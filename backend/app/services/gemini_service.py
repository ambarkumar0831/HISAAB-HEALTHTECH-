import os
import json
import logging
from typing import Optional, Dict, Any
from decimal import Decimal

from app.core.config import settings
from app.models.schemas import BillExtraction

logger = logging.getLogger(__name__)


class GeminiService:
    """Primary bill extraction service using Google Gemini API."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self._client = None

    @property
    def client(self):
        if self._client is None:
            if not self.api_key:
                raise ValueError("GEMINI_API_KEY is not configured")
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except ImportError:
                raise ImportError("google-genai package is not installed")
        return self._client

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def extract_bill(self, file_path: str, file_mime: str) -> BillExtraction:
        """Extract structured bill information from an uploaded document.

        Raises ValueError on extraction failure so the caller can fall back to OCR.
        """
        if not self.is_configured():
            raise ValueError("Gemini API key is not configured")

        prompt = self._build_extraction_prompt()

        try:
            # Upload the file to Gemini
            uploaded_file = self.client.files.upload(file=file_path)

            response = self.client.models.generate_content(
                model=self.model,
                contents=[uploaded_file, prompt],
                config={
                    "response_mime_type": "application/json",
                    "response_schema": BillExtraction,
                },
            )

            # Clean up the uploaded file from Gemini
            try:
                self.client.files.delete(name=uploaded_file.name)
            except Exception:
                pass

            raw_text = response.text or ""
            extracted = self._parse_and_validate(raw_text)
            return extracted

        except Exception as exc:
            logger.error(f"Gemini extraction failed: {exc}")
            raise ValueError(f"Gemini extraction failed: {str(exc)}")

    def _build_extraction_prompt(self) -> str:
        return (
            "You are an expert medical billing auditor. Read the uploaded hospital bill "
            "and extract ALL visible information into a structured JSON object.\n\n"
            "Extract these fields:\n"
            "- hospital_name, hospital_address\n"
            "- patient_name, patient_id (if present)\n"
            "- bill_number, bill_date (YYYY-MM-DD)\n"
            "- admission_date, discharge_date (YYYY-MM-DD)\n"
            "- items: list of {item_name, quantity, unit_price, total, category, confidence}\n"
            "- subtotal, discount, tax, grand_total\n"
            "- currency (default INR)\n"
            "- payment_info, miscellaneous_charges\n"
            "- uncertain_fields: list of field names that are unclear or missing\n\n"
            "Rules:\n"
            "- Do not invent patient information or amounts.\n"
            "- If an amount is missing or unreadable, leave it as null (do not assume zero).\n"
            "- Record low-confidence or ambiguous values in uncertain_fields.\n"
            "- Preserve original extracted text where practical.\n"
            "- Return ONLY valid JSON matching the schema.\n"
        )

    def _parse_and_validate(self, raw_text: str) -> BillExtraction:
        """Parse Gemini JSON response and validate with Pydantic."""
        # Strip markdown code fences if present
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)  # raises if invalid JSON
        # Normalize dates: Gemini may return various formats; keep as strings, Pydantic validates loosely
        extraction = BillExtraction.model_validate(data)
        if not extraction.extraction_method:
            extraction.extraction_method = "GEMINI"
        return extraction

    async def explain_findings(
        self,
        bill_data: Dict[str, Any],
        audit_results: Dict[str, Any],
    ) -> str:
        """Ask Gemini to explain Python audit findings in simple patient-friendly language."""
        if not self.is_configured():
            return "AI explanation unavailable (Gemini not configured)."

        prompt = (
            "You are a helpful healthcare billing assistant. Explain the following audit findings "
            "in simple, plain language that an ordinary patient can understand.\n\n"
            "IMPORTANT RULES:\n"
            "- Do NOT modify any calculated amounts.\n"
            "- Do NOT invent benchmark rates or medical procedures.\n"
            "- Do NOT claim the hospital committed fraud.\n"
            "- Clearly separate confirmed arithmetic errors from possible issues.\n"
            "- Keep explanations short and understandable.\n"
            "- Suggest what documents the patient may want to gather.\n\n"
            f"BILL DATA:\n{json.dumps(bill_data, default=str, indent=2)}\n\n"
            f"AUDIT RESULTS:\n{json.dumps(audit_results, default=str, indent=2)}\n\n"
            "Provide a clear, patient-friendly explanation of each finding."
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )
            return response.text or "No explanation generated."
        except Exception as exc:
            logger.error(f"Gemini explanation failed: {exc}")
            return f"Explanation generation failed: {str(exc)}"
