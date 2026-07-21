from fastapi import APIRouter, Query

from app.core.ml import forecast_demand, forecast_donor_availability
from app.core.supabase_client import get_service_client
from app.schemas.donor import BloodGroup
from app.schemas.prediction import AvailabilityForecastOut, DemandForecastOut

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/demand", response_model=DemandForecastOut)
def get_demand_forecast(
    blood_group: BloodGroup | None = Query(None),
    city: str | None = Query(None),
    days: int = Query(7, ge=1, le=30),
):
    query = get_service_client().table("blood_requests").select("created_at")
    if blood_group:
        query = query.eq("blood_group", blood_group.value)
    if city:
        query = query.ilike("city", f"%{city}%")

    rows = query.execute().data
    result = forecast_demand(rows, future_days=days)
    result["blood_group"] = blood_group.value if blood_group else None
    result["city"] = city
    return result


@router.get("/donor-availability", response_model=AvailabilityForecastOut)
def get_donor_availability_forecast(
    blood_group: BloodGroup | None = Query(None),
    city: str | None = Query(None),
    days: int = Query(30, ge=1, le=90),
):
    query = get_service_client().table("donors").select("availability, last_donation_date")
    if blood_group:
        query = query.eq("blood_group", blood_group.value)
    if city:
        query = query.ilike("city", f"%{city}%")

    rows = query.execute().data
    result = forecast_donor_availability(rows, future_days=days)
    result["blood_group"] = blood_group.value if blood_group else None
    result["city"] = city
    return result
