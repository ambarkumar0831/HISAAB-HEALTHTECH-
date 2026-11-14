import logging
import os
import re
import shutil
from pathlib import Path
from typing import Dict, List, Optional

from PIL import Image

from app.models.schemas import BillExtraction, BillItemExtract

logger = logging.getLogger(__name__)

_NUMBER = r"(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?"
_CURRENCY = r"(?:(?:₹|INR|Rs\.?)\s*)?"
_ITEM_ROW = re.compile(
    rf"^(?P<description>.+?)\s+(?P<quantity>\d+(?:\.\d+)?)\s+"
    rf"(?P<unit_price>{_CURRENCY}{_NUMBER})\s+"
    rf"(?P<total>{_CURRENCY}{_NUMBER})\s*$",
    re.IGNORECASE,
)

_TOTAL_LABELS = {
    "grand_total": r"(?:grand\s+total|net\s+payable|amount\s+due|total\s+due|total\s+payable|final\s+amount)",
    "subtotal": r"sub\s*total",
    "discount": r"(?:discount|less\s+discount)",
    "tax": r"(?:tax|gst)",
}


def _number_value(value: str) -> float:
    match = re.search(_NUMBER, value)
    if not match:
        raise ValueError(f"No numeric amount found in {value!r}")
    return float(match.group().replace(",", ""))


class OCRService:
    """Tesseract OCR fallback for bill text extraction."""

    def __init__(self):
        self.available = self._check_tesseract()

    @staticmethod
    def _find_tesseract() -> Optional[str]:
        configured_path = os.environ.get("TESSERACT_CMD")
        if configured_path and Path(configured_path).is_file():
            return configured_path

        executable = shutil.which("tesseract")
        if executable:
            return executable

        roots = [
            os.environ.get("ProgramFiles"),
            os.environ.get("ProgramFiles(x86)"),
            os.environ.get("LOCALAPPDATA"),
        ]
        candidates = [
            Path(root) / folder / "tesseract.exe"
            for root in roots
            if root
            for folder in (
                "Tesseract-OCR",
                os.path.join("Programs", "Tesseract-OCR"),
            )
        ]
        return next((str(path) for path in candidates if path.is_file()), None)

    def _check_tesseract(self) -> bool:
        try:
            import pytesseract
        except ImportError:
            logger.warning("pytesseract not installed; OCR fallback unavailable")
            return False

        executable = self._find_tesseract()
        if not executable:
            logger.warning("Tesseract executable not found; OCR fallback unavailable")
            return False

        pytesseract.pytesseract.tesseract_cmd = executable
        try:
            pytesseract.get_tesseract_version()
        except (pytesseract.TesseractNotFoundError, pytesseract.TesseractError, OSError) as exc:
            logger.warning("Tesseract executable could not be started: %s", exc)
            return False
        return True

    def is_available(self) -> bool:
        return self.available

    async def extract_bill(self, file_path: str) -> BillExtraction:
        """Extract a conservative draft from a PDF or image using Tesseract."""
        if not self.available:
            raise ValueError(
                "OCR fallback is unavailable; install Tesseract and ensure it is on PATH"
            )

        import pytesseract

        try:
            if Path(file_path).suffix.lower() == ".pdf":
                text = self._extract_from_pdf(file_path, pytesseract)
            else:
                with Image.open(file_path) as image:
                    rgb_image = image.convert("RGB")
                    try:
                        text = pytesseract.image_to_string(rgb_image)
                    finally:
                        rgb_image.close()
        except (pytesseract.TesseractNotFoundError, pytesseract.TesseractError) as exc:
            raise ValueError(f"Tesseract OCR failed: {exc}") from exc
        except (ImportError, OSError, RuntimeError, ValueError) as exc:
            raise ValueError(f"Could not read the uploaded file for OCR: {exc}") from exc

        if not text or len(text.strip()) < 10:
            raise ValueError("OCR produced no usable text")

        parsed = self._parse_ocr_text(text)
        if not parsed.items and parsed.grand_total is None:
            raise ValueError(
                "OCR could not identify a bill total or itemized charges; try a clearer image"
            )
        parsed.extraction_method = "TESSERACT"
        return parsed

    def _extract_from_pdf(self, file_path: str, pytesseract) -> str:
        try:
            import pypdfium2 as pdfium
        except ImportError as exc:
            raise ImportError("pypdfium2 is required for PDF OCR fallback") from exc

        document = pdfium.PdfDocument(file_path)
        texts = []
        try:
            for page_index in range(len(document)):
                page = document[page_index]
                try:
                    bitmap = page.render(scale=2)
                    try:
                        image = bitmap.to_pil()
                        try:
                            texts.append(pytesseract.image_to_string(image))
                        finally:
                            image.close()
                    finally:
                        bitmap.close()
                finally:
                    page.close()
        finally:
            document.close()
        return "\n".join(texts)

    def _parse_ocr_text(self, text: str) -> BillExtraction:
        """Parse only clearly labeled totals and simple quantity/rate/amount rows."""
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        total_values: Dict[str, List[float]] = {field: [] for field in _TOTAL_LABELS}

        for line in lines:
            for field, labels in _TOTAL_LABELS.items():
                if not re.match(rf"^\s*(?:{labels})\b", line, re.IGNORECASE):
                    continue
                match = re.fullmatch(
                    rf"\s*(?:{labels})\s*(?::|-)?\s*{_CURRENCY}({_NUMBER})\s*",
                    line,
                    re.IGNORECASE,
                )
                if match:
                    total_values[field].append(_number_value(match.group(1)))
                break

        parsed_totals: Dict[str, Optional[float]] = {}
        # OCR values remain uncertain until the user checks them against the bill.
        uncertain = ["items", "subtotal", "discount", "tax", "grand_total"]
        for field in _TOTAL_LABELS:
            values = total_values[field]
            if values and len(set(values)) == 1:
                parsed_totals[field] = values[0]
            else:
                parsed_totals[field] = None

        items = []
        hospital_name = None
        bill_number = None
        patient_name = None

        for line in lines:
            low = line.lower()
            if not hospital_name and any(
                marker in low for marker in ("hospital", "clinic", "centre", "center")
            ):
                hospital_name = line
            if not bill_number and re.search(
                r"\b(?:bill|invoice)\s*(?:no|number|#)\b", low
            ):
                bill_number = line
            if not patient_name and re.search(r"\bpatient\s*(?:name)?\s*:", low):
                patient_name = line

            match = _ITEM_ROW.fullmatch(line)
            if not match:
                continue
            description = match.group("description").strip(" :-")
            if not description or re.search(
                r"\b(?:grand\s+total|sub\s*total|amount\s+due|bill\s+no|invoice\s+no|date)\b",
                description,
                re.IGNORECASE,
            ):
                continue
            try:
                items.append(
                    BillItemExtract(
                        item_name=description,
                        quantity=float(match.group("quantity").replace(",", "")),
                        unit_price=_number_value(match.group("unit_price")),
                        total=_number_value(match.group("total")),
                    )
                )
            except ValueError:
                continue

        return BillExtraction(
            hospital_name=hospital_name,
            bill_number=bill_number,
            patient_name=patient_name,
            grand_total=parsed_totals["grand_total"],
            subtotal=parsed_totals["subtotal"],
            discount=parsed_totals["discount"],
            tax=parsed_totals["tax"],
            items=items,
            uncertain_fields=uncertain,
            extraction_method="TESSERACT",
            currency="INR",
        )
