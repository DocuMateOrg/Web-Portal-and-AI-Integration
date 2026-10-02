import os
import cv2
import json
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
import re
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from google.genai.errors import ClientError, ServerError
load_dotenv()

logger = logging.getLogger(__name__)

# Create Gemini client (NEW SDK)
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

# Model fallback chain — verified available models (fastest → most stable)
GEMINI_MODELS = [
    "gemini-2.5-flash-lite",   # fastest & cheapest
    "gemini-2.5-flash",        # more capable fallback
    "gemini-flash-lite-latest", # alias always pointing to current lite model
]

# Both 4xx client errors AND 5xx server overload errors are retryable
RETRYABLE = (ClientError, ServerError)


async def _generate_with_fallback(contents) -> str:
    """
    Try each model in GEMINI_MODELS in order.
    Returns the raw response text from the first model that succeeds.
    - 503 ServerError  → try next model (overloaded)
    - 404 ClientError  → try next model (model deprecated/not found)
    - Other ClientError → break immediately (quota/auth issues won't be fixed by switching models)
    Raises the last exception if all models fail.
    """
    last_exc = None
    for model in GEMINI_MODELS:
        try:
            logger.info(f"[Gemini] Trying model: {model}")
            response = await client.aio.models.generate_content(
                model=model,
                contents=contents
            )
            return response.text.strip()
        except ServerError as e:
            logger.warning(
                f"[Gemini] {model} → 503 overloaded, trying next... ({e})"
            )
            last_exc = e
            await asyncio.sleep(1)
        except ClientError as e:
            status_code = e.code if hasattr(e, 'code') else 0
            if status_code == 404:
                # Model deprecated / not found — try the next one
                logger.warning(f"[Gemini] {model} → 404 not found, trying next model...")
                last_exc = e
            else:
                # Quota exceeded, auth error, etc. — no point trying other models
                logger.error(f"[Gemini] {model} → {status_code} client error, stopping. ({e})")
                raise e
    raise last_exc


@retry(
    wait=wait_exponential(multiplier=2, min=5, max=60),
    stop=stop_after_attempt(4),
    retry=retry_if_exception_type(RETRYABLE),
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

    raw_text = await _generate_with_fallback(contents)
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
    wait=wait_exponential(multiplier=2, min=5, max=60),
    stop=stop_after_attempt(4),
    retry=retry_if_exception_type(RETRYABLE),
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
    try:
        raw_text = await _generate_with_fallback(prompt)
    except ServerError:
        # All models overloaded — skip cleaning, return raw OCR text as-is
        logger.warning("[Gemini] All models unavailable for clean_text — returning raw OCR text.")
        return {
            "cleaned_text": ocr_text,
            "language": "mixed"
        }

    cleaned_json_text = re.sub(r"^```json\s*|\s*```$", "", raw_text, flags=re.MULTILINE)

    try:
        return json.loads(cleaned_json_text)
    except json.JSONDecodeError:
        return {
            "language": "mixed",
            "cleaned_text": cleaned_json_text
        }
