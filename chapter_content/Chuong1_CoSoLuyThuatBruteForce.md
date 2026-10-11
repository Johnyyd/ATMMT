# CHƯƠNG 1: CƠ SỞ LÝ THUYẾT VỀ XÁC THỰC VÀ TẤN CÔNG BRUTE FORCE

## 1.1. Bản chất của xác thực người dùng dựa trên mật khẩu

Xác thực (Authentication) là bước đầu tiên trong tam giác bảo mật AAA (Authentication, Authorization, Accounting), có nhiệm vụ đối chiếu thông tin người dùng cung cấp với dữ liệu định danh lưu trữ nhằm xác nhận danh tính trước khi cấp quyền truy cập tài nguyên.

Trong các mô hình xác thực dựa trên yếu tố tri thức (knowledge-based factor), cặp thông tin định danh phổ biến nhất gồm:
- **Tên đăng nhập (Username)**: Chuỗi ký tự công khai dùng để định danh duy nhất một thực thể trong hệ thống.
- **Mật khẩu (Password)**: Chuỗi ký tự bí mật chỉ người dùng hợp pháp nắm giữ.

Quy trình xác thực chuẩn của một ứng dụng web hiện đại diễn ra qua 4 bước:
1. **Tiếp nhận thông tin xác thực**: Người dùng gửi yêu cầu đăng nhập chứa `username` và `password` thô (hoặc đã được mã hóa ở tầng client) lên máy chủ qua kênh truyền an toàn HTTPS.
2. **Truy vấn bản ghi tài khoản**: Máy chủ tìm kiếm tài khoản tương ứng trong cơ sở dữ liệu dựa trên `username`. Nếu không tìm thấy, hệ thống dừng xử lý hoặc thực thi nhánh xử lý chống rò rỉ thông tin.
3. **So khớp giá trị băm (Hash verification)**: Máy chủ sử dụng giải thuật băm một chiều an toàn để kiểm tra mật khẩu nhận được với chuỗi băm lưu trữ (`hashed_password`) kèm chuỗi muối (Salt).
4. **Cấp phát định danh phiên (Session/Token issuance)**: Nếu khớp, máy chủ tạo phiên làm việc (Session ID hoặc JSON Web Token) và gửi về client. Nếu sai, hệ thống từ chối yêu cầu và phản hồi mã lỗi (HTTP 401).

Trong kiến trúc của hệ thống web thực nghiệm (`/web`), cơ chế xác thực được xây dựng dựa trên các chuẩn kỹ thuật cụ thể:
- **Lưu trữ mật khẩu bằng Bcrypt (`app/security.py`)**: Sử dụng thư viện `passlib` với thuật toán băm chậm Bcrypt kết hợp muối ngẫu nhiên (salt) được sinh tự động cho từng mật khẩu. Muối triệt tiêu hoàn toàn nguy cơ tấn công bằng bảng tra cứu trước (Rainbow Table), trong khi hệ số làm chậm (work factor/cost factor) buộc kẻ tấn công phải tiêu tốn chu kỳ CPU đáng kể cho mỗi lần thử.
- **Xác thực phi trạng thái bằng JWT (JSON Web Token)**: Khi đăng nhập thành công, máy chủ cấp token ký theo chuẩn HMAC-SHA256 (`HS256`), payload chứa định danh người dùng (`sub`), vai trò (`role`) và mã tài khoản (`user_id`).
- **Bảo vệ Token bằng HttpOnly Cookie**: Token được gán vào cookie với đầy đủ cờ bảo mật `HttpOnly=True`, `Secure=True`, `SameSite=Strict`. Cấu hình này ngăn chặn JavaScript trên trình duyệt truy cập token (loại trừ nguy cơ đánh cắp phiên qua XSS) và giảm thiểu rủi ro tấn công Cross-Site Request Forgery (CSRF).

---

## 1.2. Kỹ thuật tấn công Brute Force

