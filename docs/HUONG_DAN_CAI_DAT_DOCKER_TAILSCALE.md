# HƯỚNG DẪN CÀI ĐẶT DOCKER, LẤY TAILSCALE KEY VÀ KHỞI CHẠY DỰ ÁN

> **Dành cho:** Tất cả thành viên trong nhóm thực hiện đề tài *Tấn công Brute Force và Chính sách Mật khẩu*  
> **Mục tiêu:** Cài đặt môi trường Docker hoàn chỉnh trên Windows / Linux, đăng ký Tailscale, lấy Auth Key và chạy script public tên miền phục vụ nghiên cứu và demo thực nghiệm.

---

## MỤC LỤC

1. [Cài đặt Docker trên Windows](#1-cài-đặt-docker-trên-windows)
2. [Cài đặt Docker trên Linux (Ubuntu / Debian / Arch / Fedora)](#2-cài-đặt-docker-trên-linux)
3. [Hướng dẫn Đăng ký & Lấy Tailscale Auth Key](#3-hướng-dẫn-đăng-ký--lấy-tailscale-auth-key)
4. [Cấu hình Key vào Dự án & Khởi chạy Docker Compose](#4-cấu-hình-key-vào-dự-án--khởi-chạy-docker-compose)
5. [Chạy Script Kích hoạt Tên miền Công khai (Tailscale Funnel)](#5-chạy-script-kích-hoạt-tên-miền-công-khai-tailscale-funnel)
6. [Xử lý các lỗi thường gặp (Troubleshooting)](#6-xử-lý-các-lỗi-thường-gặp-troubleshooting)

---

## 1. CÀI ĐẶT DOCKER TRÊN WINDOWS

Đối với máy tính chạy hệ điều hành Windows 10/11:

### Bước 1.1: Bật WSL 2 (Windows Subsystem for Linux)
1. Mở **PowerShell** với quyền Administrator (nhấp chuột phải vào Start $\rightarrow$ chọn *Windows Terminal (Admin)* hoặc *PowerShell (Admin)*).
2. Chạy lệnh cài đặt WSL:
   ```powershell
   wsl --install
   ```
3. Sau khi cài xong, **khởi động lại máy tính (Restart PC)** nếu hệ thống yêu cầu.

### Bước 1.2: Tải và Cài đặt Docker Desktop
1. Truy cập trang chủ Docker: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Bấm nút **Download for Windows** để tải file cài đặt `Docker Desktop Installer.exe`.
3. Mở file vừa tải về và tiến hành cài đặt:
   - Đảm bảo tích chọn mục: **"Use WSL 2 instead of Hyper-V (recommended)"**.
   - Bấm **OK** và chờ quá trình giải nén hoàn tất.
4. Sau khi cài xong, bấm **Close and restart** để áp dụng thay đổi.

### Bước 1.3: Khởi động và Kiểm tra Docker trên Windows
1. Mở ứng dụng **Docker Desktop** từ Start Menu và đồng ý với điều khoản sử dụng (*Accept Terms*).
2. Chờ biểu tượng chú cá voi ở góc dưới thanh Taskbar chuyển sang trạng thái màu xanh lá (*Engine running*).
3. Mở **Command Prompt (CMD)** hoặc **PowerShell** và gõ lệnh kiểm tra:
   ```cmd
   docker --version
   docker compose version
   ```
   Nếu cả 2 lệnh đều hiển thị phiên bản (ví dụ `Docker version 27.x`, `Docker Compose version v2.x`) là bạn đã cài đặt thành công!

---

## 2. CÀI ĐẶT DOCKER TRÊN LINUX

Dành cho các thành viên sử dụng hệ điều hành Ubuntu, Debian, Kali Linux, Arch Linux hoặc Fedora:

### Cách 1: Sử dụng Script cài đặt tự động (Khuyên dùng cho Ubuntu/Debian/Kali)
Mở Terminal và chạy tuần tự các lệnh sau:

```bash
# 1. Tải và chạy script cài đặt chính thức từ Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Thêm người dùng hiện tại vào nhóm docker (để chạy docker không cần sudo)
sudo usermod -aG docker $USER

# 3. Kích hoạt dịch vụ Docker khởi động cùng hệ thống
sudo systemctl enable docker
sudo systemctl start docker

# 4. Áp dụng quyền nhóm mới ngay lập tức
newgrp docker
```

### Cách 2: Cài đặt trên Arch Linux / Manjaro
```bash
sudo pacman -Syu docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

### Kiểm tra cài đặt trên Linux:
```bash
docker --version
docker compose version
```

---

## 3. HƯỚNG DẪN ĐĂNG KÝ & LẤY TAILSCALE AUTH KEY

Tailscale cho phép tạo đường hầm an toàn (Funnel) từ máy cá nhân của bạn ra ngoài Internet với tên miền công khai kèm chứng chỉ HTTPS hoàn toàn miễn phí.

### Bước 3.1: Đăng ký tài khoản Tailscale
1. Truy cập trang chủ: [https://tailscale.com](https://tailscale.com).
2. Bấm **Get Started for Free** (hoặc **Log In**).
3. Đăng nhập bằng tài khoản Google, GitHub hoặc Microsoft của bạn.

### Bước 3.2: Bật tính năng Funnel trên Tailscale Admin Console
1. Truy cập vào trang quản trị: [https://login.tailscale.com/admin/](https://login.tailscale.com/admin/).
2. Trên thanh menu trên cùng, bấm vào mục **Access Controls**.
3. Kiểm tra file cấu hình ACL (Access Control List), đảm bảo có phần cấp quyền `funnel` cho các node (hoặc thêm đoạn sau vào nếu chưa có):
   ```json
   "nodeAttrs": [
       {
           "target": ["*"],
           "app": {
               "tailscale.com/cap/funnel": [{}]
           }
       }
   ]
   ```
4. Bấm **Save** để lưu lại.

### Bước 3.3: Tạo Auth Key
1. Đi tới phần cài đặt Keys: [https://login.tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys)  
   *(Hoặc: Bấm vào **Settings** ở góc trên bên phải $\rightarrow$ chọn mục **Keys** ở thanh bên trái)*.
2. Bấm nút **Generate auth key...**.
3. Cấu hình các tùy chọn cho Key:
   - **Description:** Đặt tên gợi nhớ (ví dụ: `ATMMT-Project`).
   - **Reusable:** ✅ **BẬT (Tích chọn mục này)**  
     *(Bắt buộc bật vì hệ thống có 2 container Tailscale cùng dùng chung key này).*
   - **Ephemeral:** Có thể bật hoặc tắt (Bật giúp tự động xóa thiết bị khi tắt container).
   - **Pre-authorized:** ✅ **BẬT** (để container tự động kết nối mà không cần duyệt tay).
4. Bấm nút **Generate key**.
5. **Sao chép ngay chuỗi key xuất hiện** (chuỗi ký tự bắt đầu bằng: `tskey-auth-...`).  
   *(Lưu ý: Khóa này chỉ xuất hiện 1 lần duy nhất, hãy lưu tạm vào Notepad).*

---

## 4. CẤU HÌNH KEY VÀO DỰ ÁN & KHỞI CHẠY DOCKER COMPOSE

### Bước 4.1: Clone dự án về máy
Mở Terminal / PowerShell và clone repository:
```bash
git clone https://github.com/Johnyyd/ATMMT.git
cd ATMMT/web
```

### Bước 4.2: Cập nhật Tailscale Auth Key
Mở file `web/docker-compose.yml` bằng VS Code, Notepad hoặc nano:
Tìm đến 2 vị trí chứa biến `TS_AUTHKEY`:

1. Tại service `tailscale-frontend` (khoảng dòng 45):
   ```yaml
   environment:
     - TS_AUTHKEY=tskey-auth-kMvFmVxPpg11CNTRL-dWkCF7p8tLFLXHhgSqzsKFc5bp7aHEYf # Thay key của bạn vào đây
   ```
2. Tại service `tailscale-backend` (khoảng dòng 64):
   ```yaml
   environment:
     - TS_AUTHKEY=tskey-auth-kMvFmVxPpg11CNTRL-dWkCF7p8tLFLXHhgSqzsKFc5bp7aHEYf # Thay key của bạn vào đây
   ```
Dán chuỗi `tskey-auth-...` mà bạn đã lấy ở Bước 3 vào cả hai vị trí này rồi lưu file lại.

### Bước 4.3: Khởi chạy toàn bộ hệ thống bằng Docker Compose
Trong thư mục `web/`, thực thi lệnh:
```bash
docker compose up -d --build
```
- Lệnh này sẽ tự động:
  - Tải base image và build ứng dụng Frontend (React + Nginx).
  - Cài đặt dependencies và build ứng dụng Backend (FastAPI + SQLite).
  - Tải container Tailscale và tự động xác thực vào tài khoản Tailscale của bạn.

Kiểm tra trạng thái các container:
```bash
docker compose ps
```
Nếu thấy cả 4 container: `chat_frontend`, `chat_backend`, `chat`, `chat_ts` đều ở trạng thái **Up** / **Running** là hoàn tất.

---

## 5. CHẠY SCRIPT KÍCH HOẠT TÊN MIỀN CÔNG KHAI (TAILSCALE FUNNEL)

Sau khi các container đã chạy, bạn cần kích hoạt đường hầm Tailscale Funnel để nhận tên miền HTTPS công khai.

### 5.1. Trên hệ điều hành Windows:
Trong thư mục `web/`, mở Command Prompt hoặc PowerShell và chạy:
```cmd
.\init-tailscale-tunnel.bat
```

### 5.2. Trên hệ điều hành Linux / macOS:
Trong thư mục `web/`, mở Terminal và chạy:
```bash
chmod +x init-tailscale-tunnel.sh
./init-tailscale-tunnel.sh
```

### 5.3. Xem Tên Miền Công Khai Được Cấp:
Chạy lệnh sau trên Terminal / CMD:
```bash
docker exec chat tailscale funnel status
```
Màn hình sẽ hiển thị thông tin đường hầm và tên miền thật được cấp, ví dụ:
```text
https://chat.<tên-mạng-của-bạn>.ts.net (Funnel on)
|-- / proxy http://frontend:8080
```

Bây giờ bạn có thể mở trình duyệt trên điện thoại hoặc máy tính khác (ở bất kỳ đâu ngoài Internet) và truy cập vào URL:
- Trang web chính thức (Frontend): `https://chat.<tên-mạng-của-bạn>.ts.net/`
- Backend API & Tài liệu Swagger UI: `https://chat-ts.<tên-mạng-của-bạn>.ts.net/docs`

Hệ thống đã sẵn sàng 100% để các thành viên trong nhóm tiến hành quay video demo hoặc thực nghiệm kịch bản tấn công và phòng thủ!

---

## 6. XỬ LÝ CÁC LỖI THƯỜNG GẶP (TROUBLESHOOTING)

1. **Lỗi `docker: command not found`:**
   - Đảm bảo Docker Desktop đã được cài đặt và đang chạy ngầm trên máy.
   - Thử đóng và mở lại cửa sổ Terminal / PowerShell mới để nhận biến môi trường PATH.

2. **Lỗi `Funnel not permitted` hoặc `Access denied` khi chạy script:**
   - Nguyên nhân: Tài khoản Tailscale của bạn chưa bật quyền Funnel trong phần **Access Controls (ACLs)**.
   - Khắc phục: Xem lại [Bước 3.2](#bước-32-bật-tính-năng-funnel-trên-tailscale-admin-console), đảm bảo đã lưu cấu hình `tailscale.com/cap/funnel`.

3. **Lỗi `machine already exists`:**
   - Nguyên nhân: Key cũ hoặc hostname trùng lặp.
   - Khắc phục: Vào Tailscale Admin Console mục **Machines**, xóa (Delete) các máy cũ tên là `chat` hoặc `chat-ts`, sau đó chạy lại lệnh `docker compose down -v` và `docker compose up -d`.

4. **Tắt hệ thống khi không dùng:**
   ```bash
   cd web
   docker compose down
   ```
