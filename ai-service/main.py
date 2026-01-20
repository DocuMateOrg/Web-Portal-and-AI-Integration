import os
from dotenv import load_dotenv
from google import genai  # correct import for google‑genai

# Load environment variables from .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# Initialize a Gemini client with your API key
client = genai.Client(api_key=api_key)

# Ask Gemini to generate text
response = client.models.generate_content(
    model="gemini-2.5-flash",  # a supported model
    contents="Extract Sinhala and English text from this document: This is a test document. මෙය පරීක්ෂණයක්."
)

# Output the generated text
print(response.text)
