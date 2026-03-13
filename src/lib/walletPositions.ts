import type { WalletPosition, WalletPositionsResponse } from '@satsterminal-sdk/borrow';

type WalletPositionsLike = WalletPosition[] | WalletPositionsResponse | null | undefined;

const CHAIN_ALIASES: Record<string, string> = {
  '1': 'ethereum',
  '10': 'optimism',
  '56': 'bnb_smart_chain',
  '137': 'polygon',
  '42161': 'arbitrum',
  '8453': 'base',
  'arb': 'arbitrum',
  'eth': 'ethereum',
  'mainnet': 'ethereum',
  'arbitrum_one': 'arbitrum',
  'base_mainnet': 'base',
  'ethereum_mainnet': 'ethereum',
  'binance_smart_chain': 'bnb_smart_chain',
  'bsc': 'bnb_smart_chain',
  'eip155:1': 'ethereum',
  'eip155:10': 'optimism',
  'eip155:56': 'bnb_smart_chain',
  'eip155:137': 'polygon',
  'eip155:42161': 'arbitrum',
  'eip155:8453': 'base',
};

const normalizeChainId = (value: string | null | undefined) => {
  const normalized = (value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return CHAIN_ALIASES[normalized] ?? normalized;
};

export function getWalletPositionsList(positions: WalletPositionsLike): WalletPosition[] {
  if (Array.isArray(positions)) {
    return positions;
  }

  return positions?.data ?? [];
}

export function getChainAssetPosition(
  positions: WalletPositionsLike,
  assetSymbol: string,
  chainId: string,
  options?: {
    allowCrossChainFallback?: boolean;
  },
): WalletPosition | null {
  const normalizedAssetSymbol = assetSymbol.trim().toUpperCase();
  const normalizedChainId = normalizeChainId(chainId);
  const allowCrossChainFallback = options?.allowCrossChainFallback ?? true;
  const matchingSymbolPositions = getWalletPositionsList(positions).filter((position) => {
    const positionSymbol = position.attributes.fungible_info?.symbol?.trim().toUpperCase();
    return positionSymbol === normalizedAssetSymbol;
  });

  const exactChainMatch = matchingSymbolPositions.find((position) => {
    const positionChainId = normalizeChainId(position.relationships?.chain?.data?.id);
    return positionChainId === normalizedChainId;
  });

  if (exactChainMatch) {
    return exactChainMatch;
  }

  if (!allowCrossChainFallback) {
    return null;
  }

  // Fallback to the highest-balance match when the caller explicitly allows cross-chain selection.
  return (
    matchingSymbolPositions.sort((left, right) => {
      const leftQuantity = left.attributes.quantity.float || 0;
      const rightQuantity = right.attributes.quantity.float || 0;
      return rightQuantity - leftQuantity;
    })[0] ??
    getWalletPositionsList(positions).find((position) => {
      const positionSymbol = position.attributes.fungible_info?.symbol?.trim().toUpperCase();
      return positionSymbol === normalizedAssetSymbol;
    }) ??
    null
  );
}

export function formatTokenBalance(
  balance: number | string,
  maximumFractionDigits = 4,
): string {
  const normalizedBalance = String(balance).trim();

  if (!normalizedBalance) {
    return "0";
  }

  const numericBalance = Number(normalizedBalance);
  if (!Number.isFinite(numericBalance)) {
    return normalizedBalance;
  }

  const isNegative = normalizedBalance.startsWith("-");
  const unsignedBalance = isNegative
    ? normalizedBalance.slice(1)
    : normalizedBalance;
  const [rawIntegerPart = "0", rawFractionalPart = ""] =
    unsignedBalance.split(".");
  const integerPart = rawIntegerPart.replace(/^0+(?=\d)/, "") || "0";
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (maximumFractionDigits <= 0) {
    return `${isNegative ? "-" : ""}${formattedInteger}`;
  }

  const truncatedFractionalPart = rawFractionalPart.slice(
    0,
    maximumFractionDigits,
  );
  const minimumFractionDigits =
    numericBalance > 0 && numericBalance < 1
      ? Math.min(2, maximumFractionDigits)
      : 0;
  const trimmedFractionalPart = truncatedFractionalPart.replace(/0+$/, "");
  const displayedFractionalPart =
    trimmedFractionalPart.length >= minimumFractionDigits
      ? trimmedFractionalPart
      : truncatedFractionalPart
          .slice(0, minimumFractionDigits)
          .padEnd(minimumFractionDigits, "0");

  if (!displayedFractionalPart) {
    return `${isNegative ? "-" : ""}${formattedInteger}`;
  }

  return `${isNegative ? "-" : ""}${formattedInteger}.${displayedFractionalPart}`;
}
