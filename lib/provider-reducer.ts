import type { BorrowEvent, BorrowState } from './borrow-events';
import { initialComposerState, type ComposerState } from './composer-events';

export const initialBorrowState: BorrowState = { phase: 'idle' };

/**
 * Pure reducer driving the BorrowProvider state machine.
 * Covers idle → session_setup → quote_input → quotes_loading → quotes_ready
 * → executing → executed (or failed_to_execute).
 * Workflow tracking happens in a separate reducer owned per-loan by <BorrowFlow>.
 */
export function providerReducer(state: BorrowState, event: BorrowEvent): BorrowState {
  switch (event.type) {
    case 'reset':
      return initialBorrowState;

    case 'session/start':
      return { phase: 'session_setup' };

    case 'sdk/session_ready':
      return { phase: 'quote_input', composer: initialComposerState };

    // ---- composer events ----
    case 'composer/set_loan_amount':
      return updateComposer(state, (c) => ({ ...c, borrowUSDAmount: event.value }));
    case 'composer/set_ltv':
      return updateComposer(state, (c) => ({ ...c, ltv: event.value }));
    case 'composer/set_collateral_btc':
      return updateComposer(state, (c) => ({ ...c, collateralBTCAmount: event.value }));
    case 'composer/set_destination_address':
      return setDestinationAddress(state, event.value);
    case 'composer/reset':
      return updateComposer(state, () => initialComposerState);

    // ---- quote request lifecycle ----
    case 'quote/request': {
      if (!hasComposer(state)) return state;
      return {
        phase: 'quotes_loading',
        composer: state.composer,
        destinationAddress: readDestination(state),
        request: event.params,
      };
    }

    case 'sdk/quotes_received': {
      if (state.phase !== 'quotes_loading') return state;
      return {
        phase: 'quotes_ready',
        composer: state.composer,
        destinationAddress: readDestination(state),
        quotes: event.quotes,
      };
    }

    case 'sdk/quotes_failed': {
      if (state.phase !== 'quotes_loading') return state;
      return {
        phase: 'quotes_ready',
        composer: state.composer,
        destinationAddress: readDestination(state),
        quotes: [],
      };
    }

    // ---- selection + execution ----
    case 'quote/select':
      if (state.phase !== 'quotes_ready') return state;
      return { ...state, selected: event.quote };

    case 'execute':
      if (state.phase !== 'quotes_ready' || !state.selected) return state;
      return {
        phase: 'executing',
        quote: state.selected,
        destinationAddress: readDestination(state),
      };

    case 'sdk/execute_started':
      if (state.phase !== 'executing') return state;
      return {
        phase: 'executed',
        quote: state.quote,
        workflowId: event.workflowId,
      };

    case 'sdk/execute_failed':
      return {
        phase: 'failed_to_execute',
        error: event.error,
        canRetry: true,
        composer: initialComposerState,
      };

    case 'retry':
      if (state.phase !== 'failed_to_execute') return state;
      return { phase: 'quote_input', composer: state.composer };

    default:
      return state;
  }
}

function hasComposer(
  state: BorrowState,
): state is Extract<BorrowState, { composer: ComposerState }> {
  return 'composer' in state;
}

function updateComposer(
  state: BorrowState,
  fn: (c: ComposerState) => ComposerState,
): BorrowState {
  if (!hasComposer(state)) return state;
  return { ...state, composer: fn(state.composer) };
}

function setDestinationAddress(state: BorrowState, value: string | null): BorrowState {
  switch (state.phase) {
    case 'quote_input':
    case 'quotes_loading':
    case 'quotes_ready':
    case 'executing':
      return { ...state, destinationAddress: value ?? undefined };
    default:
      return state;
  }
}

function readDestination(state: BorrowState): string | undefined {
  if ('destinationAddress' in state) return state.destinationAddress;
  return undefined;
}
