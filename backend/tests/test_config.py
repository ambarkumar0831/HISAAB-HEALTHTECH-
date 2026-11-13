from app.core.config import Settings


def test_cors_origins_normalize_render_service_hosts():
    settings = Settings(
        _env_file=None,
        CORS_ORIGINS="hisaab-web.onrender.com,https://localhost:5000,http://localhost:5173",
    )

    assert settings.cors_origins_list == [
        "https://hisaab-web.onrender.com",
        "https://localhost:5000",
        "http://localhost:5173",
    ]
