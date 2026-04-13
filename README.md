# LeadPulse

Full-stack lead pipeline: **Next.js** dashboard in `frontend/` and **FastAPI** API in `backend/` (capture, scoring, webhooks, analytics).

This monorepo matches [**leadpulse-ai** on GitHub](https://github.com/Mohamed-asmaan/leadpulse-ai).

## Repository layout

| Path | Description |
|------|-------------|
| `frontend/` | Next.js 14 app (UI, auth against API) |
| `backend/` | FastAPI app, SQLAlchemy, optional Postgres or SQLite |

Always run Git commands from the **repository root** (the folder that contains `frontend/` and `backend/`), not from inside `frontend` or `backend` alone.

## Prerequisites

- Node.js 18+ and npm  
- Python 3.11+ (recommended) and pip  

## Local development

### 1. Backend API

From the repo root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit .env if needed (see backend\.env.example)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API defaults to `http://127.0.0.1:8000` (health: `http://127.0.0.1:8000/health`).

### 2. Frontend

In a second terminal, from the repo root:

```powershell
cd frontend
copy .env.example .env.local
# Ensure NEXT_PUBLIC_API_URL matches your API (see frontend\.env.example)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

- `backend/.env.example` — database URL, JWT secret, optional webhook secret.  
- `frontend/.env.example` — `NEXT_PUBLIC_API_URL` for the browser.

### Performance & security (production)

- **CORS:** set `CORS_ALLOW_ORIGINS` on the API to a comma-separated list of real front-end origins (e.g. `https://app.example.com`). Leaving it empty uses a wildcard with credentials disabled (fine for local dev).  
- **Dashboard cache:** the authenticated app uses **TanStack Query** (`AppQueryProvider` in `frontend/app/(app)/layout.tsx`) so lead lists, integration status, and lead workspace data are deduped, cached, and refreshed on a sane interval instead of ad-hoc `useEffect` fetches everywhere.  
- **HTTP cache:** browser `fetch` for the API uses `cache: "no-store"` so stale CDN/browser caching does not override React Query.

## AI in the product (visible in the app)

- Open **AI Studio** in the sidebar (`/intelligence`) for pipeline-wide suggestions, score stats, and wiring tips.  
- Open any lead: the default tab is **AI & scores** (composite model, explainable reasons, ML blend text from the API).  
- **Overview** includes a compact AI strip that links to AI Studio.

## CRM-style connectors (Meta, Google, website)

- **Meta Lead Ads:** set `META_WEBHOOK_VERIFY_TOKEN` and `META_APP_SECRET`, then in [Meta for Developers](https://developers.facebook.com/) point the Page webhook callback to `{API}/api/v1/webhooks/meta` (GET verification + POST leads).  
- **Google Ads lead forms:** POST the lead payload (including `user_column_data`) to `{API}/api/v1/webhooks/leads` with `X-Webhook-Token` when `WEBHOOK_SHARED_SECRET` is set — the API unwraps Google’s shape automatically.  
- **Your marketing site:** set `WEBSITE_FORM_SHARED_SECRET`, embed the script from `{API}/api/v1/public/embed/lead-form.js`, and use a `<form data-leadpulse-website-lead>` — submissions hit `{API}/api/v1/public/website-lead` and run the same capture → score → automation pipeline.  
- **Behavioral tracking:** `{API}/api/v1/public/track/event` with `PUBLIC_TRACKING_SECRET` (see Integrations page in the app).

Do not commit real `.env` or `.env.local` files; they are ignored by Git.

## Deploying

You can host **frontend** and **backend** on different providers while keeping this single repo (e.g. configure each host with root directory `frontend` or `backend`). Set CORS and production env vars on both sides.

## License

Add a `LICENSE` file when you choose one.
