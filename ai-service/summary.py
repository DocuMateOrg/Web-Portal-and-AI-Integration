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
  "keywords": ["...", "..."],
  "category": "exam | notes | letter | other"
}}

Document:
{text}
"""

    response = await client.aio.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt
    )

    raw_text = response.text.strip()
    
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
