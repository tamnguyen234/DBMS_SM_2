# Phân tích luồng hoạt động của `main.py`

File `main.py` đóng vai trò là Backend API sử dụng web framework **Flask** kết hợp với **Python**. Nó có nhiệm vụ quản lý dữ liệu (load, tổ chức, lưu trữ mô phỏng các chiến lược file vật lý) và cung cấp các Endpoints (đường dẫn API) để Frontend (Web App) có thể tương tác. 

Dưới đây là nội dung phân tích chi tiết của `main.py` dựa trên luồng hoạt động chuẩn của một ứng dụng web:

---

## 1. Khởi tạo ứng dụng & Khai báo biến toàn cục (Dòng 1 - 28)
Quá trình khởi tạo app và khai báo bộ nhớ tạm (Cache).
- **Import thư viện**: Sử dụng `flask` cho server, `csv` để đọc/ghi file text, và `threading` để xử lý đồng bộ khi thêm dữ liệu. 
- **`app = Flask(...)`**: Khởi tạo Web Server với cấu hình phục vụ các file tĩnh (HTML, CSS, JS) trực tiếp ở thư mục hiện tại.
- **Biến toàn cục (Cache)**: Khai báo `STUDENTS`, `ENROLLMENTS`, `DEMO_DATASET` (phục vụ giao diện ban đầu), `ORG_CACHE` (lưu trữ dữ liệu giả lập cho 4 chiến lược lưu trữ là Heap, Sequential, Clustering, Partitioning).
- Biến **`DATA_LOCK`**: Bảo vệ bộ nhớ đệm chống việc đụng độ (race condition) nếu có nhiều luồng (người dùng) muốn Insert cùng lúc.

---

## 2. Nạp và Tổ chức dữ liệu từ máy chủ (Dòng 29 - 128)
Hàm `load_data()` là trái tim của việc setup mô phỏng Hệ Quản Trị Cơ Sở Dữ Liệu (DBMS Simulator).
- Đọc file text `students.txt` và `enrollments.txt` bằng `csv.DictReader`. 
- **Dữ liệu Demo Frontend**: Xây dựng mảng `DEMO_DATASET` bị giới hạn (`DEMO_SIZE = 5000`) nhằm đảm bảo giao diện web ban đầu của người dùng không bị "đơ" vì tải quá lớn băng thông.
- **Tổ chức bộ nhớ (ORG_CACHE)**:
  - Dữ liệu thô (`FULL_DATASET`) được định dạng lại thành 4 kiến trúc lưu trữ khác nhau.
  - **Heap File (Tệp Đống)**: Dữ liệu được chia thành từng Block (khối), mỗi Block chứa tối đa 5 bản ghi. Ở đây còn có cơ chế xác suất (`0.15`) tự động tạo ra một slot rỗng (tức `None`), giả định cho các record bị xóa theo thời gian.
  - **Sequential (Tuần tự)**: Dữ liệu tự động được sắp xếp cứng (sort) theo `student_id`.
  - **Clustering (Cụm)**: Sắp xếp theo nhóm lớn là Lớp (`class_name`) theo danh sách ưu tiên `CLUSTER_ORDER`, sau đó tới `student_id`.
  - **Partitioning (Phân mảnh)**: Khởi tạo dạng Dictionary chia dữ liệu thành các mảnh nhỏ dựa vào "Học kỳ" (`semester`).

---

## 3. Các hàm hỗ trợ nội bộ - Helpers (Dòng 129 - 340)
Là các hàm tính toán chìm hoặc giả lập logic Backend:
- `_next_student_id`: Lấy ID mới nhất chưa tồn tại cho luồng Insert.
- `_append_student_to_file` & `_append_enrollment_to_file`: Lưu dữ liệu vĩnh viễn (persistence) ghi thực tệp `*.txt` bằng thư viện `csv.writer()`.
- `_insert_into_caches`: Sau khi thêm data thực vào file, nó có nhiệm vụ phân lô dữ liệu insert mới này đi vào 4 phương pháp của bộ nhớ đệm `ORG_CACHE` (Ví dụ: Heap thì tìm chỗ rỗng đầu tiên (hole - None) để gắn vào).
- `_record_matches`: Trả về `True / False` so khớp từ khóa tìm kiếm mà FE gửi lên với Record truyền vào.
- Xét mô phỏng Đọc dữ liệu với **`_simulate_query_for_manager` & `_simulate_query_partitioning`**:
  - Nó mô phỏng quá trình Table Scan. So khớp từng bản ghi để quét kết quả.
  - Sau đó đo đếm thông số (thời gian `executionTime`, số block đã duyệt `blocksRead`, đếm dữ liệu trúng `matchesCount`).
  - Hàm `_visible_window()` đảm đương việc tính toán cắt khối block nào chứa cụm kết quả đầu tiên để Web App render ra hiệu ứng, vì không thể gửi hàng ngàn block sang Web chỉ để vẽ UI.

---

## 4. Quản lý Route - Định tuyến API của Web (Dòng 358 - Dưới cùng)
Đây là cổng giao tiếp xử lý các "Request HTTP" từ ứng dụng Frontend.

1. **`@app.route('/')`**: Khi người dùng vào link mặc định (ví dụ `localhost:8000`), server trả về giao diện đồ họa (file `index.html`) để khởi động Web App.
2. **`@app.route('/api/dataset')`**: Trả về một lượng dữ liệu mẫu vừa phải sang JSON. Giúp Frontend vẽ vào cái bảng lớn ở lần load trang đầu tiên.
3. **`@app.route('/api/query')`**: Đây là Endpoint phục vụ mục đích Query tìm chính xác dòng dữ liệu thô trên App (có kèm hệ thống Limit/Offset dùng cho Pagination của data table).
4. **`@app.route('/api/query-simulation')`**:
   - Đây là lõi tương tác với hệ thống mô phỏng của frontend. 
   - Nhận vào các tham số tìm kiếm (`student_id`, `full_name`,...) từ GET Request.
   - Ném các query param này vào các hàm `_simulate_query...` cho 4 chiến lược. 
   - Tổng hợp kết quả và trả ra file JSON cực kì chi tiết về trạng thái đọc Block của cả 4 cơ chế. Web App nhận JSON này -> Cập nhật chỉ số và Render hiệu ứng khối Block.
5. **`@app.route('/api/insert', methods=['POST'])`**: 
   - Xử lý quá trình người dùng tạo dữ liệu sinh viên mới từ form.
   - Nhận Input là Payload kiểu JSON.
   - Khoá môi trường đa luồng với `DATA_LOCK`, ghi vào cả file tĩnh và Caches. 
   - Trả ra trạng thái `ok: True` nếu thêm thành công. Trả ra `400` nếu dữ liệu thiếu trường quan trọng.

---

## 5. Khởi động vòng lặp Web App (Dòng 520 - 525)
- Khi chạy trực tiếp file (`python main.py`), server sẽ gọi hàm `load_data()` để khởi tạo và làm "nóng" bộ nhớ `CACHE` trước. Mọi kết quả xử lý dữ liệu được in log ra màn hình console.
- Cuối cùng, kích hoạt web server Flask chạy trên host (`127.0.0.1:8000`). Mọi request lúc này sẽ đi theo vòng lặp được định tuyến sẵn phía trên.
