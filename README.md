<h2 style="text-align: center;">ĐỒ ÁN TỐT NGHIỆP</h2>

<h1 style="text-align: center;">XÂY DỰNG WEBSITE HỖ TRỢ HỌC TẬP VÀ ĐÁNH GIÁ TỰ ĐỘNG KỸ NĂNG THIẾT KẾ CƠ SỞ DỮ LIỆU</h1>

---

## Thông Tin Sinh Viên  

- **Họ và Tên:** Phùng Quốc Kiệt  
- **MSSV:** 110122101  
- **Mã lớp:** DA22TTD  
- **Email sinh viên:** [110122101@st.tvu.edu.vn](mailto:110122101@st.tvu.edu.vn)  
- **Email cá nhân:** [kietphung0209@gmail.com](mailto:kietphung.study@gmail.com)  
- **Số điện thoại:** 0399283015  

---

## 1. Tổng quan hệ thống
Đồ án tập trung xây dựng một hệ thống website hỗ trợ sinh viên luyện tập và thiết kế cơ sở dữ liệu (vẽ biểu đồ thực thể liên kết - ERD). Hệ thống nổi bật khi tích hợp các công cụ tự động đánh giá (AI Scoring) dựa trên công nghệ Trí tuệ nhân tạo (LLM), cùng với tính năng Chatbot RAG giúp sinh viên dễ dàng tra cứu kiến thức về CSDL. Ngoài ra, hệ thống cung cấp công cụ hỗ trợ giảng viên (Instructor) để quản lý kho kiến thức, bài tập, theo dõi đánh giá; và công cụ cho quản trị viên (Admin) để quản lý và theo dõi tổng thể hệ thống.

## 2. Công nghệ sử dụng
Dự án được xây dựng dựa trên kiến trúc microservices nhẹ kết hợp:
- **Frontend**: Ứng dụng Web Single Page Application (SPA) xây dựng bằng React / Vite, TypeScript, TailwindCSS và sử dụng thư viện React Flow để hỗ trợ tính năng không gian làm việc vẽ ERD.
- **Backend**: API server xây dựng bằng nền tảng Java Spring Boot, chịu trách nhiệm xử lý nghiệp vụ chính, bảo mật phân quyền (Spring Security), tích hợp sinh tự động bài tập từ AI, và cung cấp endpoint xử lý cho Chatbot.
- **AI Worker**: Dịch vụ xử lý ngầm (Background Job) xây dựng bằng Python (FastAPI), tiếp nhận và xử lý các tác vụ AI đòi hỏi nhiều thời gian (như tự động chấm điểm và đánh giá bài làm) thông qua hàng đợi để giảm tải cho Backend.
- **Message Queue & Cache**: Sử dụng Redis đóng vai trò là Message Queue (hàng đợi sự kiện) cho quá trình tương tác giữa Backend và AI Worker.
- **Cơ sở dữ liệu**: Sử dụng PostgreSQL tích hợp tính năng mở rộng `pgvector`. Phục vụ lưu trữ dữ liệu truyền thống của hệ thống và cả vector embeddings cho tính toán độ tương đồng (áp dụng trong Chatbot RAG).

## 3. Phần mềm cần thiết
Để triển khai và chạy hệ thống hoàn chỉnh một cách đơn giản nhất, bạn chỉ cần:
- **Docker & Docker Compose**: Giải pháp tối ưu và được khuyến khích để triển khai toàn bộ ứng dụng (Frontend, Backend, DB, Redis, AI Worker) đồng bộ chỉ với 1 câu lệnh.
- **Node.js (phiên bản 18+)**: Bắt buộc nếu muốn chạy trực tiếp Frontend không dùng Docker.
- **Java (phiên bản 17+)**: Bắt buộc nếu muốn chạy trực tiếp Backend không dùng Docker.
- **Python (3.10+)**: Bắt buộc nếu muốn chạy trực tiếp AI Worker không dùng Docker.

## 4. Cách thức chạy chương trình
Toàn bộ mã nguồn ứng dụng nằm trong thư mục `src/DBDesignAssistantWebApp`. Cách chạy nhanh nhất và ít gặp lỗi nhất là sử dụng Docker cho toàn bộ hệ thống.

### Bước 1: Cấu hình biến môi trường
Đi tới thư mục mã nguồn chính là `src/DBDesignAssistantWebApp`. Bạn hãy sao chép các file có đuôi `.env.example` thành file `.env` tại các thư mục sau và cung cấp các khóa API cần thiết (ví dụ: Gemini API Key):
1. `src/DBDesignAssistantWebApp/.env`
2. `src/DBDesignAssistantWebApp/ai-worker/.env`
3. `src/DBDesignAssistantWebApp/backend/src/main/resources/.env`

### Bước 2: Khởi động toàn bộ hệ thống bằng Docker Compose (Khuyên dùng)
Mở giao diện dòng lệnh (terminal) tại thư mục `src/DBDesignAssistantWebApp` và chạy lệnh sau để build và khởi động toàn bộ 5 dịch vụ (`postgres-pgvector`, `redis`, `backend`, `frontend`, `ai-worker`):
```bash
docker compose up --build -d
```
*(Yêu cầu Docker Desktop đã được bật. Quá trình build lần đầu có thể mất vài phút. Bạn có thể kiểm tra xem các container đã chạy ổn định chưa bằng lệnh `docker compose ps`)*

### Bước 3: Trải nghiệm ứng dụng
Truy cập giao diện ứng dụng trên trình duyệt qua địa chỉ `http://localhost:5173`. Hệ thống đã có sẵn dữ liệu mẫu, bạn có thể thử trải nghiệm bằng các tài khoản sau (Mật khẩu chung là `Password123!`):
- Admin: `admin@dbdesign.local`
- Giảng viên: `instructor@dbdesign.local`
- Sinh viên: `student@dbdesign.local`

---
*Ghi chú: Mỗi dịch vụ trong hệ thống (Frontend, Backend, AI Worker) đều có thể triển khai một cách độc lập thay vì qua Docker, vui lòng xem hướng dẫn chi tiết bên trong các file `README.md` tại thư mục của từng dịch vụ đó.*