# Frontend - DB Design Assistant Web App

Ứng dụng phía người dùng (Frontend) được phát triển để tương tác trực quan với Hệ thống Hỗ trợ học tập và thiết kế Cơ sở dữ liệu.

## Công nghệ sử dụng
- **React 18** & **Vite**: Nền tảng framework chính mang lại tốc độ build cực nhanh.
- **TypeScript**: Hỗ trợ việc kiểm tra chặt chẽ về định dạng kiểu (Type Safe), giảm thiểu lỗi runtime.
- **TailwindCSS**: Thư viện CSS Utility-first giúp xây dựng và tùy biến giao diện UI nhanh chóng, thống nhất theo thiết kế.
- **React Flow**: Thư viện biểu đồ vô cùng quan trọng cho việc thiết kế không gian làm việc, hỗ trợ vẽ Biểu đồ Thực thể Liên kết (ERD) bằng cách kéo, thả, liên kết node trực quan.
- **Axios**: Thư viện gọi các HTTP Request để liên kết và sử dụng các API từ phía Backend.

## Khởi chạy dự án

Dự án có thể chạy trực tiếp bằng Local Server trong quá trình code, hoặc chạy thông qua Docker Container. Cả 2 cách đều sẽ ánh xạ và phục vụ ứng dụng tại cổng `5173` (địa chỉ `http://localhost:5173`).

### Cách 1: Chạy trực tiếp (Local - Development)
Đảm bảo bạn đã cài đặt môi trường Node.js. Chạy các lệnh sau tại thư mục `frontend`:

```bash
# 1. Cài đặt các gói thư viện phụ thuộc
npm install

# 2. Khởi chạy ứng dụng
npm run dev
```

### Cách 2: Chạy bằng Docker (Production / Demo)
Nếu bạn không cài sẵn Node.js hoặc muốn khởi chạy đồng bộ cùng các dịch vụ khác một cách sạch sẽ, bạn nên sử dụng cấu hình Docker Compose từ thư mục `DBDesignAssistantWebApp` bên ngoài:

```bash
# Di chuyển ra thư mục gốc DBDesignAssistantWebApp và chạy lệnh
docker compose up --build -d frontend
```
Cách này sẽ tạo ra một bản build tĩnh (`dist`) từ Vite và sử dụng Nginx để phục vụ, mô phỏng chính xác môi trường khi triển khai (Production).
