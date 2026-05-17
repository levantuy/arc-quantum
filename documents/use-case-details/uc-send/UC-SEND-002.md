# UC-SEND-002: Xem lịch sử gửi

## 1. Thông tin chung
- Mã use case: UC-SEND-002
- Tên use case: Xem lịch sử gửi
- Module: Send
- Tác nhân chính: End-User
- Mức độ ưu tiên: Should
- Mục tiêu: Cho phép End-User xem danh sách giao dịch gửi token đã thực hiện, có phân trang và theo dõi trạng thái từng giao dịch.

## 2. Phạm vi và giả định
- Luồng lịch sử Send sử dụng API lịch sử dùng chung của hệ thống.
- Dữ liệu lấy từ bảng transaction trong database.
- Lọc giao dịch Send dựa trên txType = send.
- UI history chuyên sâu cho Send có thể tái sử dụng trang History tổng hợp.

## 3. Tác nhân và hệ thống liên quan
- End-User: Yêu cầu xem lịch sử giao dịch gửi.
- Frontend App: Gọi API lịch sử, hiển thị danh sách và trạng thái.
- History API: Truy vấn database với bộ lọc địa chỉ và loại giao dịch.
- Database (Prisma): Lưu transaction records.

## 4. Trigger
- End-User mở trang lịch sử hoặc tab lịch sử trong module Send.

## 5. Tiền điều kiện
- End-User có địa chỉ ví hợp lệ.
- Hệ thống có dữ liệu transaction đã lưu trước đó (qua confirm API).
- Database sẵn sàng truy vấn.

## 6. Hậu điều kiện
### 6.1. Hậu điều kiện thành công
- Trả về danh sách giao dịch theo địa chỉ ví gửi.
- Có thể lọc theo type = send.
- Trả về tổng số bản ghi để hỗ trợ phân trang.

### 6.2. Hậu điều kiện thất bại
- API trả lỗi rõ ràng khi thiếu địa chỉ, DB không khả dụng hoặc lỗi hệ thống.
- Frontend có thể hiển thị trạng thái empty/fallback an toàn.

## 7. Dữ liệu vào/ra
### 7.1. Dữ liệu vào
- Query params:
  - address: địa chỉ ví bắt buộc
  - type: send hoặc all
  - limit: số bản ghi/trang (1..50)
  - offset: vị trí bắt đầu (>= 0)

### 7.2. Dữ liệu ra
- data.transactions[] gồm:
  - id, hash, txType, from, to, amount
  - amountIn, amountOut, tokenIn, tokenOut
  - chainId, status, explorerUrl, errorMessage
  - createdAt, updatedAt
- data.total: tổng số giao dịch theo bộ lọc.

## 8. Luồng chính
1. End-User mở màn hình lịch sử gửi token.
2. Frontend lấy địa chỉ ví hiện tại và gọi GET /api/history/list?address={address}&type=send&limit={n}&offset={m}.
3. API kiểm tra tham số, chuẩn hóa address về lowercase.
4. API đếm tổng số bản ghi phù hợp điều kiện.
5. API truy vấn danh sách transaction sắp xếp mới nhất trước.
6. API trả về transactions + total.
7. Frontend hiển thị danh sách cùng trạng thái từng giao dịch (confirming/pending/success/failed).

## 9. Luồng thay thế
### AF-01: Không truyền type hoặc type = all
1. Frontend gọi API chỉ với address.
2. API trả toàn bộ giao dịch theo địa chỉ from.
3. Frontend tự lọc hoặc hiển thị tổng hợp nhiều loại giao dịch.

### AF-02: Giới hạn phân trang vượt ngưỡng
1. Frontend truyền limit > 50 hoặc limit không hợp lệ.
2. API chuẩn hóa limit về miền 1..50.
3. Dữ liệu vẫn trả về an toàn theo ngưỡng đã chuẩn hóa.

### AF-03: Người dùng chưa có giao dịch
1. API trả transactions rỗng, total = 0.
2. Frontend hiển thị trạng thái chưa có dữ liệu.

## 10. Luồng ngoại lệ
### EX-01: Thiếu address
- Điều kiện: Query không có address.
- Xử lý: API trả 400 Wallet address is required.
- Kết quả: Không truy vấn dữ liệu.

### EX-02: Database tạm thời không khả dụng
- Điều kiện: Prisma gặp lỗi kết nối/timed out.
- Xử lý: API trả 503 với fallback transactions rỗng.
- Kết quả: Frontend có thể hiện thông báo thử lại sau.

### EX-03: Lỗi nội bộ khi truy vấn
- Điều kiện: Lỗi hệ thống ngoài nhóm DB-unavailable.
- Xử lý: API trả 500 với fallback transactions rỗng.
- Kết quả: Không làm crash giao diện.

## 11. API và tích hợp kỹ thuật
### 11.1. History API
- Endpoint: GET /api/history/list
- Query chính:
  - address (bắt buộc)
  - type (tùy chọn, dùng send cho nghiệp vụ Send)
  - limit, offset
- Kết quả:
  - data.transactions
  - data.total

### 11.2. Quan hệ dữ liệu
- Nguồn dữ liệu: model Transaction trong Prisma.
- Điều kiện lọc chính hiện tại theo trường from = address đã chuẩn hóa.
- Khi truyền type = send, API thêm điều kiện txType = send.

## 12. Mã lỗi nghiệp vụ đề nghị
- SEND-002-MISSING_ADDRESS: Thiếu địa chỉ ví.
- SEND-002-DB_UNAVAILABLE: Hệ thống DB không khả dụng.
- SEND-002-HISTORY_QUERY_FAILED: Truy vấn lịch sử thất bại.

## 13. Quy tắc nghiệp vụ
- BR-SH-001: Lịch sử Send phải lọc theo txType = send để đảm bảo đúng nghiệp vụ.
- BR-SH-002: Chỉ trả tối đa 50 bản ghi mỗi lần gọi API.
- BR-SH-003: Danh sách phải sắp xếp theo createdAt giảm dần.
- BR-SH-004: Address truy vấn cần được chuẩn hóa lowercase để đồng nhất dữ liệu.

## 14. Yêu cầu phi chức năng
- NFR-SH-001 (Performance): API lịch sử phản hồi trong <= 2 giây với limit <= 50 ở điều kiện bình thường.
- NFR-SH-002 (Reliability): Khi DB lỗi tạm thời, API trả fallback có cấu trúc ổn định.
- NFR-SH-003 (Usability): Frontend cần hiển thị rõ trạng thái empty/error/loading.

## 15. Acceptance Criteria (Given-When-Then)
- AC-S002-01: Given người dùng có giao dịch send, When gọi history với type=send, Then hệ thống trả danh sách chỉ gồm txType send.
- AC-S002-02: Given người dùng chưa có giao dịch, When gọi history, Then hệ thống trả transactions = [] và total = 0.
- AC-S002-03: Given không truyền address, When gọi history, Then API trả 400.
- AC-S002-04: Given DB không khả dụng, When gọi history, Then API trả 503 với fallback dữ liệu rỗng.
- AC-S002-05: Given offset/limit hợp lệ, When gọi history, Then dữ liệu trả đúng phân trang và sắp xếp mới nhất trước.

## 16. Traceability
- History page placeholder: app/history/page.tsx
- History API (App Router): app/api/history/list/route.ts
- Legacy history API stub: app/api/history/list.ts
- Transaction state type: types/index.ts
- Transaction store: stores/tx.ts
- Transaction schema: prisma/schema.prisma
