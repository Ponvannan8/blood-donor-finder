import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import MapView from "../components/MapView";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function BloodBanks() {
  const [city, setCity] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [coords, setCoords] = useState({ latitude: "", longitude: "" });
  const [locating, setLocating] = useState(false);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listBloodBanks({
        city: city || undefined,
        blood_group: bloodGroup || undefined,
        latitude: coords.latitude || undefined,
        longitude: coords.longitude || undefined,
      });
      setBanks(data);
    } catch (err) {
      setError(err.message || "Could not load blood banks.");
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

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content" style={{ maxWidth: 1000 }}>
        <div className="page-header">
          <h1>Blood banks</h1>
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
            <input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Vellore" />
          </div>
          <div className="field">
            <label htmlFor="blood_group">Blood group in stock</label>
            <select id="blood_group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
              <option value="">Any</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
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
        ) : banks.length === 0 ? (
          <div className="empty-state card">No blood banks match your search.</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <MapView
                center={
                  coords.latitude
                    ? [parseFloat(coords.latitude), parseFloat(coords.longitude)]
                    : banks[0].latitude != null
                    ? [banks[0].latitude, banks[0].longitude]
                    : null
                }
                markers={[
                  ...(coords.latitude ? [{ id: "you", lat: parseFloat(coords.latitude), lng: parseFloat(coords.longitude), icon: "you", popup: "You" }] : []),
                  ...banks
                    .filter((b) => b.latitude != null && b.longitude != null)
                    .map((b) => ({
                      id: b.bank_id,
                      lat: b.latitude,
                      lng: b.longitude,
                      icon: "bloodBank",
                      popup: `${b.name}${b.distance_km != null ? ` · ${b.distance_km} km` : ""}`,
                    })),
                ]}
                height={380}
              />
            </div>
            {banks.map((b) => (
            <div className="facility-card" key={b.bank_id}>
              <div className="facility-card-top">
                <div>
                  <div className="facility-card-title">{b.name}</div>
                  <div className="facility-card-meta">
                    {b.address}
                    <br />
                    {b.city} · {b.contact_number}
                  </div>
                </div>
                {b.distance_km != null && <div className="donor-result-distance mono">{b.distance_km} km</div>}
              </div>
              <div className="chip-row">
                {b.available_blood_groups.length === 0 ? (
                  <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>No stock listed</span>
                ) : (
                  b.available_blood_groups.map((bg) => (
                    <span className="chip" key={bg}>
                      {bg}
                    </span>
                  ))
                )}
              </div>
            </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
