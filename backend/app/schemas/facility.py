from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.donor import BloodGroup


class BloodBankCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    address: str = Field(..., min_length=5, max_length=300)
    contact_number: str = Field(..., min_length=6, max_length=20)
    city: str = Field(..., min_length=2, max_length=80)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    available_blood_groups: list[BloodGroup] = Field(default_factory=list)


class BloodBankUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=160)
    address: str | None = Field(None, min_length=5, max_length=300)
    contact_number: str | None = Field(None, min_length=6, max_length=20)
    city: str | None = Field(None, min_length=2, max_length=80)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    available_blood_groups: list[BloodGroup] | None = None


class BloodBankOut(BaseModel):
    bank_id: str
    name: str
    address: str
    contact_number: str
    city: str
    latitude: float | None
    longitude: float | None
    available_blood_groups: list[BloodGroup]
    created_at: datetime
    updated_at: datetime
    distance_km: float | None = None


class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    address: str = Field(..., min_length=5, max_length=300)
    emergency_contact: str = Field(..., min_length=6, max_length=20)
    city: str = Field(..., min_length=2, max_length=80)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)


class HospitalUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=160)
    address: str | None = Field(None, min_length=5, max_length=300)
    emergency_contact: str | None = Field(None, min_length=6, max_length=20)
    city: str | None = Field(None, min_length=2, max_length=80)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)


class HospitalOut(BaseModel):
    hospital_id: str
    name: str
    address: str
    emergency_contact: str
    city: str
    latitude: float | None
    longitude: float | None
    created_at: datetime
    updated_at: datetime
    distance_km: float | None = None
