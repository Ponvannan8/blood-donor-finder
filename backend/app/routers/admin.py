from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import require_admin
from app.core.supabase_client import get_service_client
from app.schemas.admin import AdminRequestOut, AdminStatsOut, RequestsOverTimePoint
from app.schemas.request import RequestOut, RequestStatusUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

STATS_WINDOW_DAYS = 30


@router.get("/requests", response_model=list[AdminRequestOut])
def list_all_requests(
    status_filter: str | None = Query(None, alias="status"),
    blood_group: str | None = Query(None),
    city: str | None = Query(None),
):
    query = get_service_client().table("blood_requests").select("*")
    if status_filter:
        query = query.eq("status", status_filter)
    if blood_group:
        query = query.eq("blood_group", blood_group)
    if city:
        query = query.ilike("city", f"%{city}%")

    return query.order("created_at", desc=True).execute().data


@router.patch("/requests/{request_id}/status", response_model=RequestOut)
def admin_update_request_status(request_id: str, payload: RequestStatusUpdate):
    """Lets an admin override any request's status, regardless of who created it."""
    client = get_service_client()
    existing = client.table("blood_requests").select("request_id").eq("request_id", request_id).execute()
    if not existing.data:
        raise HTTPException(404, "Request not found")

    result = (
        client.table("blood_requests")
        .update({"status": payload.status.value})
        .eq("request_id", request_id)
        .execute()
    )
    return result.data[0]


@router.get("/stats", response_model=AdminStatsOut)
def get_stats():
    client = get_service_client()

    donors = client.table("donors").select("blood_group").execute().data
    requests_rows = client.table("blood_requests").select("status, created_at, updated_at").execute().data
    blood_banks_count = len(client.table("blood_banks").select("bank_id").execute().data)
    hospitals_count = len(client.table("hospitals").select("hospital_id").execute().data)

    donors_by_blood_group = Counter(d["blood_group"] for d in donors)
    requests_by_status = Counter(r["status"] for r in requests_rows)

    cutoff = datetime.now(timezone.utc) - timedelta(days=STATS_WINDOW_DAYS)

    created_per_day: dict[str, int] = defaultdict(int)
    fulfilled_per_day: dict[str, int] = defaultdict(int)

    for r in requests_rows:
        created_at = _parse_ts(r["created_at"])
        if created_at and created_at >= cutoff:
            created_per_day[created_at.date().isoformat()] += 1

        if r["status"] == "fulfilled":
            updated_at = _parse_ts(r["updated_at"])
            if updated_at and updated_at >= cutoff:
                fulfilled_per_day[updated_at.date().isoformat()] += 1

    requests_over_time = _fill_date_range(created_per_day, STATS_WINDOW_DAYS)
    fulfilled_over_time = _fill_date_range(fulfilled_per_day, STATS_WINDOW_DAYS)

    return AdminStatsOut(
        donors_by_blood_group=dict(donors_by_blood_group),
        requests_by_status=dict(requests_by_status),
        requests_over_time=requests_over_time,
        fulfilled_over_time=fulfilled_over_time,
        total_donors=len(donors),
        total_blood_banks=blood_banks_count,
        total_hospitals=hospitals_count,
        total_requests=len(requests_rows),
        open_requests=requests_by_status.get("pending", 0) + requests_by_status.get("matched", 0),
    )


def _parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _fill_date_range(counts: dict[str, int], days: int) -> list[RequestsOverTimePoint]:
    today = datetime.now(timezone.utc).date()
    points = []
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        points.append(RequestsOverTimePoint(date=d, count=counts.get(d, 0)))
    return points
