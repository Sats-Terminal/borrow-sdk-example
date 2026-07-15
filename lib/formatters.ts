export interface FormatUsdOptions {
  /** Default 2; bumped to 6 for tiny amounts so small numbers don't round to 0. */
  fractionDigits?: number;
}

export function formatUsd(amount: number, opts: FormatUsdOptions = {}): string {
  if (!Number.isFinite(amount)) return '$0';
  const fractionDigits =
    opts.fractionDigits ?? (Math.abs(amount) > 0 && Math.abs(amount) < 0.05 ? 6 : 2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export interface FormatBtcOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatBtc(value: number, opts: FormatBtcOptions = {}): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: opts.minimumFractionDigits ?? 0,
    maximumFractionDigits: opts.maximumFractionDigits ?? 8,
  });
}

/** Truncate an address-like string to "0x1234…abcd". */
export function truncateAddress(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
