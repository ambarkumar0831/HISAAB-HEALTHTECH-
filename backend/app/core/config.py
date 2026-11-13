from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Database
    DATABASE_URL: str = ""

    # File storage
    UPLOAD_DIR: str = "./uploads"
    REPORT_DIR: str = "./generated_reports"
    MAX_UPLOAD_SIZE_MB: int = 10

    # Backend
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "http://localhost:5000,http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> list:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return [
            origin if origin.startswith(("http://", "https://")) else f"https://{origin}"
            for origin in origins
        ]


settings = Settings()
