'use client';

import { Button } from '@/components/ui/button';
import { DEPOSIT_DETECTION_TIMEOUT_SECONDS } from '@/lib/borrow-events';
import type { WorkflowState } from '@/lib/tracker-events';
import { useBorrowFlowTracker } from '../hooks/use-borrow-flow-tracker';
import { NoActionStatusCard } from './no-action-status-card';
import { StatusTimeline } from './status-timeline';
import { WaitingCollateralPanel } from './waiting-collateral-panel';
import { cn } from '@/lib/utils';

export interface BorrowFlowProps {
  /** Workflow id to track. Use sdk.executeBorrow() to obtain one, or pass an existing pending loan's id. */
  loanId: string;
  /** Deposit-window anchor in ms-since-epoch. Defaults to now. */
  startedAt?: number;
  /** Seconds before the deposit window expires. Default 24h. */
  depositWindowSeconds?: number;
  className?: string;
  /** Optional callback when the integrator wants to clear/dismiss the flow. */
  onReset?: () => void;
}

/**
 * Tracks a single borrow workflow. Owns its own local state via
 * useBorrowFlowTracker — multiple <BorrowFlow loanId> instances can run on
 * the same page concurrently (e.g. dashboards with multiple pending loans).
 *
 * Required: must be a descendant of <BorrowProvider> (uses the SDK from context).
 */
export function BorrowFlow({
  loanId,
  startedAt,
  depositWindowSeconds = DEPOSIT_DETECTION_TIMEOUT_SECONDS,
  className,
  onReset,
}: BorrowFlowProps) {
  const { state } = useBorrowFlowTracker({ loanId, startedAt });

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <StatusTimeline state={state} />
      <PhasePanel
        state={state}
        depositWindowSeconds={depositWindowSeconds}
        onReset={onReset}
      />
    </div>
  );
}

function PhasePanel({
  state,
  onReset,
  depositWindowSeconds,
}: {
  state: WorkflowState;
  depositWindowSeconds: number;
  onReset?: () => void;
}) {
  if (state.phase === 'connecting') {
    return (
      <NoActionStatusCard
        title="Connecting"
        body="Subscribing to workflow updates…"
      />
    );
  }

  if (state.phase === 'completed') {
    return (
      <section className="flex flex-col gap-3 rounded-lg border p-5">
        <h2 className="text-lg font-medium">Funds available</h2>
        <p className="text-sm text-muted-foreground">
          Your loan is live. Funds have been disbursed to your destination wallet.
        </p>
        {onReset && (
          <Button variant="outline" onClick={onReset} className="self-start">
            Start another loan
          </Button>
        )}
      </section>
    );
  }

  if (state.phase === 'failed') {
    return (
      <section className="flex flex-col gap-3 rounded-lg border p-5">
        <h2 className="text-lg font-medium">{failedTitle(state.kind)}</h2>
        <p className="text-sm text-muted-foreground">{state.error}</p>
        {onReset && (
          <Button variant="outline" onClick={onReset} className="self-start">
            Start over
          </Button>
        )}
      </section>
    );
  }

  // tracking
  const { ui, startedAt } = state;
  switch (ui.group) {
    case 'creating_order':
      return (
        <NoActionStatusCard
          title="Creating your order"
          body="Locking the optimal route for your loan."
        />
      );
    case 'waiting_collateral':
      return (
        <WaitingCollateralPanel
          mode={ui.mode}
          address={ui.address}
          amountSats={ui.amountSats}
          amountBtc={ui.amountBtc}
          depositTxHash={ui.depositTxHash}
          startedAt={startedAt}
          depositWindowSeconds={depositWindowSeconds}
        />
      );
    case 'deposit_pool':
      return (
        <NoActionStatusCard
          title="Depositing collateral into pool"
          body="Supplying your Bitcoin as collateral to the lending protocol."
          etaLabel="~5 min"
        />
      );
    case 'disburse_loan':
      return (
        <NoActionStatusCard
          title="Disbursing loan"
          body="Sending borrowed funds to your destination wallet."
          etaLabel="~5 min"
        />
      );
    case 'loan_active':
      return (
        <NoActionStatusCard
          title="Loan confirmed"
          body="Your loan is live. Finalizing the payout."
        />
      );
  }
}

function failedTitle(kind: 'cancelled' | 'refunded' | 'error'): string {
  if (kind === 'cancelled') return 'Transaction cancelled';
  if (kind === 'refunded') return 'Collateral refunded';
  return 'Something went wrong';
}