### 1.2.1. Định nghĩa và nguyên lý hoạt động
Tấn công Brute Force (vét cạn / duyệt toàn bộ không gian khóa) là phương pháp thử lần lượt tất cả các tổ hợp ký tự có thể xảy ra của mật khẩu cho đến khi tìm được chuỗi khớp với thông tin xác thực của nạn nhân.

Về mặt toán học, nếu một mật khẩu có độ dài $L$ được tạo thành từ một bộ ký tự có kích thước $C$, tổng số tổ hợp khả dĩ $N$ trong không gian khóa được xác định theo công thức:
$$N = C^L$$

Nếu kẻ tấn công gửi thử nghiệm với tốc độ trung bình $R$ (phép thử/giây), thời gian tối đa $T_{\max}$ để vét cạn toàn bộ không gian khóa là:
$$T_{\max} = \frac{C^L}{R}$$

Thời gian kỳ vọng trung bình để tìm ra mật khẩu (với giả thiết phân phối đều) là:
$$T_{\text{avg}} = \frac{C^L}{2R}$$

### 1.2.2. Đặc điểm kỹ thuật của Brute Force
- **Tính chắc chắn (Completeness)**: Nếu không gian ký tự là hữu hạn và hệ thống đích không có cơ chế giới hạn số lần thử, Brute Force luôn tìm ra kết quả đúng sau một số hữu hạn các bước.
- **Không yêu cầu lỗi logic phần mềm**: Brute Force không khai thác lỗ hổng tràn bộ đệm (Buffer Overflow) hay lỗi chèn lệnh (SQL Injection), mà khai thác trực tiếp sự yếu kém trong không gian mật khẩu và sự thiếu hụt của các rào cản kiểm soát truy cập tại cổng đăng nhập.
- **Khả năng tự động hóa cao**: Kẻ tấn công có thể dùng script đa luồng hoặc các công cụ tự động để phát sinh liên tục các gói tin HTTP POST tới endpoint xác thực.

### 1.2.3. Rào cản và điểm yếu của phương pháp
- **Độ phức tạp tính toán bùng nổ theo hàm mũ**: Mỗi khi tăng thêm 1 ký tự vào độ dài mật khẩu, số phép thử phải nhân thêm $C$ lần.
  - Mật khẩu chỉ gồm số ($C = 10$), độ dài 6 ký tự: $10^6 = 1.000.000$ tổ hợp. Một máy tính phổ thông có thể hoàn thành việc gửi qua mạng nội bộ trong vài phút.
  - Mật khẩu gồm đầy đủ chữ hoa, chữ thường, số và ký tự đặc biệt ($C \approx 94$), độ dài 8 ký tự: $94^8 \approx 6{,}09 \times 10^{15}$ tổ hợp. Với tốc độ gửi request qua mạng công cộng đạt 100 req/s, kẻ tấn công phải mất gần 2 triệu năm để quét hết không gian này.
- **Dễ bị phát hiện qua nhật ký**: Brute Force tạo ra đột biến lớn về lưu lượng mạng và số lượng bản ghi mã lỗi HTTP 401/403 trong log máy chủ, giúp hệ thống giám sát an ninh (WAF/SIEM) phát hiện nguồn tấn công rất nhanh.

---

## 1.3. Kỹ thuật tấn công từ điển (Dictionary Attack)

### 1.3.1. Phân biệt Brute Force thuần túy và Dictionary Attack
Trong thực tế kiểm thử thâm nhập, kẻ tấn công rất hiếm khi dùng Brute Force thuần túy để dò mật khẩu từ con số không qua đường truyền mạng, bởi độ trễ mạng (Network Latency) và tài nguyên băng thông là những nút thắt vật lý không thể vượt qua. Thay vào đó, phương pháp được sử dụng chủ đạo là **Dictionary Attack (Tấn công từ điển)**:

