import os

class Settings:
    PROJECT_NAME: str = "Chat-style Portfolio & Guestbook API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./guestbook.db")
    ENABLE_SWAGGER: bool = os.getenv("ENABLE_SWAGGER", "False").lower() in ("true", "1", "t")

settings = Settings()
