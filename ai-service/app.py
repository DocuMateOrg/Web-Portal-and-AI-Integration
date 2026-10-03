from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from preprocess import preprocess_image
from ocr import extract_text, clean_text
from summary import detect_summary_language, generate_summary
from tts import text_to_speech_bytes
import fitz
import io
import logging
from google.genai.errors import ClientError, ServerError
from supabase_storage import upload_bytes
import os
import uuid

app = FastAPI()
logger = logging.getLogger(__name__)


def _gemini_client_error_response(error: ClientError, operation: str) -> JSONResponse:
    status_code = getattr(error, "code", 502)
    error_text = str(error).lower()
    is_daily_quota = (
        status_code == 429
        and (
            "generaterequestsperday" in error_text
            or "per_day" in error_text
            or "per day" in error_text
        )
    )

    if is_daily_quota:
        message = (
            "The Gemini daily request quota is exhausted for the available models. "
            "Wait for the quota to reset or enable billing/increase the project's quota."
        )
        retryable = False
        error_code = "daily_quota_exhausted"
    elif status_code == 429:
        message = "Gemini is temporarily rate-limited. Please wait a little and try again."
        retryable = True
        error_code = "rate_limited"
    else:
        message = "Gemini could not process this request. Check the request and API configuration."
        retryable = False
        error_code = "gemini_request_failed"

    logger.error("Gemini %s failed with HTTP %s (%s)", operation, status_code, error_code)
    return JSONResponse(
        status_code=status_code if 400 <= status_code < 500 else 502,
        content={
            "status": "error",
            "code": error_code,
            "message": message,
            "retryable": retryable,
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Keep serving files uploaded by older versions of the service.
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/static", StaticFiles(directory="uploads"), name="static")

@app.get("/health")
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
        
        # Upload generated audio to Supabase Storage.
        file_id = str(uuid.uuid4())
        destination = f"audio/{file_id}.mp3"
        audio_url = upload_bytes(audio_bytes, destination, "audio/mpeg")
        
        return {
            "status": "success",
            "audio_url": audio_url,
            "message": "Audio generated and uploaded to cloud."
        }
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

            doc_id = str(uuid.uuid4())
            safe_filename = os.path.basename(filename.replace("\\", "/")) or "document"
            destination = f"documents/{doc_id}_{safe_filename}"
            document_url = upload_bytes(file_bytes, destination, content_type)
    except ClientError as e:
        return _gemini_client_error_response(e, "OCR")
    except ServerError as e:
        logger.error("Gemini OCR models are temporarily unavailable: %s", e)
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "message": "Gemini is temporarily overloaded. Please wait a moment and retry the upload.",
                "retryable": True,
            },
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
    except (ClientError, ServerError):
        cleaned = {"cleaned_text": combined_text, "language": final_language}

    summary_language = detect_summary_language(combined_text)
    if combined_text.strip():
        try:
            summary_result = await generate_summary(combined_text, summary_language)
        except (ClientError, ServerError):
            summary_result = {
                "summary": "Summary unavailable: the AI service is busy or its quota is exhausted. Please try again later.",
                "tags": [],
                "category": "other",
                "language": summary_language,
            }
    else:
        summary_result = {
            "summary": "No readable text was extracted, so a summary could not be generated.",
            "tags": [],
            "category": "other",
            "language": "en",
        }

    response_data = {
        "ocr": final_ocr_result,
        "cleaned_text": cleaned,
        "summary": summary_result,
        "document_url": document_url
    }

    # Ensure UTF-8 encoding in response
    return JSONResponse(
        content=response_data,
        media_type="application/json; charset=utf-8"
    )


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

    doc_id = str(uuid.uuid4())
    safe_filename = os.path.basename(filename.replace("\\", "/")) or "document"
    destination = f"documents/{doc_id}_{safe_filename}"
    document_url = upload_bytes(file_bytes, destination, content_type)

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
        "document_url": document_url
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

    raw_results: list[dict] = []
    try:
        for file in files:
            raw_results.append(await _ocr_file(file))
    except ClientError as e:
        return _gemini_client_error_response(e, "batch OCR")
    except ServerError as e:
        logger.error("Gemini batch OCR models are temporarily unavailable: %s", e)
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "message": "Gemini is temporarily overloaded. Please wait a moment and retry the batch.",
                "retryable": True,
            },
        )

    per_file_results: list[dict] = []
    for item in raw_results:
        summary_language = detect_summary_language(item["text"])
        file_summary = {
            "summary": "No readable text was extracted, so a summary could not be generated.",
            "tags": [],
            "category": "other",
            "language": summary_language,
        }

        if item["text"].strip():
            try:
                file_summary = await generate_summary(item["text"], summary_language)
            except (ClientError, ServerError):
                file_summary = {
                    "summary": "Summary unavailable: the AI service is busy or its quota is exhausted. Please try again later.",
                    "tags": [],
                    "category": "other",
                    "language": summary_language,
                }

        per_file_results.append(
            {
                "filename": item["filename"],
                "language": item["language"],
                "confidence": item["confidence"],
                "metadata": item.get("metadata", {"pages": 1, "word_count": 0}),
                "text": item["text"],
                "summary": file_summary.get("summary", ""),
                "summary_language": summary_language,
                "tags": file_summary.get("tags", []),
                "category": file_summary.get("category", "other"),
                "document_url": item.get("document_url")
            }
        )

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

    summary_language = (
        "si"
        if per_file_results and all(item["summary_language"] == "si" for item in per_file_results)
        else "en"
    )
    if combined_text.strip():
        try:
            combined_summary = await generate_summary(combined_text, summary_language)
        except (ClientError, ServerError):
            combined_summary = {
                "summary": "Combined summary unavailable: the AI service is busy or its quota is exhausted. Please try again later.",
                "tags": [],
                "category": "other",
                "language": summary_language,
            }
    else:
        combined_summary = {
            "summary": "No readable text was extracted from the uploaded documents, so a combined summary could not be generated.",
            "tags": [],
            "category": "other",
            "language": summary_language,
        }

    return {
        "batch_info": {
            "total_documents": total_docs,
            "language": final_language,
            "summary_language": summary_language,
            "avg_confidence": round(avg_confidence, 4),
        },
       
        "per_file": per_file_results,
        
        "combined_text": combined_text,
        "combined_summary": combined_summary,
    }

# ── Hugging Face Gradio SDK integration ──────────────────────────────────────
# HF Gradio Spaces expect a Gradio "demo" at module level AND check the /info
# endpoint for liveness.  We mount a minimal Gradio Blocks at the root path
# so those checks pass, while all our FastAPI routes (/ocr /tts /batch…)
# remain available on the same server.
import gradio as gr

with gr.Blocks(title="DocuMate AI Service") as demo:
    gr.Markdown("# 🤖 DocuMate AI Service")
    gr.Markdown("FastAPI OCR · Summarization · TTS")
    gr.Markdown("**Endpoints:** `/ocr` · `/tts` · `/batch` · `/health`")

# Mount Gradio at "/" – adds /info, /queue/status, etc. that HF expects.
# All existing FastAPI routes remain accessible alongside.
app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)