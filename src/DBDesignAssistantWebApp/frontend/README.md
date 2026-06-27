# Frontend - DB Design Assistant Web App

Ứng dụng phía người dùng (Frontend) được phát triển để tương tác trực quan với Hệ thống Hỗ trợ học tập và thiết kế Cơ sở dữ liệu.

## Công nghệ sử dụng
- **React 18** & **Vite**: Nền tảng framework chính mang lại tốc độ build cực nhanh.
- **TypeScript**: Hỗ trợ việc kiểm tra chặt chẽ về định dạng kiểu (Type Safe), giảm thiểu lỗi runtime.
- **TailwindCSS**: Thư viện CSS Utility-first giúp xây dựng và tùy biến giao diện UI nhanh chóng, thống nhất theo thiết kế.
- **React Flow**: Thư viện biểu đồ vô cùng quan trọng cho việc thiết kế không gian làm việc, hỗ trợ vẽ Biểu đồ Thực thể Liên kết (ERD) bằng cách kéo, thả, liên kết node trực quan.
- **Axios**: Thư viện gọi các HTTP Request để liên kết và sử dụng các API từ phía Backend.

## Khởi chạy dự án (Môi trường dev)
Đảm bảo bạn đã cài đặt môi trường Node.js. Chạy lệnh tại thư mục `frontend`:

```bash
# 1. Cài đặt các gói thư viện phụ thuộc
npm install

# 2. Khởi chạy ứng dụng
npm run dev
```

Hệ thống sẽ cung cấp đường link host, mặc định chạy trên cổng `http://localhost:5173`.
