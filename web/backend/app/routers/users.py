from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
import os
import shutil
from pathlib import Path

from app.database import get_db
from app.models import User
from app.schemas import UserResponse, UserProfileUpdate, UserPasswordUpdate, EncryptedPayload
from app.crypto import decrypt_payload
from app.security import get_current_user, verify_password, get_password_hash

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/profile", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get the current user's profile information.
    Returns 200 with profile data if authenticated, 401 if not.
    """
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get public profile information for any user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/me/profile", response_model=UserResponse)
def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's profile information.
    All fields are optional - only provided fields will be updated.
    Returns 200 with updated profile data.
    """
    # Update only the fields that were provided (not None)
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url
    if profile_data.cover_url is not None:
        current_user.cover_url = profile_data.cover_url
    if profile_data.display_name is not None:
        current_user.display_name = profile_data.display_name
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.website_url is not None:
        current_user.website_url = profile_data.website_url
    if profile_data.location is not None:
        current_user.location = profile_data.location

    # updated_at will be automatically updated by SQLAlchemy due to onupdate=datetime.utcnow

    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật hồ sơ: {str(e)}")

    return current_user

@router.put("/me/password")
def update_password(encrypted_payload: EncryptedPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    decrypted_data = decrypt_payload(encrypted_payload.encrypted_key, encrypted_payload.payload)
    password_data = UserPasswordUpdate(**decrypted_data)
    
    """
    Update the current user's password.
    """
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác"
        )
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Mật khẩu đã được thay đổi thành công"}

@router.post("/me/avatar", response_model=dict)
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload avatar image for the current user.
    Validates file type and size, saves the file, and updates the user's avatar_url.
    Returns 200 with avatar URL on success.
    """
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )

    # Validate file size (5MB limit)
    max_size = 5 * 1024 * 1024  # 5MB
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum allowed size is 5MB."
        )

    # Create upload directory if it doesn't exist
    upload_dir = Path("uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Map content_type to extension
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp"
    }
    file_extension = ext_map.get(file.content_type, "jpg")
    
    import uuid
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = upload_dir / unique_filename

    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save uploaded file."
        )
    finally:
        file.file.close()

    # Update user's avatar_url in database
    avatar_url = f"/uploads/avatars/{unique_filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    return {
        "avatar_url": avatar_url,
        "message": "Avatar uploaded successfully"
    }

@router.post("/me/cover", response_model=dict)
def upload_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload cover image for the current user.
    """
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )

    max_size = 5 * 1024 * 1024  # 5MB
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum allowed size is 5MB."
        )

    upload_dir = Path("uploads/covers")
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp"
    }
    file_extension = ext_map.get(file.content_type, "jpg")
    
    import uuid
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = upload_dir / unique_filename

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save uploaded file."
        )
    finally:
        file.file.close()

    cover_url = f"/uploads/covers/{unique_filename}"
    current_user.cover_url = cover_url
    db.commit()
    db.refresh(current_user)

    return {
        "cover_url": cover_url,
        "message": "Cover uploaded successfully"
    }