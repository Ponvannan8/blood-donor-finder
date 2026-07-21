import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";

const EMPTY_FORM = { name: "", address: "", emergency_contact: "", city: "", latitude: "", longitude: "" };

export default function AdminHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listHospitals({});
      setHospitals(data);
    } catch (err) {
      setError(err.message || "Could not load hospitals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (hospital) => {
    setEditingId(hospital.hospital_id);
    setForm({
      name: hospital.name,
      address: hospital.address,
      emergency_contact: hospital.emergency_contact,
      city: hospital.city,
      latitude: hospital.latitude ?? "",
      longitude: hospital.longitude ?? "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.address.trim() || !form.emergency_contact.trim() || !form.city.trim()) {
      setError("Fill in name, address, emergency contact and city.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      emergency_contact: form.emergency_contact.trim(),
      city: form.city.trim(),
      latitude: form.latitude === "" ? null : parseFloat(form.latitude),
      longitude: form.longitude === "" ? null : parseFloat(form.longitude),
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await api.updateHospital(editingId, payload);
      } else {
        await api.createHospital(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Could not save the hospital.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (hospitalId) => {
    setError("");
    try {
      await api.deleteHospital(hospitalId);
      await load();
    } catch (err) {
      setError(err.message || "Could not delete the hospital.");
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content">
        <div className="page-header">
          <h1>Manage hospitals</h1>
          <Link to="/dashboard" className="link-back">
            ← Back to dashboard
          </Link>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <div className="card" style={{ maxWidth: 480 }}>
          <h2 style={{ fontSize: 16, marginBottom: 14 }}>{editingId ? "Edit hospital" : "Add a hospital"}</h2>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" value={form.name} onChange={update("name")} required />
            </div>
            <div className="field">
              <label htmlFor="address">Address</label>
              <input id="address" value={form.address} onChange={update("address")} required />
            </div>
            <div className="field">
              <label htmlFor="emergency_contact">Emergency contact</label>
              <input id="emergency_contact" value={form.emergency_contact} onChange={update("emergency_contact")} required />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" value={form.city} onChange={update("city")} required />
            </div>
            <div className="field">
              <label>Coordinates (optional, enables distance search)</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="mono" placeholder="Latitude" value={form.latitude} onChange={update("latitude")} inputMode="decimal" />
                <input className="mono" placeholder="Longitude" value={form.longitude} onChange={update("longitude")} inputMode="decimal" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Save changes" : "Add hospital"}
              </button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <h2 style={{ fontSize: 18, margin: "28px 0 12px" }}>All hospitals</h2>
        {loading ? (
          <p>Loading…</p>
        ) : hospitals.length === 0 ? (
          <div className="empty-state card">No hospitals added yet.</div>
        ) : (
          hospitals.map((h) => (
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
              </div>
              <div className="request-card-actions">
                <button className="btn-small" onClick={() => startEdit(h)}>
                  Edit
                </button>
                <button className="btn-small btn-small-danger" onClick={() => handleDelete(h.hospital_id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
