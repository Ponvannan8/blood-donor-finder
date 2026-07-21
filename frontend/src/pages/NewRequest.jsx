import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import LocationPickerMap from "../components/LocationPickerMap";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function NewRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    patient_name: "",
    blood_group: "",
    units_required: 1,
    hospital_name: "",
    city: "",
    latitude: "",
    longitude: "",
    notes: "",
    requester_name: "",
    requester_phone: "",
  });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleUseLocation = () => {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location access. Enter coordinates manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setError("Could not get your location. Enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.requester_name.trim()) return setError("Enter your name.");
    if (!form.requester_phone.trim()) return setError("Enter your phone number.");
    if (!form.blood_group) return setError("Select the blood group needed.");
    if (!form.hospital_name.trim()) return setError("Enter the hospital name.");
    if (!form.city.trim()) return setError("Enter the city.");
    if (form.latitude === "" || form.longitude === "") {
      return setError("Set the hospital/patient location — tap \"Use current location\" or enter coordinates.");
    }

    setSubmitting(true);
    try {
      const req = await api.createRequest({
        patient_name: form.patient_name.trim(),
        blood_group: form.blood_group,
        units_required: parseInt(form.units_required, 10),
        hospital_name: form.hospital_name.trim(),
        city: form.city.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        notes: form.notes.trim() || null,
        requester_name: form.requester_name.trim(),
        requester_phone: form.requester_phone.trim(),
      });
      navigate(`/requests/${req.request_id}/matches`);
    } catch (err) {
      setError(err.message || "Could not submit the request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <div className="dashboard-content">
        <div className="page-header">
          <h1>New blood request</h1>
          <Link to="/dashboard" className="link-back">
            ← Back to dashboard
          </Link>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <div className="card" style={{ maxWidth: 480 }}>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="patient_name">Patient name</label>
              <input id="patient_name" value={form.patient_name} onChange={update("patient_name")} required />
            </div>

            <div className="field">
              <label htmlFor="requester_name">Your name</label>
              <input id="requester_name" value={form.requester_name} onChange={update("requester_name")} required />
            </div>

            <div className="field">
              <label htmlFor="requester_phone">Your phone number</label>
              <input
                id="requester_phone"
                type="tel"
                value={form.requester_phone}
                onChange={update("requester_phone")}
                placeholder="+91 9xxxxxxxxx"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="blood_group">Blood group needed</label>
              <select id="blood_group" value={form.blood_group} onChange={update("blood_group")} required>
                <option value="" disabled>
                  Select blood group
                </option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="units_required">Units required</label>
              <input
                id="units_required"
                type="number"
                min={1}
                max={20}
                value={form.units_required}
                onChange={update("units_required")}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="hospital_name">Hospital</label>
              <input id="hospital_name" value={form.hospital_name} onChange={update("hospital_name")} required />
            </div>

            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" value={form.city} onChange={update("city")} required />
            </div>

            <div className="field">
              <label>Hospital / patient location</label>
              <button type="button" className="btn-secondary" onClick={handleUseLocation} disabled={locating}>
                {locating ? "Locating…" : "📍 Use current location"}
              </button>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <input className="mono" placeholder="Latitude" value={form.latitude} onChange={update("latitude")} inputMode="decimal" />
                <input className="mono" placeholder="Longitude" value={form.longitude} onChange={update("longitude")} inputMode="decimal" />
              </div>
              <div style={{ marginTop: 12 }}>
                <LocationPickerMap
                  position={form.latitude !== "" && form.longitude !== "" ? [parseFloat(form.latitude), parseFloat(form.longitude)] : null}
                  onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
                  height={200}
                />
              </div>
              <div className="field-hint">Click the map, drag the pin, or use the button/inputs above — used to find and sort nearby compatible donors.</div>
            </div>

            <div className="field">
              <label htmlFor="notes">Notes (optional)</label>
              <input id="notes" value={form.notes} onChange={update("notes")} placeholder="e.g. needed before Friday" />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request & find donors"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
