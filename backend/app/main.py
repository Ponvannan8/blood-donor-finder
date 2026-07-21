from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import admin, blood_banks, chat, donor, hospitals, predictions, requests, search

settings = get_settings()

app = FastAPI(
    title="Blood Donor Finder API",
    description=(
        "Open, no-account blood donor platform. Donor/request 'ownership' is a client-held "
        "owner-token; admin access is a shared passcode. Phase 2: Requests & Matching · "
        "Phase 3: Blood Banks & Hospitals · Phase 4: Maps · Phase 5: Admin Panel · "
        "Phase 6: Demand/Availability Prediction · Phase 7: Chatbot"
    ),
    version="1.0.0-no-auth",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(donor.router)
app.include_router(requests.router)
app.include_router(search.router)
app.include_router(blood_banks.router)
app.include_router(hospitals.router)
app.include_router(admin.router)
app.include_router(predictions.router)
app.include_router(chat.router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "env": settings.ENV}
