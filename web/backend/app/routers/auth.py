import logging
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
    
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        logger.warning(f"Audit: Failed login attempt for username '{payload.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"Audit: Successful login for user '{user.username}'")
    token = create_access_token(data={"sub": user.username, "role": user.role, "user_id": user.id})
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="strict")
    user_resp = UserResponse.model_validate(user)
    return AuthResponse(user=user_resp)

@router.post("/token", response_model=AuthResponse)
def login_for_access_token(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db), _: None = Depends(auth_rate_limiter)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Audit: Failed token request for username '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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
