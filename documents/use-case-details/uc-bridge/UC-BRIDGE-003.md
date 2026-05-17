# UC-BRIDGE-003: Xử lý lỗi giao dịch Bridge

## Mục tiêu
Đảm bảo người dùng được hỗ trợ khi giao dịch bridge gặp lỗi (pending lâu, failed, không nhận được token, v.v.).

## Actor
- End-User
- Admin (hỗ trợ xử lý thủ công nếu cần)
- Arc Network (backend kiểm tra, xử lý tự động)

## Tiền điều kiện
- Người dùng có giao dịch bridge ở trạng thái lỗi hoặc pending quá lâu.

## Luồng chính
1. Người dùng phát hiện giao dịch bridge bị lỗi hoặc pending lâu, truy cập mục hỗ trợ/chi tiết giao dịch.
2. Hệ thống cung cấp hướng dẫn tự kiểm tra (kiểm tra explorer, làm mới trạng thái, v.v.).
3. Nếu vẫn chưa giải quyết, người dùng gửi yêu cầu hỗ trợ (ticket) tới admin.
4. Backend kiểm tra trạng thái giao dịch trên cả hai chain.
5. Nếu có thể tự động xử lý (retry, unlock, refund), hệ thống thực hiện và cập nhật trạng thái cho người dùng.
6. Nếu cần can thiệp thủ công, admin xem xét và xử lý (ví dụ: hoàn tiền, unlock token thủ công).
7. Người dùng nhận được thông báo kết quả xử lý.

## Luồng phụ
- Hệ thống tự động phát hiện và xử lý các giao dịch pending quá lâu (retry, refund, cảnh báo admin).

## Ngoại lệ
- Không thể xác minh trạng thái giao dịch: Thông báo cho người dùng và chuyển cho admin xử lý.
- Lỗi backend hoặc không thể hoàn tiền: Thông báo rõ ràng, hướng dẫn liên hệ hỗ trợ.

## Ghi chú
- Cần lưu lại log chi tiết các bước xử lý lỗi để audit.
- Ưu tiên tự động xử lý, chỉ chuyển cho admin khi thật sự cần thiết.