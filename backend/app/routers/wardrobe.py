from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from supabase import Client

from app.config import Settings, get_settings
from app.deps import CurrentUser, get_current_user, get_db
from app.schemas import ClothingItemCreate, ClothingItemUpdate, FitFeedbackCreate

router = APIRouter(prefix="/api/items", tags=["wardrobe"])

ALLOWED_IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _get_item(db: Client, item_id: str) -> dict:
    # RLS hides other users' rows, so "not yours" and "doesn't exist" both 404.
    rows = db.table("clothing_items").select("*").eq("id", item_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return rows[0]


def _with_image_url(db: Client, item: dict, settings: Settings) -> dict:
    if item.get("image_path"):
        signed = db.storage.from_(settings.storage_bucket).create_signed_url(
            item["image_path"], settings.signed_url_ttl_seconds
        )
        item["image_url"] = signed.get("signedURL") or signed.get("signedUrl")
    else:
        item["image_url"] = None
    return item


@router.get("")
def list_items(db: Client = Depends(get_db), settings: Settings = Depends(get_settings)):
    items = db.table("clothing_items").select("*").order("created_at", desc=True).execute().data
    return [_with_image_url(db, i, settings) for i in items]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_item(body: ClothingItemCreate, user: CurrentUser = Depends(get_current_user), db: Client = Depends(get_db)):
    row = {"user_id": user.id, **body.model_dump(exclude_none=True)}
    return db.table("clothing_items").insert(row).execute().data[0]


@router.get("/{item_id}")
def get_item(item_id: str, db: Client = Depends(get_db), settings: Settings = Depends(get_settings)):
    return _with_image_url(db, _get_item(db, item_id), settings)


@router.patch("/{item_id}")
def update_item(item_id: str, body: ClothingItemUpdate, db: Client = Depends(get_db)):
    _get_item(db, item_id)
    changes = body.model_dump(exclude_none=True)
    return db.table("clothing_items").update(changes).eq("id", item_id).execute().data[0]


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: str, db: Client = Depends(get_db), settings: Settings = Depends(get_settings)):
    item = _get_item(db, item_id)
    if item.get("image_path"):
        db.storage.from_(settings.storage_bucket).remove([item["image_path"]])
    db.table("clothing_items").delete().eq("id", item_id).execute()


@router.post("/{item_id}/image")
async def upload_image(
    item_id: str,
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    _get_item(db, item_id)
    ext = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if ext is None:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Use JPEG, PNG, WEBP or HEIC")
    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image must be 10 MB or smaller")

    path = f"{user.id}/{item_id}.{ext}"
    db.storage.from_(settings.storage_bucket).upload(
        path, data, {"content-type": file.content_type, "upsert": "true"}
    )
    item = db.table("clothing_items").update({"image_path": path}).eq("id", item_id).execute().data[0]
    return _with_image_url(db, item, settings)


@router.get("/{item_id}/fit-feedback")
def list_fit_feedback(item_id: str, db: Client = Depends(get_db)):
    _get_item(db, item_id)
    return db.table("fit_feedback").select("*").eq("item_id", item_id).order("created_at", desc=True).execute().data


@router.post("/{item_id}/fit-feedback", status_code=status.HTTP_201_CREATED)
def add_fit_feedback(
    item_id: str, body: FitFeedbackCreate, user: CurrentUser = Depends(get_current_user), db: Client = Depends(get_db)
):
    _get_item(db, item_id)
    row = {"user_id": user.id, "item_id": item_id, **body.model_dump(mode="json")}
    return db.table("fit_feedback").insert(row).execute().data[0]
