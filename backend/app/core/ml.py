"""
Phase 6 prediction logic.

Two distinct things live here, and it's important not to blur them:

1. `forecast_demand` — a genuine Scikit-learn model (LinearRegression on a
   day-index trend + day-of-week seasonality). This is only meaningful once
   there's enough historical request data to learn a pattern from; with a
   freshly-deployed app there usually isn't, so below MIN_SAMPLES/MIN_DAYS
   this honestly falls back to a flat historical-average heuristic instead
   of dressing up a guess as a trained model. The `confidence` field in the
   response tells the frontend (and the person reading it) which mode
   produced the numbers.

2. `forecast_donor_availability` — deliberately NOT framed as machine
   learning. Whether a donor becomes eligible again is fully determined by
   the 90-day cooldown rule (last_donation_date + 90 days), so this is a
   rule-based projection, not a prediction with any real uncertainty to
   model. Calling this "AI" would be overclaiming for something that's
   just date arithmetic — the schema and API docs say so explicitly.
"""
from collections import Counter
from datetime import date, datetime, timedelta, timezone

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

MIN_DISTINCT_DAYS = 10
MIN_SAMPLES = 10
DONOR_ELIGIBILITY_COOLDOWN_DAYS = 90


def _parse_date(value: str) -> date:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def _daily_counts(rows: list[dict], date_field: str) -> dict[date, int]:
    counts: Counter = Counter()
    for r in rows:
        if r.get(date_field):
            counts[_parse_date(r[date_field])] += 1
    return dict(counts)


def _weekday_onehot(d: date) -> list[int]:
    """6 columns for Mon..Sat; Sunday is the implicit baseline (dropped to avoid collinearity)."""
    vec = [0] * 6
    if d.weekday() < 6:
        vec[d.weekday()] = 1
    return vec


def forecast_demand(request_rows: list[dict], future_days: int = 7) -> dict:
    counts_by_day = _daily_counts(request_rows, "created_at")
    total_samples = len(request_rows)
    distinct_days = len(counts_by_day)

    today = datetime.now(timezone.utc).date()

    if distinct_days < MIN_DISTINCT_DAYS or total_samples < MIN_SAMPLES:
        # Not enough history to learn a trend — use the plain historical
        # average per day instead of pretending a model fit means anything.
        avg = (total_samples / distinct_days) if distinct_days else 0.0
        points = [
            {"date": (today + timedelta(days=i + 1)).isoformat(), "predicted_requests": round(avg, 2)}
            for i in range(future_days)
        ]
        return {
            "points": points,
            "confidence": "low_data",
            "samples_used": total_samples,
            "distinct_days_used": distinct_days,
            "r2_in_sample": None,
        }

    min_day = min(counts_by_day)
    max_day = max(counts_by_day)
    span_days = (max_day - min_day).days + 1

    X, y = [], []
    for i in range(span_days):
        d = min_day + timedelta(days=i)
        X.append([i, *_weekday_onehot(d)])
        y.append(counts_by_day.get(d, 0))

    X = np.array(X)
    y = np.array(y)

    model = LinearRegression()
    model.fit(X, y)
    in_sample_r2 = r2_score(y, model.predict(X))

    future_X = []
    for i in range(future_days):
        d = today + timedelta(days=i + 1)
        day_index = (d - min_day).days
        future_X.append([day_index, *_weekday_onehot(d)])

    predictions = np.clip(model.predict(np.array(future_X)), 0, None)

    points = [
        {"date": (today + timedelta(days=i + 1)).isoformat(), "predicted_requests": round(float(p), 2)}
        for i, p in enumerate(predictions)
    ]

    return {
        "points": points,
        "confidence": "model",
        "samples_used": total_samples,
        "distinct_days_used": distinct_days,
        "r2_in_sample": round(float(in_sample_r2), 3),
    }


def forecast_donor_availability(donor_rows: list[dict], future_days: int = 30) -> dict:
    today = datetime.now(timezone.utc).date()

    currently_available = sum(1 for d in donor_rows if d.get("availability"))

    newly_eligible_by_day: Counter = Counter()
    for d in donor_rows:
        if d.get("availability"):
            continue  # already available, not "becoming" eligible
        last_donation = d.get("last_donation_date")
        if not last_donation:
            continue  # no donation on record but marked unavailable — a manual choice, not cooldown-driven
        eligible_on = _parse_date(last_donation) + timedelta(days=DONOR_ELIGIBILITY_COOLDOWN_DAYS)
        delta = (eligible_on - today).days
        if 1 <= delta <= future_days:
            newly_eligible_by_day[eligible_on] += 1

    points = []
    running_total = currently_available
    for i in range(future_days):
        d = today + timedelta(days=i + 1)
        newly_eligible = newly_eligible_by_day.get(d, 0)
        running_total += newly_eligible
        points.append(
            {
                "date": d.isoformat(),
                "newly_eligible": newly_eligible,
                "cumulative_available_estimate": running_total,
            }
        )

    return {"points": points, "current_available": currently_available}
