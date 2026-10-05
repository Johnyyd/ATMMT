# CHƯƠNG 2: CHÍNH SÁCH MẬT KHẨU VÀ PHÒNG THỦ

## 2.1. Chính sách mật khẩu (Password Policy) là gì?

**Định nghĩa**: Chính sách mật khẩu là bộ quy định và tiêu chuẩn xác định đặc điểm các mật khẩu được phép sử dụng trong hệ thống, bao gồm:
- Độ dài tối thiểu và tối đa
- Yêu cầu về độ phức tạp (kích thước bộ ký tự sử dụng)
- Giới hạn về việc tái sử dụng mật khẩu cũ
- Thời gian tồn tại của mật khẩu trước khi phải thay đổi
- Hành động khi vi phạm chính sách (từ chối, cảnh báo, khóa tài khoản)

**Vai trò trong việc bảo vệ hệ thống**:
1. **Tăng cường độ khó ataque**: Làm tăng số lượng tổ hợp mật khẩu khả thi
2. **Ngăn chặn mật khẩu yếu**: Loại bỏ các mật khẩu phổ biến dễ đoán
3. **Tích hợp với các cơ chế bảo vệ khác**: Hiệu lực khi kết hợp với Account Lockout, Rate Limiting
4. **Tuân thủ tiêu chuẩn an toàn thông tin**: Đáp ứng các yêu cầu như NIST, ISO 27001, PCI-DSS

Trong hệ thống trước khi vá lỗi (nhánh `main`):
- Độ dài tối thiểu: 6 ký tự
- Không yêu cầu độ phức tạp (chữ hoa, thường, số, ký tự đặc biệt)
- Mật khẩu mặc định: "admin123" khi biến môi trường ADMIN_PASSWORD không được thiết lập

## 2.2. Tiêu chuẩn của một mật khẩu mạnh

### Yếu tố độ dài (Min Length)
- **Lý do**: Độ dài là yếu tố quan trọng nhất trong việc cưỡng chế Brute Force
- **Tác động**: Mỗi ký tự bổ sung tăng số lượng tổ hợp theo cấp số nhân với kích thước bộ ký tự
- **Ví dụ**: 
  - 6 ký tự chỉ số: 10^6 = 1.000.000組合
  - 8 ký tự chỉ số: 10^8 = 100.000.000組合 (tăng 100x)
  - 8 ký tựalphanumeric thường: 36^8 ≈ 2.8 trillion組合

