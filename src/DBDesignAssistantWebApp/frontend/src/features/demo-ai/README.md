# Demo AI Learning (UI Prototype)

Mục đích: cung cấp giao diện demo tạm thời cho luồng AI learning.
- Các phản hồi là cố định (deterministic), không gọi AI thật.
- Không ghi dữ liệu demo vào backend.
- Sẽ xóa hoặc tái cấu trúc khi triển khai AI production.

Ghi chú UI:
- Khi vào trang demo chỉ hiển thị khung sinh bài tập (form chọn độ khó/từ khóa/ngữ cảnh).
- Sau khi sinh bài cần bấm "Làm bài" mới hiển thị khung thiết kế + nộp bài.
- Khi bấm "Làm bài" thì khu vực sinh đề bị khóa.
- Nộp bài sẽ khóa khu vực thiết kế; "Sửa bài" mở khóa; "Nộp lại" khóa lại và sinh phản hồi tiếp.
- Hết số vòng nhận xét thì các nút thao tác bị khóa.
