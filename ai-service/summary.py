import os
import json
from dotenv import load_dotenv
from google import genai
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from google.genai.errors import ClientError

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

@retry(
    wait=wait_exponential(multiplier=2, min=10, max=65), 
    stop=stop_after_attempt(6), 
    retry=retry_if_exception_type(ClientError),
    reraise=True
)
async def generate_summary(text: str):
    prompt = f"""
Summarize the following document.

Return JSON ONLY:
{{
  "summary": "...",
  "tags": ["...", "..."],
  "category": "exam | notes | letter | other"
}}

Document:
{text}
"""

    response = await client.aio.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt
    )

    raw_text = response.text.strip()

    # Remove code fences if present
    raw_text = raw_text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw_text)
    except:
        return {
            "summary": raw_text,
            "tags": [],
            "category": "other"
        }
