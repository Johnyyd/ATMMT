import re
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator

def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Mật khẩu phải có tối thiểu 8 ký tự.")
    if not re.search(r"[a-z]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.")
    if not re.search(r"[0-9]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ số.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.")
    return v

# --- User & Auth Schemas ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Tên đăng nhập")
    password: str = Field(..., min_length=8, max_length=100, description="Mật khẩu")

    @field_validator("password")
    @classmethod
    def check_password_complexity(cls, v: str) -> str:
        return validate_password_strength(v)

class UserLogin(BaseModel):
    username: str = Field(..., description="Tên đăng nhập")
    password: str = Field(..., description="Mật khẩu")

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    created_at: datetime
    # Profile fields
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = None
    updated_at: Optional[datetime] = None

class PublicUserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = None
    updated_at: Optional[datetime] = None

class AuthResponse(BaseModel):
    user: UserResponse

class UserProfileUpdate(BaseModel):
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def check_new_password_complexity(cls, v: str) -> str:
        return validate_password_strength(v)

class EncryptedPayload(BaseModel):
    encrypted_key: str
    payload: str

# --- Guestbook Schemas ---
class GuestbookCreate(BaseModel):
    author_name: str = Field(..., min_length=2, max_length=50, description="Tên tác giả tin nhắn")
    content: str = Field(..., min_length=1, max_length=1000, description="Nội dung lưu bút")
    avatar_color: str = Field("#2563EB", max_length=20, description="Màu sắc đại diện avatar")
    user_token: Optional[str] = Field(None, max_length=64, description="Session token của người nhắn")
    image: Optional[str] = None

class GuestbookUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000, description="Nội dung tin nhắn sau khi chỉnh sửa")

class GuestbookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_name: str
    content: str
    avatar_color: str
    likes_count: int
    created_at: datetime
    user_token: Optional[str] = None
    user_id: Optional[int] = None
    image: Optional[str] = None
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    author_role: str = "anonymous"  # "admin", "user", or "anonymous"
