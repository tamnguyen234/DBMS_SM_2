# KỊCH BẢN THUYẾT TRÌNH DEMO STORAGE MANAGEMENT

Tài liệu này hướng dẫn cách thuyết trình demo dự án, tập trung vào việc đối chiếu giữa giao diện trực quan và logic xử lý trong code (`main.py` và `app.js`).

---

## 1. Mở đầu & Tổng quan
*   **Thao tác**: Mở trình duyệt hiển thị màn hình chính của ứng dụng.
*   **Nội dung nói**: "Chào thầy và các bạn, hôm nay nhóm chúng em xin trình bày ứng dụng Storage Management VLab. Đây là ứng dụng mô phỏng trực quan 4 cơ chế tổ chức lưu trữ file vật lý trong CSDL: Heap File, Sequential File, Multitable Clustering và Partitioning."
*   **Kỹ thuật**: Hệ thống được thiết kế với Backend là Python (Flask) để xử lý logic lưu trữ và Frontend bằng JavaScript thuần để render trực quan các Data Blocks (khối dữ liệu).

---

## 2. Phần 1: Khởi tạo dữ liệu và Tổ chức file (Data Loading)
*   **Thao tác**: Mở file `main.py`, trỏ vào hàm `load_data()`.
*   **Nội dung nói**: "Để bắt đầu, dữ liệu từ các file text sẽ được load lên bộ nhớ thông qua hàm `load_data()`. Tại đây, nhóm đã ánh xạ dữ liệu thành 4 cấu trúc khác nhau đại diện cho 4 cơ chế vật lý:"
*   **Chi tiết code**:
    *   **Heap File**: (Trỏ vào đoạn tạo Heap với `None`) "Đối với Heap, code ánh xạ dữ liệu thành mảng 2 chiều, mỗi mảng con là 1 block. **Tác dụng của đoạn code rải ngẫu nhiên các giá trị `None` này** là để giả lập các **'lỗ hổng' (holes)** trong ổ đĩa – kết quả của các thao tác xóa dữ liệu trước đó."
    *   **Sequential / Clustering / Partitioning**: (Trỏ vào đoạn `.sort()` và `partition_by_semester`) "Ngược lại, Sequential được sắp xếp theo ID, Clustering được gom cụm theo lớp, và Partitioning được chia thành các vùng vùng độc lập dựa trên học kỳ."

---

## 3. Phần 2: Thao tác Truy vấn (Query Demo)
*   **Thao tác**: Trên Web, nhập một sinh viên và bấm Query. Sau đó mở `main.py`, trỏ vào hàm `_simulate_query_for_manager`.
*   **Nội dung nói**: "Khi thực hiện truy vấn, hệ thống hiển thị chính xác những block nào được nạp lên RAM. Đằng sau giao diện này, code xử lý như sau:"
*   **Chi tiết code**:
    *   **Heap/Sequential/Clustering**: Hàm `_simulate_query_for_manager` phải quét qua gần như toàn bộ các blocks. **Vai trò của đoạn code này** là minh họa cho kiểu quét toàn bộ file (Full Table Scan).
    *   **Partitioning**: (Trỏ vào `_simulate_query_partitioning`) "Với Partitioning, khi lọc theo học kỳ, hệ thống chỉ trích xuất đúng vùng dữ liệu đó. **Tác dụng**: Giảm thiểu số lượng block phải đọc xuống mức tối thiểu, tiết kiệm tài nguyên hệ thống."

---

## 4. Phần 3: Thao tác Thêm Bản Ghi (Insert Demo) - ĐIỂM NHẤN
*   **Thao tác**: Trên Web, nhập thông tin và bấm "Thêm". Sau đó mở `app.js`, trỏ vào class `HeapFile` hàm `insert`.
*   **Nội dung nói**: "Đây là phần thể hiện rõ nhất đặc tính của các cơ chế tổ chức file."
*   **Chi tiết code**:
    *   **Heap Mechanism**: "Trong `HeapFile.insert`, code thực hiện vòng lặp tìm vị trí `null` (ô trống) đầu tiên. Ngay khi thấy ô màu trắng trên UI, bản ghi sẽ điền vào đó. **Tác dụng**: Chèn cực nhanh, tái sử dụng ổ đĩa hoàn hảo mà không phải dịch chuyển dữ liệu cũ."
    *   **Sequential Mechanism**: "Ngược lại, Sequential phải tìm đúng vị trí thứ tự ID. Trong thực tế, việc này rất tốn kém vì phải 'đẩy' các bản ghi cũ ra sau để lấy chỗ. Để minh họa điều này, bọn em đã thiết kế các slot trống (`free slots`) trong mỗi block để giảm thiểu việc dịch chuyển dữ liệu."

---

## 5. Tổng kết (Kết luận Dashboard)
*   **Thao tác**: Chỉ vào hai bảng thống kê (Blocks Read & Execution Time) ở cuối trang web.
*   **Nội dung nói**: "Nhìn vào bảng thống kê, ta có thể rút ra kết luận:"
    1.  **Heap**: Ưu tiên tốc độ ghi (Insert), không quan tâm thứ tự.
    2.  **Sequential**: Ưu tiên truy vấn theo thứ tự ID.
    3.  **Clustering**: Hiệu quả nhất khi cần lấy dữ liệu theo nhóm (Lớp học).
    4.  **Partitioning**: Tối ưu nhất cho các tập dữ liệu khổng lồ phân loại theo thời gian/học kỳ.

---
*Lưu ý: Luôn đối chiếu giữa con số trên bảng thống kê và logic đã giải thích trong code để bài thuyết trình thuyết phục hơn.*
