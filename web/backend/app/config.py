import os

class Settings:
    PROJECT_NAME: str = "Chat-style Portfolio & Guestbook API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./guestbook.db")
settings = Settings()
