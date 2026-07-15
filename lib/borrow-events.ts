import type { Quote, WorkflowStatus, QuoteRequest } from '@satsterminal-sdk/borrow';
import type { ComposerState } from './composer-events';

/**
 * Mirrored from @satsterminal/types BorrowWorkflowStage.
 * Kept as a const object so the registry has zero hard dependency on the
 * internal types package while remaining exhaustively type-checked.
 */
export const BorrowStage = {
  INITIALIZING: 'INITIALIZING',
  QUOTE_READY: 'QUOTE_READY',
  DEPOSIT_ADDRESS_READY: 'DEPOSIT_ADDRESS_READY',
  PREPARING_DEPOSIT: 'PREPARING_DEPOSIT',
  AWAITING_DEPOSIT: 'AWAITING_DEPOSIT',
  AUTO_TRANSFERRING_BTC: 'AUTO_TRANSFERRING_BTC',
  AWAITING_DEPOSIT_CONFIRMATION: 'AWAITING_DEPOSIT_CONFIRMATION',
  DEPOSIT_CONFIRMED: 'DEPOSIT_CONFIRMED',
  AWAITING_REDEEM: 'AWAITING_REDEEM',
  REDEEM_CONFIRMED: 'REDEEM_CONFIRMED',
  PREPARING_BORROW: 'PREPARING_BORROW',
  PREPARING_BORROW_DEPOSIT: 'PREPARING_BORROW_DEPOSIT',
  COLLATERAL_DEPOSITED: 'COLLATERAL_DEPOSITED',
  PREPARING_LOAN: 'PREPARING_LOAN',
  LOAN_CONFIRMED: 'LOAN_CONFIRMED',
  PREPARING_DISBURSEMENT: 'PREPARING_DISBURSEMENT',
  DISBURSEMENT_SUBMITTED: 'DISBURSEMENT_SUBMITTED',
  DISBURSEMENT_COMPLETED: 'DISBURSEMENT_COMPLETED',
  DISBURSEMENT_FAILED: 'DISBURSEMENT_FAILED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUND_INITIATED: 'REFUND_INITIATED',
  REFUND_COMPLETED: 'REFUND_COMPLETED',
} as const;

export type BorrowStageValue = (typeof BorrowStage)[keyof typeof BorrowStage];

/**
 * UI groups mirror the production web app's `transactionStageGroups`.
 * Each group corresponds to one step in the user-visible 5-step progress timeline.
 */
export type WorkflowUiGroup =
  | 'creating_order'
  | 'waiting_collateral'
  | 'deposit_pool'
  | 'disburse_loan'
  | 'loan_active';

export interface UiGroupMeta {
  id: WorkflowUiGroup;
  order: number;
  label: string;
}

export const UI_GROUP_ORDER: readonly UiGroupMeta[] = [
  { id: 'creating_order', order: 1, label: 'Creating Order' },
  { id: 'waiting_collateral', order: 2, label: 'Waiting For Collateral Deposit' },
  { id: 'deposit_pool', order: 3, label: 'Deposit Collateral Into Pool' },
  { id: 'disburse_loan', order: 4, label: 'Disburse Loan' },
  { id: 'loan_active', order: 5, label: 'Funds Available' },
] as const;

export type WaitingCollateralMode = 'manual' | 'auto' | 'confirming' | 'confirmed';

export type WorkflowUiState =
  | { group: 'creating_order'; raw: WorkflowStatus }
  | {
      group: 'waiting_collateral';
      mode: WaitingCollateralMode;
      address?: string;
      amountSats?: number;
      amountBtc?: number;
      depositTxHash?: string;
      raw: WorkflowStatus;
    }
  | { group: 'deposit_pool'; raw: WorkflowStatus }
  | { group: 'disburse_loan'; raw: WorkflowStatus }
  | { group: 'loan_active'; raw: WorkflowStatus };

