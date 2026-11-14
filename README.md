# HISAAB — Audit the Hospital Bill

**Team:** AFTERSHOCK  
**Track:** HealthTech | COLOSSUS 3.0 (24-Hour National Level Hackathon)  
**Event:** Dr. Ambedkar Institute of Technology, Bengaluru

## Overview

HISAAB is an AI-powered hospital bill auditing platform that helps patients understand and verify their hospital bills.

Users upload a hospital bill (PDF, JPG, PNG). The application:
1. Reads the bill using **Google Gemini API** (primary).
2. Falls back to **Tesseract OCR** if Gemini extraction fails.
3. Shows extracted line items and totals for the user to edit and confirm before analysis.
4. Independently verifies complete calculations using a **Python audit engine**; missing values are left unchecked rather than assumed to be zero.
5. Detects possible duplicate entries, arithmetic errors, and unclear charges as review prompts—not accusations.
6. Compares up to five unit rates against one date-applicable, cited benchmark source when available; applicability to an individual case is not presumed.
7. Generates an understandable audit report and a downloadable questions PDF with editable hospital questions.

**Core philosophy:** We do not dispute medical care. We help patients understand and verify their hospital bills.

## Architecture

```
React + Vite + TypeScript + Tailwind CSS   (Frontend)
      |
      v
FastAPI + Python                          (Backend)
      |
      |-- Gemini API  (primary extraction)
      |-- Tesseract OCR (fallback extraction)
      |-- Python Audit Engine (arithmetic, duplicates, dates, benchmarks)
      |-- ReportLab (PDF generation)
      |
      v
Supabase Auth + PostgreSQL                (Auth & Database)
```

## Tech Stack

**Frontend:** React, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router, Supabase JS SDK  
**Backend:** Python, FastAPI, Pydantic, SQLAlchemy, Uvicorn  
**AI:** Google Gemini API (google-genai SDK)  
**OCR:** Tesseract, pytesseract, Pillow  
**PDF:** ReportLab  
**Database:** SQLite for local tests / Supabase PostgreSQL when configured
**Auth:** Supabase Auth with verified JWTs, owner-scoped API access, and PostgreSQL Row Level Security

## Project Structure

```
hisaab/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routes (audits, benchmarks)
│   │   ├── core/          # Config
│   │   ├── services/      # Gemini, OCR, audit engine, PDF, benchmarks
│   │   ├── models/        # SQLAlchemy models + Pydantic schemas
│   │   └── database/      # DB session
│   ├── tests/             # pytest tests
│   ├── uploads/           # Temporary uploaded bills
│   ├── generated_reports/ # Generated PDFs
│   ├── main.py            # FastAPI entry point
│   ├── requirements.txt
│   └── .env / .env.example
└── frontend/
    ├── src/
    │   ├── components/    # Navbar, Layout, cards, badges
    │   ├── pages/         # Landing, Dashboard, Upload, AuditResults, History, Benchmarks, About, Settings, Login, GetStarted, DemoAudit
    │   ├── services/      # API client, Supabase client
    │   ├── types/         # TypeScript interfaces
    │   └── App.tsx        # Routing
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── index.html
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Tesseract OCR installed (for OCR fallback)
- Google Gemini API key

### Backend
```bash
cd backend
cp .env.example .env
# Set SUPABASE_URL and DATABASE_URL in .env.
# DATABASE_URL is a private database credential; do not commit or share it.
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
# API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
npm install
npm run dev -- --host 0.0.0.0 --port 5000
# App: http://localhost:5000
```

### Supabase setup

1. Create or select a Supabase project. In **Authentication → URL Configuration**, set the local site URL and allow the callback URLs `http://localhost:5000/login` and `http://localhost:5173/login`. Keep email confirmation enabled.
2. Copy the project URL and publishable/anon key into `frontend/.env.local`. These client values are public; never place a service-role key in the frontend.
3. Copy the PostgreSQL URI from the project’s **Connect** dialog into `backend/.env` as `DATABASE_URL`, and set the same project URL as `SUPABASE_URL`. Use the session pooler if the direct connection is unavailable on your network. Change the URI scheme from `postgresql://` to `postgresql+psycopg://` so SQLAlchemy uses the installed PostgreSQL driver. Keep database credentials local. `SUPABASE_JWT_SECRET` is needed only for older projects using HS256 access tokens; projects using asymmetric signing keys are verified through Supabase’s JWKS endpoint.
4. Start the backend once so SQLAlchemy creates the MVP tables, then run `supabase/migrations/20261113000000_hisaab_rls.sql` and `supabase/migrations/20261114000000_bill_review_confirmation.sql` in the Supabase SQL Editor, in that order. Apply both migrations before deploying this version. The API also checks audit ownership; the first migration adds a database-level RLS layer, and the second adds confirmed-extraction, calculation, and benchmark-evidence fields.
5. Restart the frontend after changing `.env.local`, open `http://localhost:5000`, create an account, confirm the email, and sign in. Password recovery returns to `/login`.

