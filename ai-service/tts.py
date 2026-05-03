import io
from gtts import gTTS

# gTTS language codes for supported languages
LANG_MAP = {
    "en": "en",
    "si": "si",    
    "mixed": "en",   
}

def text_to_speech_bytes(text: str, lang: str = "en") -> bytes:
    """
    Convert text to MP3 audio bytes using gTTS.
    Returns raw MP3 bytes that can be streamed to the client.
    """
    gtts_lang = LANG_MAP.get(lang, "en")
    tts = gTTS(text=text, lang=gtts_lang, slow=False)
    buffer = io.BytesIO()
    tts.write_to_fp(buffer)
    buffer.seek(0)
    return buffer.read()
