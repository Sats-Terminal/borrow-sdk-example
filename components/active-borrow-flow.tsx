'use client';

import { useBorrowContext } from '@/components/borrow-context';
import { BorrowFlow } from './borrow-flow';

export interface ActiveBorrowFlowProps {
  className?: string;
  /** Seconds before the deposit window expires. Default 24h. */
  depositWindowSeconds?: number;
}

/**
 * Zero-config wrapper around <BorrowFlow loanId>. Reads the workflowId from
 * provider context after a successful execute and renders the workflow tracker.
 * Renders null in any other phase.
 *
 * Use this when you've wired up <LoanComposer> + <AvailableOffers> in the same
 * provider and want the workflow to appear automatically after the user clicks
 * an offer. For dashboards or resume flows where you already have a loanId,
 * render <BorrowFlow loanId={...} /> directly.
 */
export function ActiveBorrowFlow({
  className,
  depositWindowSeconds,
}: ActiveBorrowFlowProps) {
  const { state, dispatch } = useBorrowContext();
  if (state.phase !== 'executed') return null;
  return (
    <BorrowFlow
      loanId={state.workflowId}
      className={className}
      depositWindowSeconds={depositWindowSeconds}
      onReset={() => dispatch({ type: 'reset' })}
    />
  );
}
