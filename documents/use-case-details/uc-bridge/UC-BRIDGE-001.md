# UC-BRIDGE-001: Chuyển token giữa các chain

## Mục tiêu
Cho phép người dùng chuyển token từ một blockchain này sang blockchain khác thông qua Bridge của hệ thống.

## Actor
- End-User
- Arc Network (hệ thống backend xử lý giao dịch)

## Tiền điều kiện
- Người dùng đã kết nối ví EVM hợp lệ.
- Người dùng có đủ số dư token trên chain nguồn.
- Bridge hỗ trợ cặp chain và token cần chuyển.

## Luồng chính
1. Người dùng chọn chain nguồn, chain đích, loại token và số lượng muốn chuyển.
2. Hệ thống kiểm tra điều kiện (số dư, hỗ trợ, hạn mức, v.v.).
3. Người dùng xác nhận giao dịch trên ví (ký giao dịch).
4. Hệ thống gửi giao dịch lên chain nguồn, lock/burn token.
5. Hệ thống backend theo dõi trạng thái giao dịch trên chain nguồn.
6. Khi giao dịch thành công, backend thực hiện mint/unlock token trên chain đích.
7. Người dùng nhận được token trên chain đích, hệ thống thông báo hoàn tất.

## Luồng phụ
- Nếu giao dịch pending lâu, hệ thống hiển thị trạng thái chờ và cho phép người dùng kiểm tra lại.
- Nếu giao dịch thất bại, chuyển sang luồng xử lý lỗi (UC-BRIDGE-003).

## Ngoại lệ
- Số dư không đủ: Thông báo lỗi, không cho phép thực hiện giao dịch.
- Chain/token không được hỗ trợ: Thông báo lỗi.
- Người dùng từ chối ký giao dịch: Hủy thao tác.

## Ghi chú
- Có thể áp dụng phí bridge, hiển thị rõ cho người dùng trước khi xác nhận.
- Hệ thống cần đảm bảo an toàn, tránh double-spend hoặc mất mát tài sản.