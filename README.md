# Blood Donor Finder

Stack: **React + Vite** (frontend) · **FastAPI** (backend) · **Supabase Postgres** (database only) · **Leaflet + OpenStreetMap** (maps) · **Recharts** (charts) · **Scikit-learn** (prediction) · **OpenRouter free tier** (chatbot) — all free tier / open-source, no paid maps API.

**This app has no user accounts.** Anyone can register as a donor or raise a blood request immediately, with no sign-up flow. Two lightweight mechanisms replace what accounts used to do:

- **Owner tokens** — the browser generates a random ID (stored in `localStorage`) the first time it's needed, and sends it on every request as `X-Owner-Token`. A donor listing or blood request remembers which token created it, so *that same browser* can edit or cancel it later. This is **not real security** — anyone who copies the token could act as that "owner" — it just stops casual cross-editing between different people using the app from different browsers, which is the most a no-account app can honestly offer.
- **Admin passcode** — a single shared secret you set in the backend's `.env` (`ADMIN_PASSCODE`), sent as `X-Admin-Passcode`. Whoever has it can manage blood banks, hospitals, and requests, and view analytics. There's no per-admin identity or audit trail — it's one shared password, not a role tied to an account.

If you need real accounts, per-user history, or an audit trail later, that's a larger rework (bringing back Supabase Auth, RLS policies keyed to a signed-in user, etc.) — this version deliberately trades that off for zero-friction access.

---

## Features

- **Donor registration**: name, phone, blood group, city, latitude/longitude (via Browser Geolocation API or a click/drag map picker), last donation date, availability toggle
- **Blood requests**: patient name, blood group, units required, hospital, requester name/phone, status (pending/matched/fulfilled/cancelled)
- **ABO/Rh compatibility-aware matching**: a request for A+ also surfaces O+/O-/A- donors, not just an exact match (`app/core/matching.py`)
- **Nearest-first search** by great-circle distance (haversine — no paid maps API), with Leaflet + OpenStreetMap maps showing donors, requests, blood banks, and hospitals as color-coded pins, plus a search-radius circle
- **Blood banks & hospitals directories**, publicly browsable, admin-managed
- **Admin panel** (passcode-gated): oversee every request and override its status, add/edit/delete blood banks and hospitals, and view analytics (requests over time, donors by blood group, requests by status) charted with Recharts
- **Blood demand forecast**: a real **Scikit-learn `LinearRegression`** model (day-index trend + day-of-week seasonality) trained on historical request counts. Below a data threshold (10 distinct days / 10 requests) it's honest about not having enough history yet and shows a flat historical average instead of dressing up a guess as a trained model — the response's `confidence` field says which one you're looking at
- **Donor availability forecast**: a **rule-based** projection (last_donation_date + 90-day cooldown), deliberately not labeled as machine learning, since eligibility timing is fully determined by that rule
- **Chatbot**: a floating widget on every page, backed by OpenRouter's free tier, answering blood-donation FAQs — the system prompt tells it explicitly that it isn't a doctor and to defer specific medical judgment calls

---

## 1. Set up Supabase (used purely as a hosted Postgres database)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** → paste the contents of `backend/app/database/no_auth_schema.sql` → **Run**. This creates `donors`, `blood_requests`, `blood_banks`, and `hospitals` — no `auth.users`, no `profiles` table, and Row Level Security is intentionally left off (the backend always uses the service-role key, and access control lives in application code instead — see the note at the top of that file).
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `service_role` key (**secret** — backend only, never in frontend code)

You do **not** need to touch Authentication settings, Google OAuth, or the anon key anywhere in this project.

## 2. Run the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSCODE, OPENROUTER_API_KEY
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs` once running.

## 3. Run the frontend

```bash
cd frontend
npm install
cp .env.example .env            # only VITE_API_BASE_URL is needed
npm run dev
```

Open `http://localhost:5173`.

---

## Flow to test end-to-end

