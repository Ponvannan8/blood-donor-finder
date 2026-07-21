"""
Centralised app settings, loaded from environment variables (.env).
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Supabase project settings — from Project Settings > API in the Supabase
    # dashboard. Used purely as a hosted Postgres database here — this app
    # has no accounts, so Supabase Auth is never touched.
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str  # SECRET — server-side only. Never expose to the frontend.

    # CORS: comma-separated list of allowed frontend origins
    FRONTEND_ORIGINS: str = "http://localhost:5173"

    ENV: str = "development"

    # Shared passcode gating the admin panel, since there are no accounts/roles.
    # Leave blank to disable admin access entirely.
    ADMIN_PASSCODE: str = ""

    # Phase 7 — chatbot. Get a free key at https://openrouter.ai/keys.
    # "openrouter/free" is OpenRouter's auto-router across whichever :free
    # models are currently available, so this default doesn't go stale as
    # individual free models rotate in and out — override OPENROUTER_MODEL
    # to pin a specific one instead if you prefer.
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openrouter/free"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