| Tiêu chí | Brute Force thuần túy | Dictionary Attack (Tấn công từ điển) |
| :--- | :--- | :--- |
| **Không gian thử nghiệm** | Toàn bộ tổ hợp toán học khả dĩ $C^L$ | Tập hợp con các từ có xác suất xuất hiện cao (Wordlist) |
| **Thứ tự thử** | Tuần tự hoặc hoán vị theo bộ ký tự | Ưu tiên các từ phổ biến nhất theo thống kê thực tế |
| **Chi phí tính toán** | Tăng theo cấp số nhân với độ dài mật khẩu | Phụ thuộc tuyến tính vào kích thước file từ điển $\mathcal{O}(M)$ |
| **Thời gian thực hiện qua mạng** | Cực kỳ dài (hàng năm đến hàng thế kỷ với mật khẩu dài) | Nhanh (từ vài giây đến vài phút cho hàng ngàn từ) |
| **Tỷ lệ thành công** | 100% về lý thuyết (nếu không giới hạn thời gian) | Phụ thuộc vào thói quen đặt mật khẩu của nạn nhân |

### 1.3.2. Cơ sở thực tiễn của Tấn công từ điển
Hiệu quả của Dictionary Attack bắt nguồn từ các yếu tố hành vi con người và quản trị hệ thống:
1. **Thói quen sử dụng mật khẩu dễ nhớ**: Người dùng có xu hướng chọn mật khẩu ngắn, chứa các từ ngữ phổ thông, dãy số bàn phím liên tiếp (`123456`, `qwerty`), tên riêng, ngày sinh, hoặc các từ vựng tiếng Anh thông dụng.
2. **Dữ liệu từ các vụ rò rỉ thực tế (Data Breaches)**: Các tệp từ điển chuẩn công nghiệp như `rockyou.txt` chứa hơn 14 triệu mật khẩu thu thập từ các vụ lộ lọt dữ liệu có thật trên thế giới. Kẻ tấn công chỉ cần lọc ra top 1.000 hoặc 10.000 từ phổ biến nhất là đã bao phủ một tỷ lệ lớn tài khoản người dùng bình thường.
3. **Mật khẩu khởi tạo mặc định (Default Credentials)**: Nhiều phần mềm, thiết bị mạng và dịch vụ nội bộ khi vừa cài đặt thường đi kèm tài khoản quản trị mặc định (như `admin/admin`, `admin/admin123`, `root/root`). Nếu quản trị viên quên đổi mật khẩu ngay sau khi triển khai, kẻ tấn công chỉ cần vài giây gửi request là đã chiếm được quyền điều khiển cao nhất.

Trong hệ thống web thực nghiệm này, trên nhánh mã nguồn khởi điểm (`main`), tài khoản quản trị viên `admin` được khởi tạo mật khẩu mặc định là `admin123`. Đây là mật khẩu đứng trong nhóm đầu các danh sách rò rỉ phổ biến, tạo điều kiện cho kịch bản tấn công từ điển thành công nhanh chóng.

---

## 1.4. Các công cụ hỗ trợ tấn công xác thực

### 1.4.1. Burp Suite Intruder
Burp Suite là bộ công cụ kiểm thử bảo mật ứng dụng web chuẩn công nghiệp của PortSwigger. Module **Intruder** hoạt động theo mô hình proxy chặn bắt và tự động hóa các yêu cầu HTTP:
- **Cơ chế hoạt động**: Bắt một gói tin HTTP mẫu (ví dụ request đăng nhập `POST /api/auth/token`), đánh dấu các vị trí cần thay thế tham số bằng ký hiệu `§...§`, sau đó nạp danh sách payload (wordlist) để gửi lặp lại tự động.
- **Các chế độ tấn công (Attack Types)**:
  - *Sniper*: Dùng một danh sách wordlist, lần lượt thay thế vào từng vị trí được đánh dấu. Đây là chế độ phù hợp nhất khi kẻ tấn công đã xác định được `username=admin` và chỉ cần vét cạn trường `password`.
  - *Battering Ram*: Dùng cùng một giá trị payload nạp đồng thời vào mọi vị trí được đánh dấu trong gói tin.
  - *Pitchfork*: Dùng nhiều danh sách payload độc lập chạy song song theo từng cặp dòng (dòng 1 của list 1 đi kèm dòng 1 của list 2). Phù hợp khi thử danh sách các cặp tài khoản và mật khẩu tương ứng.
  - *Cluster Bomb*: Thử toàn bộ tổ hợp tích Descartes giữa nhiều danh sách payload. Số lượng request sinh ra bằng tích độ dài các danh sách.
