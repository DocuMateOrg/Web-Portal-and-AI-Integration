import os
from functools import lru_cache
from pathlib import PurePosixPath

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()


@lru_cache(maxsize=1)
def _get_storage():
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    bucket_name = os.getenv("SUPABASE_BUCKET", "documents")
    if not supabase_url or not service_role_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for uploads"
        )
    if not bucket_name:
        raise RuntimeError("SUPABASE_BUCKET must not be empty")

    return create_client(supabase_url, service_role_key).storage.from_(bucket_name)


def upload_bytes(
    file_bytes: bytes,
    object_path: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload bytes to the configured public Supabase Storage bucket."""
    object_name = PurePosixPath(object_path)
    if (
        not object_path
        or object_name.is_absolute()
        or any(part in ("", ".", "..") for part in object_name.parts)
    ):
        raise ValueError("A valid relative storage object path is required")

    storage = _get_storage()
    normalized_path = object_name.as_posix()
    storage.upload(
        normalized_path,
        file_bytes,
        file_options={
            "content-type": content_type or "application/octet-stream",
            "upsert": "false",
        },
    )
    return storage.get_public_url(normalized_path)
