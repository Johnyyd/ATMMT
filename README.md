# TÀI LIỆU QUẢN LÝ DỰ ÁN: TẤN CÔNG BRUTE FORCE VÀ CHÍNH SÁCH MẬT KHẨU

## 1. Bối cảnh và Yêu cầu dự án

> 📖 **Tài liệu Kỹ thuật Chi tiết:** Xem hướng dẫn phân tích lỗ hổng do thám, kịch bản tấn công Brute Force và mã nguồn phòng thủ tại: [HUONG_DAN_DU_AN_BRUTE_FORCE.md](file:///home/tringuyen/Documents/GitHub/ATMMT/docs/HUONG_DAN_DU_AN_BRUTE_FORCE.md)

- **Tên đề tài:** Kỹ thuật tấn công mạng - Tấn công Brute Force và chính sách mật khẩu.
- **Quy mô:** Nhóm 11 thành viên.
- **Yêu cầu đầu ra (Deliverables):**
  1. **File báo cáo Word:** Phải tuân thủ chuẩn 5 chương (Lý thuyết -> Triển khai -> Phân tích kết quả -> Kết luận). Trang bìa, mục lục, định dạng lề, font chữ phải tuân thủ nghiêm ngặt theo file mẫu của Trường Đại học Công Thương TP. HCM
  2. **Video Demo:** Quay màn hình mô phỏng kịch bản tấn công và phòng thủ, **không có quá 10 phút**.

---

## 2. Phân công nhiệm vụ chi tiết (11 Thành Viên)

### 2.1. Nhóm Kỹ thuật & Video (3 người)

- **Người 1 (Tấn công):** Chạy tool Brute Force (vd: Burp Suite/Hydra). Chụp ảnh các bước cấu hình và kết quả.
- **Người 2 (Phòng thủ):** Đăng nhập hệ thống mục tiêu, thiết lập chính sách (độ dài mật khẩu, khóa tài khoản). Chụp ảnh lúc hệ thống báo lỗi/chặn tool.
- **Người 3 (Video Editor):** Quay màn hình thao tác của Người 1 & 2. Ghép và tua nhanh thành video dưới 10 phút.

### 2.2. Nhóm Biên soạn Nội dung (5 người)

- **Người 4:** Phụ trách **Mở đầu & Chương 1**.
- **Người 5:** Phụ trách **Chương 2**.
- **Người 6:** Phụ trách **Chương 3**.
- **Người 7:** Phụ trách **Chương 4**.
- **Người 8:** Phụ trách **Chương 5**.
- _(Xem dàn ý chi tiết từng chương ở Mục 6 bên dưới)_

### 2.3. Nhóm QA/QC & Trình bày (3 người)

- **Người 9 (Tổng biên tập / Định dạng Word):** Gom file từ 5 người viết. Xóa format rác, đồng bộ font, canh lề, tạo mục lục tự động giống hệt form mẫu.
- **Người 10 (Thiết kế Slide):** Lọc ý chính từ file Word để làm PowerPoint.
- **Người 11 (Diễn giả):** Thuyết trình trước lớp, khớp kịch bản nói với tiến độ của Video Demo.

---

## 3. Quy định làm việc & Quản lý Git

- `docs/drafts/`: Chứa file Word nháp của Người 4, 5, 6, 7, 8 (vd: `Chuong1_NguyenVanA.docx`).
- `assets/images/`: Chứa ảnh chụp màn hình demo của Người 1, 2.
- `assets/video/`: Chứa file video của Người 3 (Nếu > 100MB, tạo file `link_drive.txt`).
- `presentations/`: Chứa file Slide `.pptx`.
- `FINAL_DELIVERY/`: Nơi Người 9 push bản Word báo cáo cuối cùng hoàn chỉnh.

---

## 4. DÀN Ý CHI TIẾT TỪNG CHƯƠNG (BẮT BUỘC TUÂN THỦ)

Các thành viên phụ trách viết báo cáo (Người 4, 5, 6, 7, 8) phải dùng đúng các Tiêu đề (Heading) dưới đây trong file Word của mình. Có thể bổ sung ý nếu thấy phù hợp.

### PHẦN MỞ ĐẦU (Người 4 viết)

- **1. Lý do chọn đề tài:** Tầm quan trọng của mật khẩu trong bảo mật hệ thống thông tin, sự nguy hiểm của tấn công dò mật khẩu.
- **2. Mục tiêu nghiên cứu:** Tìm hiểu nguyên lý Brute Force và cách chống lại bằng cấu hình hệ thống.
- **3. Đối tượng và phạm vi nghiên cứu:** (Ghi rõ: Chỉ tập trung demo trên form đăng nhập web giả định hoặc giao thức cụ thể, không tấn công hệ thống thực tế bên ngoài).

### CHƯƠNG 1: CƠ SỞ LÝ THUYẾT VỀ BRUTE FORCE (Người 4 viết)

- **1.1. Khái niệm xác thực người dùng:** Giải thích ngắn gọn cơ chế Username/Password hoạt động ra sao.
- **1.2. Kỹ thuật tấn công Brute Force là gì?** Định nghĩa, ưu điểm (chắc chắn tìm ra nếu đủ thời gian) và nhược điểm (tốn tài nguyên, dễ bị phát hiện).
- **1.3. Kỹ thuật Dictionary Attack (Tấn công từ điển):** Phân biệt sự khác nhau giữa Brute Force thuần túy (thử mọi tổ hợp) và dùng Wordlist.
- **1.4. Các công cụ phổ biến:** Giới thiệu ngắn 1-2 công cụ (vd: Burp Suite Intruder, Hydra) mà nhóm dự định dùng.

### CHƯƠNG 2: CHÍNH SÁCH MẬT KHẨU VÀ PHÒNG THỦ (Người 5 viết)

- **2.1. Chính sách mật khẩu (Password Policy) là gì?** Định nghĩa và vai trò trong việc bảo vệ hệ thống.
- **2.2. Tiêu chuẩn của một mật khẩu mạnh:** Phân tích yếu tố độ dài (min length) và độ phức tạp (chữ hoa, chữ thường, số, ký tự đặc biệt).
- **2.3. Cơ chế Account Lockout (Khóa tài khoản):** Giải thích cách hệ thống đếm số lần đăng nhập sai và thời gian khóa (Lockout duration) để bẻ gãy Brute Force.
- **2.4. Các cơ chế bổ sung (Tùy chọn):** Giới thiệu thêm về Rate Limiting (Giới hạn tốc độ request) hoặc CAPTCHA.

### CHƯƠNG 3: TRIỂN KHAI KỊCH BẢN TẤN CÔNG (Người 6 viết)

_(Lưu ý: Chương này phải chèn hình ảnh do Người 1 cung cấp)_

- **3.1. Thiết lập môi trường tấn công:** Mô tả hệ thống "nạn nhân" (IP, chức năng form đăng nhập) và công cụ tấn công được sử dụng.
- **3.2. Chuẩn bị Wordlist:** Liệt kê một số mật khẩu mẫu có trong file từ điển.
- **3.3. Các bước tiến hành tấn công:** Trình bày theo dạng Bước 1, Bước 2... (Cấu hình IP -> Nạp wordlist -> Bắt đầu chạy).
- **3.4. Kết quả kịch bản 1:** Chụp ảnh màn hình cho thấy công cụ đã bắt được HTTP Status Code (vd: 200 OK hoặc 302 Found) và tìm ra mật khẩu thành công.

### CHƯƠNG 4: TRIỂN KHAI PHÒNG THỦ VÀ PHÂN TÍCH (Người 7 viết)

_(Lưu ý: Chương này phải chèn hình ảnh do Người 2 cung cấp)_

- **4.1. Thiết lập chính sách bảo vệ trên hệ thống:** Trình bày các bước Admin cấu hình (Ví dụ: Chỉnh policy khóa tài khoản sau 5 lần nhập sai).
- **4.2. Kịch bản tấn công lại:** Chạy lại tool Brute Force ở Chương 3 vào hệ thống vừa được bảo vệ.
- **4.3. Phân tích kết quả:**
  - Hiện tượng gì xảy ra? (Hệ thống trả về mã lỗi 403 Forbidden hoặc hiển thị "Tài khoản đã bị khóa").
  - Tốc độ và hiệu quả của tool tấn công bị giảm sút/vô hiệu hóa ra sao?
  - Đánh giá trực tiếp sức mạnh của chính sách mật khẩu.

### CHƯƠNG 5: KẾT LUẬN (Người 8 viết)

- **5.1. Kết quả đạt được:** Nhóm đã làm được gì (hiểu nguyên lý, demo thành công 2 kịch bản).
- **5.2. Những hạn chế của đề tài:** (Ví dụ: Chỉ thử nghiệm ở quy mô nhỏ, chưa thử nghiệm vượt CAPTCHA, chưa dùng IP proxy/botnet).
- **5.3. Hướng phát triển:** Nhắc đến các xu hướng bảo mật tương lai (Xác thực 2 lớp - 2FA, đăng nhập không mật khẩu bằng sinh trắc học - Passwordless).
