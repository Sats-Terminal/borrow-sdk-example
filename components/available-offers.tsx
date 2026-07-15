'use client';

import { useBorrowContext } from '@/components/borrow-context';
import { EmptyOffers } from './empty-offers';
import { LoanOfferCard } from './loan-offer-card';
import { LoanOfferCardSkeleton } from './loan-offer-card-skeleton';
import { cn } from '@/lib/utils';

export interface AvailableOffersProps {
  className?: string;
  /** Optional payout override passed to sdk.executeBorrow(). */
  destinationAddress?: string;
  /** Skeleton count while loading. Default 3. */
  loadingPlaceholderCount?: number;
}

/**
 * Reads quotes from BorrowProvider context. Renders loading / empty / list
 * states. On card click: selects the quote and immediately calls
 * `actions.execute()` — single tap, no confirm screen.
 */
export function AvailableOffers({
  className,
  destinationAddress,
  loadingPlaceholderCount = 3,
}: AvailableOffersProps) {
  const { state, actions } = useBorrowContext();

  if (state.phase !== 'quotes_loading' && state.phase !== 'quotes_ready') {
    return null;
  }

  const offerCount = state.phase === 'quotes_ready' ? state.quotes.length : 0;

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Available offers</h2>
          {state.phase === 'quotes_ready' && offerCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {offerCount} {offerCount === 1 ? 'offer' : 'offers'} found
            </p>
          )}
        </div>
      </div>

      {state.phase === 'quotes_loading' &&
        Array.from({ length: loadingPlaceholderCount }, (_, i) => (
          <LoanOfferCardSkeleton key={i} />
        ))}

      {state.phase === 'quotes_ready' && state.quotes.length === 0 && <EmptyOffers />}

      {state.phase === 'quotes_ready' &&
        state.quotes.map((quote, index) => (
          <LoanOfferCard
            key={`${quote.protocol}-${quote.chain}-${index}`}
            quote={quote}
            isBest={index === 0}
            selected={state.selected === quote}
            onSelect={(q) => void actions.execute(q, { destinationAddress })}
          />
        ))}
    </section>
  );
}
