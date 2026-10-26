import time

import jwt
from fastapi import Depends
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.deps import get_current_user, get_db
from app.main import app

SECRET = "test-secret-at-least-32-bytes-long!!"
app.dependency_overrides[get_settings] = lambda: Settings(supabase_url="http://localhost", supabase_jwt_secret=SECRET)
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
