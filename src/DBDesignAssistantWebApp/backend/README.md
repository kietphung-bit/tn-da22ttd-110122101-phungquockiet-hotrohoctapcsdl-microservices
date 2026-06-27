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
Yêu cầu đã chạy PostgreSQL và Redis (thường sẽ được chạy qua Docker ở thư mục bên ngoài).

```bash
# Tại thư mục backend
.\mvnw.cmd spring-boot:run
```
Hệ thống sẽ chạy trên `http://localhost:8080`.
