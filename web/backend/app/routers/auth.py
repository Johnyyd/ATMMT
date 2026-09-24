import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, UserResponse, AuthResponse, EncryptedPayload
from app.crypto import decrypt_payload
from app.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from app.rate_limit import auth_rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_FAILED_ATTEMPTS = 5       # Sai tối đa 5 lần
LOCKOUT_DURATION_MINUTES = 15 # Khóa tài khoản trong 15 phút

# Băm mật khẩu giả lập để ngăn chặn Timing Attack (User Enumeration qua phân tích thời gian phản hồi)
DUMMY_PASSWORD_HASH = get_password_hash("dummy_constant_time_pass_for_timing_mitigation_2026")

def authenticate_user(db: Session, username: str, password: str) -> User:
    """
    Xác thực người dùng với các cơ chế phòng thủ chuyên sâu:
    1. Account Lockout: Khóa tài khoản 15 phút khi nhập sai 5 lần liên tiếp (HTTP 403).
    2. Timing Attack Mitigation: Thực thi băm Bcrypt giả lập khi username không tồn tại.
    3. Reset bộ đếm khi đăng nhập thành công hoặc khi hết thời hạn khóa.
    """
    user = db.query(User).filter(User.username == username).first()
    now = datetime.utcnow()

    if user:
        # 1. Kiểm tra tài khoản có đang bị khóa hay không
        if user.locked_until:
            if now < user.locked_until:
                remaining_seconds = int((user.locked_until - now).total_seconds())
                remaining_minutes = max(1, remaining_seconds // 60)
                logger.warning(f"Audit: Rejected login for locked account '{user.username}'. Remaining: {remaining_minutes}m")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Tài khoản đang bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau {remaining_minutes} phút."
                )
            else:
                # Đã hết thời gian khóa -> tự động reset
                user.locked_until = None
                user.failed_login_attempts = 0
                db.commit()

        # 2. Kiểm tra mật khẩu
        is_password_valid = verify_password(password, user.hashed_password)
        if not is_password_valid:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                db.commit()
                logger.warning(f"Security Alert: Account '{user.username}' locked due to {MAX_FAILED_ATTEMPTS} failed attempts.")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Tài khoản đã bị tạm khóa {LOCKOUT_DURATION_MINUTES} phút do nhập sai quá {MAX_FAILED_ATTEMPTS} lần liên tiếp."
                )
            db.commit()
            logger.warning(f"Audit: Failed login for '{user.username}' (attempt {user.failed_login_attempts}/{MAX_FAILED_ATTEMPTS})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tên đăng nhập hoặc mật khẩu không đúng",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 3. Đăng nhập thành công -> Reset số lần thử sai
        if user.failed_login_attempts > 0 or user.locked_until is not None:
            user.failed_login_attempts = 0
            user.locked_until = None
            db.commit()

        return user
    else:
        # Username không tồn tại: chạy băm giả lập để giữ thời gian phản hồi đồng nhất (~150-250ms)
        verify_password(password, DUMMY_PASSWORD_HASH)
        logger.warning(f"Audit: Failed login for non-existent username '{username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(encrypted_payload: EncryptedPayload, response: Response, db: Session = Depends(get_db), _: None = Depends(auth_rate_limiter)):
    decrypted_data = decrypt_payload(encrypted_payload.encrypted_key, encrypted_payload.payload)
    payload = UserCreate(**decrypted_data)
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == payload.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập này đã tồn tại. Vui lòng chọn tên khác."
        )
    
    # Public registration ALWAYS creates standard 'user' accounts.
    # Admin accounts are seeded during system setup or created via DB management.
    role = "user"

    hashed_pw = get_password_hash(payload.password)
    new_user = User(
        username=payload.username,
        hashed_password=hashed_pw,
        role=role
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        logger.error(f"Error during registration: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Lỗi hệ thống khi đăng ký.")
    
    logger.info(f"Audit: New user registered '{new_user.username}'")

    token = create_access_token(data={"sub": new_user.username, "role": new_user.role, "user_id": new_user.id})
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="strict")
    user_resp = UserResponse.model_validate(new_user)
    return AuthResponse(user=user_resp)

@router.post("/login", response_model=AuthResponse)
def login_user(encrypted_payload: EncryptedPayload, response: Response, db: Session = Depends(get_db), _: None = Depends(auth_rate_limiter)):
    decrypted_data = decrypt_payload(encrypted_payload.encrypted_key, encrypted_payload.payload)
    payload = UserLogin(**decrypted_data)
    
    user = authenticate_user(db, payload.username, payload.password)
    
    logger.info(f"Audit: Successful login for user '{user.username}'")
    token = create_access_token(data={"sub": user.username, "role": user.role, "user_id": user.id})
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="strict")
    user_resp = UserResponse.model_validate(user)
    return AuthResponse(user=user_resp)

@router.post("/token", response_model=AuthResponse)
def login_for_access_token(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db), _: None = Depends(auth_rate_limiter)):
    user = authenticate_user(db, form_data.username, form_data.password)
    
    logger.info(f"Audit: Successful token issuance for user '{user.username}'")
    token = create_access_token(data={"sub": user.username, "role": user.role, "user_id": user.id})
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="strict")
    user_resp = UserResponse.model_validate(user)
    return AuthResponse(user=user_resp)

@router.post("/logout")
def logout_user(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Đăng xuất thành công"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
