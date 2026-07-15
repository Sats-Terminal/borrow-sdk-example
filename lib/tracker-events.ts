import type { WorkflowStatus, DepositInfo } from '@satsterminal-sdk/borrow';
import type { WorkflowUiState } from './borrow-events';

/**
 * Local state for one running borrow workflow, owned by <BorrowFlow loanId>.
 * Each instance maintains its own state — multiple BorrowFlow components
 * can run concurrently (e.g. dashboard with several pending loans).
 */
export type WorkflowState =
  | { phase: 'connecting'; workflowId: string; startedAt: number }
  | { phase: 'tracking'; workflowId: string; startedAt: number; ui: WorkflowUiState }
  | { phase: 'completed'; workflowId: string; result: unknown }
  | {
      phase: 'failed';
      workflowId: string;
      error: string;
      kind: 'cancelled' | 'refunded' | 'error';
    };

export type WorkflowEvent =
  | { type: 'status_update'; status: WorkflowStatus }
  | { type: 'deposit_ready'; info: DepositInfo }
  | { type: 'complete'; result: unknown }
  | { type: 'error'; error: string };