1. **Home page** (`/`) — no login screen. You'll see a prompt to register as a donor (if this browser hasn't yet) plus nav cards for requests, directories, and admin.
2. **Register as a donor** (`/donor-register`): name, phone, blood group, city, and location (button, manual inputs, or the map — all three stay in sync). On success you land back on the home page, which now shows your listing with an availability toggle.
3. **New blood request** (`/requests/new`): your name/phone, patient details, blood group needed, hospital, and location. Submitting takes you straight to **Matching donors** — a map plus list of compatible, available, eligible donors sorted by distance, with an adjustable search radius.
4. **My requests** (`/requests/mine`): every request raised from *this browser* (matched via the owner-token header, automatically attached — nothing to log in for). Cancel or mark fulfilled from here.
5. **Search donors** (`/search/donors`) and **Requests near you** (`/requests/open`, only shown once you have a donor listing) work the same way as before, just without any login gate.
6. **Blood banks** / **Hospitals** (`/blood-banks`, `/hospitals`): public directories, searchable by city/blood-group/distance, each with its own map.
7. **Predictions** (`/predictions`): demand and availability forecasts, filterable by blood group/city. Expect the demand chart to say "low data" on a freshly-seeded database — that's correct behavior, not a bug (see Features above).
8. **Admin** (`/admin/...`, linked from the home page): the first visit prompts for the passcode you set as `ADMIN_PASSCODE`. Once entered, it's remembered for the browser tab (`sessionStorage`) until the tab closes. From here: **Manage requests** (any request, override status), **Analytics** (charts), **Manage blood banks** / **Manage hospitals** (add/edit/delete).
9. **Chatbot**: the 💬 button bottom-right works on every page, no login required. If `OPENROUTER_API_KEY` isn't set, it shows a clear error bubble rather than failing silently.

---

## Project structure

```
backend/
  app/
    core/
      config.py            Settings: Supabase connection, ADMIN_PASSCODE, OpenRouter config
      supabase_client.py    Single service-role Postgres client
      security.py            Owner-token + admin-passcode dependencies (replaces JWT auth)
      matching.py             Blood-group compatibility map + haversine distance + distance-sort helper
      ml.py                    Scikit-learn demand forecasting + rule-based donor availability forecasting
      chatbot.py               OpenRouter chat completion client + system prompt
    schemas/                  Pydantic models: donor.py, request.py, facility.py, admin.py, prediction.py, chat.py
    routers/
      donor.py                 Register/get/update/delete a donor listing (owner-token gated)
      requests.py               Create/list/cancel a blood request (owner-token gated)
      search.py                  Donor search, per-request matching, "open requests near me"
      blood_banks.py, hospitals.py   Public directories, admin-passcode-gated writes
      admin.py                  Request oversight + analytics (whole router passcode-gated)
      predictions.py             Demand/availability forecast endpoints
      chat.py                    Chatbot proxy
    database/
      no_auth_schema.sql         The schema to run — donors, blood_requests, blood_banks, hospitals
      legacy_with_auth/          Old Supabase-Auth-based migrations, kept only for reference
    main.py
  requirements.txt
  .env.example

frontend/
  src/
    lib/
      api.js                Fetch wrapper — generates/attaches the owner-token, and the admin passcode when set
    components/
      AuthBrandPanel.jsx     Split-screen brand panel (used by DonorRegister/NewRequest — no auth logic despite the name)
      PulseDivider.jsx        Signature ECG-line SVG (availability indicator + divider)
      MapView.jsx, LocationPickerMap.jsx   Leaflet map display + click/drag location picker
      BloodGroupChipSelect.jsx   Multi-select chips for a blood bank's stock
      AdminGate.jsx             Prompts for the admin passcode before rendering admin pages
      Navbar.jsx, StatusBadge.jsx, DonorResultCard.jsx, ChatWidget.jsx
    pages/
      Dashboard.jsx (home), DonorRegister.jsx, NewRequest.jsx, MyRequests.jsx, RequestMatches.jsx,
      DonorSearch.jsx, OpenRequests.jsx, BloodBanks.jsx, Hospitals.jsx, Predictions.jsx,
      AdminBloodBanks.jsx, AdminHospitals.jsx, AdminRequests.jsx, AdminStats.jsx
    styles/
      tokens.css    Design system: colors, type, spacing (documented inline)
      auth.css, dashboard.css, requests.css, chat.css
  package.json
  .env.example
```

