# UC-HIS-001: Xem lịch sử giao dịch

## 1. Thông tin chung
- Mã use case: UC-HIS-001
- Tên use case: Xem lịch sử giao dịch
- Module: History
- Tác nhân chính: End-User
- Mức độ ưu tiên: Must
- Mục tiêu: Cho phép End-User xem toàn bộ lịch sử giao dịch của ví mình bao gồm Send, Swap và Bridge, có bộ lọc theo loại giao dịch, trạng thái, khoảng thời gian và tìm kiếm theo hash. Mỗi giao dịch có thể xem chi tiết qua modal.

## 2. Phạm vi và giả định
- Tài liệu này mô tả thiết kế mục tiêu (planned implementation) cho History module, frontend hiện là placeholder.
- Lịch sử giao dịch được tổng hợp từ hai nguồn dữ liệu riêng biệt:
  - Bảng `Transaction` (Prisma): chứa các giao dịch Send và Swap, phục vụ qua `/api/history/list`.
  - Bảng `BridgeTransaction` (Prisma): chứa các giao dịch Bridge, phục vụ qua `/api/bridge/history`.
- Frontend thực hiện merge và chuẩn hoá dữ liệu từ hai nguồn trên để hiển thị chung trên UI.
- Giao diện tổ chức theo tab: **Tất cả / Send / Swap / Bridge**. Mỗi tab có phân trang riêng.
- Bộ lọc trạng thái và khoảng thời gian áp dụng độc lập trong từng tab.
- Tìm kiếm theo tx hash áp dụng trên tất cả các tab.
- Không bao gồm chức năng xuất dữ liệu (export CSV/PDF) trong phạm vi MVP.
- Không bao gồm lịch sử giao dịch của ví khác (chỉ hiển thị theo địa chỉ ví đang kết nối).

## 3. Tác nhân và hệ thống liên quan
- End-User: Xem danh sách giao dịch, áp dụng bộ lọc, xem chi tiết giao dịch.
- Frontend App: Gọi API lấy dữ liệu, merge hai nguồn, render danh sách, quản lý trạng thái bộ lọc và phân trang.
- API `/api/history/list`: Truy vấn bảng `Transaction` (Send/Swap) theo địa chỉ ví, loại, phân trang.
- API `/api/bridge/history`: Truy vấn bảng `BridgeTransaction` theo địa chỉ ví, phân trang.
- Database (Prisma/PostgreSQL): Nguồn dữ liệu gốc cho cả hai bảng.

## 4. Trigger
- End-User điều hướng đến trang `/history`.
- Hệ thống tự động tải danh sách giao dịch theo địa chỉ ví đang kết nối.

## 5. Tiền điều kiện
- End-User đã kết nối ví EVM hợp lệ.
- Địa chỉ ví đang kết nối được truyền vào các API như query param.

## 6. Hậu điều kiện
### 6.1. Hậu điều kiện thành công
- Danh sách giao dịch được hiển thị đúng theo bộ lọc và tab đang chọn.
- Phân trang hoạt động chính xác cho từng tab.
- Khi click vào một giao dịch, modal chi tiết mở ra với đầy đủ thông tin.

### 6.2. Hậu điều kiện thất bại
- Nếu API lỗi hoặc chưa có giao dịch nào, UI hiển thị thông báo rỗng (empty state) hoặc thông báo lỗi tương ứng.
- UI không crash, các bộ lọc vẫn hoạt động để thử lại.

## 7. Dữ liệu vào/ra
### 7.1. Dữ liệu vào
- Từ Frontend (query params gửi tới API):
  - `address`: địa chỉ ví đang kết nối (bắt buộc)
  - `type`: loại giao dịch — `send`, `swap`, `bridge`, hoặc bỏ trống để lấy tất cả
  - `status`: lọc theo trạng thái — `pending`, `confirming`, `success`, `failed`
  - `dateFrom`: timestamp bắt đầu khoảng thời gian (ISO 8601)
  - `dateTo`: timestamp kết thúc khoảng thời gian (ISO 8601)
  - `hash`: chuỗi tìm kiếm theo tx hash (tìm kiếm gần đúng)
  - `limit`: số bản ghi mỗi trang (mặc định 10, tối đa 50)
  - `offset`: vị trí bắt đầu phân trang (mặc định 0)

