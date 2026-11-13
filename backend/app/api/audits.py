import os
import uuid
import shutil
import logging
from typing import Optional, List
from decimal import Decimal

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import FileResponse

from app.core.config import settings
from app.database.session import SessionLocal, get_db
from app.models.sqlmodels import Audit, BillItem, AuditFinding, Report, ExtractionMethod, AuditStatus
from app.models.schemas import (
    AuditCreate, AuditOut, AuditDetailOut, BillItemOut, AuditFindingOut,
    BillExtraction,
)
from app.services.gemini_service import GeminiService
from app.services.ocr_service import OCRService
from app.services.audit_engine import AuditEngine
from app.services.benchmark_service import BenchmarkService
from app.services.pdf_service import PDFService
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/audits", tags=["audits"])
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
ALLOWED_MIME = {"image/jpeg", "image/png", "application/pdf"}


def _validate_file(file: UploadFile) -> None:
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Allowed: JPG, JPEG, PNG, PDF")
    if file.content_type and file.content_type not in ALLOWED_MIME and ext != ".pdf":
        raise HTTPException(status_code=400, detail="Unsupported MIME type")


@router.post("/upload", status_code=202)
async def upload_bill(
    file: UploadFile = File(...),
    user_id: str = Form(default="anonymous"),
    db: Session = Depends(get_db),
):
    """Upload a hospital bill and create an audit record."""
    _validate_file(file)

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(status_code=413, detail="File too large")

    audit_id = str(uuid.uuid4())
    safe_name = f"{audit_id}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    with open(file_path, "wb") as f:
        f.write(contents)

    audit = Audit(
        id=audit_id,
        user_id=user_id,
        status=AuditStatus.PENDING,
        extraction_method=ExtractionMethod.GEMINI,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    return {
        "audit_id": audit_id,
        "status": "PENDING",
        "file_path": file_path,
        "message": "Bill uploaded. Call /extract to start extraction.",
    }


@router.post("/{audit_id}/extract", response_model=dict)
async def extract_bill(audit_id: str, db: Session = Depends(get_db)):
    """Extract bill information using Gemini (primary) or Tesseract (fallback)."""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    audit.status = AuditStatus.PROCESSING
    db.commit()

    # Find the uploaded file
    file_path = None
    for fname in os.listdir(settings.UPLOAD_DIR):
        if fname.startswith(f"{audit_id}_"):
            file_path = os.path.join(settings.UPLOAD_DIR, fname)
            break
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    gemini = GeminiService()
    ocr = OCRService()
    extraction: Optional[BillExtraction] = None
    method = "GEMINI"

    # Try Gemini first
    try:
        import mimetypes
        mime, _ = mimetypes.guess_type(file_path)
        extraction = await gemini.extract_bill(file_path, mime or "application/octet-stream")
        method = "GEMINI"
    except Exception as gemini_exc:
        logger.warning(f"Gemini failed for audit {audit_id}: {gemini_exc}")
        # Fallback to Tesseract
        try:
            extraction = await ocr.extract_bill(file_path)
            method = "TESSERACT"
        except Exception as ocr_exc:
            logger.error(f"Both Gemini and OCR failed for audit {audit_id}: {ocr_exc}")
            audit.status = AuditStatus.FAILED
            db.commit()
            raise HTTPException(
                status_code=502,
                detail=f"Extraction failed. Gemini: {gemini_exc}. OCR: {ocr_exc}",
            )

    if not extraction:
        audit.status = AuditStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail="No extraction produced")

    # Save extraction into audit fields
    audit.hospital_name = extraction.hospital_name
    audit.bill_number = extraction.bill_number
    audit.patient_name = extraction.patient_name
    audit.bill_date = extraction.bill_date
    audit.admission_date = extraction.admission_date
    audit.discharge_date = extraction.discharge_date
    audit.grand_total = extraction.grand_total
    audit.original_total = extraction.grand_total
    audit.extraction_method = ExtractionMethod(method)
    audit.status = AuditStatus.COMPLETED
    db.commit()

    # Save bill items
    for item in (extraction.items or []):
        db.add(BillItem(
            id=str(uuid.uuid4()),
            audit_id=audit_id,
            description=item.item_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            billed_total=item.total,
            category=item.category,
        ))
    db.commit()

    return {
        "audit_id": audit_id,
        "extraction_method": method,
        "extraction": extraction.model_dump(),
        "status": "COMPLETED",
        "message": "Extraction complete.",
    }


