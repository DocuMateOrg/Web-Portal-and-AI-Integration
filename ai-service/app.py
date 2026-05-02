from fastapi import FastAPI, UploadFile, File, Form
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from preprocess import preprocess_image
from ocr import extract_text, clean_text
from summary import generate_summary
from tts import text_to_speech_bytes
import fitz
import io
from fastapi.responses import JSONResponse, StreamingResponse
from google.genai.errors import ClientError

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "success", "message": "AI Service is running! Visit /docs to test the API."}

@app.post("/tts")
async def tts_endpoint(text: str = Form(...), lang: str = Form("en")):
    """
    Convert text to speech and return an MP3 audio stream.
    Accepts: text (the content to speak), lang (language code: en, si)
    """
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text cannot be empty."})
    try:
        audio_bytes = text_to_speech_bytes(text.strip(), lang)
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=summary.mp3"},
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"TTS failed: {str(e)}"})

@app.post("/ocr")
async def ocr_endpoint(files: List[UploadFile] = File(...)):
    all_texts = []
    all_languages = []
    all_confidences = []
    
    try:
        for file in files:
            # Read uploaded file
            file_bytes = await file.read()
            
            filename = file.filename or ""
            content_type = file.content_type or ""
            
            is_pdf = filename.lower().endswith('.pdf') or content_type == 'application/pdf'
            
            if is_pdf:
                # Process PDF
                pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
                pdf_images = []
                for page_num in range(len(pdf_doc)):
                    page = pdf_doc.load_page(page_num)
                    # Use Matrix to increase resolution for better OCR
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    img_data = pix.tobytes("png")
                    
                    processed = preprocess_image(img_data)
                    pdf_images.append(processed)
                pdf_doc.close()
                
                # Call extract_text ONCE for all images to save API quota
                page_ocr_result = await extract_text(pdf_images)
                all_texts.append(page_ocr_result.get("text", ""))
                all_languages.append(page_ocr_result.get("language", "mixed"))
                all_confidences.append(page_ocr_result.get("confidence", 0.0))
            else:
                # Process single image
                processed = preprocess_image(file_bytes)
                page_ocr_result = await extract_text(processed)
                
                all_texts.append(page_ocr_result.get("text", ""))
                all_languages.append(page_ocr_result.get("language", "mixed"))
                all_confidences.append(page_ocr_result.get("confidence", 0.0))
    except ClientError as e:
        return JSONResponse(
            status_code=429,
            content={
                "status": "error",
                "message": f"Gemini API Error: {str(e)}",
                "details": "You may have exceeded the daily API rate limit. Please try again later or check your API key quotas."
            }
        )

    combined_text = "\n\n".join(all_texts)
    avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
    
    unique_langs = set(all_languages)
    final_language = list(unique_langs)[0] if len(unique_langs) == 1 else "mixed"
    if not unique_langs:
        final_language = "mixed"

    final_ocr_result = {
        "text": combined_text,
        "language": final_language,
        "confidence": avg_confidence
    }

    try:
        cleaned = await clean_text(combined_text)
        summary_result = await generate_summary(cleaned.get("cleaned_text", combined_text))
    except ClientError as e:
        cleaned = {"cleaned_text": combined_text, "language": final_language}
        summary_result = {"summary": "Summary unavailable due to API rate limits.", "tags": [], "category": "other"}


    return {
        "ocr": final_ocr_result,
        "cleaned_text": cleaned,
        "summary": summary_result
    }


# ---------------------------------------------------------------------------
# Batch Processing Endpoint
# Supports BOTH use cases:
#   • Related documents  → use the combined_summary
#   • Different documents → use per_file[n].summary and per_file[n].tags
# ---------------------------------------------------------------------------

