import type { Quote } from '@satsterminal-sdk/borrow';

/**
 * Quote calculation helpers ported from
 * borrow-turborepo/apps/web/lib/utils/quote-calculations.ts. Limited to the
 * subset the registry card actually renders — fee preview, APR, monthly
 * interest are excluded.
 */

function toNumber(v: string | number | undefined | null): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getEffectiveApyPercent(quote: Quote): number {
  return toNumber(quote.effectiveApy?.variable ?? quote.borrowApy.variable);
}

export function getMaxLtvPercent(quote: Quote): number {
  return toNumber(quote.maxLtv);
}

export function getLiquidationLtvPercent(quote: Quote): number {
  return toNumber(quote.lltv);
}

export function getLoanAmountUsd(quote: Quote): number {
  return toNumber(quote.loanAmount);
}

export function getCollateralBtc(quote: Quote): number {
  return toNumber(quote.collateralAmount);
}

/**
 * Liquidation price (USD) = loanAmountUsd / (collateralBtc * lltvFraction).
 * Falls back to maxLtv when lltv is absent. Returns 0 if any required input is missing.
 */
export function getLiquidationPriceUsd(quote: Quote): number {
  const collateralBtc = getCollateralBtc(quote);
  const loanAmountUsd = getLoanAmountUsd(quote);
  const liquidationLtvPercent =
    getLiquidationLtvPercent(quote) || getMaxLtvPercent(quote);

  if (collateralBtc <= 0 || loanAmountUsd <= 0 || liquidationLtvPercent <= 0) {
    return 0;
  }
  const liquidationLtvFraction =
    liquidationLtvPercent > 1 ? liquidationLtvPercent / 100 : liquidationLtvPercent;
  if (liquidationLtvFraction <= 0) return 0;

  return loanAmountUsd / (collateralBtc * liquidationLtvFraction);
}

/** Loan chain shown on the card — prefers loanChain, falls back to chain. */
export function getQuoteDisplayChain(quote: Quote): string {
  const chain = String(quote.loanChain ?? quote.chain ?? '');
  return formatChainLabel(chain);
}

function formatChainLabel(chain: string): string {
  if (!chain) return '';
  return chain
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : capitalize(part)))
    .join(' ');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
