# UC-SEND-001: Gửi token

## 1. Thông tin chung
- Mã use case: UC-SEND-001
- Tên use case: Gửi token
- Module: Send
- Tác nhân chính: End-User
- Mức độ ưu tiên: Must
- Mục tiêu: Cho phép End-User gửi token từ ví của mình đến địa chỉ nhận hợp lệ, có kiểm tra số dư và ước tính phí trước khi xác nhận giao dịch.

## 2. Phạm vi và giả định
- Phạm vi nghiệp vụ bám theo hạ tầng giao dịch dùng chung đang có trong dự án.
- Frontend trang Send hiện mới ở mức mô tả UI, chưa có form gửi token hoàn chỉnh.
- Luồng nghiệp vụ hiện dựa trên các API giao dịch:
  - POST /api/tx/validate
  - POST /api/tx/confirm
  - GET /api/tx/status/{hash}
- Không bao gồm chuyển token cross-chain (đã thuộc Module Bridge).
- Chain mục tiêu mặc định: Arc Testnet.

## 3. Tác nhân và hệ thống liên quan
- End-User: Nhập thông tin giao dịch, ký giao dịch, theo dõi trạng thái.
- Frontend App: Thu thập dữ liệu, gọi API validate/confirm/status, hiển thị kết quả.
- EVM Wallet Provider: Ký và phát giao dịch on-chain.
- Arc RPC (ethers JsonRpcProvider): Ước tính gas, lấy fee data, đọc receipt.
- Database (Prisma): Lưu transaction record để phục vụ history và theo dõi trạng thái.

## 4. Trigger
- End-User mở Send module và bấm thao tác gửi token.

## 5. Tiền điều kiện
- End-User đã kết nối ví EVM hợp lệ.
- Ví đang ở network hỗ trợ (Arc Testnet).
- Người dùng có đủ số dư để trả amount + gas.
- Địa chỉ nhận là địa chỉ EVM hợp lệ.

## 6. Hậu điều kiện
### 6.1. Hậu điều kiện thành công
- Giao dịch được phát lên mạng blockchain.
- Hệ thống lưu transaction với trạng thái ban đầu confirming.
- Người dùng nhận được transaction hash và có thể tra cứu trạng thái.

### 6.2. Hậu điều kiện thất bại
- Không phát giao dịch hoặc không lưu được transaction record.
- UI hiển thị lỗi tương ứng (địa chỉ không hợp lệ, thiếu số dư, hash không hợp lệ, lỗi mạng).
- Không tạo hoặc không cập nhật đúng transaction history cho nghiệp vụ Send.

## 7. Dữ liệu vào/ra
### 7.1. Dữ liệu vào
- Từ End-User:
  - from: địa chỉ ví gửi
  - to: địa chỉ ví nhận
  - amount: số lượng token native/token quy đổi chuỗi số
  - data (tùy chọn): dữ liệu contract call
- Từ ví:
  - transaction hash sau khi phát giao dịch

### 7.2. Dữ liệu ra
- Kết quả validate:
  - valid
  - estimatedGas
  - gasPrice
  - totalGasCost
  - senderBalance
  - totalRequired
  - warning
- Kết quả confirm:
  - transaction.id
  - transaction.hash
  - transaction.status
  - transaction.explorerUrl
- Kết quả status:
  - hash
  - status (pending/success/failed)
  - confirmedAt
  - blockNumber
  - errorMessage

## 8. Luồng chính
1. End-User nhập địa chỉ nhận và số lượng token muốn gửi.
2. Frontend gọi POST /api/tx/validate để kiểm tra định dạng địa chỉ, số dư và phí gas dự kiến.
3. API validate trả về valid = true cùng estimatedGas và totalRequired.
4. End-User xác nhận gửi token và ký/phát giao dịch trong ví.
5. Frontend nhận tx hash từ ví.
6. Frontend gọi POST /api/tx/confirm để lưu transaction record với txType = send và trạng thái confirming.
7. Frontend hiển thị mã hash cho End-User và điều hướng/cho phép theo dõi trạng thái.
8. Frontend định kỳ gọi GET /api/tx/status/{hash} cho đến khi giao dịch success hoặc failed.

## 9. Luồng thay thế
### AF-01: Validate có cảnh báo số dư sát ngưỡng
1. API trả valid = true nhưng warning có nội dung cảnh báo.
2. UI hiển thị cảnh báo để End-User cân nhắc trước khi ký.
3. End-User vẫn có thể tiếp tục nếu chấp nhận rủi ro.

### AF-02: Giao dịch đã có record trước đó
1. Frontend gửi lại cùng hash vào /api/tx/confirm.
2. Hệ thống dùng upsert để cập nhật record hiện có thay vì tạo mới.
3. Trạng thái tiếp tục là confirming để chờ cập nhật từ endpoint status.

### AF-03: Có dữ liệu contract call
1. End-User gửi giao dịch có trường data.
2. Validate thực hiện estimateGas theo dữ liệu call.
3. Nếu estimate thành công, hệ thống dùng gas ước tính thực tế thay cho giá trị mặc định.

