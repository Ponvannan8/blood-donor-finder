"""
Blood-group compatibility and geo-distance helpers used by the search/
matching endpoints. Kept dependency-free (no PostGIS/earthdistance
extension required) since donor/request volumes here are small enough
that filtering + sorting in Python is simple and fast enough.
"""
import math

# For a recipient who needs blood group X, this lists which donor blood
# groups are safe to transfuse into them (standard ABO/Rh compatibility).
COMPATIBLE_DONORS_FOR_RECIPIENT: dict[str, list[str]] = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],  # universal recipient
}


def compatible_donor_groups(recipient_blood_group: str) -> list[str]:
    return COMPATIBLE_DONORS_FOR_RECIPIENT.get(recipient_blood_group, [recipient_blood_group])


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lon points, in kilometres."""
    r = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def attach_distance_and_sort(
    rows: list[dict], lat: float | None, lon: float | None, radius_km: float, max_results: int = 50
) -> list[dict]:
    """
    Adds distance_km to each row (if a reference point is given and the row
    has coordinates), filters by radius, and sorts nearest-first. Rows
    without coordinates of their own are dropped from a distance-based
    search but rows are simply returned unsorted (capped) if no reference
    point was given at all.
    """
    if lat is None or lon is None:
        return rows[:max_results]

    enriched = []
    for row in rows:
        if row.get("latitude") is None or row.get("longitude") is None:
            continue
        dist = haversine_km(lat, lon, row["latitude"], row["longitude"])
        if dist <= radius_km:
            enriched.append({**row, "distance_km": round(dist, 2)})

    enriched.sort(key=lambda r: r["distance_km"])
    return enriched[:max_results]
