from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.matching import attach_distance_and_sort, compatible_donor_groups
from app.core.security import require_owner_token
from app.core.supabase_client import get_service_client
from app.schemas.donor import BloodGroup
from app.schemas.request import DonorMatch, OpenRequestMatch

router = APIRouter(prefix="/api/search", tags=["search"])

DEFAULT_RADIUS_KM = 50
MAX_RESULTS = 50


@router.get("/donors", response_model=list[DonorMatch])
def search_donors(
    blood_group: BloodGroup = Query(..., description="Blood group needed"),
    latitude: float | None = Query(None, ge=-90, le=90),
    longitude: float | None = Query(None, ge=-180, le=180),
    radius_km: float = Query(DEFAULT_RADIUS_KM, gt=0, le=500),
    compatible_only: bool = Query(True, description="Include ABO/Rh-compatible donors, not just an exact match"),
    only_available: bool = Query(True),
    only_eligible: bool = Query(True),
):
    groups = compatible_donor_groups(blood_group.value) if compatible_only else [blood_group.value]

    query = get_service_client().table("donor_directory").select("*").in_("blood_group", groups)
    if only_available:
        query = query.eq("availability", True)
    if only_eligible:
        query = query.eq("eligible_to_donate", True)

    result = query.execute()
    matches = attach_distance_and_sort(result.data, latitude, longitude, radius_km)
    return matches


@router.get("/requests/{request_id}/matches", response_model=list[DonorMatch])
def match_donors_for_request(
    request_id: str,
    radius_km: float = Query(DEFAULT_RADIUS_KM, gt=0, le=500),
):
    client = get_service_client()
    req_result = client.table("blood_requests").select("*").eq("request_id", request_id).execute()
    if not req_result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")

    req = req_result.data[0]
    groups = compatible_donor_groups(req["blood_group"])
    donors = (
        client.table("donor_directory")
        .select("*")
        .in_("blood_group", groups)
        .eq("availability", True)
        .eq("eligible_to_donate", True)
        .execute()
    )

    return attach_distance_and_sort(donors.data, req["latitude"], req["longitude"], radius_km)


@router.get("/open-requests", response_model=list[OpenRequestMatch])
def open_requests_for_donor(
    radius_km: float = Query(DEFAULT_RADIUS_KM, gt=0, le=500),
    owner_token: str = Depends(require_owner_token),
):
    """
    Requests a donor is a compatible match for, nearest first. Uses the
    donor listing owned by this browser (via X-Owner-Token) for blood
    group + location — the same "ownership" mechanism used everywhere
    else now that there are no accounts.
    """
    client = get_service_client()
    donor_result = client.table("donors").select("*").eq("owner_token", owner_token).execute()
    if not donor_result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Register as a donor first (in this browser) to see nearby requests")

    donor = donor_result.data[0]

    # Which recipient blood groups can this donor safely give to?
    compatible_recipient_groups = [
        recipient_group
        for recipient_group in [bg.value for bg in BloodGroup]
        if donor["blood_group"] in compatible_donor_groups(recipient_group)
    ]

    requests_result = (
        client.table("blood_requests")
        .select("*")
        .eq("status", "pending")
        .in_("blood_group", compatible_recipient_groups)
        .execute()
    )

    return attach_distance_and_sort(requests_result.data, donor["latitude"], donor["longitude"], radius_km)
