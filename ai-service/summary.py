import json
import logging
from dotenv import load_dotenv
from ocr import _generate_with_fallback

load_dotenv()

logger = logging.getLogger(__name__)


def detect_summary_language(text: str) -> str:
    """Use Sinhala only when it is the dominant alphabetic script."""
    alphabetic_count = 0
    sinhala_count = 0
    for character in text:
        if character.isalpha():
            alphabetic_count += 1
            if "\u0D80" <= character <= "\u0DFF":
                sinhala_count += 1

    if sinhala_count and sinhala_count / max(alphabetic_count, 1) >= 0.7:
        return "si"
    return "en"


async def generate_summary(text: str, language: str | None = None):
    summary_language = language or detect_summary_language(text)
    output_language = "Sinhala" if summary_language == "si" else "English"
    prompt = f"""
Summarize only information explicitly supported by the extracted document text below.
Write the summary in {output_language}. Do not translate it into another language.
When several source documents are provided, treat them as related material and
write one cohesive combined summary covering the shared topic and important
information across all sources. Do not write a separate summary per file and do
not output file names as headings.

Return JSON ONLY:
{{
  "summary": "...",
  "tags": ["...", "..."],
  "keywords": ["...", "..."],
  "category": "exam | notes | letter | other"
}}

Rules:
- Do not use outside knowledge or guess missing details.
- Do not invent names, titles, dates, authors, singers, or other facts.
- If the source is Sinhala or another language, understand the source text before summarizing it; do not guess at corrupted or uncertain OCR.
- If OCR is noisy or the meaning is uncertain, say so briefly instead of guessing.
- For lyrics or other creative writing, describe only the apparent themes; do not identify the work or people unless the text clearly does so.
- Keep the summary concise and write it in {output_language}. Preserve the document's meaning without translating line-by-line.
- Do not state names or credits unless they are clearly readable in the supplied text.
- Use short, relevant tags based only on the text.

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
            result = json.loads(clean_json)
        else:
            result = json.loads(raw_text)

        if not isinstance(result, dict):
            logger.warning("Summary model returned JSON that was not an object")
            return {
                "summary": "Summary unavailable: the AI returned an invalid response. Please try again.",
                "tags": [],
                "keywords": [],
                "category": "other",
                "language": summary_language,
            }

        summary = result.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            logger.warning("Summary model returned no summary text")
            return {
                "summary": "Summary unavailable: the AI returned no summary text. Please try again.",
                "tags": [],
                "keywords": [],
                "category": "other",
                "language": summary_language,
            }

        result["summary"] = summary.strip()
        result["language"] = summary_language
        tags = result.get("tags")
        result["tags"] = [
            tag.strip() for tag in tags
            if isinstance(tag, str) and tag.strip()
        ] if isinstance(tags, list) else []
        if not isinstance(result.get("keywords"), list):
            result["keywords"] = []
        if not isinstance(result.get("category"), str) or not result["category"].strip():
            result["category"] = "other"

        return result
    except json.JSONDecodeError as e:
        logger.warning("Summary response was not valid JSON: %s", e)
        return {
            "summary": "Summary unavailable: the AI returned an unreadable response. Please try again.",
            "tags": [],
            "keywords": [],
            "category": "other",
            "language": summary_language,
        }
