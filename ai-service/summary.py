import os
import json
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai.errors import ClientError, ServerError
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from ocr import _generate_with_fallback, RETRYABLE

load_dotenv()

logger = logging.getLogger(__name__)

@retry(
    wait=wait_exponential(multiplier=2, min=5, max=60),
    stop=stop_after_attempt(4),
    retry=retry_if_exception_type(RETRYABLE),
    reraise=True
)
async def generate_summary(text: str):
    prompt = f"""
Summarize the following document.

Return JSON ONLY:
{{
  "summary": "...",
  "tags": ["...", "..."],
  "keywords": ["...", "..."],
  "category": "exam | notes | letter | other"
}}

Document:
{text}
"""
    raw_text = await _generate_with_fallback(prompt)
    
    try:
        # Extract JSON block between first { and last }
        start = raw_text.find('{')
        end = raw_text.rfind('}')
        if start != -1 and end != -1:
            clean_json = raw_text[start:end+1]
            return json.loads(clean_json)
        return json.loads(raw_text)
    except Exception as e:
        print(f"Summary Parsing Error: {e} | Raw Output: {raw_text}")
        return {
            "summary": raw_text, # Fallback to showing raw text if parsing fails
            "tags": [],
            "keywords": [],
            "category": "other"
        }
