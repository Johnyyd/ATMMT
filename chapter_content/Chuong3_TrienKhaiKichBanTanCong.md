# CHƯƠNG 3: TRIỂN KHAI KỊCH BẢN TẤN CÔNG

## 3.1. Môi trường thử nghiệm

### Hệ thống "nạn nhân"
- **Plattform**: Docker Compose orchestrating multiple containers
- **Frontend**: React 18 application served on port 8080, accessible via `https://chat.taild6d848.ts.net/`
- **Backend**: Python FastAPI application served on port 7000, accessible via `https://chat-ts.taild6d848.ts.net/`
- **Cơ sở dữ liệu**: SQLite (`guestbook.db`) lưu trữ thông tin người dùng và tin nhắn
- **Môi trường triển khai**: 
  - Chạy trên **tên miền thật (Public URL)** thông qua **Tailscale Funnel / Serve**
  - Mỗi service được cấp phát chứng chỉ SSL/TLS từ Let's Encrypt
  - Không sử dụng localhost để tăng tính thực tế của démonстрация

### Công cụ tấn công được sử dụng
- **Burp Suite Professional Edition**: 
  - Proxy để bắt và sửa đổi request HTTP/HTTPS
  - Intruder module để thực hiện automated dictionary attack
  - Scanner để xác thực lỗ hổng (tùy chọn)
- **Alternative tools mentioned**: Hydra, cURL, Python scripts
- **Lý do chọn Burp Suite**: 
  - Giao diện trực quan để ghi chép và trình bày kết quả
  - Dễ dàng cấu hình payload positions và xử lý response
  - Cung cấp thông tin chi tiết về mã trạng thái, kích thước, thời gian phản hồi

## 3.2. Chuẩn bị Wordlist

### File từ điển `passwords.txt`
Dưới đây là danh sách mật khẩu mẫu được sử dụng trong cuộc tấn công, bao gồm các mật khẩu phổ biến và dễ đoán:

```
123456
password
12345678
qwerty
123456789
12345
1234
111111
1234567
dragon
123123
baseball
abc123
football
monkey
letmein
shadow
master
654321
superman
1qaz2wsx
67890
michael
batman
trustno1
admin
admin123
administrator
root
toor
guest
demo
test
```

**Lưu ý quan trọng**: Mật khẩu `admin123` (mặc định của tài khoản admin trong hệ thống) nằm ở vịřízení相当靠后 trong danh sách này, trong nhóm mật khẩu liên quan tới "admin".

### Nguyên lý lựa chọn
- **Tập trung vào mật khẩu phổ biến**: Dựa trên các báo cáo rò rỉ mật khẩu thực tế
- **Kết hợp giữa các dạng**: Chỉ số, chỉ chữ,混合, và liên quan tới tên người dùng
- **Kích thước vừa phải**: Đủ để thể hiện hiệu quả của 공격 mà không làm phức tạp quá trình thực nghiệm

## 3.3. Các bước tiến hành tấn công

### Bước 1 (Do thám & Xác định mục tiêu)
**Mục tiêu**: Xác định tài khoản quản trị (admin) để tập trung công力

**Thực hiện**:
1. Truy cập giao diện web: `https://chat.taild6d848.ts.net/`
2. Mở công cụ phát triển (F12) → Tab Network
3. Tải lại trang hoặc tương tác với tính năng Sổ lưu bút (Guestbook)
4. Quan sát request đến endpoint: `GET /api/guestbook`

**Kết quả**:
```json
{
  "id": 1,
  "author_name": "admin",
  "author_role": "admin",
  "user_id": 1,
  "content": "..."
}
```

**Suy luận của attacker**:
- Hệ thống có phân quyền vai trò người dùng (`author_role`)
- Tin nhắn được tạo bởi tài khoản có `author_name: "admin"` và `author_role: "admin"`
- User ID: 1 thường là tài khoản được tạo đầu tiên, thường là administrator
- **Điều quyết định**: Tập trung toàn bộ công lực vào tài khoản `admin`

### Bước 2 (Dò tìm subdomain backend & Khám phá Swagger UI)
**Vấn đề**: Form đăng nhập trên web sử dụng RSA + AES encryption, khiến việc bắt payload khó khăn

**Thực hiện**:
1. Thử truy cập đường dẫn API documentation mặc định: `https://chat.taild6d848.ts.net/docs`
   - Nhận được phản hồi **404 Not Found** (do Nginx frontend chỉ phục vụ `/api`, không chuyển tiếp `/docs`)
2. Sử dụng công cụ tra cứu Certificate Transparency Logs (CT Logs):
   - Truy cập: `https://www.certkit.io/tools/ct-logs/`
   - Nhập tên miền: `taild6d848.ts.net`
   - Kết quả tra cứu phát hiện 2 subdomain:
     - `chat.taild6d848.ts.net` (Giao diện frontend)
     - `chat-ts.taild6d848.ts.net` (Backend service)
3. Truy cập Swagger UI trên backend:
   - URL: `https://chat-ts.taild6d848.ts.net/docs`
   - Nhận được giao diện Swagger UI đầy đủ

