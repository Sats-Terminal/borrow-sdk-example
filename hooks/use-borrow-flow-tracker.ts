'use client';

import { useEffect, useReducer, useState } from 'react';
import type { WorkflowCallbacks } from '@satsterminal-sdk/borrow';
import {
  initialWorkflowState,
  workflowTrackerReducer,
} from '@/lib/tracker-reducer';
import type { WorkflowState } from '@/lib/tracker-events';
import { useBorrowContext } from '@/components/borrow-context';

export interface UseBorrowFlowTrackerArgs {
  loanId: string;
  /** ms since epoch — anchor for the quote-lock countdown. Defaults to now. */
  startedAt?: number;
}

export interface UseBorrowFlowTrackerResult {
  state: WorkflowState;
}

/**
 * Subscribes to one workflow's status updates via sdk.trackWorkflow and
 * maintains a local state machine for it. Each <BorrowFlow loanId> mounts its
 * own tracker — multiple loans can run concurrently.
 */
export function useBorrowFlowTracker({
  loanId,
  startedAt,
}: UseBorrowFlowTrackerArgs): UseBorrowFlowTrackerResult {
  const { sdk } = useBorrowContext();
  const [anchor] = useState(() => startedAt ?? Date.now());

  const [state, dispatch] = useReducer(
    workflowTrackerReducer,
    null,
    () => initialWorkflowState(loanId, anchor),
  );

  useEffect(() => {
    let active = true;
    const callbacks: WorkflowCallbacks = {
      onStatusUpdate: (status) => {
        if (active) dispatch({ type: 'status_update', status });
      },
      onDepositReady: (info) => {
        if (active) dispatch({ type: 'deposit_ready', info });
      },
      onComplete: (result) => {
        if (active) dispatch({ type: 'complete', result });
      },
      onError: (error) => {
        if (active) dispatch({ type: 'error', error });
      },
    };
    void sdk.trackWorkflow(loanId, callbacks, 'borrow').catch((err) => {
      if (active) {
        dispatch({
          type: 'error',
          error: err instanceof Error ? err.message : 'Failed to track workflow',
        });
      }
    });
    return () => {
      active = false;
    };
  }, [sdk, loanId]);

  return { state };
}
