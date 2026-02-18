from fastapi import FastAPI, UploadFile, File
from preprocess import preprocess_image
from ocr import extract_text

app = FastAPI()

@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    # Read uploaded file
    file_bytes = await file.read()

    # Preprocess image (grayscale, denoise, etc.)
    processed = preprocess_image(file_bytes)

    # Extract OCR text as dict
    result = extract_text(processed)

    # Return directly as JSON
    return result
