import asyncio

from PIL import Image

from app.services.ocr_service import OCRService


def test_tesseract_availability_requires_an_executable(monkeypatch):
    monkeypatch.setattr(OCRService, "_find_tesseract", staticmethod(lambda: None))

    service = OCRService()

    assert service.is_available() is False


def test_tesseract_resolves_standard_windows_install(monkeypatch, tmp_path):
    import pytesseract

    executable = tmp_path / "Tesseract-OCR" / "tesseract.exe"
    executable.parent.mkdir()
    executable.touch()
    monkeypatch.delenv("TESSERACT_CMD", raising=False)
    monkeypatch.setenv("ProgramFiles", str(tmp_path))
    monkeypatch.setattr("shutil.which", lambda _: None)
    monkeypatch.setattr(pytesseract, "get_tesseract_version", lambda: "5.4.0")

    service = OCRService()

    assert service.is_available() is True
    assert pytesseract.pytesseract.tesseract_cmd == str(executable)


def test_ocr_parser_accepts_only_clear_rows_and_labeled_totals():
    service = OCRService.__new__(OCRService)
    extraction = service._parse_ocr_text(
        "\n".join(
            [
                "City Hospital",
                "Invoice No 48320",
                "Consultation 1 800.00 800.00",
                "CBC 1 Rs. 650.00 Rs. 650.00",
                "Date 14/11/2026",
                "Sub Total: 1,450.00",
                "Grand Total: 1,450.00",
                "Total 99.00",
            ]
        )
    )

    assert [item.item_name for item in extraction.items] == ["Consultation", "CBC"]
    assert [item.total for item in extraction.items] == [800, 650]
    assert extraction.subtotal == 1450
    assert extraction.grand_total == 1450
    assert {"items", "subtotal", "discount", "tax", "grand_total"}.issubset(
        extraction.uncertain_fields
    )


def test_ocr_extraction_marks_every_amount_for_review(monkeypatch, tmp_path):
    import pytesseract

    image_path = tmp_path / "bill.png"
    Image.new("RGB", (20, 20), "white").save(image_path)
    monkeypatch.setattr(OCRService, "_find_tesseract", staticmethod(lambda: "tesseract"))
    monkeypatch.setattr(pytesseract, "get_tesseract_version", lambda: "5.4.0")
    monkeypatch.setattr(
        pytesseract,
        "image_to_string",
        lambda image: "Consultation 1 800.00 800.00\nGrand Total 800.00",
    )

    extraction = asyncio.run(OCRService().extract_bill(str(image_path)))

    assert extraction.extraction_method == "TESSERACT"
    assert extraction.grand_total == 800
    assert {"items", "grand_total"}.issubset(extraction.uncertain_fields)