## Design notes

The visual identity ("Vital Signs") is built around treating donor availability as a **live signal** rather than a static database row — the recurring ECG pulse-line motif (`PulseDivider.jsx`) only animates when a donor is actually available. Palette is crimson/ink/teal (blood, clinical trust, medical accent). Type pairs a slab serif (Fraunces) for headlines against Inter for UI text and IBM Plex Mono for data (blood groups, coordinates, stats) — see `src/styles/tokens.css`. Map markers (`lib/mapIcons.js`) carry the same palette instead of Leaflet's default blue pins.

---

## Deployment

Supabase is already hosted — nothing to deploy there beyond running the SQL once. What's left is the FastAPI backend (→ **Render**) and the React frontend (→ **Vercel** or **Netlify**), both free with no credit card required.

**Config files already in the repo:**
- `render.yaml` — Render Blueprint for the backend
- `frontend/vercel.json` — Vercel build settings + SPA rewrite
- `netlify.toml` + `frontend/public/_redirects` — same purpose, for Netlify
- `.gitignore` — excludes `node_modules`, `dist`, `venv`, and both `.env` files

### 1. Push to GitHub

```bash
cd blood-donor-finder
git init
git add .
git commit -m "Blood Donor Finder"
git branch -M main
git remote add origin https://github.com/<you>/blood-donor-finder.git
git push -u origin main
```

### 2. Deploy the backend to Render

[render.com](https://render.com) → **New → Blueprint** (reads `render.yaml` automatically) or **New → Web Service** by hand: **Root Directory** `backend`, **Build Command** `pip install -r requirements.txt`, **Start Command** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set the environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSCODE`, `OPENROUTER_API_KEY` (secrets — the blueprint leaves these blank on purpose). Leave `FRONTEND_ORIGINS` for now. Confirm it's alive at `https://<your-service>.onrender.com/health`.

### 3. Deploy the frontend

**Vercel**: **Add New → Project** → same repo → **Root Directory** `frontend` (Vite auto-detected). Set **Environment Variable** `VITE_API_BASE_URL` = your Render URL. Deploy.

**Netlify (alternative)**: **Add new site → Import an existing project** → same repo — `netlify.toml` already sets the base/build/publish paths. Set the same `VITE_API_BASE_URL` variable. Deploy.

> Vite environment variables are baked in at build time — changing one later requires a new deploy.

### 4. Wire the two together

**Render** → backend → Environment → set `FRONTEND_ORIGINS` to your frontend's URL (comma-separate multiple origins if needed). Render redeploys automatically.

That's it — there's no Supabase Auth redirect URL or Google OAuth client to configure, since this version has no accounts.

### Things worth knowing before you rely on this

- **Render's free tier spins down after 15 minutes of no traffic** — the first request after that has a ~30–50 second cold start. Expected, not a bug.
- **OpenRouter's free tier is rate-limited** (20 requests/minute, low daily cap until the account has ever added $10 in credits) — the chatbot will occasionally 429 under real traffic.
- **Owner tokens live in `localStorage`**, so clearing browser data or switching devices loses access to editing a previously-created listing/request — there's no recovery mechanism (no email, no account), by design.
- **The admin passcode is a single shared secret** — treat it like a root password. Anyone who has it can edit or delete anything in the admin-managed tables.

---

## Roadmap (not built yet)

| Idea | What it'd add |
|---|---|
| Firebase Cloud Messaging | Emergency donor alerts (push notifications) |
| Real accounts (optional, opt-in) | Per-user history, recovery if `localStorage` is lost, per-admin audit trail — would mean reintroducing Supabase Auth and RLS |

Everything above the line is built and working end-to-end without any login step.