/**
 * Provider state — owned by <BorrowProvider>. Covers the journey from idle
 * through execution start. Workflow-tracking phases live in WorkflowState
 * (see ./tracker-events.ts) owned per-loan by <BorrowFlow loanId>.
 */
export type BorrowState =
  | { phase: 'idle' }
  | { phase: 'session_setup' }
  | { phase: 'quote_input'; composer: ComposerState; destinationAddress?: string }
  | {
      phase: 'quotes_loading';
      composer: ComposerState;
      destinationAddress?: string;
      request: QuoteRequest;
    }
  | {
      phase: 'quotes_ready';
      composer: ComposerState;
      destinationAddress?: string;
      quotes: Quote[];
      selected?: Quote;
    }
  | { phase: 'executing'; quote: Quote; destinationAddress?: string }
  | { phase: 'executed'; quote: Quote; workflowId: string }
  | { phase: 'failed_to_execute'; error: string; canRetry: true; composer: ComposerState };

export type BorrowEvent =
  // user-driven
  | { type: 'session/start' }
  | { type: 'composer/set_loan_amount'; value: number }
  | { type: 'composer/set_ltv'; value: number }
  | { type: 'composer/set_collateral_btc'; value: number }
  | { type: 'composer/set_destination_address'; value: string | null }
  | { type: 'composer/reset' }
  | { type: 'quote/request'; params: QuoteRequest }
  | { type: 'quote/select'; quote: Quote }
  | { type: 'execute' }
  | { type: 'retry' }
  | { type: 'reset' }
  // sdk-driven
  | { type: 'sdk/session_ready' }
  | { type: 'sdk/quotes_received'; quotes: Quote[] }
  | { type: 'sdk/quotes_failed'; error: string }
  | { type: 'sdk/execute_started'; workflowId: string }
  | { type: 'sdk/execute_failed'; error: string };

// ---- Stage clustering (mirrors apps/web/lib/constants/transaction-stage-groups.ts) ----

const CREATING_ORDER_STAGES = new Set<string>([
  BorrowStage.INITIALIZING,
  BorrowStage.QUOTE_READY,
  BorrowStage.DEPOSIT_ADDRESS_READY,
]);

const WAITING_COLLATERAL_STAGES = new Set<string>([
  BorrowStage.AUTO_TRANSFERRING_BTC,
  BorrowStage.AWAITING_DEPOSIT,
  BorrowStage.PREPARING_DEPOSIT,
  BorrowStage.AWAITING_DEPOSIT_CONFIRMATION,
  BorrowStage.DEPOSIT_CONFIRMED,
]);

const DEPOSIT_POOL_STAGES = new Set<string>([
  BorrowStage.PREPARING_BORROW,
  BorrowStage.PREPARING_BORROW_DEPOSIT,
  BorrowStage.COLLATERAL_DEPOSITED,
]);

const DISBURSE_LOAN_STAGES = new Set<string>([
  BorrowStage.AWAITING_REDEEM,
  BorrowStage.REDEEM_CONFIRMED,
  BorrowStage.PREPARING_LOAN,
  BorrowStage.PREPARING_DISBURSEMENT,
  BorrowStage.DISBURSEMENT_SUBMITTED,
]);

const LOAN_ACTIVE_STAGES = new Set<string>([BorrowStage.LOAN_CONFIRMED]);

const TERMINAL_SUCCESS_STAGES = new Set<string>([
  BorrowStage.COMPLETED,
  BorrowStage.DISBURSEMENT_COMPLETED,
]);

const TERMINAL_FAILURE_STAGES = new Set<string>([
  BorrowStage.FAILED,
  BorrowStage.CANCELLED,
  BorrowStage.DISBURSEMENT_FAILED,
  BorrowStage.REFUND_INITIATED,
  BorrowStage.REFUND_COMPLETED,
]);

export function isTerminalSuccess(stage: string): boolean {
  return TERMINAL_SUCCESS_STAGES.has(stage);
}

