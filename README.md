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

Do not commit real `.env` or `.env.local` files; they are ignored by Git.

## Deploying

You can host **frontend** and **backend** on different providers while keeping this single repo (e.g. configure each host with root directory `frontend` or `backend`). Set CORS and production env vars on both sides.

## License

Add a `LICENSE` file when you choose one.
