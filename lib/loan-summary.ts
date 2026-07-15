import type { UserTransaction } from '@satsterminal-sdk/borrow';

export type LoanHistoryFilter = 'active' | 'pending' | 'all';

export interface LoanSummary {
  id: string;
  originalBorrowId: string;
  workflowId?: string;
  status: string;
  amount: string;
  currency: string;
  protocol?: string;
  chain?: string;
  timestamp: number;
  transaction: UserTransaction;
}

export function normalizeLoan(transaction: UserTransaction): LoanSummary {
  const root = asRecord(transaction);
  const borrow = asRecord(transaction.borrowTransaction);
  const quote = asRecord(root.bestQuote ?? borrow.bestQuote);
  const statuses = Array.isArray(root.transactionStatuses)
    ? root.transactionStatuses
    : Array.isArray(borrow.transactionStatuses)
      ? borrow.transactionStatuses
      : [];
  const latestStatus = asRecord(statuses.at(-1)).status;
  const workflowId = firstString(root.workflowId, root.workflowID, borrow.workflowId, borrow.workflowID);
  const originalBorrowId = firstString(
    root.originalBorrowId,
    borrow.originalBorrowId,
    root.transactionId,
    root._id,
    root.id,
    borrow._id,
    borrow.id,
    borrow.transactionId,
    transaction.id,
  ) ?? transactionIdFromWorkflowId(workflowId) ?? 'unknown-loan';

  return {
    id: firstString(
      root.transactionId,
      root._id,
      root.id,
      transaction.id,
      borrow._id,
      borrow.id,
      borrow.transactionId,
    ) ?? originalBorrowId,
    originalBorrowId,
    workflowId,
    status: firstString(latestStatus, root.status, borrow.status, transaction.status) ?? 'unknown',
    amount: firstString(
      transaction.borrowPrincipalAmount,
      transaction.borrowerPayoutAmount,
      root.borrowAmount,
      root.loanAmount,
      borrow.borrowAmount,
      borrow.loanAmount,
      transaction.amount,
    ) ?? '0',
    currency: firstString(
      transaction.currency,
      root.outputToken,
      root.destinationAsset,
      root.borrowAsset,
      borrow.borrowAsset,
      borrow.loanAssetSymbol,
      quote.loanAssetSymbol,
    ) ?? 'USD',
    protocol: firstString(root.protocol, borrow.protocol, quote.protocol),
    chain: firstString(
      root.loanChain,
      root.chain,
      root.destinationChain,
      borrow.loanChain,
      borrow.chain,
      quote.loanChain,
      quote.chain,
    ),
    timestamp: normalizeTimestamp(root.createdAt ?? borrow.createdAt ?? root.timestamp),
    transaction,
  };
}

export function isPendingLoan(loan: LoanSummary): boolean {
  const status = loan.status.toLowerCase();
  return status === 'pending' || status === 'awaiting_deposit' || status.includes('awaiting_deposit');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function transactionIdFromWorkflowId(workflowId?: string): string | undefined {
  return workflowId?.match(/([a-f\d]{24})$/i)?.[1];
}

function normalizeTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
