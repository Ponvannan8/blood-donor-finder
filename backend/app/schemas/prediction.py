from enum import Enum

from pydantic import BaseModel, Field


class ForecastConfidence(str, Enum):
    model = "model"
    low_data = "low_data"


class DemandForecastPoint(BaseModel):
    date: str
    predicted_requests: float


class DemandForecastOut(BaseModel):
    points: list[DemandForecastPoint]
    confidence: ForecastConfidence = Field(
        description="'model' = fit with scikit-learn LinearRegression on day-index + weekday features. "
        "'low_data' = not enough history yet, showing the flat historical average instead."
    )
    samples_used: int
    distinct_days_used: int
    r2_in_sample: float | None = Field(None, description="In-sample R²; only present when confidence='model'.")
    blood_group: str | None = None
    city: str | None = None


class AvailabilityForecastPoint(BaseModel):
    date: str
    newly_eligible: int
    cumulative_available_estimate: int


class AvailabilityForecastOut(BaseModel):
    points: list[AvailabilityForecastPoint]
    current_available: int
    blood_group: str | None = None
    city: str | None = None
    note: str = (
        "Rule-based projection (last_donation_date + 90-day cooldown), not a machine-learning prediction — "
        "eligibility timing is fully determined by that rule, so there's no learned uncertainty to model."
    )
