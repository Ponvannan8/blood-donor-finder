"""
Access control without accounts.

Two independent mechanisms replace what used to be Supabase Auth + roles:

1. Owner tokens — the frontend generates a random UUID once per browser
   (localStorage) and sends it as `X-Owner-Token` on every request. A donor
   listing or blood request records whichever token created it; editing or
   cancelling it later requires sending that same token back. This is NOT
   real security (anyone who copies the token could act as that "owner")
   — it just prevents casual cross-editing between different people using
   the app from different browsers, which is all a no-account app can offer.

2. Admin passcode — a single shared secret (ADMIN_PASSCODE in the backend's
   .env) sent as `X-Admin-Passcode`, checked against every admin-only route.
   Whoever holds the passcode has full admin access; there's no per-admin
   identity or audit trail.
"""
from fastapi import Header, HTTPException, status

from app.core.config import get_settings


def get_owner_token(x_owner_token: str | None = Header(None, alias="X-Owner-Token")) -> str | None:
    """Optional — use where a missing token should just mean 'no matches', not an error."""
    return x_owner_token


def require_owner_token(x_owner_token: str | None = Header(None, alias="X-Owner-Token")) -> str:
    """Required — use on endpoints that create or need to prove ownership of a record."""
    if not x_owner_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing X-Owner-Token header")
    return x_owner_token


def require_admin(x_admin_passcode: str | None = Header(None, alias="X-Admin-Passcode")) -> None:
    settings = get_settings()
    if not settings.ADMIN_PASSCODE:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Admin access isn't configured — set ADMIN_PASSCODE in the backend .env.",
        )
    if not x_admin_passcode or x_admin_passcode != settings.ADMIN_PASSCODE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid admin passcode")