### 7.2. Dữ liệu ra
- Từ `/api/history/list` (Send/Swap):
  - `transactions[]`: danh sách giao dịch với các trường:
    - `id`, `hash`, `txType` (`send`/`swap`), `from`, `to`
    - `amount`, `amountIn`, `amountOut`, `tokenIn`, `tokenOut`
    - `chainId`, `status`, `explorerUrl`, `errorMessage`
    - `createdAt`, `updatedAt`
  - `total`: tổng số bản ghi phù hợp bộ lọc
  - `limit`, `offset`

- Từ `/api/bridge/history` (Bridge):
  - `transactions[]`: danh sách bridge transaction với các trường:
    - `id`, `userAddress`, `fromChainId`, `toChainId`
    - `tokenAddress`, `amount`, `status` (`pending`/`success`/`failed`)
    - `txHashSource`, `txHashDest`, `errorMessage`
    - `createdAt`, `updatedAt`
  - `total`, `limit`, `offset`

- Dữ liệu sau merge (hiển thị trên UI — chuẩn hoá):
  - `id`: định danh nội bộ
  - `hash`: tx hash chính (txHashSource cho Bridge)
  - `type`: `send` / `swap` / `bridge`
  - `status`: `pending` / `confirming` / `success` / `failed`
  - `amount`: số lượng token
  - `chainInfo`: chain id hoặc cặp fromChainId → toChainId
  - `explorerUrl`: link tra cứu explorer
  - `errorMessage`: thông báo lỗi nếu có
  - `createdAt`: thời điểm tạo giao dịch

## 8. Luồng chính
1. End-User điều hướng đến trang `/history`.
2. Frontend đọc địa chỉ ví từ wallet store; nếu chưa kết nối, hiển thị thông báo yêu cầu kết nối ví.
3. Frontend hiển thị tab mặc định là **Tất cả** và bộ lọc trạng thái/thời gian ở trạng thái chưa áp dụng.
4. Frontend gọi song song hai API theo địa chỉ ví và tham số mặc định:
   - `GET /api/history/list?address=...&limit=10&offset=0`
   - `GET /api/bridge/history?address=...&limit=10&offset=0`
5. Frontend merge và sắp xếp kết quả từ hai nguồn theo `createdAt` giảm dần.
6. Danh sách giao dịch được hiển thị theo dạng bảng hoặc danh sách card, có phân trang.
7. End-User chọn tab (**Send**, **Swap**, hoặc **Bridge**) để lọc theo loại giao dịch — mỗi tab gọi API riêng và phân trang độc lập.
8. End-User áp dụng bộ lọc trạng thái, khoảng thời gian hoặc nhập tx hash để tìm kiếm; frontend gọi lại API với tham số bộ lọc mới, reset offset về 0.
9. End-User click vào một giao dịch trong danh sách.
10. Frontend mở modal chi tiết hiển thị đầy đủ thông tin: hash (kèm link explorer), loại, trạng thái, số lượng, chain, thời gian, thông báo lỗi (nếu có).
11. End-User đóng modal và tiếp tục duyệt danh sách hoặc thay đổi bộ lọc.

## 9. Luồng thay thế
### AF-01: End-User chuyển tab
1. End-User click vào tab **Send**, **Swap** hoặc **Bridge**.
2. Frontend gọi API tương ứng với `type` phù hợp, reset offset về 0.
3. Danh sách cập nhật hiển thị chỉ giao dịch thuộc loại đã chọn.
4. Bộ lọc trạng thái và thời gian được giữ nguyên khi đổi tab.

