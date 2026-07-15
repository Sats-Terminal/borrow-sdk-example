'use client';

import { ArrowRight, Undo2 } from 'lucide-react';
import type { Quote } from '@satsterminal-sdk/borrow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUsd } from '@/lib/formatters';
import {
  getEffectiveApyPercent,
  getLiquidationPriceUsd,
  getMaxLtvPercent,
  getQuoteDisplayChain,
} from '@/lib/quote-math';
import { cn } from '@/lib/utils';

export interface LoanOfferCardProps {
  quote: Quote;
  isBest?: boolean;
  selected?: boolean;
  onSelect: (quote: Quote) => void;
  onDeselect?: () => void;
  className?: string;
}

export function LoanOfferCard({
  quote,
  isBest,
  selected,
  onSelect,
  onDeselect,
  className,
}: LoanOfferCardProps) {
  const apy = getEffectiveApyPercent(quote);
  const maxLtv = getMaxLtvPercent(quote);
  const liquidationPrice = getLiquidationPriceUsd(quote);

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4',
        selected && 'border-foreground',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ProtocolLogo protocol={quote.protocol} />
          {isBest && (
            <Badge variant="outline">
              Best Offer
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={selected ? 'Deselect offer' : 'Select offer'}
          className="size-8"
          onClick={() => (selected ? onDeselect?.() : onSelect(quote))}
        >
          {selected ? <Undo2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Metric label="Net APY" value={`${apy.toFixed(2)}%`} />
        <Metric label="Max LTV" value={maxLtv > 0 ? `${maxLtv}%` : '—'} />
        <Metric
          label="Liquidation Price"
          value={liquidationPrice > 0 ? formatUsd(liquidationPrice) : '—'}
        />
        <Metric label="Collateral" value={quote.collateralAssetSymbol ?? 'BTC'} />
        <Metric label="Loan" value={quote.loanAssetSymbol ?? '—'} />
        <Metric label="Chain" value={getQuoteDisplayChain(quote) || '—'} />
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] uppercase text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-sm font-medium">{value}</span>
    </div>
  );
}

function ProtocolLogo({ protocol }: { protocol: string }) {
  const label = protocol.replaceAll('_', ' ').toUpperCase();
  return (
    <div className="flex min-w-0 items-center">
      <span className="truncate text-sm font-medium">{label}</span>
    </div>
  );
}
