import os
import cv2
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
import re

load_dotenv()

# Create Gemini client (NEW SDK)
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

def extract_text(image):
    """
    image: OpenCV image (numpy array)
    Returns a Python dict with OCR results
    """

    # Encode image to PNG bytes
    _, buffer = cv2.imencode(".png", image)
    image_bytes = buffer.tobytes()

    prompt = """
You are an OCR system.

Extract Sinhala and English text from the document image.

Return JSON ONLY in this format:
{
  "language": "si | en | mixed",
  "text": "...",
  "confidence": 0.0
}
"""

    # Call Gemini
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            prompt,
            types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/png"
            )
        ]
    )

    raw_text = response.text.strip()

    # Remove any ```json or ``` code fences
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
