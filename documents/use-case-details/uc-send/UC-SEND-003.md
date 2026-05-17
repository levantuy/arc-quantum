# UC-SEND-003: Xử lý lỗi giao dịch Send

## 1. Thông tin chung
- Mã use case: UC-SEND-003
- Tên use case: Xử lý lỗi giao dịch Send
- Module: Send
- Tác nhân chính: End-User
- Mức độ ưu tiên: Should
- Mục tiêu: Đảm bảo giao dịch gửi token khi lỗi hoặc pending lâu được phát hiện, cập nhật trạng thái rõ ràng và cung cấp hướng xử lý cho người dùng.

## 2. Phạm vi và giả định
- Luồng xử lý lỗi dựa trên endpoint trạng thái giao dịch dùng chung.
- Trạng thái giao dịch được quyết định theo transaction receipt từ chain.
- Không bao gồm cơ chế retry on-chain tự động trong backend cho Send ở phiên bản hiện tại.
- Lỗi nghiệp vụ được phản ánh qua status và errorMessage trên transaction record.

## 3. Tác nhân và hệ thống liên quan
- End-User: Kiểm tra trạng thái giao dịch khi gặp pending/fail.
- Frontend App: Polling hoặc tra cứu thủ công theo hash.
- Status API: Đọc receipt và đồng bộ trạng thái DB.
- Arc RPC: Cung cấp transaction receipt.
- Database (Prisma): Lưu trạng thái mới nhất và thông báo lỗi.

## 4. Trigger
- End-User thấy giao dịch không hoàn tất hoặc muốn kiểm tra kết quả gửi token theo hash.

## 5. Tiền điều kiện
- Có transaction hash hợp lệ (0x + 64 ký tự hex).
- Giao dịch đã hoặc đang được ghi nhận trong hệ thống.
- Status API truy cập được Arc RPC.

## 6. Hậu điều kiện
### 6.1. Hậu điều kiện thành công
- Giao dịch được đồng bộ đúng trạng thái với chain (pending/success/failed).
- Nếu failed, errorMessage được cập nhật để phục vụ hiển thị lịch sử.
- Frontend có thể hiển thị thông tin blockNumber/confirmedAt khi có receipt.

### 6.2. Hậu điều kiện thất bại
- API trả lỗi khi hash không hợp lệ.
- Nếu RPC lỗi, trạng thái có thể giữ nguyên hiện tại và frontend cần hiển thị lỗi retry.

## 7. Dữ liệu vào/ra
### 7.1. Dữ liệu vào
- Path param:
  - hash: mã giao dịch hex chuẩn

### 7.2. Dữ liệu ra
- hash
- status: pending | success | failed
- explorerUrl
- chainId
- blockNumber
- confirmedAt
- errorMessage

## 8. Luồng chính
1. End-User mở chi tiết giao dịch Send hoặc màn hình history.
2. Frontend gọi GET /api/tx/status/{hash}.
3. API kiểm tra định dạng hash.
4. API truy vấn transaction hiện có trong DB theo hash.
5. API gọi provider.getTransactionReceipt(hash).
6. API xác định trạng thái mới:
   - Không có receipt: pending (hoặc giữ trạng thái hiện tại nếu đã có).
   - receipt.status = 1: success.
   - receipt.status != 1: failed.
7. Nếu trạng thái mới khác DB, API cập nhật lại bản ghi transaction.
8. API trả dữ liệu trạng thái mới để frontend hiển thị cho End-User.

## 9. Luồng thay thế
### AF-01: Chưa có receipt sau nhiều lần kiểm tra
1. API liên tục trả pending.
2. Frontend giữ trạng thái chờ, hiển thị hướng dẫn kiểm tra lại sau.
3. End-User có thể tiếp tục tra cứu bằng hash ở các lần sau.

### AF-02: Đã có transaction trong DB nhưng RPC tạm lỗi
1. API không lấy được receipt từ RPC (catch null hoặc lỗi kết nối).
2. API fallback theo trạng thái đã có trong DB (nếu có) hoặc pending.
3. Frontend vẫn có dữ liệu tối thiểu để hiển thị.

