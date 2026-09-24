PORTFOLIO_TOPICS = [
    {
        "id": "ai-assistant",
        "title": "🤖 AI Assistant",
        "subtitle": "Trò chuyện trực tiếp với AI được huấn luyện về kỹ năng & dự án của Johnyyd",
        "avatar": "🤖",
        "type": "ai",
        "unread": 0,
        "is_online": True,
        "last_message": "Sẵn sàng hỗ trợ bạn giải đáp thắc mắc!"
    },
    {
        "id": "about",
        "title": "👤 Johnyyd - Giới thiệu tác giả",
        "subtitle": "Tìm hiểu về kỹ năng, kinh nghiệm & đam mê lập trình",
        "avatar": "https://github.com/Johnyyd.png",
        "type": "portfolio",
        "unread": 0,
        "is_online": True,
        "last_message": "Chào mừng bạn! Rất vui được gặp bạn tại đây."
    },
    {
        "id": "repos",
        "title": "🚀 Repositories Nổi Bật",
        "subtitle": "Khám phá các dự án open-source & mã nguồn của Johnyyd",
        "avatar": "https://github.com/github.png",
        "type": "portfolio",
        "unread": 0,
        "is_online": True,
        "last_message": "Các repository self-hosted & công cụ nổi bật."
    },
    {
        "id": "guestbook",
        "title": "💬 Public Guestbook",
        "subtitle": " Gửi tin nhắn đến tác giả & mọi người",
        "avatar": "👥",
        "type": "guestbook",
        "unread": 0,
        "is_online": True,
        "last_message": "Hãy để lại lời nhắn của bạn ở đây!"
    }
]

TOPIC_MESSAGES = {
    "ai-assistant": [
        {
            "id": "ai-welcome",
            "sender": "Johnyyd AI",
            "is_author": True,
            "avatar": "🤖",
            "content": "🤖 **Xin chào! Mình là AI Assistant**.\n\nMình là trợ lý thông minh đại diện cho Johnyyd.\n\nHãy đặt bất kỳ câu hỏi nào về kỹ năng Fullstack/DevOps, kinh nghiệm, các dự án Docker/Tailscale, hoặc cách hợp tác cùng Johnyyd nhé!",
            "timestamp": "Vừa xong",
            "type": "text"
        }
    ],
    "about": [
        {
            "id": "m1",
            "sender": "Johnyyd",
            "is_author": True,
            "avatar": "https://github.com/Johnyyd.png",
            "content": "👋 Xin chào! Mình là **Nguyễn Minh Trí** (Johnyyd) - Fullstack Software & DevOps Engineer.",
            "timestamp": "Vừa xong",
            "type": "text"
        },
        {
            "id": "m2",
            "sender": "Johnyyd",
            "is_author": True,
            "avatar": "https://github.com/Johnyyd.png",
            "content": "⚡ Mình đam mê xây dựng các hệ thống **Self-hosted**, ứng dụng web realtime, tối ưu hóa hạ tầng Docker/Kubernetes và giải pháp Networking bảo mật như **Tailscale**.",
            "timestamp": "Vừa xong",
            "type": "text"
        },
        {
            "id": "m3",
            "sender": "Johnyyd",
            "is_author": True,
            "avatar": "https://github.com/Johnyyd.png",
            "content": "💡 **Tech Stack chính:**\n- **Frontend:** React, TypeScript, Tailwind CSS, Framer Motion\n- **Backend:** Python (FastAPI), Node.js, RESTful API, WebSocket\n- **Database:** SQL Server, PostgreSQL, Redis\n- **DevOps:** Tailscale Serve/Funnel, Docker Compose, Linux Server Admin",
            "timestamp": "Vừa xong",
            "type": "text"
        },
        {
            "id": "m4",
            "sender": "Johnyyd",
            "is_author": True,
            "avatar": "https://github.com/Johnyyd.png",
            "content": "🔗 **Liên kết cá nhân:**\n- GitHub: [https://github.com/Johnyyd](https://github.com/Johnyyd)\n- Repository Tailscale Public URL: [Johnyyd/tailscale_public_url](https://github.com/Johnyyd/tailscale_public_url)",
            "timestamp": "Vừa xong",
            "type": "text"
        }
    ],
    "repos": [
        {
            "id": "r1",
            "sender": "Johnyyd",
            "is_author": True,
            "avatar": "https://github.com/Johnyyd.png",
            "content": "📦 Dưới đây là các Repository nổi bật mà mình đã phát triển và chia sẻ công khai:",
            "timestamp": "Vừa xong",
            "type": "text"
        },
        {
            "id": "r2",
            "sender": "Johnyyd",
            "is_author": True,
            "avatar": "https://github.com/Johnyyd.png",
            "content": "1️⃣ **Johnyyd/Chat-style-Portfolio-Guestbook**\nPortfolio cá nhân kết hợp sổ lưu bút với giao diện nhắn tin tương tác trực quan (Zalo/Telegram/Apple iMessage). Tự host hoàn toàn với Docker & FastAPI.",
            "repo": {
                "name": "Johnyyd/Chat-style-Portfolio-Guestbook",
                "url": "https://github.com/Johnyyd/Chat-style-Portfolio-Guestbook",
                "description": "Chat-style Portfolio & Guestbook với React, FastAPI, SQL Server & Tailscale",
                "language": "TypeScript / Python",
                "stars": 42,
                "forks": 8
            },
            "timestamp": "Vừa xong",
            "type": "repo_card"
        },
        {
            "id": "r3",
            "sender": "Johnyyd",
            "is_author": True,
            "avatar": "https://github.com/Johnyyd.png",
            "content": "2️⃣ **Johnyyd/tailscale_public_url**\nGiải pháp public dịch vụ nội bộ từ Docker Server ra Internet an toàn thông qua mạng riêng ảo Tailscale Funnel / Serve mà không cần mở port trên router.",
            "repo": {
                "name": "Johnyyd/tailscale_public_url",
                "url": "https://github.com/Johnyyd/tailscale_public_url",
                "description": "Docker Tailscale Proxy for secure public URL exposures via Tailscale Funnel",
                "language": "Docker / Shell",
                "stars": 128,
                "forks": 24
            },
            "timestamp": "Vừa xong",
            "type": "repo_card"
        }
    ]
}
