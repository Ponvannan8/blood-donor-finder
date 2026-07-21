"""
A single Supabase client using the SERVICE ROLE key. Since this app has no
accounts, there's no per-user client to scope queries to a signed-in
person — every request already goes through the FastAPI backend, which
enforces the owner-token / admin-passcode rules itself (see core/security.py)
before touching the database. Supabase here is just a hosted Postgres +
REST layer, nothing more.
"""
from functools import lru_cache
from supabase import create_client, Client

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_service_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
