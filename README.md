# HISAAB — Audit the Hospital Bill

**Team:** AFTERSHOCK  
**Track:** HealthTech | COLOSSUS 3.0 (24-Hour National Level Hackathon)  
**Event:** Dr. Ambedkar Institute of Technology, Bengaluru

## Overview

HISAAB is an AI-powered hospital bill auditing platform that helps patients understand and verify their hospital bills.

Users upload a hospital bill (PDF, JPG, PNG). The application:
1. Reads the bill using **Google Gemini API** (primary).
2. Falls back to **Tesseract OCR** if Gemini extraction fails.
3. Independently verifies calculations using a **Python audit engine**.
4. Detects duplicate entries, arithmetic errors, and unclear charges.
5. Compares charges against verified **benchmark rates** (PM-JAY, CGHS, state schedules).
6. Generates an understandable audit report and a downloadable **grievance appeal letter** (PDF).

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
4. Start the backend once so SQLAlchemy creates the MVP tables, then run `supabase/migrations/20261113000000_hisaab_rls.sql` in the Supabase SQL Editor. Apply the migration before using real patient records. The API also checks audit ownership; the migration adds a database-level RLS layer.
5. Restart the frontend after changing `.env.local`, open `http://localhost:5000`, create an account, confirm the email, and sign in. Password recovery returns to `/login`.

Benchmark writes are restricted to users whose trusted Supabase `app_metadata` contains `"hisaab_role": "admin"`. Do not assign roles through user-editable metadata or the browser client.

The current MVP stores uploaded bills and generated PDFs on the backend’s local filesystem, not Supabase Storage. Authentication and RLS do not by themselves make the application HIPAA compliant or production-ready for health records. Use synthetic data until private encrypted file storage, deployment security, retention/deletion controls, and any required legal/vendor agreements are in place.

### Free demo deployment

The frontend can be deployed from `frontend/` on Vercel. The FastAPI backend can be deployed from the root `render.yaml` Blueprint on Render. Set these Vercel environment variables for Production:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE` — the deployed Render service URL, without a trailing slash

Set these Render environment variables when creating the Blueprint:

- `DATABASE_URL` — the Supabase PostgreSQL connection string using `postgresql+psycopg://`
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET` — only required if the Supabase project signs access tokens with HS256
- `CORS_ORIGINS` — the exact Vercel production origin and, if needed, `http://localhost:5000`

After both services deploy, add the Vercel URL to Supabase Authentication’s Site URL and redirect URL allowlist. Render’s free service uses an ephemeral filesystem and spins down when idle; uploaded bills and generated reports can be lost on sleep, restart, or redeploy. Use synthetic data only. Do not use the free demo for real patient records or production.

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
