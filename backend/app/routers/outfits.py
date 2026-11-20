from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.config import Settings, get_settings
from app.deps import CurrentUser, get_current_user, get_db
from app.routers.wardrobe import _with_image_url
from app.schemas import OutfitRequest, OutfitUpdate
from virtual_stylist_ai import outfit_recommender

router = APIRouter(prefix="/api/outfits", tags=["outfits"])

NOT_ENOUGH_ITEMS = "Add at least a top and a bottom, or a dress, to get outfit suggestions."


def _expand(db: Client, outfit: dict, items_by_id: dict[str, dict], settings: Settings) -> dict:
    """Replace item_ids with the item rows (and signed image URLs), keeping outfit order."""
    items = [
        _with_image_url(db, dict(items_by_id[item_id]), settings)
        for item_id in outfit["item_ids"]
        if item_id in items_by_id  # an item deleted since the outfit was made is skipped
    ]
    return {**outfit, "items": items}


@router.post("/recommend")
def recommend(
    body: OutfitRequest | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    occasion = body.occasion if body else None
    # RLS limits both queries to the signed-in user's rows.
    items = db.table("clothing_items").select("*").execute().data
    prefs = db.table("style_preferences").select("*").eq("user_id", user.id).execute().data
    items_by_id = {item["id"]: item for item in items}

    suggestions = outfit_recommender.recommend_outfits(
        items, prefs[0] if prefs else None, occasion=occasion, k=3
    )
    rows = [
        {
            "user_id": user.id,
            "item_ids": s["item_ids"],
            "score": s.get("score"),
            "reason": s.get("reason"),
            "occasion": occasion,
            "source": outfit_recommender.SOURCE,
        }
        for s in suggestions
        # never store an outfit with garments outside this user's closet
        if s.get("item_ids") and all(item_id in items_by_id for item_id in s["item_ids"])
    ]
    if not rows:
        return {"outfits": [], "message": NOT_ENOUGH_ITEMS}

    saved = db.table("outfits").insert(rows).execute().data
    return {"outfits": [_expand(db, o, items_by_id, settings) for o in saved], "message": None}


@router.get("")
def list_outfits(
    saved: bool | None = None,
    db: Client = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    query = db.table("outfits").select("*").order("created_at", desc=True)
    if saved is not None:
        query = query.eq("saved", saved)
    outfits = query.limit(50).execute().data
    item_ids = sorted({item_id for o in outfits for item_id in o["item_ids"]})
    items = db.table("clothing_items").select("*").in_("id", item_ids).execute().data if item_ids else []
    items_by_id = {item["id"]: item for item in items}
    return [_expand(db, o, items_by_id, settings) for o in outfits]


@router.patch("/{outfit_id}")
def update_outfit(outfit_id: str, body: OutfitUpdate, db: Client = Depends(get_db)):
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide saved and/or reaction")
    if "saved" in changes and changes["saved"] is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "saved cannot be null")
    rows = db.table("outfits").update(changes).eq("id", outfit_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Outfit not found")
    return rows[0]
