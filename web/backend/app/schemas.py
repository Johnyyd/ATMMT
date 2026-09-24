from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

# --- User & Auth Schemas ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Tên đăng nhập")
    password: str = Field(..., min_length=6, max_length=100, description="Mật khẩu")

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
    new_password: str = Field(..., min_length=6, max_length=100)

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

# --- Chatbot Schemas ---
class ChatMessageItem(BaseModel):
    role: str = Field(..., description="Role of message sender: 'user' or 'assistant'")
    content: str = Field(..., max_length=2000, description="Message text content")

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Nội dung câu hỏi của người dùng")
    history: Optional[List[ChatMessageItem]] = Field(default_factory=list, description="Lịch sử cuộc trò chuyện")
    provider: str = Field("auto", description="Nhà cung cấp LLM: 'auto', 'openrouter', 'groq'")
    topic_id: Optional[str] = Field("about", description="Topic ID của cuộc trò chuyện")

class ChatResponseData(BaseModel):
    reply: str
    provider_used: str
    model_used: str
    suggested_questions: Optional[List[str]] = Field(default=None, description="2-3 câu hỏi gợi ý tiếp theo")
    error: Optional[str] = None

class ChatAPIResponse(BaseModel):
    success: bool = True
    data: ChatResponseData
