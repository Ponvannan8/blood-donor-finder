import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listMyRequests();
      setRequests(data);
    } catch (err) {
      setError(err.message || "Could not load your requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (id) => {
    setBusyId(id);
    try {
      await api.cancelRequest(id);
      await load();
    } catch (err) {
      setError(err.message || "Could not cancel the request.");
    } finally {
      setBusyId(null);
    }
  };

  const handleFulfill = async (id) => {
    setBusyId(id);
    try {
      await api.updateRequestStatus(id, "fulfilled");
      await load();
    } catch (err) {
      setError(err.message || "Could not update the request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content">
        <div className="page-header">
          <h1>My requests</h1>
          <Link to="/requests/new" className="link-back">
            + New request
          </Link>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        {loading ? (
          <p>Loading…</p>
        ) : requests.length === 0 ? (
          <div className="empty-state card">
            You haven't raised any blood requests yet.
            <br />
            <Link to="/requests/new">Create your first request →</Link>
          </div>
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
                    {r.hospital_name}, {r.city} · raised {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {(r.status === "pending" || r.status === "matched") && (
                <div className="request-card-actions">
                  <Link className="btn-small" to={`/requests/${r.request_id}/matches`}>
                    View matching donors
                  </Link>
                  <button className="btn-small" onClick={() => handleFulfill(r.request_id)} disabled={busyId === r.request_id}>
                    Mark fulfilled
                  </button>
                  <button
                    className="btn-small btn-small-danger"
                    onClick={() => handleCancel(r.request_id)}
                    disabled={busyId === r.request_id}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
