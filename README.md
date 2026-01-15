# BTC Borrow Example App

A React application demonstrating how to use the `@satsterminal-sdk/borrow` SDK to borrow USDC against Bitcoin collateral.

## Features

- **Bitcoin Wallet Connection**: Connect via UniSat or Xverse wallets
- **Borrow USDC**: Use BTC as collateral to borrow USDC on Base/Arbitrum
- **Loan Management**: View active loans, health factors, and transaction history
- **Repayment**: Full or partial loan repayment with collateral withdrawal
- **Collateral Withdrawal**: Withdraw available BTC collateral
- **Gasless USDC Transfers**: Transfer borrowed USDC without gas fees

## Prerequisites

- Node.js 18+
- A Bitcoin wallet (UniSat or Xverse browser extension)
- API key from SatsTerminal

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Add your API key to `.env`:
   ```
   VITE_API_KEY=your-api-key-here
   ```

## Running

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── App.tsx                    # Main app with Borrow/Loans tabs
├── main.tsx                   # Entry point
├── hooks/
│   └── useBorrowSDK.tsx       # SDK wrapper hook
├── components/
│   ├── WalletConnect.tsx      # Wallet connection UI
│   ├── borrow/
│   │   ├── LoanForm.tsx       # Collateral & LTV input
│   │   ├── QuoteDisplay.tsx   # Quote selection
│   │   ├── WorkflowStatus.tsx # Borrow progress tracking
│   │   └── DepositCard.tsx    # BTC deposit interface
│   ├── loans/
│   │   ├── LoanHistory.tsx    # Active loans & history
│   │   └── LoanDetailsDialog.tsx  # Repay/Withdraw/Transfer
│   └── ui/                    # Reusable UI components
└── lib/
    └── utils.ts               # Utility functions
```

## SDK Integration

The app integrates with `@satsterminal-sdk/borrow` through the `useBorrowSDK` hook which provides:

### Connection
```typescript
const { connect, disconnect, isConnected, btcAddress } = useBorrowSDK()

// Connect wallet
await connect('unisat') // or 'xverse'
```

### Borrowing
```typescript
const { setupForLoan, fetchQuotes, borrow } = useBorrowSDK()

// 1. Setup loan wallet
await setupForLoan()

// 2. Get quotes
const quotes = await fetchQuotes(collateralBtc, loanAmount, ltv)

// 3. Execute borrow
await borrow(selectedQuote, destinationAddress)
```

### Loan Management
```typescript
const { repay, withdrawCollateral, withdrawToEVM } = useBorrowSDK()

// Repay loan
await repay(loanId, amount, { withdrawAddress: btcAddress })

// Withdraw collateral
await withdrawCollateral(loanId, btcAmount, btcAddress)

// Transfer USDC (gasless)
await withdrawToEVM(chain, amount, evmAddress)
```

### Workflow Tracking
```typescript
const { startNewLoan } = useBorrowSDK()

await startNewLoan({
  onStatusUpdate: (status) => console.log(status),
  onDepositReady: (deposit) => console.log('Send BTC to:', deposit.address),
  onComplete: (loan) => console.log('Loan active:', loan),
  onError: (error) => console.error(error)
})
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- sats-connect (Xverse)
