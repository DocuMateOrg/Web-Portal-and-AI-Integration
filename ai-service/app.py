from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from preprocess import preprocess_image
from ocr import extract_text, clean_text
from summary import generate_summary
import fitz  # PyMuPDF
from fastapi.responses import JSONResponse
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

@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    # Read uploaded file
    file_bytes = await file.read()
    
    filename = file.filename or ""
    content_type = file.content_type or ""
    
    is_pdf = filename.lower().endswith('.pdf') or content_type == 'application/pdf'
    
    all_texts = []
    all_languages = []
    all_confidences = []
    
    try:
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