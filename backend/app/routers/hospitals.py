from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.matching import attach_distance_and_sort
from app.core.security import require_admin
from app.core.supabase_client import get_service_client
from app.schemas.facility import HospitalCreate, HospitalOut, HospitalUpdate

router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])

DEFAULT_RADIUS_KM = 50


@router.get("", response_model=list[HospitalOut])
def list_hospitals(
    city: str | None = Query(None),
    latitude: float | None = Query(None, ge=-90, le=90),
    longitude: float | None = Query(None, ge=-180, le=180),
    radius_km: float = Query(DEFAULT_RADIUS_KM, gt=0, le=500),
):
    query = get_service_client().table("hospitals").select("*")
    if city:
        query = query.ilike("city", f"%{city}%")

    result = query.execute()
    return attach_distance_and_sort(result.data, latitude, longitude, radius_km, max_results=100)


@router.get("/{hospital_id}", response_model=HospitalOut)
def get_hospital(hospital_id: str):
    result = get_service_client().table("hospitals").select("*").eq("hospital_id", hospital_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hospital not found")
    return result.data[0]


@router.post("", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def create_hospital(payload: HospitalCreate, admin: None = Depends(require_admin)):
    row = payload.model_dump(mode="json")
    result = get_service_client().table("hospitals").insert(row).execute()
    return result.data[0]


@router.patch("/{hospital_id}", response_model=HospitalOut)
def update_hospital(hospital_id: str, payload: HospitalUpdate, admin: None = Depends(require_admin)):
    updates = payload.model_dump(mode="json", exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    result = get_service_client().table("hospitals").update(updates).eq("hospital_id", hospital_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hospital not found")
    return result.data[0]


@router.delete("/{hospital_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hospital(hospital_id: str, admin: None = Depends(require_admin)):
    result = get_service_client().table("hospitals").delete().eq("hospital_id", hospital_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hospital not found")
