'use client';

import { useCallback, useMemo, type Dispatch, type MutableRefObject } from 'react';
import type { BorrowSDK, Quote, QuoteRequest } from '@satsterminal-sdk/borrow';
import type {
  BorrowEvent,
  BorrowState,
} from '@/lib/borrow-events';

export interface BorrowActions {
  restoreSession: () => Promise<boolean>;
  startSession: () => Promise<void>;
  requestQuotes: (filterOverride?: QuoteRequest['filter']) => Promise<void>;
  selectQuote: (quote: Quote) => void;
  execute: (quoteOverride?: Quote, options?: BorrowExecuteOptions) => Promise<void>;
  setDestinationAddress: (addr: string | null) => void;
  retry: () => void;
  reset: () => void;
}

export interface BorrowExecuteOptions {
  destinationAddress?: string;
}

interface UseBorrowActionsArgs {
  sdk: BorrowSDK;
  dispatch: Dispatch<BorrowEvent>;
  stateRef: MutableRefObject<BorrowState>;
}

export function useBorrowActions({
  sdk,
  dispatch,
  stateRef,
}: UseBorrowActionsArgs): BorrowActions {
  const restoreSession = useCallback(async () => {
    dispatch({ type: 'session/start' });
    try {
      const restored = await sdk.restoreSession();
      return Boolean(restored);
    } catch {
      // Restoration is a silent bootstrap optimization. Read-only SDK methods
      // remain available even when storage is stale or the restore request fails.
      return false;
    } finally {
      dispatch({ type: 'sdk/session_ready' });
    }
  }, [sdk, dispatch]);

  const startSession = useCallback(async () => {
    dispatch({ type: 'session/start' });
    try {
      await sdk.setup();
      dispatch({ type: 'sdk/session_ready' });
    } catch (err) {
      dispatch({ type: 'sdk/execute_failed', error: errMessage(err) });
    }
  }, [sdk, dispatch]);

  const requestQuotes = useCallback(
    async (filterOverride?: QuoteRequest['filter']) => {
      const current = stateRef.current;
      if (!('composer' in current)) return;
      const params: QuoteRequest = {
        collateralAmount: String(current.composer.collateralBTCAmount),
        loanAmount: String(current.composer.borrowUSDAmount),
        ...(filterOverride ? { filter: filterOverride } : {}),
      };
      dispatch({ type: 'quote/request', params });
      try {
        const quotes = await sdk.getQuotes(params);
        dispatch({ type: 'sdk/quotes_received', quotes });
      } catch (err) {
        dispatch({ type: 'sdk/quotes_failed', error: errMessage(err) });
      }
    },
    [sdk, dispatch, stateRef],
  );

  const selectQuote = useCallback(
    (quote: Quote) => dispatch({ type: 'quote/select', quote }),
    [dispatch],
  );

  const execute = useCallback(async (
    quoteOverride?: Quote,
    options: BorrowExecuteOptions = {},
  ) => {
    const current = stateRef.current;
    if (current.phase !== 'quotes_ready') return;
    const quote = quoteOverride ?? current.selected;
    if (!quote) return;
    const destinationAddress = options.destinationAddress ?? current.destinationAddress;
    if (quoteOverride) {
      dispatch({ type: 'quote/select', quote });
    }
    dispatch({ type: 'execute' });
    try {
      const workflowId = await sdk.executeBorrow(
        quote,
        destinationAddress ? { destinationAddress } : undefined,
      );
      dispatch({ type: 'sdk/execute_started', workflowId });
    } catch (err) {
      dispatch({ type: 'sdk/execute_failed', error: errMessage(err) });
    }
  }, [sdk, dispatch, stateRef]);

  const setDestinationAddress = useCallback(
    (addr: string | null) => dispatch({ type: 'composer/set_destination_address', value: addr }),
    [dispatch],
  );

  const retry = useCallback(() => dispatch({ type: 'retry' }), [dispatch]);
  const reset = useCallback(() => dispatch({ type: 'reset' }), [dispatch]);

  return useMemo(
    () => ({ restoreSession, startSession, requestQuotes, selectQuote, execute, setDestinationAddress, retry, reset }),
    [restoreSession, startSession, requestQuotes, selectQuote, execute, setDestinationAddress, retry, reset],
  );
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}
