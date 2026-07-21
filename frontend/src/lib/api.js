const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const OWNER_TOKEN_KEY = "bdf_owner_token";
const ADMIN_PASSCODE_KEY = "bdf_admin_passcode";

/**
 * "Ownership" without accounts: a random UUID generated once per browser,
 * sent as X-Owner-Token on every request. The backend uses it to let this
 * browser (and only this browser) edit/cancel the donor listing or blood
 * request it created. Not real security — just enough to stop casual
 * cross-editing between different people, which is the most an app with
 * no accounts can offer.
 */
function getOwnerToken() {
  let token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}

export function getAdminPasscode() {
  return sessionStorage.getItem(ADMIN_PASSCODE_KEY) || "";
}

export function setAdminPasscode(passcode) {
  sessionStorage.setItem(ADMIN_PASSCODE_KEY, passcode);
}

export function clearAdminPasscode() {
  sessionStorage.removeItem(ADMIN_PASSCODE_KEY);
}

async function apiFetch(path, { method = "GET", body } = {}) {
  const adminPasscode = getAdminPasscode();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Owner-Token": getOwnerToken(),
      ...(adminPasscode ? { "X-Admin-Passcode": adminPasscode } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      detail = errBody.detail || detail;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Drops undefined/null values so URLSearchParams doesn't stringify them as "undefined"
function toQuery(params) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  return new URLSearchParams(clean).toString();
}

export const api = {
  // Donors
  registerDonor: (donor) => apiFetch("/api/donors", { method: "POST", body: donor }),
  getMyDonorListing: () => apiFetch("/api/donors/mine"),
  updateMyDonorListing: (updates) => apiFetch("/api/donors/mine", { method: "PATCH", body: updates }),
  deleteMyDonorListing: () => apiFetch("/api/donors/mine", { method: "DELETE" }),

  // Blood requests
  createRequest: (req) => apiFetch("/api/requests", { method: "POST", body: req }),
  listMyRequests: () => apiFetch("/api/requests/mine"),
  getRequest: (id) => apiFetch(`/api/requests/${id}`),
  updateRequestStatus: (id, status) =>
    apiFetch(`/api/requests/${id}/status`, { method: "PATCH", body: { status } }),
  cancelRequest: (id) => apiFetch(`/api/requests/${id}`, { method: "DELETE" }),

  // Search & matching
  searchDonors: (params) => apiFetch(`/api/search/donors?${toQuery(params)}`),
  matchDonorsForRequest: (requestId, params = {}) =>
    apiFetch(`/api/search/requests/${requestId}/matches?${toQuery(params)}`),
  openRequestsForDonor: (params = {}) => apiFetch(`/api/search/open-requests?${toQuery(params)}`),

  // Blood banks
  listBloodBanks: (params = {}) => apiFetch(`/api/blood-banks?${toQuery(params)}`),
  getBloodBank: (id) => apiFetch(`/api/blood-banks/${id}`),
  createBloodBank: (bank) => apiFetch("/api/blood-banks", { method: "POST", body: bank }),
  updateBloodBank: (id, updates) => apiFetch(`/api/blood-banks/${id}`, { method: "PATCH", body: updates }),
  deleteBloodBank: (id) => apiFetch(`/api/blood-banks/${id}`, { method: "DELETE" }),

  // Hospitals
  listHospitals: (params = {}) => apiFetch(`/api/hospitals?${toQuery(params)}`),
  getHospital: (id) => apiFetch(`/api/hospitals/${id}`),
  createHospital: (hospital) => apiFetch("/api/hospitals", { method: "POST", body: hospital }),
  updateHospital: (id, updates) => apiFetch(`/api/hospitals/${id}`, { method: "PATCH", body: updates }),
  deleteHospital: (id) => apiFetch(`/api/hospitals/${id}`, { method: "DELETE" }),

  // Admin (passcode-gated server-side; see getAdminPasscode/setAdminPasscode above)
  adminListRequests: (params = {}) => apiFetch(`/api/admin/requests?${toQuery(params)}`),
  adminUpdateRequestStatus: (id, status) =>
    apiFetch(`/api/admin/requests/${id}/status`, { method: "PATCH", body: { status } }),
  adminGetStats: () => apiFetch("/api/admin/stats"),

  // Predictions
  getDemandForecast: (params = {}) => apiFetch(`/api/predictions/demand?${toQuery(params)}`),
  getDonorAvailabilityForecast: (params = {}) => apiFetch(`/api/predictions/donor-availability?${toQuery(params)}`),

  // Chatbot
  sendChatMessage: (messages) => apiFetch("/api/chat/message", { method: "POST", body: { messages } }),
};
