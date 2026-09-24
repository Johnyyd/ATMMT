from typing import List

TOPIC_STARTERS = {
    "about": ["💡 Kỹ năng chính là gì?", "📫 Cách liên hệ Johnyyd?"],
    "repos": ["🛡️ Dự án Tailscale Public URL?", "⭐ GitHub Repo trang này?"],
    "ai-assistant": ["💡 Kỹ năng chuyên môn?", "🛡️ Kinh nghiệm DevOps & Tailscale?"],
}

KEYWORD_MAP = {
    "docker": ["🐳 Chi tiết cấu hình Docker Compose?", "🚀 Kinh nghiệm tối ưu Dockerfile?"],
    "tailscale": ["🛡️ Giải pháp Networking với Tailscale?", "🔗 Cách dùng Tailscale Funnel?"],
    "react": ["⚡ Kinh nghiệm tối ưu React & Vite?", "🎨 Đam mê UI/UX & Tailwind CSS?"],
    "fastapi": ["⚡ Thiết kế REST API với FastAPI?", "🔄 Tích hợp WebSocket realtime?"],
    "liên hệ": ["📫 Email hoặc LinkedIn của Johnyyd?", "💬 Gửi tin nhắn sổ lưu bút?"],
    "kỹ năng": ["💡 Tech Stack chính là gì?", "🛠️ Kinh nghiệm với SQL Server & Postgres?"],
}

def get_fallback_suggestions(topic_id: str, user_message: str) -> List[str]:
    lowered = user_message.lower() if user_message else ""
    for kw, sugs in KEYWORD_MAP.items():
        if kw in lowered:
            return sugs
    return TOPIC_STARTERS.get(topic_id, ["💡 Kỹ năng chuyên môn?", "📫 Cách liên hệ Johnyyd?"])
