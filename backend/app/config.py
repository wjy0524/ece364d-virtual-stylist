from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    # Only needed for legacy HS256 projects; new projects verify tokens via JWKS.
    supabase_jwt_secret: str = ""
    storage_bucket: str = "closet-images"
    signed_url_ttl_seconds: int = 3600
    # Comma-separated list of frontend origins
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
