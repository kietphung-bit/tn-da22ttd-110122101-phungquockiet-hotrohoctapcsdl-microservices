# Backend - DB Design Assistant Web App

Máy chủ ứng dụng (Backend API) điều phối mọi hệ thống, làm trung tâm giao tiếp giữa thao tác của Frontend và các tính năng tính toán của AI Worker hay Database.

## Công nghệ sử dụng
- **Java 17 & Spring Boot 3**: Xây dựng RESTful API mạnh mẽ.
- **Spring Security & JWT**: Chịu trách nhiệm về bảo mật xác thực, phân quyền 3 cấp (Student, Instructor, Admin).
- **Spring Data JPA & Hibernate**: Sử dụng kỹ thuật ORM để tương tác với cấu trúc các bảng trong cơ sở dữ liệu.
- **PostgreSQL**: DBMS, cấu hình tích hợp extension `pgvector`.
- **Redis**: Phục vụ lưu cache (nếu có) và đóng vai trò cấu trúc Message Queue, giúp gửi và nhận các công việc đẩy cho AI Worker.

## Luồng hoạt động AI
- **Chatbot RAG**: Xử lý logic Vector Search qua tính toán `pgvector` và gọi provider AI để sinh câu trả lời liên quan tới các kiến thức CSDL đã được xác duyệt.
- **Tạo bài tập tự động**: Gọi trực tiếp đến API của dịch vụ AI (Gemini/LLM khác) lấy kết quả.
- **Tự động đánh giá (Evaluation)**: Backend gửi thông tin JSON của biểu đồ (Job) thông qua Redis Queue để module FastAPI (AI Worker) bên ngoài tiếp nhận xử lý ngầm (tránh timeout cho máy chủ Backend), sau đó Backend có thể truy vấn DB để nhận lại đánh giá điểm hoàn thành.

## Khởi chạy dự án

Bạn có thể chạy dự án thông qua Terminal local hoặc dùng Docker Container. Dù bằng cách nào, máy chủ cũng sẽ chạy trên địa chỉ `http://localhost:8080`.

**Yêu cầu tiên quyết chung:** Cơ sở dữ liệu (PostgreSQL) và Redis phải đang hoạt động.

### Cách 1: Chạy trực tiếp qua Maven Wrapper (Local)
Dành cho môi trường phát triển (cần cài đặt Java 17+).

```bash
# Tại thư mục backend
.\mvnw.cmd spring-boot:run
```
*(Nếu muốn chạy test nhanh, bạn có thể chạy: `.\mvnw.cmd clean test`)*

### Cách 2: Chạy thông qua Docker (Production / Demo)
Nếu máy bạn chưa cài đặt Java hoặc đang muốn demo toàn hệ thống một cách trơn tru, hãy sử dụng file Docker Compose nằm ở thư mục gốc `DBDesignAssistantWebApp`:

```bash
# Di chuyển ra thư mục DBDesignAssistantWebApp và chạy lệnh
docker compose up --build -d backend
```
Cách này sẽ tạo ra một Container gói gọn cả hệ điều hành, JRE và thư viện biên dịch để phục vụ Backend, tự động kết nối với mạng nội bộ của Redis và Postgres (Docker DNS).
