"""Tests for the Python audit engine (deterministic verification)."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.schemas import BillExtraction, BillItemExtract
from app.services.audit_engine import AuditEngine


def _extraction(items, grand_total, subtotal=None, discount=0, tax=0):
    return BillExtraction(
        hospital_name="Test Hospital",
        bill_number="BILL-TEST",
        items=items,
        subtotal=subtotal,
        discount=discount,
        tax=tax,
        grand_total=grand_total,
        extraction_method="GEMINI",
    )


def test_correct_bill_no_findings():
    """A correct bill should produce no arithmetic findings."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Blood Test", quantity=2, unit_price=500, total=1000),
            BillItemExtract(item_name="X-Ray", quantity=1, unit_price=800, total=800),
        ],
        grand_total=1800,
        subtotal=1800,
    )
    result = engine.audit(extraction)
    arith = [f for f in result["findings"] if f["finding_type"] == "ARITHMETIC"]
    assert len(arith) == 0
    assert result["calculated_total"] == 1800.0
    assert result["summary"]["confirmed_arithmetic_discrepancy"] == 0.0


def test_incorrect_item_multiplication():
    """Item total != quantity * unit price should be flagged."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Blood Test", quantity=2, unit_price=500, total=1200),  # should be 1000
        ],
        grand_total=1200,
    )
    result = engine.audit(extraction)
    arith = [f for f in result["findings"] if f["finding_type"] == "ARITHMETIC"]
    assert len(arith) >= 1
    assert any("mismatch" in f["title"].lower() for f in arith)
    assert result["summary"]["confirmed_arithmetic_discrepancy"] == 200.0


def test_incorrect_grand_total():
    """Grand total mismatch should be flagged."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Consultation", quantity=1, unit_price=600, total=600),
        ],
        grand_total=1000,  # should be 600
    )
    result = engine.audit(extraction)
    arith = [f for f in result["findings"] if f["finding_type"] == "ARITHMETIC"]
    assert any(f["reason_code"] == "GRAND_TOTAL_MISMATCH" for f in arith)


def test_discount_and_tax():
    """Discount and tax should be included in grand total calc."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Blood Test", quantity=1, unit_price=500, total=500),
        ],
        grand_total=540,  # 500 - 0 + 40 tax = 540 -> correct
        subtotal=500,
        tax=40,
    )
    result = engine.audit(extraction)
    arith = [f for f in result["findings"] if f["finding_type"] == "ARITHMETIC" and f["reason_code"] == "GRAND_TOTAL_MISMATCH"]
    assert len(arith) == 0, "Correct discount/tax should not flag"


def test_rounding_difference_treated_as_match():
    """Small rounding differences should be treated as OK."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Item", quantity=3, unit_price=0.10, total=0.30),
        ],
        grand_total=0.30,
    )
    result = engine.audit(extraction)
    arith = [f for f in result["findings"] if f["finding_type"] == "ARITHMETIC" and f["reason_code"] == "ITEM_TOTAL_MISMATCH"]
    assert len(arith) == 0


def test_zero_totals_are_preserved():
    """Zero is a valid amount, not a missing value."""
    engine = AuditEngine()
    extraction = _extraction(
        [BillItemExtract(item_name="No-charge item", quantity=1, unit_price=0, total=0)],
        grand_total=0,
        subtotal=0,
    )

    result = engine.audit(extraction)

    assert result["original_total"] == 0.0
    assert result["calculated_total"] == 0.0
    assert result["arithmetic"]["item_checks"][0]["expected_total"] == 0.0


def test_exact_duplicate_flagged():
    """Same item name + same total = possible duplicate."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Blood Test", quantity=1, unit_price=500, total=500),
            BillItemExtract(item_name="Blood Test", quantity=1, unit_price=500, total=500),
        ],
        grand_total=1000,
    )
    result = engine.audit(extraction)
    dups = [f for f in result["findings"] if f["finding_type"] == "DUPLICATE"]
    assert len(dups) == 1
    assert "duplicate" in dups[0]["title"].lower()


def test_similar_description_flagged():
    """Similar descriptions (CBC vs Complete Blood Count) with same total flagged."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Lipid Panel", quantity=1, unit_price=500, total=500),
            BillItemExtract(item_name="Lipid Profile", quantity=1, unit_price=500, total=500),
        ],
        grand_total=1000,
    )
    result = engine.audit(extraction)
    dups = [f for f in result["findings"] if f["finding_type"] == "DUPLICATE"]
    assert len(dups) == 1


def test_repeated_legitimate_service_not_auto_flagged_if_amount_differs():
    """Same service on different dates with different amounts should not be a duplicate."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Blood Test", quantity=1, unit_price=500, total=500),
            BillItemExtract(item_name="Blood Test", quantity=2, unit_price=500, total=1000),
        ],
        grand_total=1500,
    )
    result = engine.audit(extraction)
    dups = [f for f in result["findings"] if f["finding_type"] == "DUPLICATE"]
    # Different totals -> not flagged as duplicate (same name but different total)
    assert len(dups) == 0


def test_unclear_charge_missing_description():
    """Generic/missing description should be flagged as unclear."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Miscellaneous", quantity=None, unit_price=None, total=1500),
        ],
        grand_total=1500,
    )
    result = engine.audit(extraction)
    unclear = [f for f in result["findings"] if f["finding_type"] == "UNCLEAR_CHARGE"]
    assert len(unclear) == 1


def test_no_double_counting_in_summary():
    """Grand total, subtotal, and item mismatches must not be summed together."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Blood Test", quantity=2, unit_price=500, total=1200),  # +200 mismatch
        ],
        grand_total=1200,  # calculated 1000 -> +200 diff
    )
    result = engine.audit(extraction)
    # The authoritative figure is grand_total_difference (200), not sum of all three (600)
    assert result["summary"]["confirmed_arithmetic_discrepancy"] == 200.0, (
        f"Expected 200 (no double counting), got {result['summary']['confirmed_arithmetic_discrepancy']}"
    )


def test_missing_values_cannot_be_verified():
    """Items missing qty/price/total are skipped in arithmetic (not auto-flagged as error)."""
    engine = AuditEngine()
    extraction = _extraction(
        [
            BillItemExtract(item_name="Unclear Item", quantity=None, unit_price=None, total=None),
        ],
        grand_total=500,
    )
    result = engine.audit(extraction)
    arith = [f for f in result["findings"] if f["finding_type"] == "ARITHMETIC"]
    # No arithmetic findings because values are missing
    item_mismatches = [f for f in arith if f["reason_code"] == "ITEM_TOTAL_MISMATCH"]
    assert len(item_mismatches) == 0


if __name__ == "__main__":
    test_correct_bill_no_findings()
    test_incorrect_item_multiplication()
    test_incorrect_grand_total()
    test_discount_and_tax()
    test_rounding_difference_treated_as_match()
    test_exact_duplicate_flagged()
    test_similar_description_flagged()
    test_repeated_legitimate_service_not_auto_flagged_if_amount_differs()
    test_unclear_charge_missing_description()
    test_no_double_counting_in_summary()
    test_missing_values_cannot_be_verified()
    print("All audit engine tests passed!")
