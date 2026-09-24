import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User
from app.security import get_password_hash
from app.routers import health, guestbook, topics, chat, auth, users
from app.crypto import router as crypto_router
from app.services.cleanup import cleanup_loop_task

logger = logging.getLogger(__name__)

# Ensure DB schemas exist
Base.metadata.create_all(bind=engine)

def seed_default_admin():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            logger.info("No admin user found. Creating default admin account...")
            import secrets
            admin_password = os.getenv("ADMIN_PASSWORD") or "admin123"
            if not admin_password:
                admin_password = secrets.token_urlsafe(16)
                logger.warning(f"⚠️ ADMIN_PASSWORD chưa được thiết lập. Đã tự động tạo mật khẩu admin: {admin_password}")
            
            default_admin = User(
                username="admin",
                hashed_password=get_password_hash(admin_password),
                role="admin"
            )
            db.add(default_admin)
            db.commit()
            logger.info("Default admin account created successfully (username: 'admin'). Vui lòng lưu lại mật khẩu!")
        else:
            logger.info("Admin account already exists. Skipping password override.")
    except Exception as e:
        logger.error(f"Error seeding default admin account: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed default admin user
    seed_default_admin()
    # Start background 30-day message cleanup scheduler
    cleanup_task = asyncio.create_task(cleanup_loop_task())
    yield
    # Shutdown background task
    cleanup_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan,
    debug=os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Đã xảy ra lỗi hệ thống nội bộ."}
    )

@app.middleware("http")
async def strip_server_header(request: Request, call_next):
    response = await call_next(request)
    if "Server" in response.headers:
        del response.headers["Server"]
    return response


allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost,http://localhost:3000,http://localhost:80")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Route registration (/api and /api/v1 for backward compatibility and standards)
for prefix in [settings.API_PREFIX, f"{settings.API_PREFIX}/v1"]:
    app.include_router(health.router, prefix=prefix)
    app.include_router(auth.router, prefix=prefix)
    app.include_router(guestbook.router, prefix=prefix)
    app.include_router(topics.router, prefix=prefix)
    app.include_router(chat.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(crypto_router, prefix=prefix)