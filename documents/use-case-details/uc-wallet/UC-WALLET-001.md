# UC-WALLET-001: Kết nối ví EVM

## 1. Thông tin chung
- Mã use case: UC-WALLET-001
- Tên use case: Kết nối ví EVM
- Module: Wallet
- Tác nhân chính: End-User
- Mức độ ưu tiên: Must
- Mục tiêu: Cho phép End-User kết nối ví EVM để sử dụng các chức năng DeFi trong ứng dụng Arc Quantum.

## 2. Phạm vi và giả định
- Phạm vi bao gồm kết nối ví từ frontend thông qua EIP-1193 provider trên trình duyệt.
- Phạm vi này bám sát implementation hiện tại với provider window.ethereum.
- Không bao gồm đồng bộ session đăng nhập backend cho End-User.
- Hỗ trợ chain mục tiêu: Arc Testnet.

## 3. Tác nhân và hệ thống liên quan
- End-User: Khởi tạo thao tác kết nối ví.
- Frontend App: Gọi provider method, cập nhật UI và state.
- EVM Wallet Provider: Xử lý popup kết nối, trả về account và chain id.
- Arc RPC thông qua API balance: Trả về số dư sau khi kết nối.

## 4. Trigger
- End-User bấm nút Connect wallet trên giao diện.

## 5. Tiền điều kiện
- End-User truy cập ứng dụng bằng trình duyệt hỗ trợ ví EVM.
- Nếu người dùng đã từng disconnect thủ công, có thể localStorage key arcq.wallet.manual_disconnect = 1.
- Hệ thống frontend đang hoạt động bình thường.

## 6. Hậu điều kiện
### 6.1. Hậu điều kiện thành công
- Trạng thái connected = true trong wallet store.
- Địa chỉ ví được lưu vào wallet store.
- UI hiện địa chỉ rút gọn và cho phép truy cập các chức năng giao dịch.
- Hệ thống đánh giá đúng/sai network dựa trên chain id hiện tại.
- Nếu có địa chỉ hợp lệ, hệ thống bắt đầu tải số dư qua API unified balance.

### 6.2. Hậu điều kiện thất bại
- Trạng thái connected = false.
- Không lưu địa chỉ ví vào wallet store.
- UI giữ trạng thái chưa kết nối, hiện thông báo lỗi phù hợp.

## 7. Dữ liệu vào/ra
### 7.1. Dữ liệu vào
- Người dùng thực hiện thao tác bấm Connect wallet.
- Dữ liệu từ ví:
  - Danh sách tài khoản (eth_requestAccounts, eth_accounts)
  - Chain id (eth_chainId)

### 7.2. Dữ liệu ra
- Frontend state:
  - address: Address | null
  - connected: boolean
  - wrongNetwork: boolean
  - loading: boolean
  - error: string | null
- Dữ liệu balance (nếu truy vấn thành công):
  - balance
  - address
  - balanceWei

## 8. Luồng chính
1. End-User bấm Connect wallet.
2. Frontend đặt loading = true, xóa lỗi hiện tại.
3. Frontend kiểm tra sự tồn tại của provider window.ethereum.
4. Frontend gọi eth_requestAccounts để mở popup ví.
5. End-User chọn account và xác nhận trong ví.
6. Provider trả về danh sách account.
7. Frontend lưu account đầu tiên vào wallet store và đặt connected = true.
8. Frontend gọi eth_chainId và so sánh với Arc Testnet chain hex 0x4cef52.
9. Frontend cập nhật wrongNetwork tương ứng.
10. WalletInfo hiện địa chỉ ví rút gọn trên header.
11. WalletInfo gọi API GET /api/balance/unified?address={address} để lấy số dư.
12. Frontend hiện số dư và cho phép người dùng tiếp tục các nghiệp vụ DeFi.

## 9. Luồng thay thế
### AF-01: Tự động khôi phục kết nối
1. Khi tải trang, frontend gọi eth_accounts.
2. Nếu có account và không bị đánh dấu manual disconnect, hệ thống tự động đặt connected = true.
3. Hệ thống tiếp tục bước kiểm tra chain và tải số dư.

### AF-02: Ví đã được đánh dấu manual disconnect
1. Khi tải trang, hệ thống đọc localStorage key arcq.wallet.manual_disconnect.
2. Nếu giá trị bằng 1, frontend không tự động reconnect dù có tài khoản trong ví.
3. UI giữ trạng thái chưa kết nối cho đến khi End-User bấm Connect wallet.

### AF-03: Kết nối thành công nhưng sai network
1. Hệ thống vẫn cho phép kết nối account.
2. wrongNetwork được đặt true.
3. UI cảnh báo sai network và cho phép thao tác switch network.

## 10. Luồng ngoại lệ
### EX-01: Không có ví EVM trên trình duyệt
- Điều kiện: window.ethereum không tồn tại.
- Xử lý: Dừng luồng kết nối, hiện lỗi MetaMask is not installed.
- Kết quả: Không có kết nối được tạo.

