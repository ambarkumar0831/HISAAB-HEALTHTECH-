import asyncio
from types import SimpleNamespace

from app.core.config import settings
from app.services.gemini_service import GeminiService


def test_gemini_schema_omits_defaults_and_parsed_model_keeps_them(monkeypatch):
    class FakeFiles:
        def upload(self, file):
            return SimpleNamespace(name="files/synthetic")

        def delete(self, name):
            pass

    class FakeModels:
        def generate_content(self, *, model, contents, config):
            schema = config["response_schema"]

            def contains_default(value):
                if isinstance(value, dict):
                    return "default" in value or any(
                        contains_default(nested) for nested in value.values()
                    )
                if isinstance(value, list):
                    return any(contains_default(nested) for nested in value)
                return False

            assert not contains_default(schema)
            assert isinstance(schema, dict)
            assert "extraction_method" not in schema["properties"]
            assert config["response_mime_type"] == "application/json"
            return SimpleNamespace(
                text='{"items": [], "uncertain_fields": [], "extraction_method": "OCR"}'
            )

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-only-key")
    service = GeminiService()
    service._client = SimpleNamespace(files=FakeFiles(), models=FakeModels())

    extraction = asyncio.run(
        service.extract_bill("synthetic-bill.png", "image/png")
    )

    assert extraction.currency == "INR"
    assert extraction.extraction_method == "GEMINI"