### AF-02: End-User áp dụng bộ lọc trạng thái hoặc thời gian
1. End-User chọn trạng thái (pending / confirming / success / failed) hoặc chọn date range.
2. Frontend gọi lại API với tham số `status`, `dateFrom`, `dateTo` tương ứng, reset phân trang.
3. Danh sách cập nhật theo bộ lọc mới.
4. Nếu không có kết quả phù hợp, hiển thị empty state: "Không tìm thấy giao dịch nào phù hợp bộ lọc."

### AF-03: End-User tìm kiếm theo tx hash
1. End-User nhập một phần hoặc toàn bộ tx hash vào ô tìm kiếm.
2. Frontend gọi API với tham số `hash` (tìm kiếm gần đúng), áp dụng trên tất cả các tab.
3. Kết quả hiển thị các giao dịch có hash khớp.

### AF-04: Phân trang
1. End-User click nút Trang tiếp / Trang trước hoặc chọn số trang cụ thể.
2. Frontend tính `offset` mới và gọi lại API với `offset` cập nhật.
3. Danh sách cập nhật theo trang mới.

### AF-05: Chưa có giao dịch nào
1. API trả `total = 0` hoặc `transactions = []`.
2. UI hiển thị empty state: "Bạn chưa có giao dịch nào." kèm CTA hướng dẫn sử dụng Bridge/Swap/Send.

### AF-06: Xem chi tiết giao dịch Bridge
1. End-User click vào một giao dịch Bridge trong danh sách.
2. Modal hiển thị thêm thông tin đặc thù: `fromChainId` → `toChainId`, `txHashSource` (hash khoá token), `txHashDest` (hash mint token), link explorer tương ứng mỗi chain.

## 10. Luồng ngoại lệ
### EX-01: Chưa kết nối ví
- Điều kiện: `address` trong wallet store là null.
- Xử lý: UI hiển thị thông báo "Vui lòng kết nối ví để xem lịch sử giao dịch." và nút Connect Wallet.
- Kết quả: Không gọi bất kỳ API history nào.

### EX-02: API `/api/history/list` lỗi
- Điều kiện: API trả 400, 500 hoặc lỗi mạng.
- Xử lý: Phần Send/Swap trong danh sách hiển thị thông báo lỗi kèm nút "Thử lại".
- Kết quả: Phần Bridge (nếu thành công) vẫn hiển thị bình thường.

### EX-03: API `/api/bridge/history` lỗi
- Điều kiện: API Bridge trả 400, 500 hoặc lỗi mạng.
- Xử lý: Phần Bridge trong danh sách hiển thị thông báo lỗi kèm nút "Thử lại".
- Kết quả: Phần Send/Swap (nếu thành công) vẫn hiển thị bình thường.

### EX-04: Thiếu tham số `address`
- Điều kiện: API nhận request không có `address` hoặc `address` rỗng.
- Xử lý: API trả 400 với `error: 'Wallet address is required'`.
- Kết quả: Frontend hiển thị thông báo lỗi và không cố gọi lại mà không có địa chỉ.

### EX-05: Khoảng thời gian `dateFrom` > `dateTo`
- Điều kiện: End-User chọn date range không hợp lệ.
- Xử lý: Frontend tự validate và hiển thị cảnh báo "Ngày bắt đầu không thể sau ngày kết thúc." Không gọi API.
- Kết quả: Bộ lọc thời gian chưa được áp dụng.

### EX-06: Lỗi cơ sở dữ liệu
- Điều kiện: Prisma trả lỗi P5010, P1001, P1002 hoặc lỗi kết nối DB.
- Xử lý: API trả 503 với message phù hợp. UI hiển thị thông báo "Hệ thống đang bảo trì, vui lòng thử lại sau."
- Kết quả: Không expose thông tin lỗi nội bộ ra ngoài.

