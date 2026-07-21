import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import PulseDivider from "../components/PulseDivider";

export default function Dashboard() {
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    api
      .getMyDonorListing()
      .then(setDonor)
      .catch(() => setDonor(null)) // no listing for this browser yet — perfectly normal
      .finally(() => setLoading(false));
  }, []);

  const toggleAvailability = async () => {
    if (!donor) return;
    setToggling(true);
    try {
      const updated = await api.updateMyDonorListing({ availability: !donor.availability });
      setDonor(updated);
    } catch (err) {
      setError(err.message || "Could not update availability.");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content">
        {error && <div className="banner banner-error">{error}</div>}

        <div className="card">
          <h2 style={{ marginBottom: 6 }}>Find or become a blood donor</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            No account needed — register as a donor, raise a blood request, or search nearby donors right away.
          </p>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : donor ? (
          <div className="card">
            <div className="card-header">
              <h2>Your donor listing (this browser)</h2>
              <span className={`badge ${donor.availability ? "badge-available" : "badge-unavailable"}`}>
                <span className="badge-dot" />
                {donor.availability ? "Available" : "Not available"}
              </span>
            </div>
            <PulseDivider animated={donor.availability} height={28} color={donor.availability ? "var(--crimson)" : "var(--line)"} />

            <div className="stat-row">
              <div className="stat-box">
                <div className="stat-box-label">Blood group</div>
                <div className="stat-box-value">{donor.blood_group}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">City</div>
                <div className="stat-box-value">{donor.city}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Last donation</div>
                <div className="stat-box-value">{donor.last_donation_date || "Never"}</div>
              </div>
            </div>

            <button className="btn-primary" style={{ marginTop: 20 }} onClick={toggleAvailability} disabled={toggling}>
              {toggling ? "Updating…" : donor.availability ? "Mark as unavailable" : "Mark as available"}
            </button>
          </div>
        ) : (
          <div className="nav-grid">
            <Link to="/donor-register" className="nav-card">
              <div className="nav-card-title">Register as a donor</div>
              <div className="nav-card-desc">List your blood group and location so requesters can find you.</div>
            </Link>
          </div>
        )}

        <h2 style={{ fontSize: 16, margin: "8px 0 4px", color: "var(--text-muted)" }}>Blood requests</h2>
        <div className="nav-grid">
          <Link to="/requests/new" className="nav-card">
            <div className="nav-card-title">New blood request</div>
            <div className="nav-card-desc">Raise a request for a patient and get matched with nearby donors.</div>
          </Link>
          <Link to="/requests/mine" className="nav-card">
            <div className="nav-card-title">My requests</div>
            <div className="nav-card-desc">Requests raised from this browser — track status and matches.</div>
          </Link>
          <Link to="/search/donors" className="nav-card">
            <div className="nav-card-title">Search donors</div>
            <div className="nav-card-desc">Search by blood group and location without raising a request.</div>
          </Link>
          {donor && (
            <Link to="/requests/open" className="nav-card">
              <div className="nav-card-title">Requests near you</div>
              <div className="nav-card-desc">Patients whose blood group your donor listing is compatible with.</div>
            </Link>
          )}
        </div>

        <h2 style={{ fontSize: 16, margin: "8px 0 4px", color: "var(--text-muted)" }}>Directories</h2>
        <div className="nav-grid">
          <Link to="/blood-banks" className="nav-card">
            <div className="nav-card-title">Blood banks</div>
            <div className="nav-card-desc">Browse blood banks by city, blood group in stock, or nearest to you.</div>
          </Link>
          <Link to="/hospitals" className="nav-card">
            <div className="nav-card-title">Hospitals</div>
            <div className="nav-card-desc">Browse hospitals with emergency contact numbers by city.</div>
          </Link>
          <Link to="/predictions" className="nav-card">
            <div className="nav-card-title">Predictions</div>
            <div className="nav-card-desc">Forecasted blood demand and projected donor availability.</div>
          </Link>
        </div>

        <h2 style={{ fontSize: 16, margin: "8px 0 4px", color: "var(--text-muted)" }}>Admin</h2>
        <div className="nav-grid">
          <Link to="/admin/requests" className="nav-card">
            <div className="nav-card-title">Manage requests</div>
            <div className="nav-card-desc">View every blood request and override its status. Passcode required.</div>
          </Link>
          <Link to="/admin/stats" className="nav-card">
            <div className="nav-card-title">Analytics</div>
            <div className="nav-card-desc">Charts for donors and requests over time. Passcode required.</div>
          </Link>
          <Link to="/admin/blood-banks" className="nav-card">
            <div className="nav-card-title">Manage blood banks</div>
            <div className="nav-card-desc">Add, edit, or remove blood banks. Passcode required.</div>
          </Link>
          <Link to="/admin/hospitals" className="nav-card">
            <div className="nav-card-title">Manage hospitals</div>
            <div className="nav-card-desc">Add, edit, or remove hospitals. Passcode required.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
