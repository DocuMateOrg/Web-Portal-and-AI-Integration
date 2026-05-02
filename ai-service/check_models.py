import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

print("Listing models...")
try:
    for m in client.models.list():
        # Print the name and the full object so I can see the structure
        print(f"MODEL: {m.name}")
except Exception as e:
    print(f"Error: {e}")
