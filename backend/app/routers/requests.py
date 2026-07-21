from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_owner_token, require_owner_token
from app.core.supabase_client import get_service_client
from app.schemas.request import RequestCreate, RequestOut, RequestStatusUpdate

router = APIRouter(prefix="/api/requests", tags=["requests"])


@router.post("", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
def create_request(payload: RequestCreate, owner_token: str = Depends(require_owner_token)):
    row = payload.model_dump(mode="json")
    row["owner_token"] = owner_token

    result = get_service_client().table("blood_requests").insert(row).execute()
    return result.data[0]


@router.get("/mine", response_model=list[RequestOut])
def list_my_requests(owner_token: str = Depends(require_owner_token)):
    result = (
        get_service_client()
        .table("blood_requests")
        .select("*")
        .eq("owner_token", owner_token)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{request_id}", response_model=RequestOut)
def get_request(request_id: str):
    result = (
        get_service_client()
        .table("blood_requests")
        .select("*")
        .eq("request_id", request_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    return result.data[0]


def _is_owner_or_admin(request_id: str, owner_token: str | None, admin_ok: bool) -> dict:
    client = get_service_client()
    existing = client.table("blood_requests").select("owner_token").eq("request_id", request_id).execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    if not admin_ok and existing.data[0]["owner_token"] != owner_token:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This browser didn't create this request")
    return client


@router.patch("/{request_id}/status", response_model=RequestOut)
def update_request_status(
    request_id: str,
    payload: RequestStatusUpdate,
    owner_token: str | None = Depends(get_owner_token),
):
    client = _is_owner_or_admin(request_id, owner_token, admin_ok=False)
    result = (
        client.table("blood_requests")
        .update({"status": payload.status.value})
        .eq("request_id", request_id)
        .execute()
    )
    return result.data[0]


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_request(request_id: str, owner_token: str | None = Depends(get_owner_token)):
    client = _is_owner_or_admin(request_id, owner_token, admin_ok=False)
    client.table("blood_requests").update({"status": "cancelled"}).eq("request_id", request_id).execute()
