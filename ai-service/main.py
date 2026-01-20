import os
from dotenv import load_dotenv
from google import genai   # ✅ correct library

# Load API key from .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# Initialize Gemini client
client = genai.Client(api_key=api_key)

# Sprint 2 test prompt
prompt = """
Extract Sinhala and English text from the following content.
Return JSON ONLY in this format:
{
  "language": "",
  "text": ""
}

Content:
This is a test document. මෙය පරීක්ෂණයක්.
"""

# Generate response
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
)

# Print output
print(response.text)
