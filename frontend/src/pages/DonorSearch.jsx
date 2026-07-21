import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import DonorResultCard from "../components/DonorResultCard";
import MapView from "../components/MapView";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function DonorSearch() {
  const [bloodGroup, setBloodGroup] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [coords, setCoords] = useState({ latitude: "", longitude: "" });
  const [locating, setLocating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUseLocation = () => {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location access.");
      return;
    }
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

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    if (!bloodGroup) return setError("Select a blood group.");

    setLoading(true);
    try {
      const data = await api.searchDonors({
        blood_group: bloodGroup,
        latitude: coords.latitude || undefined,
        longitude: coords.longitude || undefined,
        radius_km: radiusKm,
      });
      setResults(data);
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content" style={{ maxWidth: 1000 }}>
        <div className="page-header">
          <h1>Search donors</h1>
          <Link to="/dashboard" className="link-back">
            ← Back to dashboard
          </Link>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <form className="search-form" onSubmit={handleSearch}>
          <div className="field">
            <label htmlFor="blood_group">Blood group needed</label>
            <select id="blood_group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
              <option value="" disabled>
                Select
              </option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="radius">Radius (km)</label>
            <input id="radius" type="number" min={1} max={500} value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
          </div>

          <button type="button" className="btn-secondary" style={{ width: "auto" }} onClick={handleUseLocation} disabled={locating}>
            {locating ? "Locating…" : coords.latitude ? "📍 Location set" : "📍 Use my location"}
          </button>

          <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {results !== null && (
          <div style={{ marginBottom: 20 }}>
            <MapView
              center={coords.latitude ? [parseFloat(coords.latitude), parseFloat(coords.longitude)] : results[0] ? [results[0].latitude, results[0].longitude] : null}
              markers={[
                ...(coords.latitude ? [{ id: "you", lat: parseFloat(coords.latitude), lng: parseFloat(coords.longitude), icon: "you", popup: "You" }] : []),
                ...results.map((d) => ({
                  id: d.donor_id,
                  lat: d.latitude,
                  lng: d.longitude,
                  icon: d.availability ? "donor" : "donorUnavailable",
                  popup: `${d.username} · ${d.blood_group}${d.distance_km != null ? ` · ${d.distance_km} km` : ""}`,
                })),
              ]}
              radiusKm={coords.latitude ? parseFloat(radiusKm) : undefined}
              height={380}
            />
          </div>
        )}

        {results !== null &&
          (results.length === 0 ? (
            <div className="empty-state card">No compatible, available donors found. Try widening the radius.</div>
          ) : (
            results.map((d) => <DonorResultCard donor={d} key={d.donor_id} />)
          ))}
      </div>
    </div>
  );
}
