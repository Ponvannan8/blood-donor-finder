from pydantic import BaseModel, Field

from app.schemas.request import RequestOut


class AdminRequestOut(RequestOut):
    """Requester name/phone already live on the request itself now (no
    accounts to join against), so this is currently identical to RequestOut
    — kept as its own type in case admin-only fields are added later."""
    pass


class RequestsOverTimePoint(BaseModel):
    date: str
    count: int


class AdminStatsOut(BaseModel):
    donors_by_blood_group: dict[str, int]
    requests_by_status: dict[str, int]
    requests_over_time: list[RequestsOverTimePoint] = Field(
        description="New requests created per day, most recent 30 days"
    )
    fulfilled_over_time: list[RequestsOverTimePoint] = Field(
        description="Requests marked fulfilled per day, most recent 30 days — the closest proxy this app "
        "has to an actual 'donation completed' event, since a dedicated donation log isn't tracked yet."
    )
    total_donors: int
    total_blood_banks: int
    total_hospitals: int
    total_requests: int
    open_requests: int
