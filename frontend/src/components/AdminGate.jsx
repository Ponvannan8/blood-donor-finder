import { useEffect, useState } from "react";
import { api, setAdminPasscode, getAdminPasscode, clearAdminPasscode } from "../lib/api";

/**
 * Replaces role-based admin auth: prompts for the shared ADMIN_PASSCODE
 * (set in the backend's .env) and verifies it against a real endpoint
 * before rendering admin pages. The passcode itself lives in
 * sessionStorage (cleared when the tab closes), not localStorage.
 */
export default function AdminGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | allowed | denied
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const verify = async () => {
    try {
      await api.adminGetStats();
      setStatus("allowed");
    } catch {
      setStatus("denied");
    }
  };

  useEffect(() => {
    if (getAdminPasscode()) {
      verify();
    } else {
      setStatus("denied");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    setAdminPasscode(input);
    try {
      await api.adminGetStats();
      setStatus("allowed");
    } catch (err) {
      clearAdminPasscode();
      setError(err.message || "Incorrect passcode.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "checking") {
    return <div style={{ padding: 40 }}>Checking access…</div>;
  }

  if (status === "denied") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="card" style={{ maxWidth: 360, width: "100%" }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Admin access</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            This app has no accounts — enter the shared admin passcode to continue.
          </p>
          {error && <div className="banner banner-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="passcode">Passcode</label>
              <input
                id="passcode"
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting || !input}>
              {submitting ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}
