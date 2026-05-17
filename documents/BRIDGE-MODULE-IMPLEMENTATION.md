# Bridge Module - Implementation Documentation

## Overview
The Bridge Module enables cross-chain token transfers on the Arc Quantum DeFi platform. It implements the three primary use cases outlined in the requirements:
- **UC-BRIDGE-001**: Initiate cross-chain token transfers
- **UC-BRIDGE-002**: View transaction status and history
- **UC-BRIDGE-003**: Handle failed transactions with automatic retry

## Architecture

### Backend Layer

#### Database Schema (Prisma)
- **BridgeTransaction**: Main transaction records
  - id, userAddress, fromChainId, toChainId, tokenAddress, amount
  - status (pending, success, failed)
  - txHashSource, txHashDest
  - errorMessage, createdAt, updatedAt

- **BridgeTransactionLog**: Audit trail for each transaction
  - Tracks every step in the bridge process
  - Stores detailed information for debugging and compliance
  - Enables transaction replay and analysis

#### Service Layer (`lib/bridge/`)
- **types.ts**: Enumerations and constants
  - BridgeTransactionStatus
  - BridgeLogStep (13 steps covering entire lifecycle)
  - Configuration constants (retries, timeouts, etc.)

- **validator.ts**: Request validation
  - Address format validation
  - Chain ID validation
  - Amount limit validation
  - Bridge configuration checks

- **logger.ts**: Audit logging
  - BridgeTransactionLogger class with methods for each step
  - JSON serialization for detailed tracking
  - Automatic timestamp recording

- **service.ts**: Core business logic
  - BridgeService class (main service)
  - UC-BRIDGE-001: initiateTransfer()
  - UC-BRIDGE-002: getTransaction(), getUserTransactionHistory()
  - UC-BRIDGE-003: handleFailedTransaction()
  - Private helpers for RPC interaction and retry logic

#### API Endpoints
1. **POST /api/bridge/transfer**
   - Initiates a new bridge transfer
   - Validates signature, balance, bridge support
   - Locks tokens on source chain
   - Returns: BridgeTransaction object

2. **GET /api/bridge/history**
   - Retrieves user's transaction history
   - Query params: address, limit (max 100), offset
   - Returns: paginated transactions with total count

3. **GET /api/bridge/[id]**
   - Gets transaction details with full audit logs
   - Returns: BridgeTransaction + BridgeTransactionLog[]

4. **POST /api/bridge/[id]/retry**
   - Initiates retry for failed transactions (UC-BRIDGE-003)
   - Implements automatic retry logic with exponential backoff
   - Max 3 retry attempts

### Frontend Layer

#### Components (`components/bridge/`)

1. **BridgeForm.tsx**
   - Form for initiating transfers (UC-BRIDGE-001)
   - Chain selection, token address, amount input
   - Signature verification via connected wallet
   - Form validation with error handling

2. **BridgeStatus.tsx**
   - Displays transaction status badge
   - Shows chain routing (from → to)
   - Displays transaction hashes
   - Error message display

3. **BridgeHistory.tsx**
   - List of user's transactions (UC-BRIDGE-002)
   - Click to select transaction for details
   - Real-time status updates
   - Pagination support

4. **BridgeTransactionDetail.tsx**
   - Detailed view with audit logs (UC-BRIDGE-002)
   - Timeline visualization of processing steps
   - Step-by-step details expandable
   - Retry button for failed transactions (UC-BRIDGE-003)

#### Hooks (`hooks/`)
- **useBridge.ts**: Main Bridge hook
  - initiateTransfer()
  - getTransaction()
  - getUserHistory()
  - retryTransaction()
  - Loading and error states

#### Page (`app/bridge/page.tsx`)
- Main Bridge feature page
- Tab navigation between "Initiate Transfer" and "History"
- Instructions for users

## Transaction Flow

### UC-BRIDGE-001: Initiate Transfer
1. User fills form (chains, token, amount)
2. System validates input format
3. User signs message with wallet
4. Backend verifies signature
5. System checks balance (frontend) and bridge support
6. Validates amount against min/max limits
7. Locks tokens on source chain via Arc App Kit
8. Waits for source chain confirmation
9. Returns transaction record

### UC-BRIDGE-002: View Status & History
1. User navigates to Bridge History
2. System queries BridgeTransaction records for user
3. For selected transaction:
   - Retrieves full transaction details
   - Fetches all audit logs (BridgeTransactionLog)
   - Displays processing timeline
   - Shows transaction hashes for explorer verification

### UC-BRIDGE-003: Handle Failed Transactions
1. System detects failed transaction (pending timeout or explicit failure)
2. Automatic retry initiated (up to 3 attempts)
3. Each retry:
   - Waits RETRY_DELAY_MS (5000ms)
   - Attempts to complete next stage
   - Logs retry attempt with step number
4. After max retries:
   - Transaction marked as failed
   - Flagged for admin review
   - User can manually retry via API

## Processing Steps (BridgeLogStep)

1. **init**: Transaction initialized
2. **validate**: Request format validated
3. **check_balance**: User balance verified
4. **check_bridge_support**: Bridge config checked
5. **lock_token**: Token locked on source chain
6. **wait_source_confirmation**: Waiting for source confirmation
7. **source_tx_success**: Source chain confirmed
8. **mint_token**: Token minting on destination
9. **wait_dest_confirmation**: Waiting for destination confirmation
10. **dest_tx_success**: Destination chain confirmed
11. **completed**: Transfer completed successfully
12. **error**: Error occurred
13. **retry**: Retry attempt initiated

## Integration with Arc App Kit

The Bridge service includes placeholder methods for Arc App Kit Bridge integration:
- `lockTokenOnSourceChain()`: Calls Arc SDK bridge lock methods
- `waitSourceChainConfirmation()`: Monitors source chain status
- `completeMintOnDestChain()`: Calls Arc SDK bridge mint methods

## Security Considerations

1. **Signature Verification**: All transfers require user signature
2. **Rate Limiting**: Consider adding to prevent abuse
3. **Audit Trail**: Complete logging for compliance
4. **Amount Validation**: Min/max limits enforced
5. **Chain Validation**: Only supported chains accepted
6. **Bridge Config**: Admin-configured bridge routes

## Configuration

Edit `BRIDGE_CONFIG` in `lib/bridge/types.ts`:
```typescript
MAX_RETRY_ATTEMPTS: 3          // Max retries for failed tx
RETRY_DELAY_MS: 5000           // Delay between retries
CONFIRMATION_BLOCKS: 12        // Blocks to confirm tx
LOCK_TIMEOUT_MS: 600000        // 10 min timeout for lock
```

## Testing Checklist

- [ ] Form validation (invalid address, same chains, invalid amounts)
- [ ] Signature verification
- [ ] Balance checking
- [ ] Bridge config validation
- [ ] Transaction creation and logging
- [ ] Transaction history retrieval
- [ ] Transaction detail with logs
- [ ] Failed transaction retry
- [ ] Max retry limit enforcement
- [ ] Error handling and user feedback
- [ ] UI responsiveness
- [ ] Wallet connection requirement

## Future Improvements

1. Integrate real Arc App Kit Bridge methods
2. Add gas estimation
3. Implement transaction monitoring service
4. Add webhook notifications
5. Create admin dashboard for failed transaction review
6. Implement automated refunds for stuck transactions
7. Add bridge liquidity management
8. Support for NFT bridges
9. Multi-sig transaction support
10. Bridge transaction acceleration
