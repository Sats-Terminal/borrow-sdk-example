export type Satoshis = number;
export type BTC = string;

export const Units = {
  satsToBtc: (sats: number): BTC => (sats / 100000000).toFixed(8) as BTC,

  btcToSats: (btc: string): Satoshis =>
    Math.floor(parseFloat(btc) * 100000000) as Satoshis,

  formatBtc: (btc: BTC | string, decimals: number = 8): string => {
    const value = parseFloat(btc);
    return Number.isNaN(value) ? "0" : value.toFixed(decimals);
  },

  formatSats: (sats: Satoshis | number): string =>
    Math.floor(sats).toLocaleString("en-US"),

  asBtc: (value: string): BTC => parseFloat(value).toFixed(8) as BTC,

  asSatoshis: (value: number): Satoshis => Math.floor(value) as Satoshis,

  isLikelySatoshis: (value: number): boolean => value > 1,

  normalizeToBtc: (value: string | number): BTC => {
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    if (Number.isNaN(numericValue)) return "0.00000000" as BTC;

    return numericValue > 1
      ? Units.satsToBtc(numericValue)
      : (numericValue.toFixed(8) as BTC);
  },

  normalizeToSats: (value: string | number): Satoshis => {
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    if (Number.isNaN(numericValue)) return 0;

    return numericValue <= 1
      ? Units.btcToSats(numericValue.toString())
      : Math.floor(numericValue);
  },
};