async def _ocr_file(file: UploadFile) -> dict:
    """
    Step 1 helper: read + preprocess + OCR one file.
    Returns raw OCR result (text, language, confidence, metadata).
    """
    file_bytes = await file.read()
    filename = file.filename or ""
    content_type = file.content_type or ""
    is_pdf = filename.lower().endswith(".pdf") or content_type == "application/pdf"
    page_count = 1

    if is_pdf:
        pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_count = len(pdf_doc)
        pdf_images = []
        for page_num in range(page_count):
            page = pdf_doc.load_page(page_num)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_data = pix.tobytes("png")
            pdf_images.append(preprocess_image(img_data))
        pdf_doc.close()
        ocr_result = await extract_text(pdf_images)
    else:
        ocr_result = await extract_text(preprocess_image(file_bytes))

    text = ocr_result.get("text") or ""
    word_count = len(text.split()) if text.strip() else 0

    return {
        "filename": filename,
        "language": ocr_result.get("language", "mixed"),
        "confidence": ocr_result.get("confidence", 0.0),
        "text": text,
        "metadata": {
            "pages": page_count,
            "word_count": word_count,
        },
    }


@app.post("/batch")
async def batch_endpoint(files: List[UploadFile] = File(...)):
    """
    Dual-mode batch processing pipeline:

    Phase A — Per-file (works for DIFFERENT documents):
      • Each file is independently OCR-ed.
      • Each file gets its own summary + tags.

    Phase B — Combined (works for RELATED documents):
      • All texts are merged into one block.
      • A single unified summary + tags is generated once.

    The frontend decides which view to render based on use case.
    """
    if not files:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "No files provided."},
        )

    # ------------------------------------------------------------------ #
    # PHASE A – OCR every file                                            #
    # ------------------------------------------------------------------ #
    raw_results: list[dict] = []
    try:
        for file in files:
            raw_results.append(await _ocr_file(file))
    except ClientError as e:
        return JSONResponse(
            status_code=429,
            content={
                "status": "error",
                "message": f"Gemini API Error: {str(e)}",
                "details": "Daily API quota exceeded. Please try again later.",
            },
        )

    # ------------------------------------------------------------------ #
    # PHASE A – Per-file summary (one AI call per document)               #
    # ------------------------------------------------------------------ #
    per_file_results: list[dict] = []
    is_single_batch = len(raw_results) == 1

    for item in raw_results:
        file_summary = {"summary": "", "tags": [], "category": "other"}
        
        if item["text"].strip():
            try:
                file_summary = await generate_summary(item["text"])
            except ClientError:
                file_summary = {
                    "summary": "Summary unavailable (rate limit).",
                    "tags": [],
                    "category": "other",
                }

        per_file_results.append(
            {
                "filename": item["filename"],
                "language": item["language"],
                "confidence": item["confidence"],
                "metadata": item.get("metadata", {"pages": 1, "word_count": 0}),
                "text": item["text"],
                "summary": file_summary.get("summary", ""),
                "tags": file_summary.get("tags", []),
                "category": file_summary.get("category", "other"),
            }
        )

    # ------------------------------------------------------------------ #
    # PHASE B – Combined summary (single AI call for all documents)       #
    # ------------------------------------------------------------------ #
    labelled_texts = [
        f"--- Document: {r['filename']} ---\n{r['text']}"
        for r in raw_results
        if r["text"].strip()
    ]
    combined_text = "\n\n".join(labelled_texts)

    total_docs = len(per_file_results)
    avg_confidence = (
        sum(r["confidence"] for r in raw_results) / total_docs if total_docs else 0.0
    )
    unique_langs = set(r["language"] for r in raw_results)
    final_language = list(unique_langs)[0] if len(unique_langs) == 1 else "mixed"

    combined_summary = {"summary": "", "tags": [], "category": "other"}
    if combined_text.strip():
        try:
            cleaned = await clean_text(combined_text)
            combined_summary = await generate_summary(
                cleaned.get("cleaned_text", combined_text)
            )
        except ClientError:
            combined_summary = {
                "summary": "Combined summary unavailable (rate limit).",
                "tags": [],
                "category": "other",
            }

    # ------------------------------------------------------------------ #
    # Return both views                                                    #
    # ------------------------------------------------------------------ #
    return {
        "batch_info": {
            "total_documents": total_docs,
            "language": final_language,
            "avg_confidence": round(avg_confidence, 4),
        },
        # Per-file view — use when documents are DIFFERENT
        "per_file": per_file_results,
        # Combined view — use when documents are RELATED
        "combined_text": combined_text,
        "combined_summary": combined_summary,
    }