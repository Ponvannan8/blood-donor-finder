import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";

const CRIMSON = "#c81e3a";
const TEAL = "#0e7c7b";
const AMBER = "#e8a33d";
const INK = "#14181f";

function toChartData(obj, order) {
  const keys = order || Object.keys(obj);
  return keys.map((k) => ({ name: k, value: obj[k] || 0 }));
}

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .adminGetStats()
      .then(setStats)
      .catch((err) => setError(err.message || "Could not load stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-shell">
        <Navbar />
        <div className="dashboard-content">Loading…</div>
      </div>
    );
  }

  const donorsByGroup = stats
    ? toChartData(stats.donors_by_blood_group, ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    : [];
  const requestsByStatus = stats
    ? toChartData(stats.requests_by_status, ["pending", "matched", "fulfilled", "cancelled"])
    : [];

  const trendData =
    stats?.requests_over_time.map((point, i) => ({
      date: point.date.slice(5), // MM-DD
      requests: point.count,
      fulfilled: stats.fulfilled_over_time[i]?.count ?? 0,
    })) ?? [];

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content" style={{ maxWidth: 1000 }}>
        <div className="page-header">
          <h1>Analytics</h1>
          <Link to="/dashboard" className="link-back">
            ← Back to dashboard
          </Link>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        {stats && (
          <>
            <div className="stat-row" style={{ marginTop: 0, marginBottom: 24 }}>
              <div className="stat-box">
                <div className="stat-box-label">Total donors</div>
                <div className="stat-box-value">{stats.total_donors}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Blood banks</div>
                <div className="stat-box-value">{stats.total_blood_banks}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Hospitals</div>
                <div className="stat-box-value">{stats.total_hospitals}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Total requests</div>
                <div className="stat-box-value">{stats.total_requests}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Open requests</div>
                <div className="stat-box-value">{stats.open_requests}</div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: 16, marginBottom: 4 }}>Requests over time</h2>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>
                Last 30 days — new requests raised vs. marked fulfilled (the closest proxy this app has to a
                completed donation, since donations aren't logged separately yet).
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="requests" name="Requests raised" stroke={CRIMSON} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="fulfilled" name="Fulfilled" stroke={TEAL} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Requests by status</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={requestsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={AMBER} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Donors by blood group</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={donorsByGroup}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={CRIMSON} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
