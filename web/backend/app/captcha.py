import random
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import jwt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.security import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/auth", tags=["auth"])

class CaptchaResponse(BaseModel):
    captcha_token: str
    captcha_svg: str

def generate_math_challenge() -> Tuple[str, str]:
    """
    Tạo phép toán ngẫu nhiên (cộng, trừ, nhân đơn giản)
    Trả về (câu hỏi hiển thị, đáp án chuỗi)
    """
    op = random.choice(["+", "-", "*"])
    if op == "+":
        a = random.randint(10, 50)
        b = random.randint(1, 40)
        question = f"{a} + {b} = ?"
        answer = str(a + b)
    elif op == "-":
        a = random.randint(20, 60)
        b = random.randint(1, a - 1)
        question = f"{a} - {b} = ?"
        answer = str(a - b)
    else:
        a = random.randint(2, 9)
        b = random.randint(2, 9)
        question = f"{a} × {b} = ?"
        answer = str(a * b)
    return question, answer

def generate_captcha_svg(text: str) -> str:
    """
    Sinh hình ảnh vector SVG cho câu hỏi CAPTCHA với hiệu ứng làm nhiễu chống OCR cơ bản.
    """
    width = 160
    height = 46
    
    # Sinh các đường cong lượn sóng ngẫu nhiên chống bot
    lines = []
    colors = ["#38bdf8", "#818cf8", "#f43f5e", "#10b981", "#fbbf24"]
    for _ in range(3):
        x1, y1 = random.randint(5, 30), random.randint(10, 40)
        cx, cy = random.randint(50, 110), random.randint(5, 45)
        x2, y2 = random.randint(120, 155), random.randint(10, 40)
        c = random.choice(colors)
        lines.append(f'<path d="M {x1} {y1} Q {cx} {cy} {x2} {y2}" stroke="{c}" stroke-width="1.5" fill="none" opacity="0.45"/>')

    # Sinh các chấm nhiễu ngẫu nhiên
    dots = []
    for _ in range(18):
        dx = random.randint(5, width - 5)
        dy = random.randint(5, height - 5)
        r = random.uniform(1.0, 2.0)
        dc = random.choice(colors)
        dots.append(f'<circle cx="{dx}" cy="{dy}" r="{r:.1f}" fill="{dc}" opacity="0.35"/>')

    rotation = random.randint(-3, 3)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" style="user-select: none; border-radius: 8px;">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <rect width="{width}" height="{height}" rx="8" fill="url(#bgGrad)"/>
  {''.join(dots)}
  {''.join(lines)}
  <g transform="rotate({rotation} {width/2} {height/2})">
    <text x="{width/2}" y="{height/2 + 7}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="20" font-weight="bold" fill="#38bdf8" text-anchor="middle" letter-spacing="2" filter="url(#shadow)">
      {text}
    </text>
  </g>
</svg>"""
    return svg

def create_captcha_token(answer: str) -> str:
    """Tạo JWT token 5 phút chứa đáp án đã được mã hóa/ký bí mật."""
    payload = {
        "ans": answer.strip().lower(),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "purpose": "captcha",
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_captcha(captcha_token: Optional[str], captcha_answer: Optional[str]) -> bool:
    """
    Xác minh đáp án CAPTCHA. Báo lỗi HTTP 400 nếu sai hoặc hết hạn.
    """
    if not captcha_token or not captcha_answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng giải mã xác nhận CAPTCHA để tiếp tục."
        )
    
    try:
        payload = jwt.decode(captcha_token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã CAPTCHA đã hết hạn. Vui lòng tải lại mã mới."
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã CAPTCHA không hợp lệ."
        )
        
    if payload.get("purpose") != "captcha":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token CAPTCHA không hợp lệ."
        )

    expected = str(payload.get("ans", "")).strip().lower()
    provided = str(captcha_answer).strip().lower()
    
    if expected != provided:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã CAPTCHA không chính xác. Vui lòng thử lại."
        )
        
    return True

@router.get("/captcha", response_model=CaptchaResponse)
def get_captcha():
    """Endpoint cấp phát mã thử thách CAPTCHA dưới dạng ảnh SVG kèm token ký bảo mật."""
    question, answer = generate_math_challenge()
    svg = generate_captcha_svg(question)
    token = create_captcha_token(answer)
    return CaptchaResponse(captcha_token=token, captcha_svg=svg)
