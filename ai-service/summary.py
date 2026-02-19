import os
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

def generate_summary(text: str):
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

    response = client.models.generate_content(
        model="gemini-2.5-flash",
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
