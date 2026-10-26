from fastapi import APIRouter, Depends
from supabase import Client

from app.deps import CurrentUser, get_current_user, get_db
from app.schemas import ProfileUpdate, StylePreferences

router = APIRouter(prefix="/api/me", tags=["profile"])


@router.get("")
def get_me(user: CurrentUser = Depends(get_current_user), db: Client = Depends(get_db)):
    profile = db.table("profiles").select("*").eq("id", user.id).single().execute().data
    prefs = db.table("style_preferences").select("*").eq("user_id", user.id).single().execute().data
    return {"email": user.email, "profile": profile, "style_preferences": prefs}


@router.patch("")
def update_profile(body: ProfileUpdate, user: CurrentUser = Depends(get_current_user), db: Client = Depends(get_db)):
    changes = body.model_dump(exclude_none=True)
    return db.table("profiles").update(changes).eq("id", user.id).execute().data[0]


@router.put("/preferences")
def put_preferences(body: StylePreferences, user: CurrentUser = Depends(get_current_user), db: Client = Depends(get_db)):
    row = {"user_id": user.id, **body.model_dump()}
    return db.table("style_preferences").upsert(row).execute().data[0]