## 11. API và tích hợp kỹ thuật
### 11.1. API lịch sử Send/Swap
- Endpoint: `GET /api/history/list`
- Query params:
  - `address` (bắt buộc): địa chỉ ví, được normalize lowercase trước khi query.
  - `type`: `send` | `swap` | `bridge` | bỏ trống (lấy tất cả `Transaction`).
  - `status`: lọc theo cột `status` trong bảng `Transaction`.
  - `dateFrom`, `dateTo`: lọc theo `createdAt >= dateFrom AND createdAt <= dateTo`.
  - `hash`: lọc `hash ILIKE '%{hash}%'`.
  - `limit`: 1–50, mặc định 10.
  - `offset`: >= 0, mặc định 0.
- Response 200: `{ data: { transactions[], total, limit, offset } }`
- Response 400: `{ error: 'Wallet address is required' }`
- Response 503: `{ error: '<db-unavailable-message>' }`

### 11.2. API lịch sử Bridge
- Endpoint: `GET /api/bridge/history`
- Query params tương tự: `address`, `status`, `dateFrom`, `dateTo`, `hash`, `limit`, `offset`.
- Response 200: `{ data: { transactions[], total, limit, offset } }`
- Dữ liệu trả về có schema `BridgeTransaction` khác schema `Transaction`.

### 11.3. Chuẩn hoá dữ liệu tại Frontend
- Frontend map hai schema về dạng thống nhất `NormalizedTransaction` trước khi render:

```typescript
interface NormalizedTransaction {
  id: string;           // 'tx-{id}' hoặc 'bridge-{id}' để tránh xung đột
  hash: string;         // txHashSource cho Bridge
  type: 'send' | 'swap' | 'bridge';
  status: 'pending' | 'confirming' | 'success' | 'failed';
  amount: string;
  chainInfo: string;    // ví dụ: 'Arc Testnet' hoặc 'Chain 1 → Chain 2'
  explorerUrl?: string;
  errorMessage?: string;
  createdAt: string;
  raw: Transaction | BridgeTransaction;  // giữ nguyên để hiển thị modal chi tiết
}
```

### 11.4. Modal chi tiết giao dịch
- Mở khi End-User click vào một giao dịch.
- Không có route riêng, sử dụng state nội bộ `selectedTx`.
- Hiển thị tất cả trường từ `raw` object tương ứng.
- Cung cấp link "Xem trên Explorer" mở tab mới.

## 12. Mã lỗi nghiệp vụ đề nghị
- HIS-001-NO_WALLET: Chưa kết nối ví.
- HIS-001-MISSING_ADDRESS: Thiếu tham số địa chỉ ví khi gọi API.
- HIS-001-FETCH_TX_FAILED: Lỗi khi lấy danh sách Send/Swap.
- HIS-001-FETCH_BRIDGE_FAILED: Lỗi khi lấy danh sách Bridge.
- HIS-001-INVALID_DATE_RANGE: Khoảng thời gian bộ lọc không hợp lệ.
- HIS-001-DB_UNAVAILABLE: Cơ sở dữ liệu không khả dụng.

## 13. Quy tắc nghiệp vụ
- BR-H-001: Chỉ hiển thị giao dịch có `from` (hoặc `userAddress`) khớp với địa chỉ ví đang kết nối (normalize lowercase).
- BR-H-002: Tab **Tất cả** hiển thị merge từ cả `Transaction` (send + swap) và `BridgeTransaction`, sắp xếp theo `createdAt` giảm dần.
- BR-H-003: Phân trang trong tab **Tất cả** hoạt động độc lập với phân trang trong từng tab riêng.
- BR-H-004: `status = confirming` chỉ tồn tại trong bảng `Transaction`; khi hiển thị cùng `BridgeTransaction`, coi `pending` là tương đương.
- BR-H-005: Bộ lọc hash là tìm kiếm gần đúng (contains), không yêu cầu nhập toàn bộ hash.
- BR-H-006: Giới hạn `limit` tối đa 50 bản ghi mỗi lần gọi API để tránh quá tải.
- BR-H-007: Thông tin lỗi nội bộ (stack trace, Prisma error code) không được trả về cho client.

