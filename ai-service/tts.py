import io
from gtts import gTTS
from summary import detect_summary_language

# gTTS language codes for supported languages
LANG_MAP = {
    "en": "en",
    "en-us": "en",
    "en-gb": "en",
    "si": "si",
    "si-lk": "si",
    "sinhala": "si",
    "mixed": "en",
}


def _resolve_language(text: str, lang: str | None) -> str:
    normalized_language = (lang or "").strip().lower().replace("_", "-")
    if normalized_language in ("", "en", "en-us", "en-gb") and detect_summary_language(text) == "si":
        return "si"
    return LANG_MAP.get(normalized_language, "en")


def _is_mp3(audio_bytes: bytes) -> bool:
    if len(audio_bytes) < 1024:
        return False

    frame_offset = 0
    if audio_bytes.startswith(b"ID3") and len(audio_bytes) >= 10:
        tag_size = sum(
            (audio_bytes[index] & 0x7F) << shift
            for index, shift in zip(range(6, 10), (21, 14, 7, 0))
        )
        frame_offset = 10 + tag_size

    return (
        frame_offset + 1 < len(audio_bytes)
        and audio_bytes[frame_offset] == 0xFF
        and audio_bytes[frame_offset + 1] & 0xE0 == 0xE0
    )


def text_to_speech_bytes(text: str, lang: str = "en") -> bytes:
    """
    Convert text to MP3 audio bytes using gTTS.
    Resolves Sinhala labels consistently and rejects empty or malformed MP3 output.
    """
    text = text.strip()
    if not text:
        raise ValueError("Text cannot be empty.")

    tts = gTTS(text=text, lang=_resolve_language(text, lang), slow=False)
    buffer = io.BytesIO()
    tts.write_to_fp(buffer)
    audio_bytes = buffer.getvalue()
    if not _is_mp3(audio_bytes):
        raise RuntimeError("Speech provider returned an empty or invalid MP3 audio file.")
    return audio_bytes
