# UC-BRIDGE-002: Xem trạng thái giao dịch

## Mục tiêu
Cho phép người dùng kiểm tra trạng thái các giao dịch bridge đã thực hiện (đang chờ, thành công, thất bại).

## Actor
- End-User
- Arc Network (backend cung cấp thông tin trạng thái)

## Tiền điều kiện
- Người dùng đã thực hiện ít nhất một giao dịch bridge.

## Luồng chính
1. Người dùng truy cập màn hình lịch sử hoặc trạng thái giao dịch bridge.
2. Hệ thống truy vấn backend để lấy danh sách giao dịch bridge của người dùng.
3. Hệ thống hiển thị danh sách giao dịch với các thông tin: chain nguồn, chain đích, token, số lượng, thời gian, trạng thái (pending, success, failed).
4. Người dùng có thể chọn từng giao dịch để xem chi tiết (hash, log, trạng thái từng bước).

## Luồng phụ
- Người dùng có thể làm mới (refresh) danh sách trạng thái giao dịch.
- Hệ thống tự động cập nhật trạng thái nếu có thay đổi.

## Ngoại lệ
- Không tìm thấy giao dịch: Thông báo cho người dùng.
- Lỗi kết nối backend: Hiển thị thông báo lỗi, cho phép thử lại.

## Ghi chú
- Có thể tích hợp link explorer để người dùng kiểm tra trực tiếp trên blockchain.