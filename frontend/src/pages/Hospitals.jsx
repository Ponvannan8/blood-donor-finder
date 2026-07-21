import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import MapView from "../components/MapView";

export default function Hospitals() {
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState({ latitude: "", longitude: "" });
  const [locating, setLocating] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listHospitals({
        city: city || undefined,
        latitude: coords.latitude || undefined,
        longitude: coords.longitude || undefined,
      });
      setHospitals(data);
    } catch (err) {
      setError(err.message || "Could not load hospitals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseLocation = () => {
    if (!("geolocation" in navigator)) return setError("Your browser doesn't support location access.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) });
        setLocating(false);
      },
      () => {
        setError("Could not get your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const mapCenter = coords.latitude
    ? [parseFloat(coords.latitude), parseFloat(coords.longitude)]
    : hospitals[0]?.latitude != null
    ? [hospitals[0].latitude, hospitals[0].longitude]
    : null;

  const mapMarkers = [
    ...(coords.latitude ? [{ id: "you", lat: parseFloat(coords.latitude), lng: parseFloat(coords.longitude), icon: "you", popup: "You" }] : []),
    ...hospitals
      .filter((h) => h.latitude != null && h.longitude != null)
      .map((h) => ({
        id: h.hospital_id,
        lat: h.latitude,
        lng: h.longitude,
        icon: "hospital",
        popup: `${h.name}${h.distance_km != null ? ` · ${h.distance_km} km` : ""}`,
      })),
  ];

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content" style={{ maxWidth: 1000 }}>
        <div className="page-header">
          <h1>Hospitals</h1>
          <Link to="/dashboard" className="link-back">
            ← Back to dashboard
          </Link>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ranipet" />
          </div>
          <button type="button" className="btn-secondary" style={{ width: "auto" }} onClick={handleUseLocation} disabled={locating}>
            {locating ? "Locating…" : coords.latitude ? "📍 Location set" : "📍 Near me"}
          </button>
          <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {loading ? (
          <p>Loading…</p>
        ) : hospitals.length === 0 ? (
          <div className="empty-state card">No hospitals match your search.</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <MapView center={mapCenter} markers={mapMarkers} height={380} />
            </div>
            {hospitals.map((h) => (
              <div className="facility-card" key={h.hospital_id}>
                <div className="facility-card-top">
                  <div>
                    <div className="facility-card-title">{h.name}</div>
                    <div className="facility-card-meta">
                      {h.address}
                      <br />
                      {h.city} · Emergency: <span className="mono">{h.emergency_contact}</span>
                    </div>
                  </div>
                  {h.distance_km != null && <div className="donor-result-distance mono">{h.distance_km} km</div>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
