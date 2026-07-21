from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_owner_token
from app.core.supabase_client import get_service_client
from app.schemas.donor import DonorCreate, DonorOut, DonorUpdate

router = APIRouter(prefix="/api/donors", tags=["donors"])


@router.post("", response_model=DonorOut, status_code=status.HTTP_201_CREATED)
def register_donor(payload: DonorCreate, owner_token: str = Depends(require_owner_token)):
    client = get_service_client()

    existing = client.table("donors").select("donor_id").eq("owner_token", owner_token).execute()
    if existing.data:
        raise HTTPException(status.HTTP_409_CONFLICT, "This browser already has a donor listing — use PATCH to update it")

    row = payload.model_dump(mode="json")
    row["owner_token"] = owner_token

    result = client.table("donors").insert(row).execute()
    return result.data[0]


@router.get("/mine", response_model=DonorOut)
def get_my_donor_listing(owner_token: str = Depends(require_owner_token)):
    result = (
        get_service_client()
        .table("donors")
        .select("*")
        .eq("owner_token", owner_token)
        .execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No donor listing for this browser yet — register first")
    return result.data[0]


@router.patch("/mine", response_model=DonorOut)
def update_my_donor_listing(payload: DonorUpdate, owner_token: str = Depends(require_owner_token)):
    updates = payload.model_dump(mode="json", exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    result = (
        get_service_client()
        .table("donors")
        .update(updates)
        .eq("owner_token", owner_token)
        .execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No donor listing for this browser yet — register first")
    return result.data[0]


@router.delete("/mine", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_donor_listing(owner_token: str = Depends(require_owner_token)):
    result = get_service_client().table("donors").delete().eq("owner_token", owner_token).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No donor listing for this browser")