## 14. Yêu cầu phi chức năng
- NFR-H-001 (Performance): Danh sách giao dịch phải tải xong trong <= 3 giây ở điều kiện mạng bình thường với tối đa 50 bản ghi/trang.
- NFR-H-002 (Usability): Mỗi tab phải hiển thị skeleton loading trong khi chờ API phản hồi.
- NFR-H-003 (Usability): Empty state phải có thông báo rõ ràng và CTA phù hợp khi không có giao dịch.
- NFR-H-004 (Reliability): Lỗi từ một API nguồn (Send/Swap hoặc Bridge) không được làm crash toàn bộ trang; phần còn lại vẫn hiển thị bình thường.
- NFR-H-005 (Security): Address ví phải được validate định dạng EVM (`/^0x[0-9a-fA-F]{40}$/`) trước khi gửi lên API.
- NFR-H-006 (Accessibility): Explorer link mở trong tab mới, có `rel="noopener noreferrer"`.
- NFR-H-007 (Observability): Lỗi fetch ở phía server phải được log; lỗi fetch ở phía client phải được ghi console để hỗ trợ debug.

## 15. Acceptance Criteria (Given-When-Then)
- AC-H001-01: Given End-User đã kết nối ví và có giao dịch, When điều hướng tới `/history`, Then danh sách giao dịch tổng hợp (Send + Swap + Bridge) hiển thị trong tab Tất cả theo thứ tự mới nhất trước.
- AC-H001-02: Given tab Tất cả đang active, When End-User chọn tab Send, Then chỉ hiển thị giao dịch có `txType = send`, phân trang reset về trang 1.
- AC-H001-03: Given đang ở tab Tất cả, When End-User lọc `status = success`, Then chỉ hiển thị giao dịch có trạng thái success từ cả hai nguồn.
- AC-H001-04: Given End-User chọn date range hợp lệ, When áp dụng bộ lọc, Then chỉ hiển thị giao dịch trong khoảng thời gian đó.
- AC-H001-05: Given End-User chọn dateFrom > dateTo, When áp dụng bộ lọc, Then UI hiển thị thông báo lỗi ngày không hợp lệ và không gọi API.
- AC-H001-06: Given End-User nhập một phần tx hash vào ô tìm kiếm, When kết quả về, Then danh sách chỉ chứa giao dịch có hash chứa chuỗi đã nhập.
- AC-H001-07: Given End-User click vào một giao dịch Send, When modal mở, Then hiển thị đầy đủ: hash, loại (Send), trạng thái, số lượng, địa chỉ nhận, link explorer, thời gian tạo.
- AC-H001-08: Given End-User click vào một giao dịch Bridge, When modal mở, Then hiển thị cặp chain (fromChainId → toChainId), txHashSource, txHashDest và link explorer tương ứng.
- AC-H001-09: Given End-User chưa kết nối ví, When vào trang `/history`, Then hiển thị thông báo "Vui lòng kết nối ví" và nút Connect Wallet, không gọi API.
- AC-H001-10: Given API `/api/bridge/history` lỗi 500, When trang history tải, Then phần Send/Swap vẫn hiển thị bình thường; phần Bridge hiển thị thông báo lỗi kèm nút Thử lại.
- AC-H001-11: Given danh sách có hơn 10 giao dịch, When End-User click trang tiếp theo, Then API gọi lại với `offset` tương ứng và danh sách cập nhật đúng.

## 16. Traceability
- History page: `app/history/page.tsx`
- API Send/Swap history: `app/api/history/list/route.ts`
- API Bridge history: `app/api/bridge/history/` (cần tạo hoặc tham chiếu từ bridge module)
- Transaction schema: `prisma/schema.prisma` — model `Transaction`
- BridgeTransaction schema: `prisma/schema.prisma` — model `BridgeTransaction`
- Transaction type: `types/index.ts` — interface `Transaction`, `BridgeTransaction`
- Wallet state: `stores/wallet.ts`
- TX store: `stores/tx.ts`
- Chain constants: `constants/index.ts`
