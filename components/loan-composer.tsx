'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBorrowContext } from '@/components/borrow-context';
import {
  COMPOSER_LTV_MAX,
} from '@/lib/composer-events';
import {
  formatBtc,
  formatUsd,
} from '@/lib/formatters';
import { loanComposerSchema } from '../lib/loan-composer-schema';
import { useLoanCalculator } from '../hooks/use-loan-calculator';
import { CurrencyInput } from './currency-input';
import { LtvSlider } from './ltv-slider';
import { cn } from '@/lib/utils';

export interface LoanComposerProps {
  className?: string;
  /** Hide the composer when the workflow has already started. Default true. */
  hideAfterExecution?: boolean;
}

/**
 * Top-level composer. Reads composer state from BorrowProvider,
 * dispatches edits, and triggers `actions.requestQuotes()` on submit.
 */
export function LoanComposer({
  className,
  hideAfterExecution = true,
}: LoanComposerProps) {
  const { state, dispatch, actions } = useBorrowContext();
  const { collateralUsdRequired, collateralBtcRequired, btcPriceUsd } =
    useLoanCalculator();
  const [error, setError] = useState<string | null>(null);

  if (hideAfterExecution && !('composer' in state)) return null;

  const composer = 'composer' in state ? state.composer : null;
  if (!composer) return null;

  const isLoading = state.phase === 'quotes_loading' || state.phase === 'executing';

  const onSubmit = () => {
    setError(null);
    const parsed = loanComposerSchema.safeParse({
      borrowUSDAmount: composer.borrowUSDAmount,
      collateralBTCAmount: collateralBtcRequired,
      ltv: composer.ltv,
      maxLtv: COMPOSER_LTV_MAX,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid loan inputs');
      return;
    }
    void actions.requestQuotes();
  };

  return (
    <section className={cn('flex flex-col gap-5 rounded-lg border p-5 sm:p-6', className)}>
      <h2 className="text-lg font-medium">Get a loan</h2>

      <CurrencyInput
        label="Borrow amount"
        value={composer.borrowUSDAmount}
        onValueChange={(value) =>
          dispatch({ type: 'composer/set_loan_amount', value })
        }
        disabled={isLoading}
      />

      <div className="flex flex-col gap-4 border-b pb-5">
        <LtvSlider
          value={composer.ltv}
          onValueChange={(value) => dispatch({ type: 'composer/set_ltv', value })}
          disabled={isLoading}
        />

        <CollateralRow
          usd={collateralUsdRequired}
          btc={collateralBtcRequired}
          priceAvailable={btcPriceUsd != null}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        variant="outline"
        onClick={onSubmit}
        disabled={isLoading || composer.borrowUSDAmount <= 0}
        className="self-start"
      >
        {isLoading ? 'Finding offers...' : 'Get loan'}
      </Button>
    </section>
  );
}

function CollateralRow({
  usd,
  btc,
  priceAvailable,
}: {
  usd: number;
  btc: number;
  priceAvailable: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">Required collateral</span>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-xl font-medium">{formatUsd(usd)}</span>
        {priceAvailable && (
          <span className="text-sm text-muted-foreground">
            {formatBtc(btc)} BTC
          </span>
        )}
      </div>
    </div>
  );
}
