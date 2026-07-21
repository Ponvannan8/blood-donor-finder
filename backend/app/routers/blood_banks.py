from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.matching import attach_distance_and_sort
from app.core.security import require_admin
from app.core.supabase_client import get_service_client
from app.schemas.donor import BloodGroup
from app.schemas.facility import BloodBankCreate, BloodBankOut, BloodBankUpdate

router = APIRouter(prefix="/api/blood-banks", tags=["blood-banks"])

DEFAULT_RADIUS_KM = 50


@router.get("", response_model=list[BloodBankOut])
def list_blood_banks(
    city: str | None = Query(None),
    blood_group: BloodGroup | None = Query(None, description="Only banks currently stocking this group"),
    latitude: float | None = Query(None, ge=-90, le=90),
    longitude: float | None = Query(None, ge=-180, le=180),
    radius_km: float = Query(DEFAULT_RADIUS_KM, gt=0, le=500),
):
    query = get_service_client().table("blood_banks").select("*")
    if city:
        query = query.ilike("city", f"%{city}%")
    if blood_group:
        query = query.contains("available_blood_groups", [blood_group.value])

    result = query.execute()
    return attach_distance_and_sort(result.data, latitude, longitude, radius_km, max_results=100)


@router.get("/{bank_id}", response_model=BloodBankOut)
def get_blood_bank(bank_id: str):
    result = get_service_client().table("blood_banks").select("*").eq("bank_id", bank_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Blood bank not found")
    return result.data[0]


@router.post("", response_model=BloodBankOut, status_code=status.HTTP_201_CREATED)
def create_blood_bank(payload: BloodBankCreate, admin: None = Depends(require_admin)):
    row = payload.model_dump(mode="json")
    result = get_service_client().table("blood_banks").insert(row).execute()
    return result.data[0]


@router.patch("/{bank_id}", response_model=BloodBankOut)
def update_blood_bank(bank_id: str, payload: BloodBankUpdate, admin: None = Depends(require_admin)):
    updates = payload.model_dump(mode="json", exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    result = get_service_client().table("blood_banks").update(updates).eq("bank_id", bank_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Blood bank not found")
    return result.data[0]


@router.delete("/{bank_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blood_bank(bank_id: str, admin: None = Depends(require_admin)):
    result = get_service_client().table("blood_banks").delete().eq("bank_id", bank_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Blood bank not found")
