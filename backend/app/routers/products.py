"""Shopping links. Week 1: store the pasted URL. Retailer import comes in Week 5."""

from fastapi import APIRouter, Depends, status
from supabase import Client

from app.deps import CurrentUser, get_current_user, get_db
from app.schemas import LinkedProductCreate

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("")
def list_products(db: Client = Depends(get_db)):
    return db.table("linked_products").select("*").order("created_at", desc=True).execute().data


@router.post("", status_code=status.HTTP_201_CREATED)
def link_product(body: LinkedProductCreate, user: CurrentUser = Depends(get_current_user), db: Client = Depends(get_db)):
    row = {"user_id": user.id, "url": str(body.url), "retailer": body.url.host}
    return db.table("linked_products").insert(row).execute().data[0]
