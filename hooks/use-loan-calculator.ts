'use client';

import { useEffect } from 'react';
import { useBorrowContext } from '@/components/borrow-context';
import { useBtcPrice } from '@/lib/btc-price';

export interface LoanCalculatorResult {
  collateralUsdRequired: number;
  collateralBtcRequired: number;
  btcPriceUsd: number | undefined;
  isLoadingPrice: boolean;
}

/**
 * Reads composer state from context, computes derived collateral amounts using
 * the current BTC price, and writes the BTC amount back into the reducer so
 * downstream consumers (AvailableOffers, the QuoteRequest builder) see it.
 *
 * Single-direction calculation: borrowUSDAmount + ltv → collateralBtc.
 * The bidirectional flow from the production web app is intentionally omitted.
 */
export function useLoanCalculator(): LoanCalculatorResult {
  const { state, dispatch } = useBorrowContext();
  const { data: btcPriceUsd, isLoading: isLoadingPrice } = useBtcPrice();

  const composer = 'composer' in state ? state.composer : null;
  const borrowUSDAmount = composer?.borrowUSDAmount ?? 0;
  const ltv = composer?.ltv ?? 0;

  const collateralUsdRequired =
    ltv > 0 && borrowUSDAmount > 0 ? borrowUSDAmount / (ltv / 100) : 0;
  const collateralBtcRequired =
    btcPriceUsd && btcPriceUsd > 0 ? collateralUsdRequired / btcPriceUsd : 0;

  useEffect(() => {
    if (!composer) return;
    const rounded = Math.round(collateralBtcRequired * 1e8) / 1e8;
    if (rounded !== composer.collateralBTCAmount) {
      dispatch({ type: 'composer/set_collateral_btc', value: rounded });
    }
  }, [composer, collateralBtcRequired, dispatch]);

  return {
    collateralUsdRequired,
    collateralBtcRequired,
    btcPriceUsd,
    isLoadingPrice,
  };
}
