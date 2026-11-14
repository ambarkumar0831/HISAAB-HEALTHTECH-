import logging
import os
import uuid
from datetime import datetime
from decimal import Decimal
from xml.sax.saxutils import escape, quoteattr

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
        calculated_subtotal = (
            sum((it["expected_total"] for it in bill_items), 0)
            if bill_items and all(it.get("expected_total") is not None for it in bill_items)
            else None
        )
        totals = [
            ["Line subtotal (quantity × unit price)", f"₹{calculated_subtotal}" if calculated_subtotal is not None else "Not checked"],
            ["Subtotal printed on bill", f"₹{audit['subtotal']}" if audit.get("subtotal") is not None else "Not extracted"],
            ["Discount", f"− ₹{audit['discount']}" if audit.get("discount") is not None else "Not extracted"],
            ["Tax", f"+ ₹{audit['tax']}" if audit.get("tax") is not None else "Not extracted"],
            ["Calculated final total", f"₹{calc}" if calc is not None else "Not checked"],
            ["Total shown on bill", f"₹{orig}" if orig is not None else "Not extracted"],
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
            expected_total = it.get("expected_total")
            billed_total = it.get("billed_total")
            status = (
                "Not compared"
                if expected_total is None or billed_total is None
                else "Matches"
                if abs(billed_total - expected_total) < 0.01
                else "Check total"
            )
            item_data.append([
                it.get("description") or "—",
                str(it.get("quantity")) if it.get("quantity") is not None else "—",
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

        benchmark_review = audit.get("benchmark_review") or {}
        story.append(Paragraph("Published Rate Reference", styles["SectionHead"]))
        if benchmark_review.get("source_url"):
            source_name = escape(str(benchmark_review.get("source_name") or "Published source"))
            story.append(Paragraph(
                f"Source: {source_name} · "
                f"<link href={quoteattr(str(benchmark_review['source_url']))} color='#477C69'>View source</link>",
                styles["Body"],
            ))
            for comparison in benchmark_review.get("comparisons", []):
                effective_from = comparison.get("effective_from")
                effective_until = comparison.get("effective_until")
                period = (
                    f" · effective {escape(str(effective_from))}"
                    f"{' through ' + escape(str(effective_until)) if effective_until else ''}"
                    if effective_from
                    else ""
                )
                story.append(Paragraph(
                    f"{escape(str(comparison.get('item_name') or 'Bill item'))}: "
                    f"unit price ₹{comparison.get('unit_price')} vs reference ₹{comparison.get('reference_rate')}{period}. "
                    f"{escape(str(comparison.get('applicability_notes') or 'Applicability is not verified.'))}",
                    styles["Small"],
                ))
        else:
            story.append(Paragraph(
                escape(str(benchmark_review.get("not_checked_reason") or "No source-backed rate comparison was made.")),
                styles["Body"],
            ))

        # Findings
        story.append(Paragraph("Audit Findings", styles["SectionHead"]))
        if not findings:
            story.append(Paragraph(
                "No review prompts were generated. This does not confirm every bill entry is correct.",
                styles["Body"],
            ))
        else:
            for f in findings:
                story.append(Paragraph(f"<b>{escape(str(f.get('title') or 'Review prompt'))}</b>", styles["Body"]))
                story.append(Paragraph(escape(str(f.get("description") or "")), styles["Body"]))
                if f.get("estimated_difference") is not None:
                    story.append(Paragraph(f"Estimated difference: ₹{f['estimated_difference']}", styles["Small"]))
                if f.get("source_url"):
                    story.append(Paragraph(
                        f"Source: {escape(str(f.get('source_name') or 'Published source'))}"
                        f"{' · effective ' + escape(str(f['source_date'])) if f.get('source_date') else ''}"
                        f" · <link href={quoteattr(str(f['source_url']))} color='#477C69'>View source</link>",
                        styles["Small"],
                    ))
                    if f.get("applicability_notes"):
                        story.append(Paragraph(escape(str(f["applicability_notes"])), styles["Small"]))
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
        questions: list | None = None,
    ) -> str:
        filename = f"appeal_letter_{audit_id}.pdf"
        path = os.path.join(self.report_dir, filename)
        styles = self._styles()
        doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=18*mm)
        story = []

        story.append(Paragraph("HISAAB", styles["HisaabTitle"]))
        story.append(Paragraph("Hospital Bill Questions — Draft", styles["HisaabSubtitle"]))
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
            f"I am writing with respect to hospital bill number <b>{escape(str(bill_number))}</b> dated {escape(str(bill_date or '—'))} "
            f"issued by {escape(str(hospital_name or 'the hospital'))} for patient {escape(str(patient_name or 'the patient'))}.",
            styles["Body"],
        ))
        story.append(Spacer(1, 6))

        story.append(Paragraph(
            "An automated review raised the following entries for clarification. These prompts are not confirmed errors:",
            styles["Body"],
        ))
        story.append(Spacer(1, 6))

        if findings:
            for idx, f in enumerate(findings, 1):
                story.append(Paragraph(
                    f"{idx}. <b>{escape(str(f.get('title') or 'Review prompt'))}</b><br/>{escape(str(f.get('description') or ''))}", styles["Body"]
                ))
                if f.get("estimated_difference") is not None:
                    story.append(Paragraph(f"Estimated amount in question: ₹{f['estimated_difference']}", styles["Small"]))
                story.append(Spacer(1, 4))
        else:
            story.append(Paragraph(
                "No review prompts were generated. Please still compare the extracted details with the original bill.",
                styles["Body"],
            ))
            story.append(Spacer(1, 4))

        if questions is not None:
            if questions:
                story.append(Paragraph("Questions for the hospital:", styles["Body"]))
                for idx, question in enumerate(questions, 1):
                    story.append(Paragraph(f"{idx}. {escape(question.strip())}", styles["Body"]))
            else:
                story.append(Paragraph("No custom questions were added.", styles["Body"]))
        else:
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
        story.append(Paragraph(escape(str(patient_name or "Patient / Representative")), styles["Body"]))
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"Bill Reference: {escape(str(bill_number))}", styles["Small"]))

        doc.build(story)
        logger.info(f"Generated appeal letter: {path}")
        return path