### EX-02: Người dùng từ chối popup kết nối
- Điều kiện: Provider ném lỗi khi gọi eth_requestAccounts.
- Xử lý: Frontend lấy message từ provider nếu có, ngược lại dùng message User rejected connection.
- Kết quả: connected giữ false, UI không crash.

### EX-03: Không nhận được account
- Điều kiện: Danh sách account rỗng sau khi request.
- Xử lý: Ném lỗi No wallet account selected.
- Kết quả: Không cập nhật địa chỉ ví.

### EX-04: Lỗi khi switch network
- Điều kiện: End-User bấm switch network nhưng provider trả lỗi.
- Xử lý: Hiện thông báo Failed to switch network.
- Kết quả: wrongNetwork có thể vẫn true.

### EX-05: Lỗi lấy số dư
- Điều kiện: API balance trả về 400/500 hoặc lỗi mạng.
- Xử lý: WalletInfo hiện lỗi Failed to fetch balance hoặc Network error và fallback số dư 0.00.
- Kết quả: Kết nối ví vẫn được duy trì.

## 11. API và tích hợp kỹ thuật
### 11.1. Provider methods
- eth_accounts: Kiểm tra account đã được cấp quyền trước đó.
- eth_requestAccounts: Yêu cầu cấp quyền kết nối account.
- eth_chainId: Đọc chain id hiện tại.
- wallet_switchEthereumChain: Chuyển sang Arc Testnet chain (0x4cef52).

### 11.2. Internal API
- GET /api/balance/unified?address={address}
  - 200: Trả về balance, address, balanceWei.
  - 400: Invalid address.
  - 500: Failed to fetch balance.

### 11.3. Dữ liệu và state liên quan
- Wallet store (zustand): address, connected.
- UI state: loading, error, wrongNetwork, balance.
- Local storage key: arcq.wallet.manual_disconnect.

## 12. Mã lỗi nghiệp vụ đề nghị
- WALLET-001-NO_PROVIDER: Không tìm thấy provider ví.
- WALLET-001-USER_REJECTED: Người dùng từ chối kết nối.
- WALLET-001-NO_ACCOUNT: Không có account được chọn.
- WALLET-001-WRONG_NETWORK: Ví kết nối sai network Arc Testnet.
- WALLET-001-BALANCE_FETCH_FAILED: Lỗi truy vấn balance.

## 13. Quy tắc nghiệp vụ
- BR-W-001: Mỗi thời điểm chỉ được xem là kết nối với một account active trong UI.
- BR-W-002: Kết nối ví không đồng nghĩa với xác thực tài khoản backend cho End-User.
- BR-W-003: Hệ thống ưu tiên tôn trọng lựa chọn manual disconnect của người dùng.
- BR-W-004: Hệ thống phải cảnh báo khi chain id khác Arc Testnet.

## 14. Yêu cầu phi chức năng
- NFR-W-001 (Reliability): Khi provider thất bại, UI không được crash và phải hiện thông báo lỗi rõ ràng.
- NFR-W-002 (Performance): Sau khi kết nối thành công, hiển thị địa chỉ ví trong <= 1 giây ở điều kiện mạng bình thường.
- NFR-W-003 (Usability): Trạng thái loading phải hiển thị trong quá trình chờ popup/phản hồi từ ví.
- NFR-W-004 (Compatibility): Luồng kết nối tuân theo chuẩn EIP-1193.
- NFR-W-005 (Observability): Lỗi truy vấn balance được ghi console để phục vụ debug.

## 15. Acceptance Criteria (Given-When-Then)
- AC-W001-01: Given End-User chưa kết nối ví, When bấm Connect wallet và xác nhận trong ví, Then hệ thống hiện địa chỉ ví rút gọn và connected = true.
- AC-W001-02: Given End-User đã kết nối account, When chain id khác 0x4cef52, Then hệ thống đặt wrongNetwork = true và hiện cảnh báo sai network.
- AC-W001-03: Given End-User từ chối popup kết nối, When provider trả lỗi, Then hệ thống hiện thông báo lỗi thân thiện và không crash.
- AC-W001-04: Given localStorage arcq.wallet.manual_disconnect = 1, When tải lại trang, Then hệ thống không tự động reconnect dù có account tồn tại.
- AC-W001-05: Given kết nối ví thành công, When gọi API unified balance thành công, Then UI hiện số dư và cập nhật định kỳ 15 giây.
- AC-W001-06: Given kết nối ví thành công nhưng API balance lỗi, When API trả 400/500 hoặc network error, Then UI hiện thông báo lỗi và fallback số dư 0.00.

## 16. Traceability
- Hook: hooks/useWallet.ts
- UI: components/wallet/WalletInfo.tsx
- State: stores/wallet.ts
- Constants: constants/index.ts
- API balance: app/api/balance/unified/route.ts
- Type liên quan: types/index.ts
