from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict, field_serializer


def _serialize_dt(value):
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


# ---------- Gemini extraction schema ----------

class BillItemExtract(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item_name: Optional[str] = Field(None, description="Description of the bill item")
    quantity: Optional[float] = Field(None, description="Quantity of the item")
    unit_price: Optional[float] = Field(None, description="Unit price of the item")
    total: Optional[float] = Field(None, description="Billed total for the item")
    category: Optional[str] = Field(None, description="Service category")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Extraction confidence 0-1")


class BillExtraction(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    bill_number: Optional[str] = None
    bill_date: Optional[date] = None
    admission_date: Optional[date] = None
    discharge_date: Optional[date] = None
    items: List[BillItemExtract] = Field(default_factory=list)
    subtotal: Optional[float] = None
    discount: Optional[float] = None
    tax: Optional[float] = None
    grand_total: Optional[float] = None
    currency: Optional[str] = "INR"
    payment_info: Optional[str] = None
    miscellaneous_charges: Optional[str] = None
    uncertain_fields: List[str] = Field(default_factory=list)
    extraction_method: str = "GEMINI"


class AppealQuestions(BaseModel):
    questions: List[Annotated[str, Field(max_length=1000)]] = Field(default_factory=list, max_length=50)


# ---------- Audit finding schema ----------

class AuditFindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    finding_type: str
    title: str
    description: Optional[str] = None
    reason_code: Optional[str] = None
    severity: str
    confidence: Optional[float] = None
    expected_value: Optional[float] = None
    actual_value: Optional[float] = None
    estimated_difference: Optional[float] = None
    bill_item_id: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_date: Optional[date] = None
    applicability_notes: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    @field_serializer("created_at")
    def _serialize_finding_created_at(self, value):
        return _serialize_dt(value)


# ---------- Bill item schema ----------

class BillItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    description: Optional[str] = None
    service_date: Optional[date] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    billed_total: Optional[float] = None
    expected_total: Optional[float] = None
    extraction_confidence: Optional[float] = None
    position: int = 0
    category: Optional[str] = None
    is_flagged: bool = False

    @field_serializer("service_date")
    def _serialize_service_date(self, value):
        return _serialize_dt(value)


# ---------- Audit schemas ----------

class AuditCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    hospital_name: Optional[str] = None
    bill_number: Optional[str] = None
    bill_date: Optional[str] = None
    patient_name: Optional[str] = None
    admission_date: Optional[str] = None
    discharge_date: Optional[str] = None
    original_total: Optional[float] = None
    extraction_method: str = "GEMINI"


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    hospital_name: Optional[str] = None
    bill_number: Optional[str] = None
    bill_date: Optional[date] = None
    patient_name: Optional[str] = None
    admission_date: Optional[date] = None
    discharge_date: Optional[date] = None
    subtotal: Optional[float] = None
    discount: Optional[float] = None
    tax: Optional[float] = None
    original_total: Optional[float] = None
    calculated_total: Optional[float] = None
    uncertain_fields: List[str] = Field(default_factory=list)
    benchmark_review: Optional[dict] = None
    extraction_confirmed: bool = False
    extraction_method: str
    status: str
    created_at: Optional[datetime] = None

    @field_serializer("created_at", "bill_date", "admission_date", "discharge_date")
    def _serialize_dates(self, value):
        return _serialize_dt(value)


class AuditDetailOut(AuditOut):
    bill_items: List[BillItemOut] = Field(default_factory=list)
    findings: List[AuditFindingOut] = Field(default_factory=list)


# ---------- Benchmark schemas ----------

class BenchmarkRateBase(BaseModel):
    service_name: str
    category: Optional[str] = None
    rate: float
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    location: Optional[str] = None
    applicability_notes: Optional[str] = None
    effective_from: Optional[str] = None
    effective_until: Optional[str] = None


class BenchmarkRateOut(BenchmarkRateBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Optional[datetime] = None
    effective_from: Optional[date] = None
    effective_until: Optional[date] = None

    @field_serializer("created_at", "effective_from", "effective_until")
    def _serialize_benchmark_dates(self, value):
        return _serialize_dt(value)


# ---------- Dashboard stats ----------

class DashboardStats(BaseModel):
    total_audits: int = 0
    total_findings: int = 0
    arithmetic_discrepancies: int = 0
    duplicate_entries: int = 0
    benchmark_discrepancies: int = 0
    recent_audits: List[AuditOut] = Field(default_factory=list)
