import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import DonorResultCard from "../components/DonorResultCard";
import MapView from "../components/MapView";

export default function RequestMatches() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [donors, setDonors] = useState([]);
  const [radiusKm, setRadiusKm] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (radius) => {
    setLoading(true);
    setError("");
    try {
      const [req, matches] = await Promise.all([
        api.getRequest(requestId),
        api.matchDonorsForRequest(requestId, { radius_km: radius }),
      ]);
      setRequest(req);
      setDonors(matches);
    } catch (err) {
      setError(err.message || "Could not load matches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(radiusKm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const mapMarkers = [
    ...(request
      ? [
          {
            id: "request",
            lat: request.latitude,
            lng: request.longitude,
            icon: "request",
            popup: `${request.patient_name} — ${request.hospital_name}`,
          },
        ]
      : []),
    ...donors.map((d) => ({
      id: d.donor_id,
      lat: d.latitude,
      lng: d.longitude,
      icon: d.availability ? "donor" : "donorUnavailable",
      popup: `${d.username} · ${d.blood_group}${d.distance_km != null ? ` · ${d.distance_km} km` : ""}`,
    })),
  ];

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content" style={{ maxWidth: 1000 }}>
        <div className="page-header">
          <h1>Matching donors</h1>
          <Link to="/requests/mine" className="link-back">
            ← My requests
          </Link>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        {request && (
          <div className="card">
            <div className="card-header">
              <h2>
                {request.patient_name} needs <span className="mono">{request.blood_group}</span>
              </h2>
              <StatusBadge status={request.status} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {request.units_required} unit{request.units_required > 1 ? "s" : ""} · {request.hospital_name}, {request.city}
            </p>
          </div>
        )}

        <div className="search-form">
          <div className="field">
            <label htmlFor="radius">Search radius (km)</label>
            <input
              id="radius"
              type="number"
              min={1}
              max={500}
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
            />
          </div>
          <button className="btn-primary" style={{ width: "auto" }} onClick={() => load(radiusKm)}>
            Update search
          </button>
        </div>

        {request && (
          <div style={{ marginBottom: 20 }}>
            <MapView
              center={[request.latitude, request.longitude]}
              markers={mapMarkers}
              radiusKm={parseFloat(radiusKm)}
              height={380}
            />
          </div>
        )}

        {loading ? (
          <p>Searching…</p>
        ) : donors.length === 0 ? (
          <div className="empty-state card">
            No compatible, available donors found within {radiusKm} km yet. Try widening the radius.
          </div>
        ) : (
          donors.map((d) => <DonorResultCard donor={d} key={d.donor_id} />)
        )}
      </div>
    </div>
  );
}
