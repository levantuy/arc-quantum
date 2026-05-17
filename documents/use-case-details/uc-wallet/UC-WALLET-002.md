# UC-WALLET-002: Ngắt kết nối ví

## 1. Thông tin chung
- Mã use case: UC-WALLET-002
- Tên use case: Ngắt kết nối ví
- Module: Wallet
- Tác nhân chính: End-User
- Mức độ ưu tiên: Should
- Mục tiêu: Cho phép End-User chủ động ngắt kết nối ví để bảo toàn quyền kiểm soát phiên sử dụng.

## 2. Phạm vi và giả định
- Phạm vi bao gồm thao tác disconnect trên frontend và cập nhật state/UI liên quan.
- Phạm vi bám sát implementation hiện tại trong WalletInfo và useWallet.
- Không bao gồm revoke quyền kết nối tại ứng dụng ví bên thứ ba (MetaMask), vì hành vi này thuộc phía wallet extension.

## 3. Tác nhân và hệ thống liên quan
- End-User: Chọn Disconnect từ giao diện wallet details.
- Frontend App: Xóa trạng thái kết nối, balance tạm thời và đóng wallet popover.
- Local storage: Lưu cờ manual disconnect để chặn auto reconnect.

## 4. Trigger
- End-User bấm nút Disconnect trong wallet details.

## 5. Tiền điều kiện
- End-User đang ở trang có thành phần WalletInfo.
- Wallet đang ở trạng thái connected = true.
- Địa chỉ ví đang được hiển thị trên UI.

## 6. Hậu điều kiện
### 6.1. Hậu điều kiện thành công
- localStorage key arcq.wallet.manual_disconnect được set thành 1.
- Wallet store được cập nhật address = null, connected = false.
- UI trở về trạng thái hiện nút Connect wallet.
- Dữ liệu balance tạm thời được reset về null.
- Wallet details popover được đóng.

### 6.2. Hậu điều kiện thất bại
- Trong implementation hiện tại, disconnect là thao tác local, không phụ thuộc API nên khả năng thất bại rất thấp.
- Nếu localStorage không khả dụng (privacy mode), hệ thống vẫn xóa state trong store để đảm bảo ngắt kết nối trên UI.

## 7. Dữ liệu vào/ra
### 7.1. Dữ liệu vào
- Hành động người dùng bấm Disconnect.
- Trạng thái hiện tại của wallet store.

### 7.2. Dữ liệu ra
- Wallet store mới:
  - address = null
  - connected = false
- UI state:
  - balance = null
  - error = null
  - showDetails = false

## 8. Luồng chính
1. End-User nhấn vào địa chỉ ví đang hiển thị.
2. Hệ thống mở wallet details panel.
3. End-User bấm Disconnect.
4. Frontend gọi hàm disconnect trong useWallet.
5. useWallet ghi localStorage arcq.wallet.manual_disconnect = 1.
6. useWallet đặt address = null và connected = false trong wallet store.
7. WalletInfo reset balance, xóa lỗi và đóng details panel.
8. Giao diện hiện lại nút Connect wallet.

## 9. Luồng thay thế
### AF-01: Ngắt kết nối do sự kiện accountsChanged rỗng
1. Provider phát sự kiện accountsChanged với mảng rỗng.
2. useWallet tự động coi như disconnect.
3. Hệ thống set manual_disconnect = 1 và đặt connected = false.
4. UI cập nhật về trạng thái chưa kết nối.

### AF-02: Người dùng đóng panel mà không disconnect
1. End-User click ra ngoài panel.
2. Hệ thống đóng details panel.
3. Kết nối ví được giữ nguyên.

## 10. Luồng ngoại lệ
### EX-01: localStorage không khả dụng
- Điều kiện: Trình duyệt chặn localStorage.
- Xử lý: useWallet bỏ qua lỗi localStorage bằng try/catch.
- Kết quả: Disconnect vẫn hoàn tất ở cấp độ state/UI.

### EX-02: Sự kiện account thay đổi bất ngờ
- Điều kiện: Wallet extension đổi account trong lúc user thao tác.
- Xử lý: useWallet xử lý accountsChanged; nếu mảng account rỗng thì ngắt kết nối, nếu có account mới thì cập nhật account mới (trong trường hợp không bị manual disconnect).
- Kết quả: UI đồng bộ với trạng thái mới của ví.

## 11. API và tích hợp kỹ thuật
- Không gọi backend API trong thao tác disconnect có chủ ý.
- Luồng refresh balance thông qua /api/balance/unified sẽ dừng vì activeAddress = null sau disconnect.
- Tích hợp sự kiện provider:
  - accountsChanged
  - chainChanged

## 12. Mã lỗi nghiệp vụ đề nghị
- WALLET-002-LOCAL_STORAGE_UNAVAILABLE: Không thể ghi cờ manual disconnect vào localStorage.
- WALLET-002-UNEXPECTED_ACCOUNT_EVENT: Sự kiện account thay đổi ngoài dự kiến trong quá trình thao tác.

## 13. Quy tắc nghiệp vụ
- BR-W-005: Disconnect phải là thao tác ưu tiên của người dùng, ngăn hệ thống auto reconnect cho đến khi người dùng tự connect lại.
- BR-W-006: Sau disconnect, hệ thống không được phép hiển thị dữ liệu số dư của ví cũ.
- BR-W-007: Ứng dụng không được giả định có API logout cho End-User wallet connection ở module này.

## 14. Yêu cầu phi chức năng
- NFR-W-006 (Responsiveness): UI cập nhật trạng thái disconnect gần như tức thì.
- NFR-W-007 (Reliability): Disconnect không phụ thuộc network và vẫn hoạt động khi backend tạm thời lỗi.
- NFR-W-008 (Usability): Sau disconnect, người dùng nhìn thấy trạng thái chưa kết nối rõ ràng và nhất quán trên header.

## 15. Acceptance Criteria (Given-When-Then)
- AC-W002-01: Given End-User đang kết nối ví, When bấm Disconnect, Then hệ thống hiện nút Connect wallet và địa chỉ ví biến mất.
- AC-W002-02: Given End-User vừa disconnect, When tải lại trang, Then hệ thống không tự động reconnect nếu localStorage manual_disconnect = 1.
- AC-W002-03: Given End-User đang mở wallet details, When disconnect thành công, Then details panel đóng và balance reset về null.
- AC-W002-04: Given trình duyệt không cho phép localStorage, When disconnect, Then hệ thống vẫn đặt connected = false và không crash.
- AC-W002-05: Given provider phát accountsChanged với mảng rỗng, When sự kiện được xử lý, Then hệ thống chuyển sang trạng thái đã disconnect.

## 16. Traceability
- Hook: hooks/useWallet.ts
- UI: components/wallet/WalletInfo.tsx
- State: stores/wallet.ts
- API balance có liên quan gián tiếp: app/api/balance/unified/route.ts
