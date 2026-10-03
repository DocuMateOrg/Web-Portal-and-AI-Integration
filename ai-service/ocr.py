import os
import cv2
import json
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
import re
from google.genai.errors import ClientError, ServerError
load_dotenv()

logger = logging.getLogger(__name__)

# Create Gemini client (NEW SDK)
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

# Model fallback chain — verified available models (fastest → most stable)
GEMINI_MODELS = [
    "gemini-2.5-flash",        # Prefer the more capable model for OCR and summaries.
    "gemini-2.5-flash-lite",   # Lower-cost fallback.
    "gemini-flash-lite-latest", # alias always pointing to current lite model
]
GEMINI_MODEL_ATTEMPTS = 2
GEMINI_RETRY_BASE_DELAY_SECONDS = 1

async def _generate_with_fallback(contents) -> str:
    """
    Retry transient model overloads briefly, then try the next configured model.
    Quota/rate-limit errors and missing models also move directly to the next
    model. Other client errors are raised because switching models will not fix
    authentication or request errors.
    Raises the last exception if all models fail.
    """
    last_exc = None
    for model in GEMINI_MODELS:
        for attempt in range(1, GEMINI_MODEL_ATTEMPTS + 1):
            try:
                logger.info("[Gemini] Trying model %s (attempt %s)", model, attempt)
                response = await client.aio.models.generate_content(
                    model=model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(
                            disable=True
                        )
                    ),
                )
                if not response.text:
                    raise RuntimeError(f"Gemini model {model} returned an empty response")
                return response.text.strip()
            except ServerError as e:
                last_exc = e
                if attempt < GEMINI_MODEL_ATTEMPTS:
                    delay = GEMINI_RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
                    logger.info(
                        "[Gemini] %s is temporarily unavailable; retrying in %ss",
                        model,
                        delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.info("[Gemini] %s remains unavailable; trying the next model", model)
            except ClientError as e:
                status_code = e.code if hasattr(e, "code") else 0
                if status_code in (404, 429):
                    last_exc = e
                    if status_code == 429:
                        logger.info(
                            "[Gemini] %s is quota/rate limited; trying the next model",
                            model,
                        )
                    else:
                        logger.info("[Gemini] %s was not found; trying the next model", model)
                    break
                else:
                    logger.error("[Gemini] %s returned client error %s", model, status_code)
                    raise
    raise last_exc


def _make_detail_crop_parts(images):
    """Create overlapping, enlarged references to help verify small glyphs."""
    if len(images) > 3:
        return []

    detail_parts = []
    quadrants = ("top-left", "top-right", "bottom-left", "bottom-right")
    for page_number, image in enumerate(images, start=1):
        height, width = image.shape[:2]
        if min(height, width) < 700:
            continue

        overlap_x = max(1, width // 12)
        overlap_y = max(1, height // 12)
        mid_x, mid_y = width // 2, height // 2
        bounds = {
            "top-left": (0, 0, min(width, mid_x + overlap_x), min(height, mid_y + overlap_y)),
            "top-right": (max(0, mid_x - overlap_x), 0, width, min(height, mid_y + overlap_y)),
            "bottom-left": (0, max(0, mid_y - overlap_y), min(width, mid_x + overlap_x), height),
            "bottom-right": (max(0, mid_x - overlap_x), max(0, mid_y - overlap_y), width, height),
        }

        for quadrant in quadrants:
            left, top, right, bottom = bounds[quadrant]
            crop = image[top:bottom, left:right]
            crop_height, crop_width = crop.shape[:2]
            scale = min(2.0, 1600 / max(crop_height, crop_width))
            if scale > 1:
                crop = cv2.resize(
                    crop,
                    (round(crop_width * scale), round(crop_height * scale)),
                    interpolation=cv2.INTER_CUBIC,
                )
            encoded, buffer = cv2.imencode(".png", crop)
            if encoded:
                detail_parts.append(
                    (
                        f"Enlarged {quadrant} detail crop from page {page_number}; "
                        "reference only, not an additional page.",
                        types.Part.from_bytes(
                            data=buffer.tobytes(),
                            mime_type="image/png",
                        ),
                    )
                )

    return detail_parts


async def extract_text(images):
    """
    images: OpenCV image (numpy array) or list of OpenCV images
    Returns a Python dict with OCR results
    """
    if not isinstance(images, list):
        images = [images]

    prompt = """
You are an OCR system.

Extract the text exactly as it appears in the document image(s), including Sinhala and English.

IMPORTANT INSTRUCTIONS:
- Read characters from the image pixels, not from expected spelling or context.
- Preserve Sinhala script and distinguish similar-looking Sinhala characters carefully.
- Preserve visible vowel signs, consonant marks, punctuation, and word spacing.
- Do not translate or transliterate the text.
- Do not correct, complete, paraphrase, or infer text from context.
- If a character or passage cannot be read, mark only that part as [unclear].
- Preserve headings, paragraphs, lists, and tables in their original order and format.
- Do not add labels, explanations, or content that is not visible in the image.
- Treat each full-page image as one page and return all pages in order.
- Set language to "si" when the readable text is predominantly Sinhala.
- Set confidence to a number from 0.0 to 1.0 based on legibility, not plausibility.

Return JSON ONLY in this format:
{
  "language": "si | en | mixed",
  "text": "...",
  "confidence": 0.0
}
"""
    
    image_parts = []
    for img in images:
        # Encode image to PNG bytes
        _, buffer = cv2.imencode(".png", img)
        image_bytes = buffer.tobytes()
        image_parts.append(
            types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/png"
            )
        )

    contents = [prompt]
    for page_number, image_part in enumerate(image_parts, start=1):
        contents.extend([f"Full-page image for page {page_number}.", image_part])
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

    extracted_text = result.get("text")
    if (
        isinstance(extracted_text, str)
        and (
            result.get("language") == "si"
            or re.search(r"[\u0D80-\u0DFF]", extracted_text)
        )
    ):
        detail_parts = _make_detail_crop_parts(images)
        verification_prompt = f"""
You are an independent Sinhala OCR transcriber. Transcribe the supplied images
from their pixels from scratch. No draft transcript is supplied: do not invent,
reconstruct, or infer words from context, grammar, familiar lyrics, or outside
knowledge.

Full-page images define the page order, layout, and reading order. Any following
detail crops are references to parts of those pages, not additional content;
use them only to distinguish small glyphs. Return the complete transcript for
all full pages, preserving line breaks, punctuation, Sinhala marks, and spacing.
Do not translate, transliterate, normalize spellings, or add labels. If a
character cannot be read visually, use [unclear] for only that portion.
Return only the transcript, with no explanation or Markdown fences.
"""
        verification_contents = [verification_prompt]
        for page_number, image_part in enumerate(image_parts, start=1):
            verification_contents.extend(
                [f"Full-page image for page {page_number}.", image_part]
            )
        for crop_label, crop_part in detail_parts:
            verification_contents.extend([crop_label, crop_part])

        try:
            verified_text = await _generate_with_fallback(verification_contents)
            if re.search(r"[\u0D80-\u0DFF]", verified_text):
                result["text"] = verified_text.strip()
            else:
                logger.warning(
                    "Sinhala OCR verification omitted Sinhala script; keeping first-pass OCR"
                )
        except (ClientError, ServerError) as error:
            logger.warning(
                "Sinhala OCR verification unavailable; keeping first-pass OCR: %s",
                error,
            )

    return result

async def clean_text(ocr_text: str):
    prompt = f"""
You are a document processor.

Clean and structure OCR text while PRESERVING its original formatting.

IMPORTANT:
- Do NOT explain anything.
- Do NOT add extra text.
- If the text contains Markdown tables, lists, or headings, YOU MUST PRESERVE THEM perfectly in the output.
- Do not change Sinhala spelling or glyphs; preserve every Sinhala character exactly.
- Do not translate or transliterate the text.
- Formatting may be adjusted only when it does not alter or omit any source text.
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
        result = json.loads(cleaned_json_text)
        # Ensure cleaned_text is properly encoded as UTF-8
        if isinstance(result.get("cleaned_text"), str):
            result["cleaned_text"] = result["cleaned_text"].encode('utf-8', errors='replace').decode('utf-8')
        return result
    except json.JSONDecodeError:
        return {
            "language": "mixed",
            "cleaned_text": cleaned_json_text.encode('utf-8', errors='replace').decode('utf-8')
        }
