from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


class BloodGroup(str, Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"


class DonorCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=6, max_length=20)
    blood_group: BloodGroup
    city: str = Field(..., min_length=2, max_length=80)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    last_donation_date: date | None = None
    availability: bool = True


class DonorUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    phone: str | None = Field(None, min_length=6, max_length=20)
    blood_group: BloodGroup | None = None
    city: str | None = Field(None, min_length=2, max_length=80)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    last_donation_date: date | None = None
    availability: bool | None = None


class DonorOut(BaseModel):
    donor_id: str
    name: str
    phone: str
    blood_group: BloodGroup
    city: str
    latitude: float
    longitude: float
    last_donation_date: date | None
    availability: bool
    created_at: datetime
    updated_at: datetime