**Kết quả**:
- Phát hiện endpoint xác thực: `POST /api/auth/token`
- Xác định định dạng request: `application/x-www-form-urlencoded`
- Tham số bắt buộc: `username` và `password` (plaintext)
- **Lưu ý quan trọng**: Endpoint này hoàn toàn **bỏ qua** cơ chế mã hóa RSA/AES của giao diện web

### Bước 3 (Thăm dò cơ chế bảo vệ)
**Mục tiêu**: Xác định sự hiện diện hoặc vắng mặt của các cơ chế防御 như Account Lockout, Rate Limiting, CAPTCHA

**Thực hiện**:
1. Cấu hình Burp Suite Intruder để gửi request đăng nhập sai liên tục:
   - URL: `https://chat-ts.taild6d848.ts.net/api/auth/token`
   - Method: POST
   - Headers: `Content-Type: application/x-www-form-urlencoded`
   - Body: `username=admin&password=__PAYLOAD__` (đặt payload position tại password)
   - Payloads: Danh sách mật khẩu sai ngẫu nhiên (ví dụ: `111111`, `222222`, `333333`...)
2. Gửi 10-15 request liên tiếp với mật khẩu sai
3. Quan sát mã trạng thái và nội dung phản hồi

**Kết quả trên nhánh `main` (vulnerable)**:
- Tất cả request trả về **HTTP 401 Unauthorized**
- Nội dung phản hồi: `{"detail": "Tên đăng nhập hoặc mật khẩu không đúng"}`
- Không có CAPTCHA xuất hiện
- Không có mã lỗi `HTTP 429 Too Many Requests` hoặc `HTTP 403 Forbidden`
- Thời gian phản hồi: T tức thì, không có độ trễ gia tăng
- **Suy luận**: Hệ thống **không có** Account Lockout và **không có** Rate Limiting cho endpoint xác thực

### Bước 4 (Tiến hành tấn công từ điển)
**Cấu hình chi tiết trong Burp Suite Intruder**:
- **Target**: 
  - Host: `chat-ts.taild6d848.ts.net`
  - Port: `443`
  - Use HTTPS: Enabled
- **Request**:
  ```
  POST /api/auth/token HTTP/1.1
  Host: chat-ts.taild6d848.ts.net
  Content-Type: application/x-www-form-urlencoded
  Content-Length: [AUTO]
  
  username=admin&password=§123456§
  ```
  (Lưu ý: Cần xóa bỏ dòng `Content-Length: ...` để Burp tự động tính toán)
- **Payload position**: Đặt ký tự `§` xung quanh phần password để tạo biến payload
- **Payload type**: Simple list
- **Payloads**: Nội dung file `passwords.txt` (một mật khẩu mỗi dòng)
- **Attack type**: Sniper (thử từng payload một tại vị trí được định nghĩa)

**Thực hiện tấn công**:
1. Nhấn "Start Attack" trong Burp Suite Intruder
2. Công cụ sẽ tuần tự qua từng mật khẩu trong wordlist và gửi request
3. Theo dõi bảng kết quả để phát hiện bất thường về:
   - Mã trạng thái HTTP (401, 200, 403, 429...)
   - Kích thước phản hồi (bytes)
   - Thời gian phản hồi

**Kết quả thực nghiệm trên nhánh `main`**:
- Các mật khẩu sai (`123456`, `password`, `qwerty`, `admin`):
  - Trả về **HTTP 401 Unauthorized**
  - Chiều dài gói tin ngắn (~48 bytes)
  - Thời gian phản hồi nhanh (~50-100ms)
- Tại dòng thử mật khẩu `admin123`:
  - Mã trạng thái đột ngột chuyển sang **HTTP 200 OK**
  - Chiều dài gói tin nhảy vọt lên **~382 bytes**
  - Thời gian phản hồi tương tự (~100-150ms do xử lý JWT)
- **Dữ liệu trả về**: JSON chứa:
  ```json
  {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      // ... other user fields
    }
  }
  ```

### Bước 5 (Chiếm quyền điều khiển)
**Thực hiện**:
1. Sao chép Access Token từ phản hồi HTTP 200
2. Thêm cookie `access_token` với giá trị token vào trình duyệt
3. Hoặc gửi request với header `Authorization: Bearer <token>`
4. Truy cập các endpoint cần thiết có quyền admin

**Kết quả**:
- Đăng nhập thành công vào giao diện quản trị viên
- Truy cập được tất cả tính năng dành cho role `admin`
- Xác nhận vai trò qua phản hồi từ endpoint `/api/users/me` hoặc tương tự

**Lưu ý về bảo mật trong thực nghiệm**:
- Token được lưu trong HttpOnly cookie, không thể truy cập qua JavaScript
- Tuy nhiên, trong cuộc démonстрация, chúng ta sao chép token thủ công để minh chứng
- Trong thực tế, attacker có thể sử dụng token này để thực hiện các hành động bên trong vai trò admin