import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUSES = ["pending", "matched", "fulfilled", "cancelled"];

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.adminListRequests({
        status: status || undefined,
        blood_group: bloodGroup || undefined,
        city: city || undefined,
      });
      setRequests(data);
    } catch (err) {
      setError(err.message || "Could not load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (requestId, newStatus) => {
    setBusyId(requestId);
    setError("");
    try {
      await api.adminUpdateRequestStatus(requestId, newStatus);
      await load();
    } catch (err) {
      setError(err.message || "Could not update status.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content" style={{ maxWidth: 900 }}>
        <div className="page-header">
          <h1>Manage requests</h1>
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
            <label htmlFor="status">Status</label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
            <input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "auto" }}>
            Filter
          </button>
        </form>

        {loading ? (
          <p>Loading…</p>
        ) : requests.length === 0 ? (
          <div className="empty-state card">No requests match your filters.</div>
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
                    {r.hospital_name}, {r.city} · raised by {r.requester_name} ({r.requester_phone}) on{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="request-card-actions">
                {STATUSES.filter((s) => s !== r.status).map((s) => (
                  <button
                    key={s}
                    className="btn-small"
                    onClick={() => handleStatusChange(r.request_id, s)}
                    disabled={busyId === r.request_id}
                  >
                    Mark {s}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
