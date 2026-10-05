# CHƯƠNG 1: CƠ SỞ LÝ THUYẾT VỀ BRUTE FORCE

## 1.1. Khái niệm xác thực người dùng

Xác thực người dùng (authentication) là quá trình xác minh danh tính của một người dùng trước khi cho phép truy cập vào hệ thống hoặc tài nguyên. Cơ chế xác thực phổ biến nhất là sử dụng coppia username/password, trong đó:
- **Username**: Danh tính công khai để識別 người dùng
- **Password**: Bí mật riêng được dùng để chứng minh quyền sở hữu username

Quy trình xác thực typically bao gồm:
1. Người dùng cung cấp username và password
2. Hệ thống tra cứu thông tin người dùng dựa trên username
3. So sánh password đã cung cấp với password được lưu trữ (sau khi băm)
4. Nếu khớp, cấp phép truy cập; nếu không, từ chối truy cập

Trong dự án này, hệ thống sử dụng:
- **Password hashing**: Bcrypt để lưu trữ mật khẩu dưới dạng băm một chiều
- **Token-based authentication**: JWT (JSON Web Token) sau khi đăng nhập thành công
- **Cookie storage**: Access token được lưu trong HttpOnly cookie để tăng cường bảo mật

## 1.2. Kỹ thuật tấn công Brute Force là gì?

**Định nghĩa**: Brute Force attack (tấn công vét cạn) là phương pháp thử mọi tổ hợp có thể của mật khẩu cho đến khi tìm ra mật khẩu chính xác.

**Ưu điểm**:
- **Chắc chắn tìm ra mật khẩu**: Với đủ thời gian và tài nguyên, Brute Force sẽ luôn tìm ra mật khẩu nếu biết được chiều dài và tập hợp ký tự sử dụng
- **Đơn giản trong-triển khai**: Không cần kiến thức chuyên sâu về hệ thống mục tiêu
- **Không phụ thuộc vào lỗ hổng phần mềm**: Chỉ dựa vào tính yếu của chính sách mật khẩu

**Nhược điểm**:
- **Tốn tài nguyên énorm**: Số lần tentativa tăng theo mức độ O(C^N) với C là kích thước bộ ký tự và N là độ dài mật khẩu
- **Dễ phát hiện**: Tạo ra lượng lớn request thất bại trong thời gian ngắn
- **Thời gian không xác định**: Có thể mất từ giây đến hàng năm tùy thuộc vào độ phức tạp mật khẩu

Ví dụ: Với mật khẩu chỉ chứa chữ số (0-9) và độ dài 6 ký tự, cần thử tối đa 10^6 = 1.000.000組合. Với mật khẩu chứa chữ hoa, thường, số và ký tự đặc biệt (khoảng 95 ký tự) và độ dài 8 ký tự, cần thử tối đa 95^8 ≈ 6.6 quadrillion組合.

## 1.3. Kỹ thuật Dictionary Attack (Tấn công từ điển)

**Phân biệt**:
- **Brute Force thuần túy**: Thử mọi tổ hợp có thể (aaaa, aaab, aaac, ..., zzzz)
- **Dictionary Attack**: Sử dụng danh sách mật khẩu có sẵn (wordlist) dựa trên mật khẩu phổ biến trong thực tế

**Lý do effectiveness**:
- Người dùng thường chọn mật khẩu dễ nhớ mà không an toàn
- Các mật khẩu như "password", "123456", "admin123" xuất hiện thường xuyên trong những sự kiện rò rỉ dữ liệu
- Dictionary Attack giảm đáng kể số lần tentativa cần thực hiện

Trong dự án này, mật khẩu mặc định của tài khoản admin là "admin123" - một trong những mật khẩu phổ biến nhất thế giới, dễ dàng tìm thấy trong bất kỳ wordlist cơ bản nào.

## 1.4. Các công cụ phổ biến

### Burp Suite Intruder
- **Nguyên lý hoạt động**: Công cụ proxy cho phép bắt và sửa đổi request HTTP
- **Chế độ Sniper**: Đặt một vị trí payload và thử lần lượt từng giá trị từ wordlist
- **Ưu điểm**: Giao diện đồ họa直觀, hỗ trợ chi tiết request/response, dễ dàng cấu hình
- **Trong dự án**: Sử dụng để tấn công endpoint `/api/auth/token` với username=fixed và password=payload từ wordlist

### Hydra
- **Nguyên lý hoạt động**: Công cụ commandement dòng specialized trong brute force authentication
- **Hỗ trợ nhiều giao thức**: HTTP, HTTPS, SSH, FTP, SMTP, v.v.
- **Tốc độ cao**: Tối ưu cho việc gửi hàng nghìn request mỗi giây
- **Ưu điểm**: Dễ dàng script và tự động hóa trong môi trường terminal

### Tự động hóa với cURL/Python
- **cURL**: Lệnh dòng để gửi request HTTP, dễ tích hợp vào shell script
- **Python requests**: Thư viện mạnh mẽ để tương tác với API, cho phép xử lý phức tạp
- **Ưu điểm**: Tuyệt đối linh hoạt, có thể xử lý phản hồi JSON, lưu trữ session, v.v.

Trong thực nghiệm, nhóm đã chọn Burp Suite Intruder vì:
1. Giao diện trực quan giúp ghi chép và trình bày kết quả
2. Dễ dàng cấu hình và theo dõi tiến độ攻擊
3. Cung cấp thông tin chi tiết về mã trạng thái, kích thước phản hồi, thời gian chờ
4. Dễ dàng xuất kết quả để đưa vào báo cáo