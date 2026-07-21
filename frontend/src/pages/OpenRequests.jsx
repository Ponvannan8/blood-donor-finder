import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import MapView from "../components/MapView";

export default function OpenRequests() {
  const [requests, setRequests] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (radius) => {
    setLoading(true);
    setError("");
    try {
      const [data, donorProfile] = await Promise.all([
        api.openRequestsForDonor({ radius_km: radius }),
        api.getMyDonorListing(),
      ]);
      setRequests(data);
      setMyLocation([donorProfile.latitude, donorProfile.longitude]);
    } catch (err) {
      setError(err.message || "Could not load nearby requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(radiusKm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapMarkers = [
    ...(myLocation ? [{ id: "you", lat: myLocation[0], lng: myLocation[1], icon: "you", popup: "You" }] : []),
    ...requests.map((r) => ({
      id: r.request_id,
      lat: r.latitude,
      lng: r.longitude,
      icon: "request",
      popup: `${r.patient_name} · ${r.blood_group} · ${r.hospital_name}`,
    })),
  ];

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content" style={{ maxWidth: 1000 }}>
        <div className="page-header">
          <h1>Requests near you</h1>
          <Link to="/dashboard" className="link-back">
            ← Back to dashboard
          </Link>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>
          Patients whose blood group your donation is compatible with, sorted by distance.
        </p>

        {error && <div className="banner banner-error">{error}</div>}

        <div className="search-form">
          <div className="field">
            <label htmlFor="radius">Search radius (km)</label>
            <input id="radius" type="number" min={1} max={500} value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
          </div>
          <button className="btn-primary" style={{ width: "auto" }} onClick={() => load(radiusKm)}>
            Update
          </button>
        </div>

        {myLocation && (
          <div style={{ marginBottom: 20 }}>
            <MapView center={myLocation} markers={mapMarkers} radiusKm={parseFloat(radiusKm)} height={380} />
          </div>
        )}

        {loading ? (
          <p>Loading…</p>
        ) : requests.length === 0 ? (
          <div className="empty-state card">No open requests match your blood group nearby right now.</div>
        ) : (
          requests.map((r) => (
            <div className="request-card" key={r.request_id}>
              <div className="request-card-top">
                <div>
                  <div className="request-card-title">
                    {r.patient_name} · <span className="mono">{r.blood_group}</span> · {r.units_required} unit
                    {r.units_required > 1 ? "s" : ""}
                  </div>
                  <div className="request-card-meta">
                    {r.hospital_name}, {r.city}
                    {r.distance_km != null ? ` · ${r.distance_km} km away` : ""}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
