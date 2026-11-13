import logging
import os
from typing import Optional
from PIL import Image

from app.core.config import settings
from app.models.schemas import BillExtraction, BillItemExtract

logger = logging.getLogger(__name__)


class OCRService:
    """Tesseract OCR fallback for bill text extraction."""

    def __init__(self):
        self.available = self._check_tesseract()

    def _check_tesseract(self) -> bool:
        try:
            import pytesseract  # noqa: F401
            return True
        except ImportError:
            logger.warning("pytesseract not installed; OCR fallback unavailable")
            return False

    def is_available(self) -> bool:
        return self.available

    async def extract_bill(self, file_path: str) -> BillExtraction:
        """Extract text via Tesseract OCR and parse into BillExtraction.

        Raises ValueError if OCR cannot produce usable data.
        """
        if not self.available:
            raise ValueError("OCR fallback is not available (pytesseract/tesseract not installed)")

        import pytesseract

        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
        except Exception as exc:
            # Try converting PDF to image
            try:
                text = self._extract_from_pdf(file_path)
            except Exception as pdf_exc:
                raise ValueError(f"OCR failed: {str(exc)}; PDF conversion failed: {str(pdf_exc)}")

        if not text or len(text.strip()) < 10:
            raise ValueError("OCR produced no usable text")

        parsed = self._parse_ocr_text(text)
        parsed.extraction_method = "TESSERACT"
        return parsed

    def _extract_from_pdf(self, file_path: str) -> str:
        import pytesseract
        try:
            from pdf2image import convert_from_path
        except ImportError:
            raise ImportError("pdf2image is required for PDF OCR fallback")

        images = convert_from_path(file_path)
        texts = []
        for img in images:
            texts.append(pytesseract.image_to_string(img))
        return "\n".join(texts)

    def _parse_ocr_text(self, text: str) -> BillExtraction:
        """Heuristic parsing of OCR text into a BillExtraction.

        This is a best-effort parser. Unclear fields are marked uncertain so the
        user can manually correct them.
        """
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        items: List[BillItemExtract] = []
        uncertain: List[str] = []

        hospital_name = None
        bill_number = None
        patient_name = None
        grand_total = None
        subtotal = None

        for line in lines:
            low = line.lower()
            if any(k in low for k in ["hospital", "clinic", "centre", "center"]):
                if not hospital_name:
                    hospital_name = line
            if any(k in low for k in ["bill no", "bill number", "invoice no", "invoice #"]):
                bill_number = line
            if any(k in low for k in ["patient", "name"]):
                if not patient_name:
                    patient_name = line
            if any(k in low for k in ["grand total", "total amount", "total"]):
                # crude numeric capture
                import re
                nums = re.findall(r"[\d,]+\.?\d*", line)
                if nums:
                    try:
                        grand_total = float(nums[-1].replace(",", ""))
                    except ValueError:
                        uncertain.append("grand_total")

        # Attempt to find line-item-like rows: description ... qty ... price ... total
        import re
        for line in lines:
            nums = re.findall(r"[\d,]+\.?\d*", line)
            if len(nums) >= 2:
                # Heuristic: treat as a possible item
                desc = re.sub(r"[\d,]+\.?\d*", "", line).strip()
                if desc and len(desc) > 2:
                    try:
                        qty = float(nums[0].replace(",", ""))
                        price = float(nums[-2].replace(",", "")) if len(nums) >= 3 else None
                        total = float(nums[-1].replace(",", ""))
                        items.append(BillItemExtract(
                            item_name=desc or "Unidentified item",
                            quantity=qty if qty else None,
                            unit_price=price,
                            total=total,
                            confidence=0.5,
                        ))
                    except ValueError:
                        uncertain.append("items")

        if grand_total is None:
            uncertain.append("grand_total")
        if subtotal is None:
            uncertain.append("subtotal")

        return BillExtraction(
            hospital_name=hospital_name,
            bill_number=bill_number,
            patient_name=patient_name,
            grand_total=grand_total,
            subtotal=subtotal,
            items=items,
            uncertain_fields=uncertain,
            extraction_method="TESSERACT",
            currency="INR",
        )
