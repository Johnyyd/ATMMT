# TÀI LIỆU HƯỚNG DẪN KỸ THUẬT: ĐIỀU TRA DO THÁM, TẤN CÔNG BRUTE FORCE VÀ TRIỂN KHAI PHÒNG THỦ

> **Dành cho:** Tất cả 11 thành viên Nhóm 1 - Đề tài: *Tấn công Brute Force và Chính sách Mật khẩu*  
> **Phạm vi nghiên cứu:** Hệ thống mã nguồn web nội bộ tại thư mục `/web`  
> **Môi trường Demo:** Chạy trên **tên miền thật (Public URL)** thông qua mạng riêng ảo **Tailscale Funnel / Serve** (không sử dụng localhost trong demo thực tế).  
> **Mục đích:** Hướng dẫn kỹ thuật chi tiết giúp Nhóm Kỹ thuật (quay video, demo), Nhóm Nội dung (viết báo cáo 5 chương) và Nhóm Trình bày (slide, thuyết trình) phối hợp đồng bộ và chính xác.

---

## MỤC LỤC

1. [Tổng quan Kiến trúc Hệ thống Web & Chuỗi Tấn công (Kill Chain)](#1-tong-quan-kien-truc-he-thong-web--chuoi-tan-cong-kill-chain)
2. [Chi tiết Các Lỗ hổng Do thám & Điều tra (Reconnaissance Flaws)](#2-chi-tiet-cac-lo-hong-do-tham--dieu-tra-reconnaissance-flaws)
3. [Chi tiết Các Sơ hở Hỗ trợ Tấn công Brute Force](#3-chi-tiet-cac-so-ho-ho-tro-tan-cong-brute-force)
4. [Kịch bản Demo Thực nghiệm (Dành cho Người 1, 2, 3)](#4-kich-ban-demo-thuc-nghiem-danh-cho-nguoi-1-2-3)
5. [Hướng dẫn Biên soạn Báo cáo 5 Chương (Dành cho Người 4, 5, 6, 7, 8)](#5-huong-dan-bien-soan-bao-cao-5-chuong-danh-cho-nguoi-4-5-6-7-8)
6. [Hướng dẫn Slide & Thuyết trình (Dành cho Người 9, 10, 11)](#6-huong-dan-slide--thuyet-trinh-danh-cho-nguoi-9-10-11)
7. [Mã nguồn Mẫu Triển khai Phòng thủ (Account Lockout & Hardening)](#7-ma-nguon-mau-trien-khai-phong-thu-account-lockout--hardening)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG WEB & CHUỖI TẤN CÔNG (KILL CHAIN)

### 1.1. Kiến trúc công nghệ của Web (`/web`)
- **Frontend (`/web/frontend`):** React 18, TypeScript, Tailwind CSS, Vite. Sử dụng mã hóa client-side `node-forge` (RSA-OAEP 2048-bit + AES-GCM 256-bit). Đã tinh gọn toàn bộ chức năng AI/LLM để ứng dụng nhẹ, ổn định và tập trung vào bảo mật xác thực Portfolio & Guestbook.
- **Backend API (`/web/backend`):** Python FastAPI, SQLAlchemy ORM, SQLite (`guestbook.db`), thư viện băm mật khẩu `bcrypt`, xác thực bằng JSON Web Token (`PyJWT`).
- **Mạng & Triển khai Public URL:** Docker Compose kết hợp 2 container Tailscale Proxy (`chat` và `chat_ts`). Toàn bộ hệ thống được cấp phát **tên miền thật với chứng chỉ SSL/TLS HTTPS** thông qua **Tailscale Funnel**:

| Dịch vụ / Chức năng | URL Tên miền Thật | Mô tả kỹ thuật |
| :--- | :--- | :--- |
| **Giao diện Web (Frontend)** | `https://chat.taild6d848.ts.net/` | Giao diện React Portfolio & Guestbook (cổng 8080) |
| **Công cụ Dò Subdomain (CT Logs)** | `https://www.certkit.io/tools/ct-logs/` | Công cụ tra cứu Certificate Transparency Logs tìm subdomain backend |
| **Backend Trực tiếp (FastAPI)** | `https://chat-ts.taild6d848.ts.net/` | Dịch vụ Backend độc lập cổng 7000 (phát hiện qua CT Logs) |
| **Tài liệu API (Swagger UI)** | `https://chat-ts.taild6d848.ts.net/docs` | Danh mục toàn bộ API endpoints hệ thống (trên subdomain backend `chat-ts`) |
| **API Do thám Guestbook** | `https://chat.taild6d848.ts.net/api/guestbook` | Endpoint lộ danh sách tài khoản & Admin |
| **API Do thám Profile IDOR** | `https://chat.taild6d848.ts.net/api/users/1` | Dò quét tài khoản theo User ID |
| **API Mục tiêu Brute Force** | `https://chat-ts.taild6d848.ts.net/api/auth/token` | Endpoint xác thực nhận form-urlencoded |

> ⚠️ **Lưu ý quan trọng:** Đường dẫn `https://chat.taild6d848.ts.net/docs` hoàn toàn **không tồn tại (404 Not Found)** do Nginx Frontend chỉ phục vụ giao diện và reverse-proxy `/api`, không chuyển tiếp `/docs`. Do đó, phương án chuẩn xác nhất là Attacker sử dụng công cụ tra cứu Certificate Transparency Logs (CT Logs) tại `https://www.certkit.io/tools/ct-logs/` để dò quét subdomain backend (`chat-ts.taild6d848.ts.net`), từ đó mở tài liệu Swagger UI tại `https://chat-ts.taild6d848.ts.net/docs`.

### 1.2. Chuỗi Tấn công Mô phỏng (Attack Kill Chain)
Một cuộc tấn công Brute Force trong thực tế không bao giờ bắt đầu bằng việc "đoán mò ngẫu nhiên", mà luôn trải qua chuỗi 3 giai đoạn:

```mermaid
flowchart TD
    subgraph GĐ1 [GIAI ĐOẠN 1: DO THÁM & THU THẬP THÔNG TIN]
        A[Do thám giao diện Web chat.taild6d848.ts.net] --> B[Khai thác GET /api/guestbook lộ admin]
        B --> C[Tra cứu CT Logs tại certkit.io tìm subdomain]
        C --> D[Phát hiện backend chat-ts.taild6d848.ts.net]
        D --> E[Truy cập chat-ts.taild6d848.ts.net/docs lộ Swagger]
    end

    subgraph GĐ2 [GIAI ĐOẠN 2: TÌM ĐIỂM YẾU HỆ THỐNG]
        E --> F[Phát hiện endpoint không mã hóa POST /api/auth/token]
        F --> G[Phát hiện Header giả mạo X-Forwarded-For bypass Rate Limit]
        G --> H[Nhận diện hệ thống KHÔNG có Account Lockout]
    end

    subgraph GĐ3 [GIAI ĐOẠN 3: TẤN CÔNG TỪ ĐIỂN BRUTE FORCE]
        H --> I[Nạp Wordlist chứa admin123 vào Burp Suite / Hydra]
        I --> J[Gửi loạt request thử mật khẩu]
        J --> K[Bắt thành công mã HTTP 200 OK & Token JWT]
    end
```

---

## 2. CHI TIẾT CÁC LỖ HỔNG DO THÁM & ĐIỀU TRA (RECONNAISSANCE FLAWS)

Trong giai đoạn này, kẻ tấn công tìm cách xác định xem hệ thống có những tài khoản nào, ai là quản trị viên và cấu trúc API ra sao.

### Lỗ hổng 2.1: Lộ Username và Role Admin qua API Guestbook công khai
- **Tập tin liên quan:** `web/backend/app/routers/guestbook.py` (Dòng 92 - 111 và 160 - 164)
- **Bản chất kỹ thuật:**
  - Endpoint `GET /api/guestbook` là API công khai, bất kỳ ai cũng có thể đọc mà không cần đăng nhập.
  - Khi một người dùng đã đăng nhập để lại bình luận, mã nguồn tự động lấy `username` thật và `role` từ cơ sở dữ liệu:
    ```python
    if current_user:
        user_id = current_user.id
        author_name = current_user.username  # Lấy username thật
    ```
  - Khi phản hồi trả về client:
    ```python
    author_role = msg.user.role if msg.user else "anonymous"
    return GuestbookResponse(
        ...,
        author_name=msg.author_name,
        author_role=author_role, # Trả về "admin" hoặc "user"
        user_id=msg.user_id
    )
    ```
- **Ý nghĩa đối với kẻ tấn công:** Chỉ cần mở trình duyệt hoặc gửi lệnh `GET /api/guestbook`, kẻ tấn công lập tức biết hệ thống có tài khoản tên là `admin` và tài khoản này nắm giữ quyền quản trị cao nhất (`role: "admin"`).

### Lỗ hổng 2.2: Dò quét toàn bộ danh sách người dùng qua IDOR (`GET /api/users/{user_id}`)
- **Tập tin liên quan:** `web/backend/app/routers/users.py` (Dòng 27 - 38)
- **Bản chất kỹ thuật:**
  - Endpoint `GET /api/users/{user_id}` không yêu cầu xác thực (`current_user = Depends(...)` bị bỏ trống).
  - Bất kỳ ai cũng có thể gửi yêu cầu với `user_id` tăng dần: `1`, `2`, `3`,...
  - Dữ liệu trả về theo schema `UserResponse` chứa đầy đủ `id`, `username`, `role`.
- **Ý nghĩa đối với kẻ tấn công:** Cho phép thu thập 100% danh sách tài khoản hiện có trong hệ thống (User Enumeration). Tài khoản `id=1` gần như luôn là tài khoản quản trị hệ thống.

### Lỗ hổng 2.3: Lộ tài liệu API Swagger công khai trên Subdomain Backend (`https://chat-ts.taild6d848.ts.net/docs`)
- **Tập tin liên quan:** `web/backend/app/main.py` (Dòng 64)
- **Bản chất kỹ thuật:**
  - Trên Frontend (`chat.taild6d848.ts.net`), đường dẫn `/docs` không tồn tại (**404 Not Found**) do Nginx chỉ phục vụ giao diện và reverse-proxy `/api`.
  - Tuy nhiên, backend FastAPI lại được public độc lập ra Internet qua container Tailscale Funnel thứ hai với subdomain `chat-ts.taild6d848.ts.net`.
  - Bằng cách tra cứu **Certificate Transparency Logs (CT Logs)** trên công cụ như **[CertKit CT Logs](https://www.certkit.io/tools/ct-logs/)** cho domain gốc `taild6d848.ts.net`, kẻ tấn công dễ dàng phát hiện ra subdomain backend `chat-ts.taild6d848.ts.net` do Let's Encrypt công khai chứng chỉ SSL cấp phát.
  - Khi truy cập `https://chat-ts.taild6d848.ts.net/docs`, backend chưa tắt `ENABLE_SWAGGER` trong môi trường triển khai thực tế, làm lộ toàn bộ sơ đồ API, định dạng dữ liệu (JSON, Form URL Encoded), và các endpoint nhạy cảm (đặc biệt là `POST /api/auth/token`).
- **Ý nghĩa đối với kẻ tấn công:** Giúp kẻ tấn công hiểu rõ tham số đầu vào của endpoint xác thực `POST /api/auth/token` nhận mật khẩu dạng thô (Plaintext) mà không cần đọc mã nguồn hay giải mã RSA trên giao diện web.

### Lỗ hổng 2.4: Tiết lộ sự tồn tại của tài khoản qua API Đăng ký (`POST /api/auth/register`)
- **Tập tin liên quan:** `web/backend/app/routers/auth.py` (Dòng 28 - 34)
- **Bản chất kỹ thuật:**
  - Khi thử đăng ký một username đã có, hệ thống trả về HTTP 400 kèm thông điệp: `"Tên đăng nhập này đã tồn tại. Vui lòng chọn tên khác."`.
- **Ý nghĩa đối với kẻ tấn công:** Kẻ tấn công có thể đưa một danh sách tên nhân viên/người dùng phổ biến vào endpoint đăng ký. Tên nào báo lỗi "đã tồn tại" chính là tài khoản có thật cần nhắm đến.

### Lỗ hổng 2.5: Phân tích chênh lệch thời gian phản hồi (Timing Attack)
- **Tập tin liên quan:** `web/backend/app/routers/auth.py` (Dòng 68 - 75)
- **Bản chất kỹ thuật:**
  ```python
  user = db.query(User).filter(User.username == payload.username).first()
  if not user or not verify_password(payload.password, user.hashed_password):
      raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không đúng")
  ```
  - Nếu `user` không tồn tại: Biểu thức dừng ngay tại `not user` (short-circuit), không gọi hàm băm Bcrypt $\rightarrow$ Phản hồi cực nhanh (~2 - 5 ms).
  - Nếu `user` có tồn tại nhưng sai mật khẩu: Hệ thống thực thi hàm băm `verify_password()`, tính toán băm Bcrypt tốn CPU $\rightarrow$ Phản hồi chậm hơn đáng kể (~150 - 300 ms).
- **Ý nghĩa đối với kẻ tấn công:** Đo thời gian phản hồi của request cho phép khẳng định một username có tồn tại hay không, ngay cả khi thông báo lỗi trả về là chung chung.

---

## 3. CHI TIẾT CÁC SƠ HỞ HỖ TRỢ TẤN CÔNG BRUTE FORCE

Sau khi biết được tài khoản mục tiêu là `admin`, kẻ tấn công lợi dụng tiếp các sơ hở sau để tấn công vét cạn mật khẩu:

### Sơ hở 3.1: Hoàn toàn không có giới hạn tần suất (No Rate Limiting trên nhánh main)
- **Tập tin liên quan:** `web/backend/app/rate_limit.py`
- **Bản chất kỹ thuật:**
  - Trên nhánh mục tiêu tấn công (`main`), hàm `rate_limiter` và `auth_rate_limiter` đã được vô hiệu hóa hoàn toàn (`return` trực tiếp).
  - Hệ thống không giới hạn số lượng request thử nghiệm, không trả về mã lỗi HTTP 429 Too Many Requests đối với endpoint xác thực `POST /api/auth/token`.
- **Ý nghĩa đối với kẻ tấn công:** Kẻ tấn công có thể sử dụng các công cụ tự động hóa như Burp Suite Intruder, Hydra, ffuf để gửi hàng nghìn request thử mật khẩu liên tục mà không bị nghẽn mạng hay bị hệ thống chặn IP.

### Sơ hở 3.2: Lộ Endpoint xác thực chuẩn dạng thuần (`POST /api/auth/token`)
- **Tập tin liên quan:** `web/backend/app/routers/auth.py` (Dòng 83 - 98)
- **Bản chất kỹ thuật:**
  - Giao diện người dùng (Frontend) sử dụng cơ chế mã hóa RSA + AES (`/api/auth/login`), gây khó khăn cho việc chặn bắt gói tin thông thường.
  - Tuy nhiên, Backend lại mở thêm endpoint chuẩn OAuth2: `POST /api/auth/token`. Endpoint này nhận dữ liệu dạng `application/x-www-form-urlencoded` gồm `username` và `password` thuần (Plaintext).
- **Ý nghĩa đối với kẻ tấn công:** Không cần viết code giải mã RSA/AES phức tạp, kẻ tấn công có thể nạp thẳng endpoint `/api/auth/token` vào các công cụ như Burp Suite Intruder hoặc Hydra để dò mật khẩu trực tiếp.

### Sơ hở 3.3: Hoàn toàn không có cơ chế Khóa tài khoản (Account Lockout Policy)
- **Tập tin liên quan:** `web/backend/app/models.py` (Bảng `User`) và `web/backend/app/routers/auth.py`
- **Bản chất kỹ thuật:**
  - Trong database, bảng `User` không có các trường ghi nhận số lần đăng nhập sai (`failed_attempts`) hay thời gian khóa (`locked_until`).
  - Khi đăng nhập sai, hệ thống chỉ ghi log `logger.warning(...)` mà không hề khóa tài khoản.
- **Ý nghĩa đối với kẻ tấn công:** Kẻ tấn công có thể thử hàng triệu mật khẩu liên tục (Infinite Guessing) mà tài khoản không bao giờ bị khóa tạm thời hay vô hiệu hóa.

### Sơ hở 3.4: Chính sách mật khẩu lỏng lẻo & Mật khẩu mặc định dễ đoán
- **Tập tin liên quan:** `web/backend/app/schemas.py` (Dòng 8), `web/backend/app/main.py` (Dòng 30)
- **Bản chất kỹ thuật:**
  - Chính sách mật khẩu chỉ yêu cầu độ dài tối thiểu 6 ký tự: `password: str = Field(..., min_length=6, max_length=100)`. Không yêu cầu chữ hoa, chữ số, ký tự đặc biệt.
  - Khi khởi tạo hệ thống lần đầu, hàm `seed_default_admin()` gán mật khẩu mặc định:
    ```python
    admin_password = os.getenv("ADMIN_PASSWORD") or "admin123"
    ```
    Trong `docker-compose.yml`, biến `ADMIN_PASSWORD` không được thiết lập. Vì vậy, mật khẩu tài khoản `admin` luôn mặc định là `admin123`.
- **Ý nghĩa đối với kẻ tấn công:** `admin123` là mật khẩu nằm trong Top 10 mật khẩu phổ biến nhất thế giới. Bất kỳ bộ từ điển mật khẩu cơ bản nào (Wordlist) cũng sẽ dò ra mật khẩu này trong vòng vài giây đầu tiên.

---

## 4. KỊCH BẢN DEMO THỰC NGHIỆM (DÀNH CHO NGƯỜI 1, 2, 3)

Nhóm Kỹ thuật và Video gồm 3 thành viên sẽ tiến hành thực nghiệm theo 2 kịch bản nối tiếp nhau:

### 4.1. Kịch bản 1: Mô phỏng Tấn công Brute Force thành công (Người 1 thao tác, Người 3 quay)
- **Bối cảnh mô phỏng:** Đóng vai trò là một Attacker đứng ngoài Internet, chỉ biết địa chỉ web mục tiêu `https://chat.taild6d848.ts.net/` và hoàn toàn không có quyền xem mã nguồn hay cơ sở dữ liệu bên trong.
- **Mục tiêu:** Từng bước do thám, phát hiện sơ hở và thực hiện tấn công từ điển bẻ khóa thành công tài khoản quản trị `admin`.
- **Tiến trình thực hiện chi tiết qua 4 bước:**

  1. **Bước 1: Tiếp cận Mục tiêu & Do thám Tên đăng nhập (Reconnaissance & Target Hunting)**
     - **Thao tác thực hiện:** Người 1 mở trình duyệt truy cập `https://chat.taild6d848.ts.net/`, mở tab **Network** (F12) hoặc Burp Suite Proxy để quan sát các gói tin nền khi tải trang hoặc khi bấm tương tác với mục Sổ lưu bút (Guestbook).
     - **Dữ liệu thực tế nhận được (Response JSON):** Khi tải `GET /api/guestbook`, hệ thống phản hồi mảng tin nhắn chứa dữ liệu:
       ```json
       {
         "id": 1,
         "author_name": "admin",
         "author_role": "admin",
         "user_id": 1,
         "content": "..."
       }
       ```
     - **Suy luận của Attacker:** 
       - Hệ thống có phân quyền vai trò người dùng (`author_role`).
       - Tin nhắn số 1 thuộc về tài khoản quản trị cao nhất với tên đăng nhập xác thực là: `admin` (User ID: 1).
     - **Quyết định tiếp theo:** Không cần tốn thời gian đoán mò username ngẫu nhiên; toàn bộ mục tiêu tấn công được thu hẹp vào duy nhất tài khoản `admin`.
     - *Ghi nhận bằng chứng:* Người 1 và Người 3 chụp ảnh/quay video màn hình hiển thị JSON trả về có `author_name: "admin"` và `author_role: "admin"` (xem minh chứng: `assets/images/fetch-api.png`):
       
       ![Do thám API Guestbook lộ Admin](../assets/images/fetch-api.png)

  2. **Bước 2: Dò tìm Subdomain Backend qua CT Logs & Khám phá Tài liệu API (Subdomain Reconnaissance & Swagger Hunting)**
     - **Thực tế gặp phải:** Kiểm tra form đăng nhập trên web thấy gửi tới `/api/auth/login` với dữ liệu mã hóa phức tạp (RSA + AES). Attacker thử truy cập đường dẫn tài liệu API mặc định `https://chat.taild6d848.ts.net/docs` nhưng nhận thông báo **404 Not Found** (do Nginx Frontend chỉ phục vụ giao diện và reverse-proxy `/api`, không chuyển tiếp `/docs`).
     - **Kỹ thuật điều tra chuẩn xác (OSINT Certificate Transparency Logs):**
       - Attacker sử dụng công cụ tra cứu nhật ký chứng chỉ SSL/TLS công khai tại **[https://www.certkit.io/tools/ct-logs/](https://www.certkit.io/tools/ct-logs/)**.
       - Nhập tên miền mạng: `taild6d848.ts.net`.
       - Do Tailscale Funnel tự động yêu cầu cấp chứng chỉ Let's Encrypt cho mỗi service public, mọi subdomain đều được ghi nhận công khai trên CT Logs.
       - Kết quả tra cứu CertKit phát hiện 2 subdomain đang hoạt động:
         1. `chat.taild6d848.ts.net` (Giao diện Frontend)
         2. `chat-ts.taild6d848.ts.net` (Dịch vụ Backend trực tiếp!)
     - **Truy cập Backend:** Attacker truy cập đường dẫn `https://chat-ts.taild6d848.ts.net/docs`.
     - **Dữ liệu thực tế nhận được:** Giao diện Swagger UI của FastAPI hiển thị đầy đủ, để lộ mục `auth` với endpoint: `POST /api/auth/token` (Login For Access Token).
     - **Suy luận của Attacker:** 
       - Endpoint `/api/auth/token` nhận định dạng chuẩn `application/x-www-form-urlencoded` gồm 2 tham số: `username` và `password` dạng chữ thuần (Plaintext).
       - Hoàn toàn vượt qua cơ chế mã hóa RSA/AES của giao diện web mà không cần giải mã client-side.
     - **Quyết định tiếp theo:** Chọn `POST /api/auth/token` làm "cửa ngõ" chính xác để nạp vào công cụ bẻ khóa tự động Burp Suite.
     - *Ghi nhận bằng chứng:* 
       - Ảnh chụp màn hình tra cứu CT Logs trên CertKit phát hiện subdomain backend (`assets/images/crawl-subdomain.png`):
         ![Tra cứu CT Logs trên CertKit](../assets/images/crawl-subdomain.png)
       - Ảnh chụp màn hình Swagger UI trên subdomain backend `chat-ts.taild6d848.ts.net/docs` (`assets/images/found-url-backend.png`):
         ![Tài liệu Swagger UI trên Subdomain Backend](../assets/images/found-url-backend.png)
       - Giao diện trực quan toàn màn hình Swagger UI trên backend (`assets/images/docs-gui-backend.png`):
         ![Chi tiết Swagger UI trên Backend](../assets/images/docs-gui-backend.png)
       - Ảnh chụp màn hình Burp Suite ghi nhận request/response tới Swagger UI `/docs` trên subdomain backend (`assets/images/found-docs-backend.png`):
         ![Burp Suite bắt gói tin Swagger UI trên Backend Subdomain](../assets/images/found-docs-backend.png)

  3. **Bước 3: Thăm dò "Hệ thống Báo động" & Cơ chế Khóa (Defense Probing)**
     - **Thao tác thực hiện:** Gửi thử các request đăng nhập sai có chủ đích vào `POST https://chat.taild6d848.ts.net/api/auth/token` với `username=admin` và mật khẩu ngẫu nhiên (`111111`, `222222`...) liên tiếp từ 5 đến 10 lần.
     - **Dữ liệu thực tế nhận được:** 
       - Tất cả các lần thử đều trả về mã lỗi **HTTP 401 Unauthorized** (`{"detail": "Tên đăng nhập hoặc mật khẩu không đúng"}`).
       - Không có CAPTCHA xuất hiện.
       - Không có mã `HTTP 429 Too Many Requests` hay `HTTP 403 Forbidden`.
       - Tốc độ phản hồi tức thì, không có độ trễ gia tăng sau mỗi lần sai.
     - **Suy luận của Attacker:** Hệ thống nạn nhân hoàn toàn không có cơ chế **Account Lockout** (không khóa tài khoản sau $N$ lần sai). Đây là điều kiện lý tưởng để tiến hành tấn công vét cạn mật khẩu từ điển với tốc độ cao.
     - **Quyết định tiếp theo:** Chuẩn bị file từ điển mật khẩu và đưa vào công cụ tự động hóa.

  4. **Bước 4: Thực hiện Tấn công Từ điển & Chiếm quyền Điều khiển (Dictionary Attack & Exploitation)**
     - **Thao tác thực hiện:**
       - Chuẩn bị file từ điển `passwords.txt` chứa danh sách mật khẩu mẫu phổ biến (`123456`, `password`, `admin`, `admin123`, `root`, `qwerty`...).
       - Chặn bắt request gửi tới `POST https://chat-ts.taild6d848.ts.net/api/auth/token` và đưa vào tab **Intruder** của Burp Suite:
         - **Target Host:** `chat-ts.taild6d848.ts.net`, Port: `443`, Sử dụng HTTPS/TLS (HTTP/2).
         - **Request Header:** Không cần thêm bất kỳ header bypass nào (do nhánh `main` đã tắt hoàn toàn rate limit). **LƯU Ý QUAN TRỌNG:** Cần **xóa bỏ dòng header `Content-Length: ...`** để Burp Suite tự động tính toán độ dài body theo từng payload mật khẩu.
         - **Request Body:** `username=admin&password=§123456§` (đặt ký tự `§` quanh mật khẩu để làm biến payload).
         - **Payloads:** Nạp danh sách mật khẩu thử nghiệm (`123456`, `password`, `111111`, `qwerty`, `admin`, `12345678`, `admin123`, `secret`, `superadmin`).
       - Bấm **Start Attack** để công cụ tự động gửi loạt request thử nghiệm.
     - **Dữ liệu thực tế nhận được trên Bảng kết quả (Intruder Results):**
       - Các mật khẩu sai (`123456`, `password`, `admin`): Trả về **HTTP 401** với chiều dài gói tin ngắn (~48 bytes).
       - Tại dòng thử mật khẩu `admin123`: Mã trạng thái đột ngột chuyển sang **HTTP 200 OK**, chiều dài gói tin nhảy vọt lên **~382 bytes**.
     - **Dữ liệu đoạt được & Chiếm quyền:** Phản hồi HTTP 200 trả về kèm Cookie chứa **Access Token JWT** với vai trò `role: "admin"`. Người 1 nạp Token này vào trình duyệt để đăng nhập thành công vào giao diện quản trị viên.
     - *Ghi nhận bằng chứng:* Người 1 và Người 3 chụp ảnh bảng kết quả của Burp Suite cho thấy dòng chứa `admin123` có HTTP Status 200 và ảnh màn hình đăng nhập thành công vào trang web với quyền Admin.

---

### 4.2. Kịch bản 2: Thiết lập Phòng thủ & Chặn đứng Tấn công (Người 2 thao tác, Người 3 quay)
- **Mục tiêu:** Thiết lập cơ chế Account Lockout (khóa sau 5 lần sai), vá lỗi Rate Limit và chứng minh công cụ tấn công bị chặn hoàn toàn.
- **Các bước thực hiện:**
  1. **Bước 1 (Áp dụng bản vá phòng thủ):**
     - Người 2 cập nhật mã nguồn theo [Mục 7](#7-ma-nguon-mau-trien-khai-phong-thu-account-lockout--hardening) bên dưới (kích hoạt đếm số lần sai và khóa tài khoản 15 phút nếu sai $\ge 5$ lần).
     - Loại bỏ backdoor `testclient` và sửa cơ chế lấy IP.
  2. **Bước 2 (Chạy lại công cụ tấn công):**
     - Người 1 chạy lại đợt tấn công từ điển với cùng file `passwords.txt`.
  3. **Bước 3 (Ghi nhận kết quả phòng thủ):**
     - Từ lần thử thứ 1 đến 4: Trả về **HTTP 401**.
     - Từ lần thử thứ 5 trở đi: Hệ thống trả về **HTTP 403 Forbidden** hoặc **HTTP 429 Too Many Requests** với thông báo `"Tài khoản đã bị tạm khóa 15 phút do nhập sai quá 5 lần"`.
     - Dù trong từ điển có mật khẩu đúng `admin123` nằm ở vị trí thứ 6 trở đi, công cụ vẫn **không thể đăng nhập được** vì tài khoản đã bị khóa.
     - Người 2 chụp ảnh màn hình thông báo lỗi 403/429 này để đưa vào Báo cáo Chương 4.

---

## 5. HƯỚNG DẪN BIÊN SOẠN BÁO CÁO 5 CHƯƠNG (DÀNH CHO NGƯỜI 4, 5, 6, 7, 8)

Các thành viên viết báo cáo sử dụng các phát hiện kỹ thuật trên để đưa vào đúng các đề mục quy định trong `README.md`:

### 5.1. Người 4 phụ trách Mở đầu & Chương 1: Cơ sở lý thuyết về Brute Force
- **Phần Mở đầu:**
  - Nhấn mạnh: Xác thực mật khẩu là phòng tuyến đầu tiên bảo vệ tài nguyên người dùng.
  - Nêu rõ phạm vi: Thử nghiệm trên mô hình web nội bộ, phục vụ nghiên cứu học tập, tuân thủ đạo đức an toàn thông tin.
- **Mục 1.1 (Cơ chế xác thực):** Trình bày luồng xác thực Client - Server, vai trò của hàm băm một chiều (Bcrypt) và lưu trữ Token JWT.
- **Mục 1.2 & 1.3 (Brute Force & Dictionary Attack):**
  - Định nghĩa Brute Force thuần túy ($O(C^N)$ không gian mẫu lớn) so với Tấn công Từ điển (Dictionary Attack - sử dụng danh sách mật khẩu có sẵn để tối ưu thời gian).
- **Mục 1.4 (Công cụ phổ biến):** Giới thiệu nguyên lý hoạt động của Burp Suite Intruder (chế độ Sniper payload) và cURL / Python automation script.

### 5.2. Người 5 phụ trách Chương 2: Chính sách Mật khẩu và Phòng thủ
- **Mục 2.1 & 2.2 (Chính sách & Tiêu chuẩn mật khẩu mạnh):**
  - Phân tích vì sao quy định 6 ký tự hiện tại của web là điểm yếu chí mạng.
  - Đề xuất tiêu chuẩn NIST: Độ dài tối thiểu $\ge 8$ - 12 ký tự, bắt buộc tổ hợp 3/4 nhóm ký tự (hoa, thường, số, ký tự đặc biệt), chống từ điển phổ biến.
- **Mục 2.3 (Cơ chế Account Lockout):**
  - Giải thích thuật toán: Lưu `failed_attempts` và mốc thời gian `locked_until`. Khi số lần vi phạm chạm ngưỡng (ngưỡng 5 lần), vô hiệu hóa xác thực trong khoảng thời gian nhất định (15 phút).
  - Phân tích ưu/nhược điểm: Chống Brute Force hiệu quả nhưng cần lưu ý tránh nguy cơ bị lợi dụng gây Từ chối dịch vụ tài khoản (Account Denial of Service).
- **Mục 2.4 (Cơ chế bổ sung):** Trình bày về Rate Limiting (Token Bucket / Leaky Bucket) và giải pháp CAPTCHA (Cloudflare Turnstile / reCAPTCHA).

### 5.3. Người 6 phụ trách Chương 3: Triển khai Kịch bản Tấn công
*(Lấy hình ảnh do Người 1 chụp và Người 3 quay clip)*
- **Mục 3.1 (Môi trường thử nghiệm):** Mô tả hệ thống nạn nhân được triển khai trên máy chủ thật và công khai qua mạng Internet bằng tên miền Tailscale Funnel (`https://chat.taild6d848.ts.net`), không dùng localhost để tăng tính thực tế. Sử dụng API endpoint `/api/auth/token`.
- **Mục 3.2 (Chuẩn bị Wordlist):** Liệt kê bảng mật khẩu mẫu trong file từ điển `passwords.txt`.
- **Mục 3.3 (Các bước tiến hành tấn công theo góc nhìn Attacker):**
  - *Bước 1 (Do thám & Xác định mục tiêu):* Phân tích phản hồi `GET /api/guestbook` nhận diện `author_name: "admin"` và `author_role: "admin"`.
  - *Bước 2 (Dò tìm subdomain backend & Khám phá Swagger UI):* Khắc phục việc `chat.taild6d848.ts.net/docs` bị lỗi 404 bằng cách sử dụng công cụ tra cứu Certificate Transparency Logs (CT Logs) tại https://www.certkit.io/tools/ct-logs/ tìm ra subdomain backend `chat-ts.taild6d848.ts.net`. Mở `https://chat-ts.taild6d848.ts.net/docs` hiển thị Swagger UI, phát hiện endpoint `POST /api/auth/token` nhận dữ liệu form thuần thay vì `/api/auth/login` bị mã hóa.
  - *Bước 3 (Thăm dò cơ chế bảo vệ):* Thử nghiệm gửi 5-10 request sai mật khẩu liên tiếp để chứng minh hệ thống không có Account Lockout và không chặn IP.
  - *Bước 4 (Tiến hành tấn công từ điển):* Cấu hình Burp Suite Intruder nhắm vào tên miền thật `chat.taild6d848.ts.net` (Port 443 HTTPS), chèn header bypass `X-Forwarded-For: testclient`, nạp wordlist `passwords.txt`.
- **Mục 3.4 (Kết quả thực nghiệm Kịch bản 1):** 
  - Phân tích bảng kết quả: Các mật khẩu sai đều trả về **HTTP 401**, mật khẩu `admin123` trả về **HTTP 200 OK** với chiều dài gói tin tăng đột biến.
  - Chèn hình ảnh Burp Suite bắt được mã 200 OK và ảnh đăng nhập chiếm quyền Admin thành công trên trình duyệt.

### 5.4. Người 7 phụ trách Chương 4: Triển khai Phòng thủ và Phân tích
*(Lấy hình ảnh do Người 2 chụp)*
- **Mục 4.1 (Thiết lập phòng thủ):**
  - Trình bày giải pháp code: Thêm logic khóa tài khoản sau 5 lần sai vào backend, sửa hàm lọc IP.
- **Mục 4.2 (Kịch bản tấn công lại):** Mô tả lại việc dùng Burp Suite chạy lại từ điển cũ vào hệ thống đã vá.
- **Mục 4.3 (Phân tích kết quả):**
  - Hiện tượng: Hệ thống trả về mã **HTTP 403 / 429**, hiển thị thông báo tài khoản bị khóa.
  - Tốc độ và hiệu quả của tool: Bị triệt tiêu hoàn toàn sau lần thử thứ 5; dù trong từ điển có mật khẩu đúng thì kẻ tấn công vẫn không thể chiếm quyền tài khoản.

### 5.5. Người 8 phụ trách Chương 5: Kết luận
- **Mục 5.1 (Kết quả đạt được):** Nhóm đã mô phỏng thành công quá trình từ do thám đến tấn công Brute Force từ xa qua tên miền thật, đồng thời xây dựng thành công giải pháp phòng thủ Account Lockout và Password Policy.
- **Mục 5.2 (Hạn chế đề tài):** Thử nghiệm quy mô một máy trạm tấn công, chưa kiểm thử tấn công phân tán (Distributed Brute Force qua botnet/proxy xoay nhiều dải IP).
- **Mục 5.3 (Hướng phát triển):** Tích hợp xác thực 2 bước (2FA / OTP TOTP), sinh trắc học (WebAuthn/FIDO2) để loại bỏ hoàn toàn nguy cơ từ mật khẩu truyền thống.

---

## 6. HƯỚNG DẪN SLIDE & THUYẾT TRÌNH (DÀNH CHO NGƯỜI 9, 10, 11)

- **Người 9 (Tổng biên tập / Format Word):**
  - Thu nhận file Word từ Người 4, 5, 6, 7, 8 theo đường dẫn `docs/drafts/`.
  - Đồng bộ font chữ (Times New Roman, cỡ 13 hoặc 14 theo mẫu trường ĐH Công Thương TP.HCM), định dạng lề (trên 2.0cm, dưới 2.0cm, trái 3.0cm, phải 2.0cm), đánh số trang tự động và tạo Mục lục tự động.
  - Xuất bản file hoàn chỉnh vào thư mục `FINAL_DELIVERY/`.
- **Người 10 (Thiết kế Slide PowerPoint):**
  - Bố cục Slide 10 - 15 trang:
    1. Giới thiệu đề tài & thành viên nhóm.
    2. Sơ đồ chuỗi tấn công (Do thám $\rightarrow$ Brute Force $\rightarrow$ Khai thác).
    3. Trình diễn các điểm yếu mã nguồn (Code snippet).
    4. Slide so sánh trực quan Kết quả: Trước phòng thủ (HTTP 200) vs Sau phòng thủ (HTTP 403).
    5. Kết luận & Khuyến nghị chính sách mật khẩu.
- **Người 11 (Thuyết trình & Khớp kịch bản Video):**
  - Thời lượng thuyết trình: Khoảng 7 - 10 phút.
  - Phối hợp với video demo của Người 3: Khi video chiếu tới đoạn bắt gói tin trong Burp Suite, Người 11 phải giải thích rõ ràng mã phản hồi và nguyên lý phòng thủ Account Lockout đã chặn đứng cuộc tấn công ra sao.

---

## 7. MÃ NGUỒN MẪU TRIỂN KHAI PHÒNG THỦ (ACCOUNT LOCKOUT & HARDENING)

Dưới đây là mã nguồn kỹ thuật mẫu dành cho **Người 2** áp dụng vào thư mục `web/backend` để hiện thực hóa Chương 4:

### 7.1. Cập nhật Model User trong `web/backend/app/models.py`
Thêm 2 trường quản lý số lần thử sai và thời gian khóa:
```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)

    # BỔ SUNG CƠ CHẾ PHÒNG THỦ BRUTE FORCE:
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)

    # ... các trường profile khác giữ nguyên ...
```

### 7.2. Cập nhật Logic Xác thực trong `web/backend/app/routers/auth.py`
Kiểm tra trạng thái khóa tài khoản và đếm số lần sai trong cả 2 endpoint `/login` và `/token`:
```python
from datetime import datetime, timedelta

MAX_FAILED_ATTEMPTS = 5       # Cho phép sai tối đa 5 lần
LOCKOUT_DURATION_MINUTES = 15 # Khóa tài khoản trong 15 phút

@router.post("/token", response_model=AuthResponse)
def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # 1. Kiểm tra tài khoản có đang bị khóa hay không
    now = datetime.utcnow()
    if user and user.locked_until:
        if now < user.locked_until:
            remaining_seconds = int((user.locked_until - now).total_seconds())
            remaining_minutes = max(1, remaining_seconds // 60)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tài khoản đang bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau {remaining_minutes} phút."
            )
        else:
            # Hết thời gian khóa -> Reset lại bộ đếm
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    # 2. Kiểm tra mật khẩu
    if not user or not verify_password(form_data.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                db.commit()
                logger.warning(f"Security Alert: Tài khoản '{user.username}' đã bị khóa do nhập sai {MAX_FAILED_ATTEMPTS} lần.")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Tài khoản đã bị tạm khóa {LOCKOUT_DURATION_MINUTES} phút do nhập sai quá {MAX_FAILED_ATTEMPTS} lần liên tiếp."
                )
            db.commit()
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Đăng nhập thành công -> Reset bộ đếm số lần sai về 0
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    token = create_access_token(data={"sub": user.username, "role": user.role, "user_id": user.id})
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="strict")
    return AuthResponse(user=UserResponse.model_validate(user))
```

### 7.3. Vá lỗ hổng Rate Limiter trong `web/backend/app/rate_limit.py`
Xóa bỏ backdoor `"testclient"` và bảo vệ header `X-Forwarded-For`:
```python
def get_client_ip(request: Request) -> str:
    """
    Lấy IP an toàn từ kết nối socket trực tiếp của client
    Không tin cậy mù quáng header X-Forwarded-For nếu không đi qua reverse proxy tin cậy.
    """
    return request.client.host if request.client else "unknown_ip"

def auth_rate_limiter(request: Request):
    client_ip = get_client_ip(request)
    now = time.time()
    
    # Dọn dẹp các mốc cũ hơn 15 phút (900s)
    _auth_rate_limit_store[client_ip] = [ts for ts in _auth_rate_limit_store[client_ip] if now - ts < 900]
    
    if len(_auth_rate_limit_store[client_ip]) >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Quá nhiều yêu cầu xác thực từ IP này. Vui lòng chờ 15 phút."
        )
    
    _auth_rate_limit_store[client_ip].append(now)
```

---

## 8. TỔNG KẾT & DANH MỤC KIỂM TRA (CHECKLIST CHO NHÓM)

| Thành viên | Nhiệm vụ chính | Trạng thái cần đạt |
| :--- | :--- | :--- |
| **Người 1** | Thực hiện kịch bản tấn công (Do thám + Burp Suite Intruder) | Có ảnh chụp Burp Suite trả về HTTP 200 OK |
| **Người 2** | Áp dụng bản vá Account Lockout & kiểm thử phòng thủ | Có ảnh chụp hệ thống báo lỗi HTTP 403 khi sai 5 lần |
| **Người 3** | Quay video màn hình và cắt ghép clip | Video hoàn chỉnh $\le 10$ phút |
| **Người 4** | Soạn thảo Mở đầu & Chương 1 (Lý thuyết) | File Word `Chuong1.docx` trong `docs/drafts/` |
| **Người 5** | Soạn thảo Chương 2 (Chính sách mật khẩu & Lockout) | File Word `Chuong2.docx` trong `docs/drafts/` |
| **Người 6** | Soạn thảo Chương 3 (Triển khai tấn công) | File Word `Chuong3.docx` gắn đủ ảnh của Người 1 |
| **Người 7** | Soạn thảo Chương 4 (Triển khai phòng thủ) | File Word `Chuong4.docx` gắn đủ ảnh của Người 2 |
| **Người 8** | Soạn thảo Chương 5 (Kết luận & Hướng phát triển) | File Word `Chuong5.docx` trong `docs/drafts/` |
| **Người 9** | Gom 5 chương, format chuẩn mẫu Đại học Công Thương | File Word hoàn chỉnh tại `FINAL_DELIVERY/` |
| **Người 10** | Thiết kế slide PowerPoint thuyết trình | File `.pptx` tại `presentations/` |
| **Người 11** | Thuyết trình và khớp kịch bản với Video | Khớp tiến độ nói với video dưới 10 phút |
