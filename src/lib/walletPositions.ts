import type { WalletPosition, WalletPositionsResponse } from '@satsterminal-sdk/borrow';

type WalletPositionsLike = WalletPosition[] | WalletPositionsResponse | null | undefined;

const CHAIN_ALIASES: Record<string, string> = {
  '42161': 'arbitrum',
  '8453': 'base',
  'arb': 'arbitrum',
  'arbitrum_one': 'arbitrum',
  'base_mainnet': 'base',
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
): WalletPosition | null {
  const normalizedAssetSymbol = assetSymbol.trim().toUpperCase();
  const normalizedChainId = normalizeChainId(chainId);
  const matchingSymbolPositions = getWalletPositionsList(positions).filter((position) => {
    const positionSymbol = position.attributes.fungible_info?.symbol?.trim().toUpperCase();
    return positionSymbol === normalizedAssetSymbol;
  });

  const exactChainMatch = matchingSymbolPositions.find((position) => {
    const positionChainId = normalizeChainId(position.relationships?.chain?.data?.id);
    const implementationMatch = position.attributes.fungible_info?.implementations?.some(
      (implementation) => normalizeChainId(implementation.chain_id) === normalizedChainId,
    );

    return positionChainId === normalizedChainId || implementationMatch;
  });

  if (exactChainMatch) {
    return exactChainMatch;
  }

  // Fallback: when the wallet query is already chain-specific, some providers still return
  // token metadata with a chain alias that doesn't match the loan chain string exactly.
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

export function formatTokenBalance(balance: number, maximumFractionDigits = 4): string {
  return balance.toLocaleString(undefined, {
    minimumFractionDigits: balance > 0 && balance < 1 ? Math.min(2, maximumFractionDigits) : 0,
    maximumFractionDigits,
  });
}
