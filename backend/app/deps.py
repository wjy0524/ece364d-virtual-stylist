"""Auth + database dependencies.

The frontend signs users in with Supabase Auth and sends the access token as
`Authorization: Bearer <token>`. We verify it here, then talk to Supabase *as that
user* (anon key + user token), so Row Level Security enforces data ownership even
if a route has a bug.
"""

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, ClientOptions, create_client

from app.config import Settings, get_settings

bearer = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    id: str
    email: str | None
    token: str


@lru_cache
def _jwks_client(supabase_url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")


def _decode(token: str, settings: Settings) -> dict:
    if settings.supabase_jwt_secret:
        return jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
    key = _jwks_client(settings.supabase_url).get_signing_key_from_jwt(token)
    return jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated")


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        claims = _decode(creds.credentials, settings)
    except (jwt.PyJWTError, jwt.PyJWKClientError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return CurrentUser(id=claims["sub"], email=claims.get("email"), token=creds.credentials)


def get_db(
    user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> Client:
    """Supabase client scoped to the signed-in user (RLS applies)."""
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": f"Bearer {user.token}"}),
    )
