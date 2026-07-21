from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.donor import BloodGroup


class RequestStatus(str, Enum):
    pending = "pending"
    matched = "matched"
    fulfilled = "fulfilled"
    cancelled = "cancelled"


class RequestCreate(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=120)
    blood_group: BloodGroup
    units_required: int = Field(..., gt=0, le=20)
    hospital_name: str = Field(..., min_length=2, max_length=160)
    city: str = Field(..., min_length=2, max_length=80)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    notes: str | None = Field(None, max_length=500)
    requester_name: str = Field(..., min_length=2, max_length=120)
    requester_phone: str = Field(..., min_length=6, max_length=20)


class RequestStatusUpdate(BaseModel):
    status: RequestStatus


class RequestOut(BaseModel):
    request_id: str
    patient_name: str
    blood_group: BloodGroup
    units_required: int
    hospital_name: str
    city: str
    latitude: float
    longitude: float
    status: RequestStatus
    notes: str | None
    requester_name: str
    requester_phone: str
    created_at: datetime
    updated_at: datetime


class DonorMatch(BaseModel):
    """A donor returned by a search or match query, with computed distance."""
    donor_id: str
    name: str
    phone: str
    blood_group: BloodGroup
    city: str
    latitude: float
    longitude: float
    last_donation_date: str | None
    availability: bool
    eligible_to_donate: bool
    distance_km: float | None = None


class OpenRequestMatch(BaseModel):
    """A request returned when browsing open requests near a location."""
    request_id: str
    patient_name: str
    blood_group: BloodGroup
    units_required: int
    hospital_name: str
    city: str
    latitude: float
    longitude: float
    status: RequestStatus
    created_at: datetime
    distance_km: float | None = None
