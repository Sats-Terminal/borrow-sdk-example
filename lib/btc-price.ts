export const STUB_BTC_PRICE_USD = 65_000;

export interface BtcPriceResult {
  data: number | undefined;
  isLoading: boolean;
}

export function useBtcPrice(): BtcPriceResult {
  return { data: STUB_BTC_PRICE_USD, isLoading: false };
}
