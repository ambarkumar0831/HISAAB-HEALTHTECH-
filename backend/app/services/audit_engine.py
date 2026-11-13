import logging
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import List, Optional, Dict, Any, Tuple
from datetime import date

from app.models.schemas import BillExtraction, BillItemExtract

logger = logging.getLogger(__name__)


def _to_decimal(val) -> Optional[Decimal]:
    if val is None:
        return None
    try:
        return Decimal(str(val))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _money(val: Optional[Decimal]) -> Optional[Decimal]:
    if val is None:
        return None
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class AuditEngine:
    """Independent Python auditing engine. Deterministic verification of extracted bills."""

    def __init__(self, benchmark_service=None):
        self.benchmark_service = benchmark_service

    def audit(self, extraction: BillExtraction) -> Dict[str, Any]:
        """Run the full audit pipeline and return structured results."""
        items = extraction.items or []

        arithmetic = self._check_arithmetic(items, extraction)
        duplicates = self._detect_duplicates(items)
        date_checks = self._check_dates(extraction)
        unclear = self._detect_unclear_charges(items)
        benchmark = self._check_benchmarks(items, extraction)

        findings = []
        findings.extend(arithmetic["findings"])
        findings.extend(duplicates["findings"])
        findings.extend(date_checks["findings"])
        findings.extend(unclear["findings"])
        findings.extend(benchmark["findings"])

        # Compute disputed amounts without double-counting overlapping discrepancies.
        # Use the grand total difference as the single authoritative arithmetic figure
        # (item/subtotal mismatches are components of it, so summing all would double-count).
        confirmed_arith_diff = abs(arithmetic.get("grand_total_difference") or 0)
        if confirmed_arith_diff == 0:
            # Fall back to sum of item-level mismatches when no grand total recorded
            confirmed_arith_diff = sum(
                (f["estimated_difference"] or 0)
                for f in findings
                if f["finding_type"] == "ARITHMETIC" and f.get("reason_code") == "ITEM_TOTAL_MISMATCH"
            )
        possible_dup_amount = sum(
            (f["estimated_difference"] or 0) for f in findings if f["finding_type"] == "DUPLICATE"
        )
        benchmark_diff = sum(
            (f["estimated_difference"] or 0) for f in findings if f["finding_type"] == "BENCHMARK"
        )

        original_total = _to_decimal(extraction.grand_total)
        calculated_total = arithmetic.get("calculated_total")

        return {
            "extraction_method": extraction.extraction_method,
            "original_total": float(original_total) if original_total is not None else None,
            "calculated_total": float(calculated_total) if calculated_total is not None else None,
            "arithmetic": arithmetic,
            "duplicates": duplicates,
            "date_checks": date_checks,
            "unclear_charges": unclear,
            "benchmark": benchmark,
            "findings": findings,
            "summary": {
                "confirmed_arithmetic_discrepancy": float(confirmed_arith_diff),
                "possible_duplicate_amount": float(possible_dup_amount),
                "potential_benchmark_difference": float(benchmark_diff),
                "total_findings": len(findings),
                "items_requiring_manual_review": len(unclear["findings"]),
            },
        }

    # ---------------- Arithmetic ----------------

    def _check_arithmetic(
        self, items: List[BillItemExtract], extraction: BillExtraction
    ) -> Dict[str, Any]:
        findings = []
        item_level_diffs = []
        calculated_subtotal = Decimal("0")

        for idx, item in enumerate(items):
            qty = _to_decimal(item.quantity)
            price = _to_decimal(item.unit_price)
            billed_total = _to_decimal(item.total)

            if qty is None or price is None or billed_total is None:
                # Cannot verify without all three values
                continue

            expected = _money(qty * price)
            difference = _money(billed_total - expected)

            item_level_diffs.append({
                "item_index": idx,
                "item_name": item.item_name or f"Item {idx + 1}",
                "quantity": float(qty),
                "unit_price": float(price),
                "billed_total": float(billed_total),
                "expected_total": float(expected),
                "difference": float(difference),
                "status": "MISMATCH" if difference != 0 else "OK",
            })

            calculated_subtotal += expected

            if difference != 0:
                findings.append({
                    "finding_type": "ARITHMETIC",
                    "title": f"Arithmetic mismatch: {item.item_name or 'item'}",
                    "description": (
                        f"Quantity {qty} × Unit price ₹{price} = ₹{expected}, "
                        f"but billed total is ₹{billed_total}."
                    ),
                    "bill_item_id": None,
                    "reason_code": "ITEM_TOTAL_MISMATCH",
                    "severity": "HIGH" if abs(difference) > Decimal("100") else "MEDIUM",
                    "confidence": 0.95,
                    "expected_value": float(expected),
                    "actual_value": float(billed_total),
                    "estimated_difference": float(abs(difference)),
                    "status": "open",
                })

        # Subtotal check
        extracted_subtotal = _to_decimal(extraction.subtotal)
        subtotal_diff = None
        if extracted_subtotal is not None:
            subtotal_diff = _money(extracted_subtotal - calculated_subtotal)
            if subtotal_diff != 0:
                findings.append({
                    "finding_type": "ARITHMETIC",
                    "title": "Subtotal mismatch",
                    "description": (
                        f"Calculated subtotal ₹{calculated_subtotal} vs billed subtotal ₹{extracted_subtotal}."
                    ),
                    "reason_code": "SUBTOTAL_MISMATCH",
                    "severity": "HIGH",
                    "confidence": 0.9,
                    "expected_value": float(calculated_subtotal),
                    "actual_value": float(extracted_subtotal),
                    "estimated_difference": float(abs(subtotal_diff)),
                    "status": "open",
                })

        # Grand total check: subtotal - discount + tax
        discount = _to_decimal(extraction.discount) or Decimal("0")
        tax = _to_decimal(extraction.tax) or Decimal("0")
        grand_total = _to_decimal(extraction.grand_total)

        expected_grand = _money(calculated_subtotal - discount + tax)
        grand_diff = None
        if grand_total is not None:
            grand_diff = _money(grand_total - expected_grand)
            if grand_diff != 0:
                findings.append({
                    "finding_type": "ARITHMETIC",
                    "title": "Grand total mismatch",
                    "description": (
                        f"Expected grand total ₹{expected_grand} (subtotal ₹{calculated_subtotal} "
                        f"- discount ₹{discount} + tax ₹{tax}), but billed ₹{grand_total}."
                    ),
                    "reason_code": "GRAND_TOTAL_MISMATCH",
                    "severity": "HIGH",
                    "confidence": 0.9,
                    "expected_value": float(expected_grand),
                    "actual_value": float(grand_total),
                    "estimated_difference": float(abs(grand_diff)),
                    "status": "open",
                })

        return {
            "calculated_total": expected_grand,
            "calculated_subtotal": float(calculated_subtotal),
            "item_checks": item_level_diffs,
            "subtotal_difference": float(subtotal_diff) if subtotal_diff is not None else None,
            "grand_total_difference": float(grand_diff) if grand_diff is not None else None,
            "findings": findings,
        }

    # ---------------- Duplicates ----------------

    def _detect_duplicates(self, items: List[BillItemExtract]) -> Dict[str, Any]:
        findings = []
        seen: List[Dict[str, Any]] = []

        for idx, item in enumerate(items):
            name = (item.item_name or "").strip().lower()
            if not name:
                continue
            qty = _to_decimal(item.quantity)
            total = _to_decimal(item.total)

            for prev in seen:
                same_name = self._names_similar(name, prev["name"])
                same_date = prev.get("service_date") == getattr(item, "service_date", None)
                same_qty = qty is not None and prev.get("quantity") is not None and qty == prev["quantity"]
                same_total = total is not None and prev.get("total") is not None and total == prev["total"]

                if same_name and same_total:
                    dup_amount = float(total) if total is not None else 0.0
                    findings.append({
                        "finding_type": "DUPLICATE",
                        "title": f"Possible duplicate charge: {item.item_name or 'item'}",
                        "description": (
                            f"'{item.item_name}' appears more than once with the same billed amount "
                            f"₹{total}. Verify whether the service was performed multiple times."
                        ),
                        "bill_item_id": None,
                        "reason_code": "POSSIBLE_DUPLICATE",
                        "severity": "MEDIUM",
                        "confidence": 0.7,
                        "expected_value": None,
                        "actual_value": float(total) if total is not None else None,
                        "estimated_difference": dup_amount,
                        "status": "open",
                    })
                    break

            seen.append({
                "name": name,
                "quantity": qty,
                "total": total,
                "service_date": getattr(item, "service_date", None),
                "index": idx,
            })

        return {
            "possible_duplicates": len(findings),
            "findings": findings,
        }

    @staticmethod
    def _names_similar(a: str, b: str) -> bool:
        if a == b:
            return True
        # Normalize whitespace
        a_norm = " ".join(a.split())
        b_norm = " ".join(b.split())
        if a_norm == b_norm:
            return True
        a_low = a_norm.lower()
        b_low = b_norm.lower()
        # Containment check (e.g., "CBC" in "Complete Blood Count" won't match, but word overlap will)
        if len(a_low) > 3 and len(b_low) > 3:
            if a_low in b_low or b_low in a_low:
                return True
        # Word-overlap check: share at least two significant words
        a_words = {w for w in a_low.split() if len(w) > 3}
        b_words = {w for w in b_low.split() if len(w) > 3}
        if a_words and b_words:
            overlap = a_words & b_words
            if len(overlap) >= 2 or (len(overlap) >= 1 and len(a_words | b_words) <= 3):
                return True
        return False

    # ---------------- Dates ----------------

    def _check_dates(self, extraction: BillExtraction) -> Dict[str, Any]:
        findings = []
        admission = extraction.admission_date
        discharge = extraction.discharge_date
        bill_dt = extraction.bill_date

        if admission and discharge:
            if discharge < admission:
                findings.append({
                    "finding_type": "DATE_CHECK",
                    "title": "Discharge date before admission date",
                    "description": "The discharge date appears earlier than the admission date.",
                    "reason_code": "INVALID_DATE_RANGE",
                    "severity": "MEDIUM",
                    "confidence": 0.8,
                    "expected_value": None,
                    "actual_value": None,
                    "estimated_difference": None,
                    "status": "open",
                })
            else:
                stay_days = (discharge - admission).days
                if stay_days == 0:
                    findings.append({
                        "finding_type": "DATE_CHECK",
                        "title": "Same-day admission and discharge",
                        "description": "Admission and discharge dates are the same. Verify room/day charges.",
                        "reason_code": "SAME_DAY_STAY",
                        "severity": "LOW",
                        "confidence": 0.6,
                        "estimated_difference": None,
                        "status": "open",
                    })

        if bill_dt and admission and bill_dt < admission:
            findings.append({
                "finding_type": "DATE_CHECK",
                "title": "Bill date before admission date",
                "description": "The bill date appears earlier than the admission date.",
                "reason_code": "BILL_BEFORE_ADMISSION",
                "severity": "LOW",
                "confidence": 0.7,
                "status": "open",
            })

        return {
            "admission_date": str(admission) if admission else None,
            "discharge_date": str(discharge) if discharge else None,
            "stay_days": (discharge - admission).days if (admission and discharge) else None,
            "findings": findings,
        }

    # ---------------- Unclear charges ----------------

    def _detect_unclear_charges(self, items: List[BillItemExtract]) -> Dict[str, Any]:
        findings = []
        for item in items:
            name = (item.item_name or "").strip()
            qty = _to_decimal(item.quantity)
            price = _to_decimal(item.unit_price)
            total = _to_decimal(item.total)

            reasons = []
            if not name or name.lower() in ("miscellaneous", "misc", "others", "charges"):
                reasons.append("missing or generic description")
            if price is None and total is not None:
                reasons.append("missing unit price")
            if qty is None and total is not None:
                reasons.append("missing quantity")
            if qty is not None and qty > 10:
                reasons.append(f"unusually high quantity ({qty})")

            if reasons:
                findings.append({
                    "finding_type": "UNCLEAR_CHARGE",
                    "title": f"Unclear charge: {name or 'unidentified item'}",
                    "description": "Possible issues: " + "; ".join(reasons) + ". Please verify with the hospital.",
                    "reason_code": "UNCLEAR_CHARGE",
                    "severity": "LOW",
                    "confidence": 0.5,
                    "expected_value": None,
                    "actual_value": float(total) if total else None,
                    "estimated_difference": float(total) if total else None,
                    "status": "open",
                })

        return {
            "unclear_count": len(findings),
            "findings": findings,
        }

    # ---------------- Benchmarks ----------------

    def _check_benchmarks(
        self, items: List[BillItemExtract], extraction: BillExtraction
    ) -> Dict[str, Any]:
        findings = []
        if not self.benchmark_service:
            return {"benchmarks_checked": 0, "findings": findings}

        benchmarks = self.benchmark_service.list_benchmarks() or []

        for item in items:
            name = (item.item_name or "").strip()
            total = _to_decimal(item.total)
            if not name or total is None:
                continue

            match = self.benchmark_service.find_matching_benchmark(name, benchmarks)
            if not match:
                continue

            bench_rate = _to_decimal(match.get("rate"))
            if bench_rate is None:
                continue

            diff = _money(total - bench_rate)
            if diff != 0:
                findings.append({
                    "finding_type": "BENCHMARK",
                    "title": f"Potential benchmark difference: {name}",
                    "description": (
                        f"Hospital charged ₹{total}; applicable benchmark rate is ₹{bench_rate} "
                        f"({match.get('source_name')}). This may or may not apply to your case."
                    ),
                    "reason_code": "BENCHMARK_DIFFERENCE",
                    "severity": "MEDIUM",
                    "confidence": 0.6,
                    "expected_value": float(bench_rate),
                    "actual_value": float(total),
                    "estimated_difference": float(abs(diff)),
                    "status": "open",
                })

        return {
            "benchmarks_checked": len(benchmarks),
            "findings": findings,
        }