### Yếu tố độ phức tạp (Complexity)
- **Bộ ký tự thường dùng**:
  - Chữ thường (a-z): 26 ký tự
  - Chữ hoa (A-Z): 26 ký tự
  - Chữ số (0-9): 10 ký tự
  - Ký tự đặc biệt (!@#$%^&*(),.?":{}|<>): khoảng 32 ký tự
- **Tác động**: Kết hợp các bộ ký tự tăng độ bewilderment đáng kể
- **Ví dụ**:
  - Chỉ chữ thường: 26^8 ≈ 208.8 billion組合
  - Chữ thường + hoa: 52^8 ≈ 53.4 trillion組合 (tăng 256x)
  - Chữ thường + hoa + số: 62^8 ≈ 218.3 trillion組合
  - Tous 4 bộ ký tự: 94^8 ≈ 6.095 quadrillion組合

### Tiêu chuẩn NIST (National Institute of Standards and Technology)
**NIST Special Publication 800-63B** đề xuất:
- **Độ dài tối thiểu**: ≥ 8 ký tự (không bắt buộc upper limit nếu cho phép passphrase)
- **Độ phức tạp**: Bắt buộc tổ hợp từ almeno 2 trong 4 bộ ký tự (hoa, thường, số, đặc biệt)
  - Tuy nhiên, NIST 2020 đã nhấn mạnh độ dài hơn độ phức tạp
- **Kiểm tra từ điển từ chối**: Từ chối mật khẩu xuất hiện trong danh sách rò rỉ phổ biến
- **Không bắt buộc thay đổi định kỳ**: Nếu không có dấu hiệu bị làmimard
- **Cho phép copy-paste**: Trong trường hợp sử dụng password manager

**Đề xuất cho hệ thống**:
- Độ dài tối thiểu: 10 ký tự
- Bắt buộc chứa ít nhất:
  - 1 chữ hoa
  - 1 chữ thường  
  - 1 chữ số
  - 1 ký tự đặc biệt
- Kiểm tra từ điển từ chối: Loại bỏ top 1000 mật khẩu phổ biến
- Lưu trữ mật khẩu dưới dạng bcrypt với work factor đủ cao (>=12)

## 2.3. Cơ chế Account Lockout (Khóa tài khoản)

**Định nghĩa**: Cơ chế khóa tài khoản tạm thời sau một số lần đăng nhập thất bại liên tiếp, nhằm ngăn chặn cuộc tấn công Brute Force và credential stuffing.

**Thuật toán hoạt động**:
1. **Theo dõi số lần thất bại**: Mỗi lần đăng nhập sai tăng bộ đếm `failed_login_attempts`
2. **Kiểm tra ngưỡng**: Khi `failed_login_attempts >= MAX_FAILED_ATTEMPTS` → kích hoạt khóa
3. **Thiết lập thời gian khóa**: Ghi lại `locked_until = current_time + LOCKOUT_DURATION`
4. **Từ chối truy cập**: Trong thời gian khóa, tất cả yêu cầu đăng nhập trả về lỗi (thường là HTTP 403)
5. **Tự động mở khóa**: Khi thời gian hiện tại >= `locked_until`, tự động reset bộ đếm
6. **Reset khi thành công**: Khi đăng nhập thành công, reset `failed_login_attempts = 0` và `locked_until = NULL`

**Tham số cấu hình trong dự án**:
- `MAX_FAILED_ATTEMPTS = 5`: Cho phép sai tối đa 5 lần liên tiếp
- `LOCKOUT_DURATION_MINUTES = 15`: Khóa tài khoản trong 15 phút
- **Lý do chọn значение**:
  - 5 lần: Đủ để cho phép người dùng thật nhập sai do lỗi quên, nhưng đủต่ để chặn Brute Force
  - 15 phút: Dài đủ để làm chậm đáng kể attacker, nhưng ngắn đủ để không gây 불便 quá lớn cho người dùng thật

**Lợi thế bảo mật**:
- **Chống Brute Force hiệu quả**: Giảm tốc độ попытка từ hàng nghìn/giây xuống 5 lần/15 phút
- **Ghi log và cảnh báo**: Dễ dàng phát hiện cuộc tấn công qua hệ thống logging
- **Tái thiết tự động**: Không cần can thiệp quản trị để mở khóa sau thời gian hết hạn

**Nhược điểm cần lưu ý**:
- **Risk of Account Denial of Service**: Attacker có thể故意 khóa tài khoản người dùng thật
- **Giải pháp**: Kết hợp với CAPTCHA sau một số lần thất bại, hoặc sử dụngロックOUT dựa trên IP kết hợp với tài khoản

## 2.4. Các cơ chế bổ sung (Tùy chọn)

### Rate Limiting (Giới hạn tốc độ request)
**Định nghĩa**: Giới hạn số lượng request mà một client (được xác định bằng IP) có thể gửi trong một khoảng thời gian nhất định.

**Thuật toán Token Bucket (triển khai trong dự án)**:
- Mỗi IP có một "bucket" với sức chứa nhất định (ví dụ: 10 token)
- Mỗi request tiêu thụ 1 token
- Bucket được bổ sung lại với tốc độ恒定 (ví dụ: 1 token/6 giây để đạt 10 token/60s)
- Khi bucket hết token → trả về lỗi (thường là HTTP 429 Too Many Requests)

**Cấu hình trong dự án sau khi vá lỗi**:
- **General endpoints**: 10 requests per 60 seconds per IP
- **Authentication endpoints**: 5 requests per 900 seconds (15 minutes) per IP
- **Lý do**: 
  - General endpoints cho phép truy cập bình thường nhưng giới hạn lạm dụng
  - Auth endpoints có ngưỡng nghiêm ngặt hơn vì là लक्ष点 Brute Force

**Ưu điểm**:
- Dễ dàng triển khai và cấu hình
- Hiệu quả chống lại các cuộc công撃 tự động
- Có thể áp dụng dựa trên nhiều yếu tố (IP, user account, API key, v.v.)

### CAPTCHA (Completely Automated Public Turing test to tell Computers and Humans Apart)
**Định nghĩa**: Thử thách designed để phân biệt giữa người dùng thật và bot tự động.

**Các loại phổ biến**:
- **Text-based CAPTCHA**: Nhập ký tự từ hình ảnh bị distort
- **Image-based CAPTCHA**: Chọn hình ảnh thỏa mãn điều kiện nhất định (ví dụ: "Chọn tất cả ảnh có xe đạp")
- **reCAPTCHA (Google)**: Phân tích hành vi người dùng, chỉ hiển thị thử thách khi suspicion cao
- **Cloudflare Turnstile**: Giải pháp hiện đại, ít làm phiền người dùng hơn

**Vị trí triển khai đề xuất**:
- Sau 2 lần đăng nhập thất bại liên tiếp
- Kết hợp với Rate Limiting để tạo difesa-in-depth
- Chỉ áp dụng cho endpoints xác thực để giảmภาระ cho các API khác

**Lợi thế**:
- Hiệu quả ngặn hầu hết bot tự động
- Tăng độ tin cậy của hệ thống bảo vệ
- Dễ dàng tích hợp qua dịch vụ của bên thứ ba

### Tổng quan về difesa-in-depth
Một hệ thống bảo mật mạnh mẽ nên kết hợp nhiều lớp防御:
1. **Chính sách mật khẩu mạnh**: Tăng độ khó của mật khẩu
2. **Rate Limiting**: Giớiandt tần suất request
3. **Account Lockout**: Ngăn chặn tentatives vô hạn trên cùng một tài khoản
4. **CAPTCHA**: Phân biệt người thật và bot
5. **Monitoring và logging**: Phát hiện và phản hồi kịp thời tới các hành động sospechoso

Trong dự án này, các lớp 1-3 đã được triển khai trong nhánh `fix_policy`, tạo thành nền tảng bảo mật tốt mà vẫn đơn giản đủ để học tập và trình bày.