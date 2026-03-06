import type { WalletPosition, WalletPositionsResponse } from '@satsterminal-sdk/borrow';

type WalletPositionsLike = WalletPosition[] | WalletPositionsResponse | null | undefined;

const normalizeChainId = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

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

  return (
    getWalletPositionsList(positions).find((position) => {
      const positionSymbol = position.attributes.fungible_info?.symbol?.trim().toUpperCase();
      const positionChainId = normalizeChainId(position.relationships?.chain?.data?.id);
      const implementationMatch = position.attributes.fungible_info?.implementations?.some(
        (implementation) => normalizeChainId(implementation.chain_id) === normalizedChainId,
      );

      return (
        positionSymbol === normalizedAssetSymbol &&
        (positionChainId === normalizedChainId || implementationMatch)
      );
    }) ?? null
  );
}

export function formatTokenBalance(balance: number, maximumFractionDigits = 4): string {
  return balance.toLocaleString(undefined, {
    minimumFractionDigits: balance > 0 && balance < 1 ? Math.min(2, maximumFractionDigits) : 0,
    maximumFractionDigits,
  });
}
