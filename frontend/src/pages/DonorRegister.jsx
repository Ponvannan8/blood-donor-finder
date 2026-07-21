import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import AuthBrandPanel from "../components/AuthBrandPanel";
import LocationPickerMap from "../components/LocationPickerMap";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function DonorRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    blood_group: "",
    city: "",
    latitude: "",
    longitude: "",
    last_donation_date: "",
    availability: true,
  });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

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
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location access was denied. You can still enter coordinates manually, or allow location and try again."
            : "Could not get your location. Enter coordinates manually."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Enter your name.");
    if (!form.phone.trim()) return setError("Enter your phone number.");
    if (!form.blood_group) return setError("Select your blood group.");
    if (!form.city.trim()) return setError("Enter your city.");
    if (form.latitude === "" || form.longitude === "") {
      return setError("Set your location — tap \"Use my current location\" or enter coordinates.");
    }

    setSubmitting(true);
    try {
      await api.registerDonor({
        name: form.name.trim(),
        phone: form.phone.trim(),
        blood_group: form.blood_group,
        city: form.city.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        last_donation_date: form.last_donation_date || null,
        availability: form.availability,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Could not save your donor listing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <AuthBrandPanel />
      <div className="auth-panel">
        <div className="auth-card">
          <h1>Donor details</h1>
          <p className="auth-card-sub">
            This is what people searching nearby will see. No account needed — anyone with this browser's link
            (via a saved bookmark) can update this listing later.
          </p>

          {error && <div className="banner banner-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" value={form.name} onChange={update("name")} required />
            </div>

            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input id="phone" type="tel" value={form.phone} onChange={update("phone")} placeholder="+91 9xxxxxxxxx" required />
            </div>

            <div className="field">
              <label htmlFor="blood_group">Blood group</label>
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
              <label htmlFor="city">City</label>
              <input id="city" value={form.city} onChange={update("city")} placeholder="e.g. Ranipet" required />
            </div>

            <div className="field">
              <label>Location</label>
              <button type="button" className="btn-secondary" onClick={handleUseLocation} disabled={locating}>
                {locating ? "Locating…" : "📍 Use my current location"}
              </button>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <input
                  className="mono"
                  placeholder="Latitude"
                  value={form.latitude}
                  onChange={update("latitude")}
                  inputMode="decimal"
                />
                <input
                  className="mono"
                  placeholder="Longitude"
                  value={form.longitude}
                  onChange={update("longitude")}
                  inputMode="decimal"
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <LocationPickerMap
                  position={form.latitude !== "" && form.longitude !== "" ? [parseFloat(form.latitude), parseFloat(form.longitude)] : null}
                  onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
                  height={200}
                />
              </div>
              <div className="field-hint">Click the map, drag the pin, or use the button/inputs above — all three stay in sync.</div>
            </div>

            <div className="field">
              <label htmlFor="last_donation_date">Last donation date (optional)</label>
              <input
                id="last_donation_date"
                type="date"
                value={form.last_donation_date}
                onChange={update("last_donation_date")}
                max={new Date().toISOString().split("T")[0]}
              />
              <div className="field-hint">Leave blank if you've never donated before.</div>
            </div>

            <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                id="availability"
                type="checkbox"
                style={{ width: "auto" }}
                checked={form.availability}
                onChange={update("availability")}
              />
              <label htmlFor="availability" style={{ margin: 0 }}>
                I'm currently available to donate
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save donor profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
