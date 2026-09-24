import os

class Settings:
    PROJECT_NAME: str = "Chat-style Portfolio & Guestbook API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./guestbook.db")
    
    # AI LLM Provider Configurations
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "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")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")
    
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "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")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

settings = Settings()
