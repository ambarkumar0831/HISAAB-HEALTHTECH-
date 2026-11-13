import logging
import os
import uuid
from datetime import datetime
from decimal import Decimal

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

from app.core.config import settings
from app.models.schemas import BillExtraction

logger = logging.getLogger(__name__)


class PDFService:
    """Generates audit report PDFs and appeal letters using ReportLab."""

    def __init__(self):
        self.report_dir = settings.REPORT_DIR
        os.makedirs(self.report_dir, exist_ok=True)

    def _styles(self):
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name="HisaabTitle", fontName="Helvetica-Bold", fontSize=20, textColor=colors.HexColor("#123B3B"), spaceAfter=6))
        styles.add(ParagraphStyle(name="HisaabSubtitle", fontName="Helvetica", fontSize=11, textColor=colors.HexColor("#477C69"), spaceAfter=14))
        styles.add(ParagraphStyle(name="SectionHead", fontName="Helvetica-Bold", fontSize=13, textColor=colors.HexColor("#123B3B"), spaceBefore=12, spaceAfter=4))
        styles.add(ParagraphStyle(name="Body", fontName="Helvetica", fontSize=9.5, leading=13, spaceAfter=4))
        styles.add(ParagraphStyle(name="Small", fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#555555")))
        return styles

    def generate_audit_report(
        self,
        audit_id: str,
        audit: dict,
        bill_items: list,
        findings: list,
        extraction_method: str,
    ) -> str:
        filename = f"audit_report_{audit_id}.pdf"
        path = os.path.join(self.report_dir, filename)
        styles = self._styles()
        doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=16*mm)
        story = []

        # Header
        story.append(Paragraph("HISAAB", styles["HisaabTitle"]))
        story.append(Paragraph("Audit the Hospital Bill — Audit Report", styles["HisaabSubtitle"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#477C69"), spaceAfter=10))

        # Hospital / Bill info
        info = [
            ["Hospital", audit.get("hospital_name") or "—"],
            ["Patient", audit.get("patient_name") or "—"],
            ["Bill Number", audit.get("bill_number") or "—"],
            ["Bill Date", str(audit.get("bill_date")) if audit.get("bill_date") else "—"],
            ["Admission Date", str(audit.get("admission_date")) if audit.get("admission_date") else "—"],
            ["Discharge Date", str(audit.get("discharge_date")) if audit.get("discharge_date") else "—"],
            ["Extraction Method", extraction_method],
            ["Audit Date", datetime.utcnow().strftime("%Y-%m-%d %H:%M")],
        ]
        t = Table(info, colWidths=[40*mm, 120*mm])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#DDEBE3")),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

        # Totals
        orig = audit.get("original_total")
        calc = audit.get("calculated_total")
        totals = [
            ["Total Billed Amount", f"₹{orig}" if orig is not None else "—"],
            ["Independently Calculated Amount", f"₹{calc}" if calc is not None else "—"],
        ]
        t2 = Table(totals, colWidths=[80*mm, 80*mm])
        t2.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#DDEBE3")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#477C69")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t2)
        story.append(Spacer(1, 10))

        # Items table
        story.append(Paragraph("Bill Items", styles["SectionHead"]))
        item_data = [["Item", "Qty", "Unit Price", "Billed Total", "Expected Total", "Status"]]
        for it in bill_items:
            status = "Verified" if (it.get("expected_total") is None or abs((it.get("billed_total") or 0) - (it.get("expected_total") or 0)) < 0.01) else "Mismatch"
            item_data.append([
                it.get("description") or "—",
                str(it.get("quantity") or "—"),
                f"₹{it.get('unit_price')}" if it.get("unit_price") is not None else "—",
                f"₹{it.get('billed_total')}" if it.get("billed_total") is not None else "—",
                f"₹{it.get('expected_total')}" if it.get("expected_total") is not None else "—",
                status,
            ])
        itbl = Table(item_data, colWidths=[45*mm, 15*mm, 25*mm, 25*mm, 25*mm, 25*mm], repeatRows=1)
        itbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#123B3B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#DDEBE3")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(itbl)
        story.append(Spacer(1, 10))

        # Findings
        story.append(Paragraph("Audit Findings", styles["SectionHead"]))
        if not findings:
            story.append(Paragraph("No significant findings. The bill appears arithmetically consistent.", styles["Body"]))
        else:
            for f in findings:
                story.append(Paragraph(f"<b>{f.get('title')}</b>", styles["Body"]))
                story.append(Paragraph(f"{f.get('description') or ''}", styles["Body"]))
                if f.get("estimated_difference") is not None:
                    story.append(Paragraph(f"Estimated difference: ₹{f['estimated_difference']}", styles["Small"]))
                story.append(Spacer(1, 4))

        story.append(Spacer(1, 14))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#DDEBE3"), spaceAfter=6))
        story.append(Paragraph(
            "Disclaimer: HISAAB helps patients understand and verify hospital bills. It does not declare fraud, "
            "replace professional medical, legal, or financial advice, or guarantee reimbursement. Benchmark comparisons "
            "are indicative only and may not apply to every hospital, patient, or treatment.",
            styles["Small"],
        ))

        doc.build(story)
        logger.info(f"Generated audit report: {path}")
        return path

    def generate_appeal_letter(
        self,
        audit_id: str,
        audit: dict,
        findings: list,
        patient_name: str,
        hospital_name: str,
        bill_number: str,
        bill_date: str,
    ) -> str:
        filename = f"appeal_letter_{audit_id}.pdf"
        path = os.path.join(self.report_dir, filename)
        styles = self._styles()
        doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=18*mm)
        story = []

        story.append(Paragraph("HISAAB", styles["HisaabTitle"]))
        story.append(Paragraph("Grievance / Appeal Letter — Draft", styles["HisaabSubtitle"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#477C69"), spaceAfter=10))

        story.append(Paragraph(f"Date: {datetime.utcnow().strftime('%d %B %Y')}", styles["Body"]))
        story.append(Spacer(1, 6))
        story.append(Paragraph("To,", styles["Body"]))
        story.append(Paragraph("The Grievance / Billing Authority", styles["Body"]))
        story.append(Paragraph(hospital_name or "Hospital Name", styles["Body"]))
        story.append(Spacer(1, 10))

        story.append(Paragraph("Subject: Request for itemized clarification of hospital bill", styles["Body"]))
        story.append(Spacer(1, 8))

        story.append(Paragraph(
            f"Dear Sir / Madam,<br/><br/>"
            f"I am writing with respect to hospital bill number <b>{bill_number}</b> dated {bill_date or '—'} "
            f"issued by {hospital_name or 'the hospital'} for patient {patient_name or 'the patient'}.",
            styles["Body"],
        ))
        story.append(Spacer(1, 6))

        story.append(Paragraph(
            "After reviewing the bill using an independent audit tool, I have identified the following entries "
            "that require clarification or correction:",
            styles["Body"],
        ))
        story.append(Spacer(1, 6))

        if findings:
            for idx, f in enumerate(findings, 1):
                story.append(Paragraph(
                    f"{idx}. <b>{f.get('title')}</b><br/>{f.get('description') or ''}", styles["Body"]
                ))
                if f.get("estimated_difference") is not None:
                    story.append(Paragraph(f"Estimated amount in question: ₹{f['estimated_difference']}", styles["Small"]))
                story.append(Spacer(1, 4))
        else:
            story.append(Paragraph("No discrepancies were identified in this audit.", styles["Body"]))
            story.append(Spacer(1, 4))

        story.append(Paragraph(
            "I request the hospital to:<br/>"
            "&nbsp;&nbsp;1. Provide an itemized breakdown of the charges listed above.<br/>"
            "&nbsp;&nbsp;2. Clarify the basis for each charge and share supporting documentation.<br/>"
            "&nbsp;&nbsp;3. Correct any errors and issue a revised bill if applicable.<br/>"
            "&nbsp;&nbsp;4. Provide a written response to this query.<br/><br/>",
            styles["Body"],
        ))

        story.append(Paragraph(
            "This letter is a request for clarification and does not constitute a legal accusation. "
            "I welcome the opportunity to resolve this amicably.",
            styles["Body"],
        ))
        story.append(Spacer(1, 16))

        story.append(Paragraph("Yours sincerely,", styles["Body"]))
        story.append(Spacer(1, 20))
        story.append(Paragraph("_________________________", styles["Body"]))
        story.append(Paragraph(patient_name or "Patient / Representative", styles["Body"]))
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"Bill Reference: {bill_number}", styles["Small"]))

        doc.build(story)
        logger.info(f"Generated appeal letter: {path}")
        return path
