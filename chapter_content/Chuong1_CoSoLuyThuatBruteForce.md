# CHƯƠNG 1: CƠ SỞ LÝ THUYẾT VỀ XÁC THỰC VÀ TẤN CÔNG BRUTE FORCE

## 1.1. Khái niệm xác thực người dùng (User Authentication)

Xác thực người dùng (Authentication) là quá trình kiểm tra và chứng minh tính xác thực về danh tính của một thực thể (người dùng hoặc dịch vụ) trước khi cấp quyền truy cập vào tài nguyên hoặc hệ thống thông tin. Cơ chế xác thực truyền thống phổ biến nhất hiện nay dựa trên tri thức sở hữu (knowledge factor) với cặp thông tin **Tên đăng nhập / Mật khẩu** (Username / Password):
- **Username**: Định danh công khai đại diện cho tài khoản người dùng trong hệ thống.
- **Password**: Chuỗi ký tự bí mật chỉ người dùng hợp pháp nắm giữ để chứng minh quyền sở hữu tài khoản.

Quy trình xác thực tiêu chuẩn diễn ra như sau:
1. Người dùng gửi thông tin `username` và `password` tới hệ thống.
2. Hệ thống tìm kiếm bản ghi tài khoản tương ứng với `username` trong cơ sở dữ liệu.
3. Hệ thống băm mật khẩu người dùng vừa nhập bằng giải thuật mật mã an toàn kèm chuỗi muối (Salt) và so khớp với giá trị băm đã lưu trữ.
4. Nếu kết quả băm trùng khớp, hệ thống cấp phát phiên làm việc (Session / Token); nếu sai, từ chối quyền truy cập.

Trong dự án thực nghiệm này, hệ thống web áp dụng các công nghệ bảo mật:
- **Băm mật khẩu an toàn**: Sử dụng thuật toán **Bcrypt** kèm salt ngẫu nhiên để lưu trữ mật khẩu dưới dạng băm một chiều, chống tấn công dò bảng tra trước (Rainbow Table).
- **Xác thực dựa trên Token (Token-based Authentication)**: Sử dụng chuẩn **JSON Web Token (JWT)** với thuật toán ký đối xứng HMAC-SHA256 (`HS256`).
- **Lưu trữ Cookie an toàn**: Token được lưu trữ trong **HttpOnly, Secure, SameSite=Strict Cookie** nhằm ngăn chặn rủi ro tấn công Cross-Site Scripting (XSS) đánh cắp phiên đăng nhập.

---

## 1.2. Kỹ thuật tấn công Brute Force là gì?

**Định nghĩa**: Tấn công Brute Force (tấn công vét cạn / duyệt toàn bộ) là phương pháp thử nghiệm tuần tự hoặc song song tất cả các tổ hợp ký tự có thể xảy ra của mật khẩu cho đến khi tìm được chuỗi mật khẩu chính xác.

### Ưu điểm của tấn công Brute Force:
- **Tính tất định cao**: Với không gian mẫu hữu hạn và không bị giới hạn về thời gian hay số lần thử, Brute Force chắc chắn sẽ tìm ra mật khẩu chính xác.
- **Không phụ thuộc vào lỗ hổng phần mềm**: Attacker chỉ khai thác điểm yếu trong không gian khóa của mật khẩu và sự thiếu vắng của cơ chế giới hạn truy cập, không cần phần mềm có lỗi lập trình (như SQL Injection, Buffer Overflow).
- **Dễ dàng tự động hóa**: Có thể viết script hoặc sử dụng các công cụ có sẵn để gửi hàng ngàn request mỗi giây.

### Nhược điểm của tấn công Brute Force:
- **Chi phí tính toán và tài nguyên khổng lồ**: Số lượng phép thử tăng theo độ phức tạp lũy thừa $\mathcal{O}(C^N)$, trong đó $C$ là kích thước bộ ký tự (Character set size) và $N$ là độ dài chuỗi mật khẩu.
- **Dễ bị phát hiện**: Tạo ra lưu lượng truy cập bất thường và số lượng lớn bản ghi lỗi xác thực (HTTP 401) trong nhật ký hệ thống (System logs).
- **Thời gian vét cạn không khả thi đối với mật khẩu mạnh**:
  - Với mật khẩu chỉ gồm chữ số ($C = 10$) và độ dài 6 ký tự: Số tổ hợp tối đa là $10^6 = 1.000.000$. Một máy tính có thể vét cạn trong vài giây.
  - Với mật khẩu gồm chữ hoa, chữ thường, số và ký tự đặc biệt ($C \approx 95$) độ dài 8 ký tự: Số tổ hợp là $95^8 \approx 6{,}63 \times 10^{15}$ (hơn 6,6 triệu tỷ tổ hợp). Kẻ tấn công mất hàng chục năm nếu vét cạn qua mạng Internet.

---

## 1.3. Kỹ thuật Dictionary Attack (Tấn công từ điển)

### Phân biệt giữa Brute Force thuần túy và Dictionary Attack:
- **Brute Force thuần túy**: Thử mọi tổ hợp toán học có thể theo thứ tự từ điển (`a`, `b`, ..., `aa`, `ab`, ..., `zzzz`). Phương pháp này cực kỳ tốn thời gian với các mật khẩu dài.
- **Dictionary Attack (Tấn công từ điển)**: Là một biến thể tối ưu hóa của Brute Force. Kẻ tấn công chỉ thử các từ khóa, cụm từ có nghĩa hoặc mật khẩu đã được tổng hợp từ trước vào một danh sách từ điển (Wordlist) thu thập từ các vụ rò rỉ dữ liệu thực tế (Data Breaches).

