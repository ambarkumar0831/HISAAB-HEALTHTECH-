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
**Database:** SQLite (MVP) / Supabase PostgreSQL (production)  
**Auth:** Supabase Auth (JWT) + Row Level Security

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
# Edit .env and add your GEMINI_API_KEY
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
# API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

### Environment Variables (.env)
```
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
DATABASE_URL=sqlite:///./hisaab.db   # or Supabase PostgreSQL
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
UPLOAD_DIR=./uploads
REPORT_DIR=./generated_reports
MAX_UPLOAD_SIZE_MB=10
CORS_ORIGINS=http://localhost:5173
```

## Key Design Decisions

- **Gemini is primary**, Python verifies independently. Never trusts AI math blindly.
- **Tesseract is fallback only**, never the primary engine.
- **No double-counting** of overlapping discrepancies in disputed amounts.
- **No fraud accusations** — findings are warnings/possible issues, not confirmed fraud.
- **Benchmark comparisons are indicative** — may not apply to every hospital/patient.
- **SQLite for MVP**, architecture modular for PostgreSQL migration.
- **API keys never exposed** to frontend.

## Testing

```bash
cd backend
pip install pytest
pytest tests/ -v
```

## Disclaimer

HISAAB helps patients understand and verify hospital bills. It does not:
- Declare that a hospital committed fraud.
- Replace professional medical, legal, or financial advice.
- Guarantee reimbursement.
- Treat every repeated service as a duplicate.

Benchmark comparisons are indicative only and may not apply to every situation.
