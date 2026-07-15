import {
  buildUiState,
  failureKindFromStage,
  isTerminalFailure,
  isTerminalSuccess,
} from './borrow-events';
import type { WorkflowEvent, WorkflowState } from './tracker-events';

export function initialWorkflowState(
  workflowId: string,
  startedAt: number,
): WorkflowState {
  return { phase: 'connecting', workflowId, startedAt };
}

/**
 * Per-loan reducer driving <BorrowFlow loanId>. Each tracker instance owns
 * its own state — the BorrowFlow component creates one via `useReducer`
 * and feeds it SDK callbacks scoped to a single workflowId.
 */
export function workflowTrackerReducer(
  state: WorkflowState,
  event: WorkflowEvent,
): WorkflowState {
  switch (event.type) {
    case 'status_update': {
      if (state.phase === 'completed' || state.phase === 'failed') return state;

      if (isTerminalSuccess(event.status.stage)) {
        return {
          phase: 'completed',
          workflowId: state.workflowId,
          result: event.status.rawData,
        };
      }
      if (isTerminalFailure(event.status.stage)) {
        return {
          phase: 'failed',
          workflowId: state.workflowId,
          error: event.status.error ?? event.status.label ?? 'Workflow failed',
          kind: failureKindFromStage(event.status.stage),
        };
      }
      const ui = buildUiState(event.status);
      if (!ui) return state;
      if (state.phase === 'tracking' && state.ui.raw.stage === event.status.stage) {
        return state;
      }
      return {
        phase: 'tracking',
        workflowId: state.workflowId,
        startedAt: state.startedAt,
        ui,
      };
    }

    case 'deposit_ready': {
      if (state.phase !== 'tracking' && state.phase !== 'connecting') return state;
      const raw =
        state.phase === 'tracking'
          ? state.ui.raw
          : {
              stage: 'AWAITING_DEPOSIT',
              step: 2,
              label: 'Awaiting Deposit',
              description: '',
              isComplete: false,
              isFailed: false,
              rawData: null,
            };
      return {
        phase: 'tracking',
        workflowId: state.workflowId,
        startedAt: state.startedAt,
        ui: {
          group: 'waiting_collateral',
          mode: 'manual',
          address: event.info.address,
          amountSats: event.info.amount,
          amountBtc: event.info.amountBTC,
          raw,
        },
      };
    }

    case 'complete':
      return {
        phase: 'completed',
        workflowId: state.workflowId,
        result: event.result,
      };

    case 'error':
      return {
        phase: 'failed',
        workflowId: state.workflowId,
        error: event.error,
        kind: 'error',
      };

    default:
      return state;
  }
}