@router.post("/{audit_id}/analyze", response_model=dict)
async def analyze_audit(audit_id: str, db: Session = Depends(get_db)):
    """Run the Python audit engine on an extracted bill."""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    items = db.query(BillItem).filter(BillItem.audit_id == audit_id).all()
    extraction = BillExtraction(
        hospital_name=audit.hospital_name,
        bill_number=audit.bill_number,
        patient_name=audit.patient_name,
        bill_date=str(audit.bill_date) if audit.bill_date else None,
        admission_date=str(audit.admission_date) if audit.admission_date else None,
        discharge_date=str(audit.discharge_date) if audit.discharge_date else None,
        grand_total=float(audit.original_total) if audit.original_total else None,
        subtotal=None,
        items=[
            BillItemExtract(
                item_name=it.description,
                quantity=float(it.quantity) if it.quantity else None,
                unit_price=float(it.unit_price) if it.unit_price else None,
                total=float(it.billed_total) if it.billed_total else None,
                category=it.category,
            )
            for it in items
        ],
        extraction_method=audit.extraction_method.value if audit.extraction_method else "GEMINI",
    )

    benchmark = BenchmarkService(db)
    engine = AuditEngine(benchmark_service=benchmark)
    result = engine.audit(extraction)

    # Clear previous findings and rewrite
    db.query(AuditFinding).filter(AuditFinding.audit_id == audit_id).delete()

    for f in result["findings"]:
        db.add(AuditFinding(
            id=str(uuid.uuid4()),
            audit_id=audit_id,
            bill_item_id=None,
            finding_type=f["finding_type"],
            title=f["title"],
            description=f.get("description"),
            reason_code=f.get("reason_code"),
            severity=f.get("severity", "MEDIUM"),
            confidence=f.get("confidence"),
            expected_value=f.get("expected_value"),
            actual_value=f.get("actual_value"),
            estimated_difference=f.get("estimated_difference"),
            status=f.get("status", "open"),
        ))

    audit.calculated_total = Decimal(str(result["calculated_total"])) if result.get("calculated_total") else None
    audit.status = AuditStatus.COMPLETED
    db.commit()

    return {
        "audit_id": audit_id,
        "summary": result["summary"],
        "arithmetic": result["arithmetic"],
        "duplicates": result["duplicates"],
        "date_checks": result["date_checks"],
        "unclear_charges": result["unclear_charges"],
        "benchmark": result["benchmark"],
        "findings": result["findings"],
        "original_total": result["original_total"],
        "calculated_total": result["calculated_total"],
        "extraction_method": result["extraction_method"],
    }


@router.get("", response_model=List[AuditOut])
def list_audits(user_id: str = "anonymous", db: Session = Depends(get_db)):
    rows = db.query(Audit).filter(Audit.user_id == user_id).order_by(Audit.created_at.desc()).all()
    return rows


@router.get("/{audit_id}", response_model=AuditDetailOut)
def get_audit(audit_id: str, user_id: str = "anonymous", db: Session = Depends(get_db)):
    audit = db.query(Audit).filter(Audit.id == audit_id, Audit.user_id == user_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit


@router.get("/{audit_id}/report")
def download_report(audit_id: str, user_id: str = "anonymous", db: Session = Depends(get_db)):
    audit = db.query(Audit).filter(Audit.id == audit_id, Audit.user_id == user_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    items = db.query(BillItem).filter(BillItem.audit_id == audit_id).all()
    findings = db.query(AuditFinding).filter(AuditFinding.audit_id == audit_id).all()

    pdf = PDFService()
    path = pdf.generate_audit_report(
        audit_id=audit_id,
        audit={
            "hospital_name": audit.hospital_name,
            "patient_name": audit.patient_name,
            "bill_number": audit.bill_number,
            "bill_date": str(audit.bill_date) if audit.bill_date else None,
            "admission_date": str(audit.admission_date) if audit.admission_date else None,
            "discharge_date": str(audit.discharge_date) if audit.discharge_date else None,
            "original_total": float(audit.original_total) if audit.original_total else None,
            "calculated_total": float(audit.calculated_total) if audit.calculated_total else None,
        },
        bill_items=[
            {
                "description": it.description,
                "quantity": float(it.quantity) if it.quantity else None,
                "unit_price": float(it.unit_price) if it.unit_price else None,
                "billed_total": float(it.billed_total) if it.billed_total else None,
                "expected_total": float(it.expected_total) if it.expected_total else None,
            }
            for it in items
        ],
        findings=[
            {
                "title": f.title,
                "description": f.description,
                "estimated_difference": float(f.estimated_difference) if f.estimated_difference else None,
            }
            for f in findings
        ],
        extraction_method=audit.extraction_method.value if audit.extraction_method else "GEMINI",
    )

    # Record report
    db.add(Report(id=str(uuid.uuid4()), audit_id=audit_id, report_type="audit", storage_path=path))
    db.commit()

    return FileResponse(path, media_type="application/pdf", filename=f"hisaab_audit_{audit_id}.pdf")


@router.get("/{audit_id}/appeal")
def generate_appeal(audit_id: str, user_id: str = "anonymous", db: Session = Depends(get_db)):
    audit = db.query(Audit).filter(Audit.id == audit_id, Audit.user_id == user_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    findings = db.query(AuditFinding).filter(AuditFinding.audit_id == audit_id).all()

    pdf = PDFService()
    path = pdf.generate_appeal_letter(
        audit_id=audit_id,
        audit={},
        findings=[
            {"title": f.title, "description": f.description, "estimated_difference": float(f.estimated_difference) if f.estimated_difference else None}
            for f in findings
        ],
        patient_name=audit.patient_name or "Patient",
        hospital_name=audit.hospital_name or "Hospital",
        bill_number=audit.bill_number or "—",
        bill_date=str(audit.bill_date) if audit.bill_date else "—",
    )

    db.add(Report(id=str(uuid.uuid4()), audit_id=audit_id, report_type="appeal_letter", storage_path=path))
    db.commit()

    return FileResponse(path, media_type="application/pdf", filename=f"hisaab_appeal_{audit_id}.pdf")


@router.delete("/{audit_id}")
def delete_audit(audit_id: str, user_id: str = "anonymous", db: Session = Depends(get_db)):
    audit = db.query(Audit).filter(Audit.id == audit_id, Audit.user_id == user_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    # Delete uploaded file
    for fname in os.listdir(settings.UPLOAD_DIR):
        if fname.startswith(f"{audit_id}_"):
            try:
                os.remove(os.path.join(settings.UPLOAD_DIR, fname))
            except OSError:
                pass

    db.delete(audit)
    db.commit()
    return {"message": "Audit deleted"}
