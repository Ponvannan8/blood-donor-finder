import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CRIMSON = "#c81e3a";
const TEAL = "#0e7c7b";

export default function Predictions() {
  const [bloodGroup, setBloodGroup] = useState("");
  const [city, setCity] = useState("");
  const [demand, setDemand] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [demandData, availabilityData] = await Promise.all([
        api.getDemandForecast({ blood_group: bloodGroup || undefined, city: city || undefined, days: 7 }),
        api.getDonorAvailabilityForecast({ blood_group: bloodGroup || undefined, city: city || undefined, days: 30 }),
      ]);
      setDemand(demandData);
      setAvailability(availabilityData);
    } catch (err) {
      setError(err.message || "Could not load forecasts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const demandChartData =
    demand?.points.map((p) => ({ date: p.date.slice(5), predicted: p.predicted_requests })) ?? [];

  const availabilityChartData =
    availability?.points.map((p) => ({
      date: p.date.slice(5),
      newlyEligible: p.newly_eligible,
      cumulative: p.cumulative_available_estimate,
    })) ?? [];

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content" style={{ maxWidth: 1000 }}>
        <div className="page-header">
          <h1>Predictions</h1>
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
            <label htmlFor="blood_group">Blood group</label>
            <select id="blood_group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
              <option value="">All</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ranipet" />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={loading}>
            {loading ? "Loading…" : "Update forecasts"}
          </button>
        </form>

        {demand && (
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 16 }}>Blood demand — next 7 days</h2>
              <span className={`badge ${demand.confidence === "model" ? "badge-available" : "badge-unavailable"}`}>
                <span className="badge-dot" />
                {demand.confidence === "model" ? "Scikit-learn model" : "Low data — showing average"}
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>
              {demand.confidence === "model"
                ? `Linear regression fit on ${demand.distinct_days_used} days of history (${demand.samples_used} requests), in-sample R² = ${demand.r2_in_sample}. Day-of-week seasonality included.`
                : `Only ${demand.samples_used} historical request(s) across ${demand.distinct_days_used} day(s) — not enough to fit a trend yet, so this shows the flat historical average instead of a real model prediction.`}
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={demandChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="predicted" name="Predicted requests" fill={CRIMSON} radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {availability && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header">
              <h2 style={{ fontSize: 16 }}>Donor availability — next 30 days</h2>
              <span className="stat-box-value mono" style={{ fontSize: 14 }}>
                {availability.current_available} available now
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>{availability.note}</p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={availabilityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="newlyEligible" name="Newly eligible that day" fill="#e8a33d" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="cumulative" name="Est. available pool" stroke={TEAL} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