Benchmark writes are restricted to users whose trusted Supabase `app_metadata` contains `"hisaab_role": "admin"`. Do not assign roles through user-editable metadata or the browser client.

The current MVP stores uploaded bills and generated PDFs on the backend’s local filesystem, not Supabase Storage. Authentication and RLS do not by themselves make the application HIPAA compliant or production-ready for health records. Use synthetic data until private encrypted file storage, deployment security, retention/deletion controls, and any required legal/vendor agreements are in place.

### Free demo deployment

The root `render.yaml` Blueprint creates a public FastAPI Web Service and a separate Vite Static Site on Render. The backend starts from `app.main:app` in `backend/`, binds to `0.0.0.0` and Render's assigned `PORT`, and exposes `/health`. The frontend build receives the backend host from the Blueprint and uses it for API requests.

Enter these values in Render's Environment settings when prompted:

- Backend Web Service:
  - `DATABASE_URL` — a Supabase PostgreSQL connection string using `postgresql+psycopg://`
  - `GEMINI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_JWT_SECRET` — add only if the Supabase project signs access tokens with HS256
- Frontend Static Site:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` — the public anon/publishable key, never a service-role key

The Blueprint connects `VITE_API_BASE` to the backend host and `CORS_ORIGINS` to the frontend host. Add the deployed frontend URL to Supabase Authentication's Site URL and redirect URL allowlist after Render assigns it.

The backend stores uploaded bills and generated reports on its local filesystem. Render's free web service has ephemeral storage and may sleep when idle; uploads and reports can be lost on sleep, restart, or redeploy. The database must be external PostgreSQL (such as Supabase), not SQLite. Use fictional test bills only; do not use this demo for real patient records or production.

### Vercel multi-service demo

The root `vercel.json` configures one Vercel project with the FastAPI backend at `app.main:app` and the Vite frontend. Requests to `/api/*` and `/health` go to the backend; browser routes are served through the frontend's `index.html`, while assets are served directly. The frontend uses same-origin API requests, so leave `VITE_API_BASE` unset.

Enter variables directly in Vercel's Environment Variables settings; do not upload a local `.env` file. Configure `DATABASE_URL`, `GEMINI_API_KEY`, and `SUPABASE_URL` for the backend service. Add `SUPABASE_JWT_SECRET` only if your Supabase project uses HS256 signing. Configure `VITE_SUPABASE_URL` and the public `VITE_SUPABASE_ANON_KEY` for the frontend. Never prefix private values with `VITE_`. Set the backend's `UPLOAD_DIR` and `REPORT_DIR` to writable temporary paths such as `/tmp/uploads` and `/tmp/reports`.

Vercel's function filesystem is temporary: bill uploads and generated reports are not persistent, and uploads may not survive between separate invocations. The application's 10 MB upload setting may also exceed platform request limits. Treat this as a synthetic-bill demo only; use durable object storage and verify the platform's request limits before relying on uploads. Apply `supabase/migrations/20261114000000_bill_review_confirmation.sql` to the existing database before deploying this version.

## Key Design Decisions

- **Gemini is primary**, Python verifies independently. Never trusts AI math blindly.
- **Tesseract is fallback only**, never the primary engine.
- **No double-counting** of overlapping discrepancies in disputed amounts.
- **No fraud accusations** — findings are warnings/possible issues, not confirmed fraud.
- **Benchmark comparisons are indicative** — may not apply to every hospital/patient.
- **SQLite for local tests; Supabase PostgreSQL for a configured deployment.**
- **API keys never exposed** to frontend.

## Testing

```bash
cd backend
pip install pytest
# PowerShell: use an isolated in-memory SQLite database for tests.
$env:DATABASE_URL = "sqlite://"
pytest tests/ -v
```

## Disclaimer

HISAAB helps patients understand and verify hospital bills. It does not:
- Declare that a hospital committed fraud.
- Replace professional medical, legal, or financial advice.
- Guarantee reimbursement.
- Treat every repeated service as a duplicate.

Benchmark comparisons are indicative only and may not apply to every situation.