export function isTerminalFailure(stage: string): boolean {
  return TERMINAL_FAILURE_STAGES.has(stage);
}

export function failureKindFromStage(
  stage: string,
): 'cancelled' | 'refunded' | 'error' {
  if (stage === BorrowStage.CANCELLED) return 'cancelled';
  if (
    stage === BorrowStage.REFUND_INITIATED ||
    stage === BorrowStage.REFUND_COMPLETED
  ) {
    return 'refunded';
  }
  return 'error';
}

export function mapStatusToUiGroup(status: WorkflowStatus): WorkflowUiGroup | null {
  if (CREATING_ORDER_STAGES.has(status.stage)) return 'creating_order';
  if (WAITING_COLLATERAL_STAGES.has(status.stage)) return 'waiting_collateral';
  if (DEPOSIT_POOL_STAGES.has(status.stage)) return 'deposit_pool';
  if (DISBURSE_LOAN_STAGES.has(status.stage)) return 'disburse_loan';
  if (LOAN_ACTIVE_STAGES.has(status.stage)) return 'loan_active';
  return null;
}

function waitingCollateralMode(stage: string): WaitingCollateralMode {
  switch (stage) {
    case BorrowStage.AUTO_TRANSFERRING_BTC:
      return 'auto';
    case BorrowStage.PREPARING_DEPOSIT:
    case BorrowStage.AWAITING_DEPOSIT_CONFIRMATION:
      return 'confirming';
    case BorrowStage.DEPOSIT_CONFIRMED:
      return 'confirmed';
    case BorrowStage.AWAITING_DEPOSIT:
    default:
      return 'manual';
  }
}

export function buildUiState(status: WorkflowStatus): WorkflowUiState | null {
  const group = mapStatusToUiGroup(status);
  if (!group) return null;
  if (group === 'waiting_collateral') {
    const amountSats = status.depositAmount;
    return {
      group,
      mode: waitingCollateralMode(status.stage),
      address: status.depositAddress,
      amountSats,
      amountBtc: amountSats != null ? amountSats / 1e8 : undefined,
      depositTxHash: getBitcoinDepositTxHash(status),
      raw: status,
    };
  }
  return { group, raw: status };
}

/** Extract the BTC deposit txid from current and legacy workflow response shapes. */
export function getBitcoinDepositTxHash(status: WorkflowStatus): string | undefined {
  const raw = asRecord(status.rawData);
  const data = asRecord(raw.data);
  const transactionState = asRecord(data.transactionState ?? raw.transactionState ?? data);
  const workflowState = asRecord(transactionState.workflowState ?? raw.workflowState);
  const bridgeResult = asRecord(transactionState.bridgeResult ?? workflowState.bridgeResult ?? raw.bridgeResult);
  const candidates = [
    bridgeResult.depositTxHash,
    transactionState.depositTxHash,
    transactionState.btcDepositTxHash,
    workflowState.depositTxHash,
    workflowState.btcDepositTxHash,
  ];
  return candidates.find((value): value is string =>
    typeof value === 'string' && /^[a-fA-F0-9]{64}$/.test(value),
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

/**
 * Backend deposit detection window in seconds. This mirrors the Temporal
 * getDepositTxHash activity scheduleToCloseTimeout used by the borrow flows.
 */
export const DEPOSIT_DETECTION_TIMEOUT_SECONDS = 24 * 60 * 60;

/**
 * Backward-compatible alias for older copied components. Prefer
 * DEPOSIT_DETECTION_TIMEOUT_SECONDS in new code.
 */
export const QUOTE_LOCK_DURATION_SECONDS = DEPOSIT_DETECTION_TIMEOUT_SECONDS;

/** Re-export so downstream code can import everything from one place. */
export type { Quote, WorkflowStatus, DepositInfo, QuoteRequest } from '@satsterminal-sdk/borrow';
export type { ComposerState } from './composer-events';