- **Khả năng phân tích kết quả**: Cho phép lọc, sắp xếp kết quả theo HTTP Status Code, Content-Length và Round-trip Time. Giúp kẻ tấn công nhận diện ngay gói tin đăng nhập thành công khi có sự thay đổi đột ngột về mã phản hồi (từ 401 sang 200) hoặc độ dài nội dung trả về.

### 1.4.2. THC-Hydra
- **Đặc tính**: Công cụ dòng lệnh (CLI) chạy trên môi trường Linux/Kali Linux, tối ưu hóa xử lý đa luồng (multi-threading) ở mức socket để đạt tốc độ gửi yêu cầu tối đa.
- **Phạm vi giao thức**: Hỗ trợ hơn 50 giao thức truyền thông khác nhau, bao gồm HTTP POST Form, HTTP Basic/Digest Auth, SSH, FTP, SMB, MySQL, RDP.
- **Ưu điểm**: Nhẹ, tốc độ cao, dễ nhúng vào các bash script kiểm thử thâm nhập tự động.

### 1.4.3. Script tùy biến bằng Python (Requests / Httpx / Asyncio)
- **Đặc tính**: Tự viết mã nguồn bằng Python sử dụng các thư viện mạng như `requests`, `httpx` hoặc cơ chế bất đồng bộ `asyncio/aiohttp`.
- **Ưu điểm**: Linh hoạt tuyệt đối khi xử lý các kịch bản phức tạp: tự động trích xuất CSRF token từ trang trước, giải mã/mã hóa payload theo thuật toán riêng của ứng dụng (như bọc RSA/AES trước khi gửi), hoặc điều chỉnh tốc độ gửi request linh hoạt theo độ trễ máy chủ.

---

## 1.5. Lựa chọn công cụ và phương pháp trong đề tài

Trong khuôn khổ đề tài, nhóm lựa chọn **Burp Suite Community/Professional Edition** làm công cụ thực nghiệm chính vì các lý do kỹ thuật sau:
1. **Minh bạch cấu trúc gói tin mạng**: Burp Suite cho phép kiểm tra chi tiết từng byte của HTTP Request Header, Request Body, Response Header và Cookie của cả 2 kịch bản (khi chưa phòng thủ và sau khi đã phòng thủ).
2. **Khả năng quan sát trực quan các phản hồi**: Phân biệt rành mạch giữa các trạng thái phản hồi của máy chủ:
   - `HTTP 200 OK`: Đăng nhập thành công, máy chủ cấp token JWT.
   - `HTTP 401 Unauthorized`: Mật khẩu sai, hệ thống từ chối xác thực.
   - `HTTP 403 Forbidden`: Tài khoản bị tạm khóa do nhập sai quá ngưỡng cho phép (Account Lockout).
   - `HTTP 429 Too Many Requests`: Địa chỉ IP bị chặn do vượt ngưỡng tần suất (Rate Limiting).
3. **Dễ dàng giả lập các kỹ thuật né tránh (Evasion Techniques)**: Cho phép chèn các tiêu đề tùy biến như `X-Forwarded-For` để kiểm chứng lỗ hổng tin cậy header giả mạo của bộ cân bằng tải trên mã nguồn ban đầu.
4. **Phục vụ trực quan cho báo cáo kỹ thuật và video demo**: Giao diện bảng kết quả của Intruder cung cấp bằng chứng rõ ràng, thuyết phục và có thể ghi hình trực tiếp để đối chiếu số liệu.