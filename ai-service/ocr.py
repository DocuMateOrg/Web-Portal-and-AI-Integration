import os
import cv2
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
import re
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from google.genai.errors import ClientError
load_dotenv()

# Create Gemini client (NEW SDK)
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

@retry(
    wait=wait_exponential(multiplier=2, min=10, max=65), 
    stop=stop_after_attempt(6), 
    retry=retry_if_exception_type(ClientError),
    reraise=True
)
async def extract_text(images):
    """
    images: OpenCV image (numpy array) or list of OpenCV images
    Returns a Python dict with OCR results
    """
    if not isinstance(images, list):
        images = [images]

    prompt = """
You are an OCR system.

Extract Sinhala and English text from the document image(s).

IMPORTANT INSTRUCTIONS:
- Preserve the exact formatting of the original document.
- If there are tables in the document, YOU MUST extract them as properly formatted Markdown tables.
- Preserve headings, paragraphs, and lists using appropriate Markdown syntax.

Return JSON ONLY in this format:
{
  "language": "si | en | mixed",
  "text": "...",
  "confidence": 0.0
}
"""
    
    contents = [prompt]
    
    for img in images:
        # Encode image to PNG bytes
        _, buffer = cv2.imencode(".png", img)
        image_bytes = buffer.tobytes()
        contents.append(
            types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/png"
            )
        )

    # Call Gemini 
    response = await client.aio.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=contents
    )

    raw_text = response.text.strip()

  
    cleaned_text = re.sub(r"^```json\s*|\s*```$", "", raw_text, flags=re.MULTILINE)

    try:
        result = json.loads(cleaned_text)
    except json.JSONDecodeError:
        result = {
            "language": "mixed",
            "text": cleaned_text,  # fallback: return raw text
            "confidence": 0.0
        }
    return result

@retry(
    wait=wait_exponential(multiplier=2, min=10, max=65), 
    stop=stop_after_attempt(6), 
    retry=retry_if_exception_type(ClientError),
    reraise=True
)
async def clean_text(ocr_text: str):
    prompt = f"""
You are a document processor.

Clean and structure OCR text while PRESERVING its original formatting.

IMPORTANT:
- Do NOT explain anything.
- Do NOT add extra text.
- If the text contains Markdown tables, lists, or headings, YOU MUST PRESERVE THEM perfectly in the output.
- Fix spelling and OCR errors but do NOT change the document structure.
- Return ONLY valid JSON.

Format:
{{
  "cleaned_text": "...",
  "language": "si | en | mixed"
}}

Text:
\"\"\"{ocr_text}\"\"\"
"""
    response = await client.aio.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt
    )

    raw_text = response.text.strip()
    cleaned_json_text = re.sub(r"^```json\s*|\s*```$", "", raw_text, flags=re.MULTILINE)

    try:
        return json.loads(cleaned_json_text)
    except json.JSONDecodeError:
        return {
            "language": "mixed",
            "cleaned_text": cleaned_json_text
        }
