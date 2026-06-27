# AI Worker - DB Design Assistant Web App

Đây là dịch vụ chạy ngầm độc lập (Background Service) chịu trách nhiệm tính toán các tác vụ nặng liên quan đến Trí tuệ nhân tạo (AI/LLM), đặc biệt là logic **Đánh giá tự động bài làm ERD**. Việc tách riêng tính năng này ra làm worker giúp hệ thống chính (Backend Java) không bị treo/chậm trễ do tính năng của mô hình AI đôi khi trả về phản hồi khá chậm.

## Công nghệ sử dụng
- **Python 3.10+**: Môi trường chạy linh hoạt, cực kỳ mạnh trong phân tích dữ liệu và AI.
- **FastAPI**: Dùng để mở Endpoint nội bộ theo dõi tình trạng sức khoẻ của tiến trình (Health Check).
- **Redis**: Dùng làm Broker (Hàng đợi sự kiện) để Worker lắng nghe liên tục sự kiện từ máy chủ Backend truyền sang.

## Quy trình xử lý
1. AI Worker luôn chạy và lắng nghe các công việc (Jobs) được đưa vào hàng đợi Redis (ví dụ: `evaluation:jobs`).
2. Khi có việc, nó tải dữ liệu xuống, phân tích yêu cầu, gửi cấu trúc dữ liệu JSON và Prompt hướng dẫn của sơ đồ ERD lên mô hình AI sinh tạo như Gemini.
3. Sau khi đánh giá hoàn tất và AI phân tách lỗi (nếu có), Worker kết nối trực tiếp hoặc gọi lại Backend để lưu kết quả vào CSDL PostgreSQL.

## Khởi chạy dự án
Dịch vụ này được cấu hình để hoạt động tốt nhất thông qua Docker Compose ở môi trường root của dự án (`docker-compose up -d ai-worker`). 

Tuy nhiên, nếu muốn chạy trên máy vật lý để theo dõi bug/debug thủ công, bạn tiến hành tại thư mục `ai-worker`:
```bash
# 1. Tạo môi trường ảo (Khuyến khích)
python -m venv venv

# 2. Kích hoạt môi trường (trên Windows)
venv\Scripts\activate

# 3. Cài đặt các phụ thuộc
pip install -r requirements.txt

# 4. Chạy script chính
python main.py
```
