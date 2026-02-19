from fastapi import FastAPI, UploadFile, File
from preprocess import preprocess_image
from ocr import extract_text
from summary import generate_summary

app = FastAPI()

@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    # Read uploaded file
    file_bytes = await file.read()

    # Preprocess image (grayscale, denoise, etc.)
    processed = preprocess_image(file_bytes)

    # Extract OCR text as dict
    ocr_result = extract_text(processed)

    # Generate summary from OCR result
    summary_result = generate_summary(ocr_result["text"])

    # Return directly as JSON
    return {
        "ocr": ocr_result,
        "summary": summary_result
    }
