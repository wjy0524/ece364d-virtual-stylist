import time

import jwt
from fastapi import Depends
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.deps import get_current_user, get_db
from app.main import app
from app.schemas import ClothingItemCreate, FitFeedbackCreate

SECRET = "test-secret-at-least-32-bytes-long!!"
app.dependency_overrides[get_settings] = lambda: Settings(
    supabase_url="http://localhost",
    supabase_jwt_secret=SECRET,
    allow_demo_classification=False,
)
# No real Supabase in unit tests, but keep the auth check that get_db normally performs.
app.dependency_overrides[get_db] = lambda _user=Depends(get_current_user): None
client = TestClient(app)


def make_token(**overrides) -> str:
    claims = {"sub": "user-1", "aud": "authenticated", "exp": int(time.time()) + 60, **overrides}
    return jwt.encode(claims, SECRET, algorithm="HS256")


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_protected_route_requires_token():
    assert client.get("/api/items").status_code == 401
    assert client.get("/api/items/fit-feedback/history").status_code == 401


def test_rejects_bad_token():
    res = client.get("/api/items", headers={"Authorization": "Bearer not-a-jwt"})
    assert res.status_code == 401


def test_rejects_expired_token():
    token = make_token(exp=int(time.time()) - 10)
    assert client.get("/api/items", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_validates_category_before_touching_db():
    token = make_token()
    res = client.post("/api/items", json={"category": "hat"}, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 422


def test_classification_requires_a_signed_in_user():
    response = client.post("/api/items/classify", files={"file": ("shirt.png", b"image", "image/png")})
    assert response.status_code == 401


def test_demo_mode_allows_anonymous_classification_only(monkeypatch):
    class FakeClassifier:
        def predict(self, image_bytes):
            assert image_bytes == b"image"
            return {"top_prediction": {"category": "top"}}

    monkeypatch.setitem(
        app.dependency_overrides,
        get_settings,
        lambda: Settings(allow_demo_classification=True),
    )
    monkeypatch.setattr(app.state, "clothing_classifier", FakeClassifier(), raising=False)

    response = client.post("/api/items/classify", files={"file": ("shirt.png", b"image", "image/png")})

    assert response.status_code == 200
    assert response.json() == {"top_prediction": {"category": "top"}}
    assert client.post("/api/items", json={"category": "top"}).status_code == 401


def test_clothing_item_accepts_structured_brand_size_and_cut():
    item = ClothingItemCreate(
        category="top",
        brand="H&M",
        size_label="M",
        garment_cut="fitted",
    )

    assert item.model_dump()["brand"] == "H&M"
    assert item.model_dump()["size_label"] == "M"
    assert item.model_dump()["garment_cut"] == "fitted"


def test_fit_feedback_accepts_directional_fit_and_structured_areas():
    feedback = FitFeedbackCreate(
        overall_fit="slightly_tight",
        issues=[{"area": "shoulders", "issue": "tight"}, {"area": "sleeves", "issue": "short"}],
    )

    assert feedback.model_dump()["overall_fit"] == "slightly_tight"
    assert feedback.model_dump()["issues"] == [
        {"area": "shoulders", "issue": "tight"},
        {"area": "sleeves", "issue": "short"},
    ]


def test_outfit_routes_require_token():
    assert client.post("/api/outfits/recommend").status_code == 401
    assert client.get("/api/outfits").status_code == 401
    assert client.patch("/api/outfits/abc", json={"saved": True}).status_code == 401


def test_outfit_reaction_is_validated():
    token = make_token()
    res = client.patch("/api/outfits/abc", json={"reaction": "love it"}, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 422