## 10. Luồng ngoại lệ
### EX-01: Thiếu from hoặc to
- Điều kiện: Payload validate thiếu from/to.
- Xử lý: API trả 400 với lỗi From and to addresses are required.
- Kết quả: Dừng luồng gửi.

### EX-02: Địa chỉ ví không hợp lệ
- Điều kiện: from hoặc to không khớp regex địa chỉ EVM.
- Xử lý: API validate trả 400 Invalid address format.
- Kết quả: Không cho phép ký giao dịch.

### EX-03: Thiếu số dư
- Điều kiện: amount > balance hoặc amount + gas > balance.
- Xử lý: API validate trả 400 Insufficient balance hoặc warning thiếu khả năng chi trả gas.
- Kết quả: Chặn gửi giao dịch.

### EX-04: Hash giao dịch không hợp lệ khi confirm
- Điều kiện: /api/tx/confirm nhận hash sai định dạng.
- Xử lý: API trả 400 Valid transaction hash is required.
- Kết quả: Không ghi nhận transaction.

### EX-05: Lỗi mạng hoặc RPC
- Điều kiện: Lỗi khi gọi provider getBalance/estimateGas/getFeeData hoặc lỗi DB.
- Xử lý: API trả 500 tương ứng.
- Kết quả: UI hiển thị lỗi và giữ trạng thái chưa hoàn tất.

## 11. API và tích hợp kỹ thuật
### 11.1. API validate
- Endpoint: POST /api/tx/validate
- Mục đích: Kiểm tra dữ liệu giao dịch trước ký.
- Kiểm tra chính:
  - Định dạng địa chỉ from/to.
  - Số dư tài khoản gửi.
  - Ước tính gas và tổng yêu cầu amount + gas.

### 11.2. API confirm
- Endpoint: POST /api/tx/confirm
- Mục đích: Lưu transaction record sau khi có tx hash.
- Cơ chế lưu: upsert theo hash, gắn user theo from, đặt status = confirming.

### 11.3. API status
- Endpoint: GET /api/tx/status/{hash}
- Mục đích: Đồng bộ trạng thái on-chain về DB.
- Hành vi:
  - Nếu chưa có receipt: pending.
  - Receipt status = 1: success.
  - Receipt status khác 1: failed và cập nhật errorMessage.

## 12. Mã lỗi nghiệp vụ đề nghị
- SEND-001-MISSING_ADDRESS: Thiếu from/to.
- SEND-001-INVALID_ADDRESS: Địa chỉ không đúng chuẩn EVM.
- SEND-001-INSUFFICIENT_BALANCE: Không đủ số dư gửi token.
- SEND-001-INSUFFICIENT_GAS: Không đủ số dư trả phí gas.
- SEND-001-INVALID_HASH: Hash giao dịch không hợp lệ.
- SEND-001-VALIDATION_FAILED: Lỗi validate nội bộ.
- SEND-001-CONFIRM_FAILED: Lỗi ghi nhận giao dịch sau khi phát.

## 13. Quy tắc nghiệp vụ
- BR-S-001: Giao dịch Send chỉ hợp lệ khi địa chỉ from/to đúng định dạng EVM.
- BR-S-002: Tổng chi phí cần có = amount + estimatedGas * gasPrice.
- BR-S-003: Trạng thái giao dịch phải đi qua vòng đời confirming -> pending/success/failed theo dữ liệu receipt.
- BR-S-004: Một hash giao dịch chỉ có một record duy nhất trong bảng transaction (unique hash).

## 14. Yêu cầu phi chức năng
- NFR-S-001 (Reliability): API validate/confirm/status phải trả lỗi rõ ràng theo HTTP status code.
- NFR-S-002 (Performance): Validate nên phản hồi trong <= 2 giây ở điều kiện mạng bình thường.
- NFR-S-003 (Data Integrity): Lưu transaction theo cơ chế upsert để tránh trùng hash.
- NFR-S-004 (Observability): Lỗi validate hoặc broadcast cần được log server-side.

## 15. Acceptance Criteria (Given-When-Then)
- AC-S001-01: Given from/to hợp lệ và đủ số dư, When gọi validate, Then hệ thống trả valid = true kèm estimatedGas và totalRequired.
- AC-S001-02: Given amount + gas vượt balance, When gọi validate, Then hệ thống trả lỗi hoặc cảnh báo thiếu số dư phù hợp.
- AC-S001-03: Given đã có tx hash hợp lệ, When gọi /api/tx/confirm, Then hệ thống lưu transaction ở trạng thái confirming.
- AC-S001-04: Given hash không hợp lệ, When gọi /api/tx/confirm, Then hệ thống trả 400 và không tạo record.
- AC-S001-05: Given giao dịch có receipt thành công, When gọi /api/tx/status/{hash}, Then trạng thái trả về success.

## 16. Traceability
- Send page placeholder: app/send/page.tsx
- Validate API: app/api/tx/validate.ts
- Confirm API (App Router): app/api/tx/confirm/route.ts
- Status API: app/api/tx/status/[hash]/route.ts
- Arc RPC client: lib/arc/client.ts
- Chain constants: constants/index.ts
- Transaction type: types/index.ts
- Transaction schema: prisma/schema.prisma
