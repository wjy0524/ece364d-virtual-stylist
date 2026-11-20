from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from supabase import Client

from app.config import Settings, get_settings
from app.deps import CurrentUser, get_classification_user, get_current_user, get_db
from app.image_utils import with_image_url
from app.schemas import ClothingItemCreate, ClothingItemUpdate, FitFeedbackCreate, FitFeedbackUpdate
from virtual_stylist_ai.clothing_classifier import FashionClipClassifier

router = APIRouter(prefix="/api/items", tags=["wardrobe"])

ALLOWED_IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _get_item(db: Client, item_id: str) -> dict:
    # RLS hides other users' rows, so "not yours" and "doesn't exist" both 404.
    rows = db.table("clothing_items").select("*").eq("id", item_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return rows[0]


@router.get("")
def list_items(db: Client = Depends(get_db), settings: Settings = Depends(get_settings)):
    items = db.table("clothing_items").select("*").order("created_at", desc=True).execute().data
    return [with_image_url(db, i, settings) for i in items]


@router.get("/fit-feedback/history")
def list_user_fit_feedback(db: Client = Depends(get_db)):
    return (
        db.table("fit_feedback")
        .select("*, clothing_items(id, name, category, subcategory, brand, size_label, garment_cut)")
        .order("created_at", desc=True)
        .execute()
        .data
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_item(body: ClothingItemCreate, user: CurrentUser = Depends(get_current_user), db: Client = Depends(get_db)):
    row = {"user_id": user.id, **body.model_dump(exclude_none=True)}
    return db.table("clothing_items").insert(row).execute().data[0]


@router.post("/classify")
async def classify_image(
    request: Request,
    file: UploadFile = File(...),
    user: CurrentUser | None = Depends(get_classification_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Use JPEG, PNG, WEBP or HEIC")
    data = await file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image must be 10 MB or smaller")

    classifier: FashionClipClassifier | None = getattr(request.app.state, "clothing_classifier", None)
    if classifier is None:
        classifier_status = getattr(request.app.state, "clothing_classifier_status", "failed")
        detail = (
            "Image classification is still loading. Please retry in a moment."
            if classifier_status == "loading"
            else "Image classification is unavailable. Check the backend logs."
        )
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail)
    try:
        return await run_in_threadpool(classifier.predict, data)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.get("/{item_id}")
def get_item(item_id: str, db: Client = Depends(get_db), settings: Settings = Depends(get_settings)):
    return with_image_url(db, _get_item(db, item_id), settings)


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
    return with_image_url(db, item, settings)


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


@router.put("/{item_id}/fit-feedback/{feedback_id}")
def update_fit_feedback(
    item_id: str,
    feedback_id: str,
    body: FitFeedbackUpdate,
    db: Client = Depends(get_db),
):
    _get_item(db, item_id)
    rows = (
        db.table("fit_feedback")
        .select("id")
        .eq("id", feedback_id)
        .eq("item_id", item_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fit feedback not found")
    changes = body.model_dump(exclude_unset=True, mode="json")
    if not changes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide at least one field to update")
    if ("overall_fit" in changes and changes["overall_fit"] is None) or (
        "issues" in changes and changes["issues"] is None
    ):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Overall fit and issues cannot be null")
    return (
        db.table("fit_feedback")
        .update(changes)
        .eq("id", feedback_id)
        .eq("item_id", item_id)
        .execute()
        .data[0]
    )
