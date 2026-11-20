from typing import Any

from supabase import Client

from app.config import Settings


def with_image_url(db: Client, item: dict[str, Any], settings: Settings) -> dict[str, Any]:
    result = dict(item)
    if result.get("image_path"):
        signed = db.storage.from_(settings.storage_bucket).create_signed_url(
            result["image_path"], settings.signed_url_ttl_seconds
        )
        result["image_url"] = signed.get("signedURL") or signed.get("signedUrl")
    else:
        result["image_url"] = None
    return result