### Lý do Tấn công Từ điển mang lại hiệu quả cao:
1. **Tâm lý người dùng**: Đa số người dùng có xu hướng chọn mật khẩu ngắn, dễ nhớ, có quy luật ngữ nghĩa cá nhân (ví dụ: ngày sinh, tên thú cưng, từ ngữ phổ thông như `password`, `123456`, `admin123`).
2. **Tiết kiệm tài nguyên**: Thay vì thử hàng tỷ tổ hợp ngẫu nhiên vô nghĩa, kẻ tấn công chỉ cần thử vài ngàn đến vài triệu từ trong danh sách wordlist phổ biến (như `rockyou.txt`, `SecLists`), thu hẹp thời gian tấn công xuống còn vài chục giây đến vài phút.
3. **Mật khẩu mặc định của thiết bị/phần mềm**: Nhiều ứng dụng và thiết bị mạng khi xuất xưởng thường gán mật khẩu quản trị mặc định (`admin`, `admin123`, `root`). Nếu quản trị viên không đổi mật khẩu, Dictionary Attack sẽ khai thác thành công ngay lập tức.

Trong đồ án này, tài khoản quản trị `admin` ban đầu được gán mật khẩu mặc định là `admin123` – nằm trong nhóm 10 mật khẩu bị lộ nhiều nhất thế giới, tạo điều kiện thuận lợi cho cuộc tấn công từ điển thành công ở kịch bản chưa vá lỗi.

---

## 1.4. Các công cụ hỗ trợ tấn công phổ biến

### 1.4.1. Burp Suite Intruder
- **Nguyên lý hoạt động**: Burp Suite đóng vai trò là Web Proxy trung gian bắt giữ các gói tin HTTP/HTTPS giữa trình duyệt và máy chủ. Module **Intruder** cho phép cấu hình các vị trí tham số cần brute force (Payload Positions) và tự động thay thế giá trị từ file Wordlist vào từng request.
- **Các chế độ tấn công của Intruder**:
  - *Sniper*: Sử dụng một tập hợp payload duy nhất, thay thế tuần tự vào từng vị trí được đánh dấu `§...§`. Đây là chế độ phù hợp nhất khi đã biết trước `username=admin` và chỉ cần vét cạn trường `password`.
  - *Battering Ram*: Dùng cùng một payload nạp vào tất cả các vị trí cùng lúc.
  - *Pitchfork*: Sử dụng nhiều wordlist độc lập song song cho nhiều vị trí (thử cặp username:password tương ứng).
  - *Cluster Bomb*: Thử mọi tổ hợp chéo giữa nhiều danh sách wordlist khác nhau.
- **Ưu điểm**: Giao diện đồ họa (GUI) trực quan, lọc và phân loại phản hồi theo HTTP Status Code, Content-Length, Round-trip Time, rất thuận lợi cho việc phân tích thực nghiệm và làm bằng chứng báo cáo.

### 1.4.2. Hydra (THC-Hydra)
- **Nguyên lý hoạt động**: Công cụ dòng lệnh (CLI) cực nhanh, tối ưu hóa xử lý đa luồng (Multi-threading) chuyên dụng cho brute force authentication.
- **Phạm vi hỗ trợ**: Hỗ trợ hơn 50 giao thức mạng khác nhau (HTTP POST Form, HTTP Basic/Digest, SSH, FTP, Telnet, RDP, MySQL, v.v.).
- **Ưu thế**: Tốc độ xử lý cao, dễ dàng cấu hình bằng bash script để tự động hóa trên máy chủ Kali Linux.

### 1.4.3. Kịch bản tự động hóa với Python (Requests / Asyncio)
- **Nguyên lý**: Sử dụng ngôn ngữ lập trình Python kết hợp các thư viện mạng như `requests`, `httpx` hoặc `aiohttp` để gửi loạt request HTTP POST kèm tải dữ liệu tùy chỉnh.
- **Ưu điểm**: Khả năng tùy biến vô hạn; có thể tự động bóc tách cookie, giải mã token CSRF, xử lý bất đồng bộ hàng ngàn kết nối song song và ghi nhật ký phân tích chuyên sâu.

---

## 1.5. Đánh giá lựa chọn công cụ trong đề tài
Nhóm nghiên cứu quyết định chọn **Burp Suite Intruder** làm công cụ thực nghiệm tấn công chủ đạo vì các lý do:
1. Cho phép quan sát chi tiết toàn bộ cấu trúc Header, Payload và Cookie của từng gói tin HTTP request/response.
2. Trực quan hóa kết quả phân loại: Phân biệt rõ rệt mã trạng thái HTTP (HTTP 200 khi thành công, HTTP 401 khi sai mật khẩu, HTTP 403 khi tài khoản bị khóa, HTTP 429 khi bị chặn tần suất).
3. Hỗ trợ bổ sung các header giả mạo (như `X-Forwarded-For`) để minh họa kỹ thuật qua mặt cơ chế Rate Limiting ban đầu.
4. Cung cấp dữ liệu trực quan sinh động phục vụ cho việc chụp ảnh minh chứng trong Báo cáo kỹ thuật và quay video thuyết trình.