### AF-03: Giao dịch failed và có lịch sử lỗi
1. API nhận receipt thất bại.
2. API cập nhật status = failed và errorMessage mặc định theo logic hiện tại.
3. End-User xem được lý do thất bại trên màn hình lịch sử/chi tiết.

## 10. Luồng ngoại lệ
### EX-01: Hash không hợp lệ
- Điều kiện: hash không khớp regex 0x[a-fA-F0-9]{64}.
- Xử lý: API trả 400 Invalid transaction hash.
- Kết quả: Không truy vấn DB/RPC.

### EX-02: Không có transaction record trong DB
- Điều kiện: hash chưa từng được lưu qua confirm.
- Xử lý: API vẫn có thể trả status dựa vào receipt (nếu có) nhưng thiếu explorerUrl/chainId từ DB.
- Kết quả: Frontend hiển thị trạng thái tối thiểu theo hash.

### EX-03: Receipt cho kết quả failed
- Điều kiện: receipt.status != 1.
- Xử lý: API cập nhật trạng thái failed và gắn thông điệp lỗi.
- Kết quả: Giao dịch được đánh dấu thất bại trong lịch sử.

## 11. API và tích hợp kỹ thuật
### 11.1. Status API
- Endpoint: GET /api/tx/status/{hash}
- Chức năng:
  - Validate hash
  - Đọc trạng thái DB hiện tại
  - Lấy receipt từ Arc RPC
  - Đồng bộ trạng thái về DB nếu có thay đổi

### 11.2. Dữ liệu trạng thái
- Bảng Transaction lưu:
  - status
  - errorMessage
  - explorerUrl
  - chainId
- Trạng thái dùng trong hệ thống:
  - confirming
  - pending
  - success
  - failed

## 12. Mã lỗi nghiệp vụ đề nghị
- SEND-003-INVALID_HASH: Hash không hợp lệ.
- SEND-003-PENDING_TIMEOUT: Giao dịch pending lâu hơn ngưỡng theo dõi.
- SEND-003-ONCHAIN_REVERTED: Giao dịch bị revert on-chain.
- SEND-003-STATUS_SYNC_FAILED: Đồng bộ trạng thái thất bại.

## 13. Quy tắc nghiệp vụ
- BR-SE-001: Hash giao dịch phải hợp lệ trước khi truy vấn trạng thái.
- BR-SE-002: Trạng thái success/failed phải ưu tiên theo transaction receipt mới nhất.
- BR-SE-003: Khi receipt chưa có, trạng thái được xem là pending hoặc giữ trạng thái hiện hữu.
- BR-SE-004: Khi phát hiện failed, hệ thống cần ghi errorMessage để phục vụ truy vết.

## 14. Yêu cầu phi chức năng
- NFR-SE-001 (Reliability): API status phải an toàn khi RPC lỗi, không gây crash server.
- NFR-SE-002 (Consistency): Trạng thái DB và trạng thái trả về API phải đồng bộ trong cùng một lần cập nhật.
- NFR-SE-003 (Observability): Lỗi giao dịch failed cần hiện rõ trên lịch sử để hỗ trợ xử lý người dùng.

## 15. Acceptance Criteria (Given-When-Then)
- AC-S003-01: Given hash hợp lệ và receipt thành công, When gọi status API, Then hệ thống trả status = success.
- AC-S003-02: Given hash hợp lệ và receipt thất bại, When gọi status API, Then hệ thống trả status = failed và có errorMessage.
- AC-S003-03: Given hash hợp lệ nhưng chưa có receipt, When gọi status API, Then hệ thống trả pending (hoặc trạng thái hiện tại trong DB).
- AC-S003-04: Given hash không hợp lệ, When gọi status API, Then hệ thống trả 400.
- AC-S003-05: Given trạng thái mới khác trạng thái cũ trong DB, When gọi status API, Then hệ thống cập nhật DB với trạng thái mới.

## 16. Traceability
- Status API: app/api/tx/status/[hash]/route.ts
- Confirm API tạo bản ghi ban đầu: app/api/tx/confirm/route.ts
- History API đọc trạng thái lỗi: app/api/history/list/route.ts
- Arc RPC client: lib/arc/client.ts
- Transaction type/status: types/index.ts
- Transaction schema: prisma/schema.prisma
