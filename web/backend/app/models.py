from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # "admin" or "user"
    # Profile fields
    avatar_url = Column(String(255), nullable=True)
    cover_url = Column(String(255), nullable=True)
    display_name = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    website_url = Column(String(255), nullable=True)
    location = Column(String(100), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Account Lockout & Brute Force Protection
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)

    def __init__(self, **kwargs):
        if "failed_login_attempts" not in kwargs:
            kwargs["failed_login_attempts"] = 0
        super().__init__(**kwargs)

    messages = relationship("GuestbookMessage", back_populates="user")

class GuestbookMessage(Base):
    __tablename__ = "guestbook_messages"

    id = Column(Integer, primary_key=True, index=True)
    author_name = Column(String(50), nullable=False)
    content = Column(String(1000), nullable=False)
    avatar_color = Column(String(20), default="#2563EB")
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_token = Column(String(64), nullable=True, index=True)
    
    # New fields for Auth, Moderation & Expiration
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    image = Column(String, nullable=True)

    user = relationship("User", back_populates="messages")
