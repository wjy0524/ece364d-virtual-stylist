from fastapi import APIRouter, Depends, HTTPException, Response, status
from supabase import Client

from app.config import Settings, get_settings
from app.deps import CurrentUser, get_current_user, get_db
from app.image_utils import with_image_url
from app.recommendation_engine import generate_recommendations
from app.recommendation_engine import outfit_key as _outfit_key
from app.schemas import RecommendationFeedbackRequest, SaveOutfitRequest

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


def _owned_items(db: Client, user: CurrentUser, item_ids: list[str]) -> list[dict]:
    unique_ids = list(dict.fromkeys(item_ids))
    if len(unique_ids) != len(item_ids):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "An outfit cannot contain duplicate items")
    rows = (
        db.table("clothing_items")
        .select("*")
        .eq("user_id", user.id)
        .in_("id", unique_ids)
        .execute()
        .data
    )
    if len(rows) != len(unique_ids):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "One or more outfit items are not in your wardrobe")
    return rows


@router.get("")
def recommend_outfits(
    occasion: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if occasion and len(occasion) > 80:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Occasion must be 80 characters or fewer")

    wardrobe = (
        db.table("clothing_items")
        .select("id,name,category,subcategory,color,pattern,style_tags,garment_cut,image_path")
        .eq("user_id", user.id)
        .execute()
        .data
    )
    preference_rows = (
        db.table("style_preferences")
        .select("aesthetics,preferred_fits,occasions,disliked_items")
        .eq("user_id", user.id)
        .limit(1)
        .execute()
        .data
    )
    preferences = preference_rows[0] if preference_rows else {}
    feedback_rows = (
        db.table("recommendation_feedback")
        .select("outfit_key,helpful")
        .eq("user_id", user.id)
        .execute()
        .data
    )
    feedback = {row["outfit_key"]: row["helpful"] for row in feedback_rows}
    result = generate_recommendations(wardrobe, preferences, occasion, feedback=feedback)

    # Only sign photo URLs for items actually shown, not the whole closet.
    signed: dict[str, dict] = {}
    for outfit in result["recommendations"]:
        outfit["items"] = [
            signed.setdefault(str(item["id"]), with_image_url(db, item, settings)) for item in outfit["items"]
        ]
    return result


@router.get("/saved")
def list_saved_outfits(
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    saved = (
        db.table("saved_outfits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
        .data
    )
    if not saved:
        return []

    item_ids = list(dict.fromkeys(item_id for outfit in saved for item_id in outfit["item_ids"]))
    wardrobe = (
        db.table("clothing_items")
        .select("id,name,category,subcategory,color,pattern,style_tags,garment_cut,image_path")
        .eq("user_id", user.id)
        .in_("id", item_ids)
        .execute()
        .data
    )
    items_by_id = {str(item["id"]): with_image_url(db, item, settings) for item in wardrobe}

    result = []
    for outfit in saved:
        outfit_items = [items_by_id[item_id] for item_id in outfit["item_ids"] if item_id in items_by_id]
        if len(outfit_items) != len(outfit["item_ids"]):
            continue
        result.append(
            {
                "id": outfit["outfit_key"],
                "occasion": outfit["occasion"],
                "items": outfit_items,
                "explanation": outfit["explanation"],
                "ranking_score": outfit["ranking_score"],
                "saved_at": outfit["created_at"],
            }
        )
    return result


@router.post("/saved", status_code=status.HTTP_201_CREATED)
def save_outfit(
    body: SaveOutfitRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    item_ids = [str(item_id) for item_id in body.item_ids]
    _owned_items(db, user, item_ids)
    outfit_key = _outfit_key(item_ids, body.occasion)
    row = {
        "user_id": user.id,
        "outfit_key": outfit_key,
        "item_ids": item_ids,
        "occasion": body.occasion,
        "explanation": body.explanation,
        "ranking_score": body.ranking_score,
    }
    saved = (
        db.table("saved_outfits")
        .upsert(row, on_conflict="user_id,outfit_key")
        .execute()
        .data[0]
    )
    return {"id": saved["outfit_key"], "saved_at": saved["created_at"]}


@router.delete("/saved/{outfit_key}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_outfit(
    outfit_key: str,
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    db.table("saved_outfits").delete().eq("user_id", user.id).eq("outfit_key", outfit_key).execute()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/feedback", status_code=status.HTTP_201_CREATED)
def rate_recommendation(
    body: RecommendationFeedbackRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    item_ids = [str(item_id) for item_id in body.item_ids]
    _owned_items(db, user, item_ids)
    outfit_key = _outfit_key(item_ids, body.occasion)
    row = {"user_id": user.id, "outfit_key": outfit_key, "helpful": body.helpful}
    feedback = (
        db.table("recommendation_feedback")
        .upsert(row, on_conflict="user_id,outfit_key")
        .execute()
        .data[0]
    )
    return {"id": feedback["outfit_key"], "helpful": feedback["helpful"]}
