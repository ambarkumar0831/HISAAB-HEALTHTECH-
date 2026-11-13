from sqlalchemy import Column, String, Date, Numeric, Text, DateTime, Integer, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base
import enum


class ExtractionMethod(str, enum.Enum):
    GEMINI = "GEMINI"
    TESSERACT = "TESSERACT"
    MANUAL = "MANUAL"


class AuditStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    FAILED = "FAILED"


class FindingType(str, enum.Enum):
    ARITHMETIC = "ARITHMETIC"
    DUPLICATE = "DUPLICATE"
    BENCHMARK = "BENCHMARK"
    DATE_CHECK = "DATE_CHECK"
    UNCLEAR_CHARGE = "UNCLEAR_CHARGE"


class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Audit(Base):
    __tablename__ = "audits"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    hospital_name = Column(String, nullable=True)
    bill_number = Column(String, nullable=True, index=True)
    bill_date = Column(Date, nullable=True)
    patient_name = Column(String, nullable=True)
    admission_date = Column(Date, nullable=True)
    discharge_date = Column(Date, nullable=True)
    original_total = Column(Numeric(12, 2), nullable=True)
    calculated_total = Column(Numeric(12, 2), nullable=True)
    extraction_method = Column(Enum(ExtractionMethod), default=ExtractionMethod.GEMINI)
    status = Column(Enum(AuditStatus), default=AuditStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    bill_items = relationship("BillItem", back_populates="audit", cascade="all, delete-orphan")
    findings = relationship("AuditFinding", back_populates="audit", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="audit", cascade="all, delete-orphan")


class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(String, primary_key=True, index=True)
    audit_id = Column(String, ForeignKey("audits.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(Text, nullable=True)
    service_date = Column(Date, nullable=True)
    quantity = Column(Numeric(10, 2), nullable=True)
    unit_price = Column(Numeric(12, 2), nullable=True)
    billed_total = Column(Numeric(12, 2), nullable=True)
    expected_total = Column(Numeric(12, 2), nullable=True)
    category = Column(String, nullable=True)
    is_flagged = Column(Integer, default=0)

    audit = relationship("Audit", back_populates="bill_items")


class AuditFinding(Base):
    __tablename__ = "findings"

    id = Column(String, primary_key=True, index=True)
    audit_id = Column(String, ForeignKey("audits.id", ondelete="CASCADE"), nullable=False, index=True)
    bill_item_id = Column(String, ForeignKey("bill_items.id", ondelete="SET NULL"), nullable=True, index=True)
    finding_type = Column(Enum(FindingType), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    reason_code = Column(String, nullable=True)
    severity = Column(Enum(Severity), default=Severity.MEDIUM)
    confidence = Column(Numeric(3, 2), nullable=True)
    expected_value = Column(Numeric(12, 2), nullable=True)
    actual_value = Column(Numeric(12, 2), nullable=True)
    estimated_difference = Column(Numeric(12, 2), nullable=True)
    status = Column(String, default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    audit = relationship("Audit", back_populates="findings")


class BenchmarkRate(Base):
    __tablename__ = "benchmarks"

    id = Column(String, primary_key=True, index=True)
    service_name = Column(String, nullable=False)
    normalized_service_name = Column(String, nullable=True, index=True)
    category = Column(String, nullable=True)
    rate = Column(Numeric(12, 2), nullable=False)
    source_name = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    location = Column(String, nullable=True)
    applicability_notes = Column(Text, nullable=True)
    effective_from = Column(Date, nullable=True)
    effective_until = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    audit_id = Column(String, ForeignKey("audits.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(String, nullable=False)  # "audit" or "appeal_letter"
    storage_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    audit = relationship("Audit", back_populates="reports")
