import {
  ChainType,
  type WalletPosition,
  type WalletPositionsResponse,
} from '@satsterminal-sdk/borrow';

export interface WithdrawableWalletAsset {
  key: string;
  symbol: string;
  name: string;
  chain: ChainType;
  balance: number;
  balanceText: string;
  valueUsd?: number;
}

export interface WithdrawalProgress {
  stage: string;
  transactionHash?: string;
  error?: string;
  completed: boolean;
  failed: boolean;
}

type WithdrawalStatusState = {
  stage: string;
  transactionHash?: string;
  error?: string;
};

type WithdrawalStatusResponse = {
  success: boolean;
  data: {
    status: string;
    workflowState?: WithdrawalStatusState;
    transactionDetails?: { transactionHash?: string };
  };
};

const CHAIN_ALIASES: Record<string, ChainType> = {
  '1': ChainType.ETHEREUM,
  '10': ChainType.OPTIMISM,
  '56': ChainType.BSC,
  '137': ChainType.POLYGON,
  '8453': ChainType.BASE,
  '84532': ChainType.BASE_SEPOLIA,
  '42161': ChainType.ARBITRUM,
  arbitrum: ChainType.ARBITRUM,
  base: ChainType.BASE,
  'base-sepolia': ChainType.BASE_SEPOLIA,
  'binance-smart-chain': ChainType.BSC,
  bsc: ChainType.BSC,
  'bnb-smart-chain': ChainType.BSC,
  ethereum: ChainType.ETHEREUM,
  mainnet: ChainType.ETHEREUM,
  optimism: ChainType.OPTIMISM,
  polygon: ChainType.POLYGON,
};

const EVM_TRANSFER_ASSETS: Partial<Record<ChainType, string[]>> = {
  [ChainType.ETHEREUM]: ['WBTC', 'BBTC', 'LBTC', 'USDC', 'USDT', 'CBBTC'],
  [ChainType.BASE]: ['CBBTC', 'LBTC', 'USDC'],
  [ChainType.POLYGON]: ['WBTC', 'USDC', 'USDC.E', 'USDT'],
  [ChainType.OPTIMISM]: ['WBTC', 'USDC', 'USDT'],
  [ChainType.ARBITRUM]: ['WBTC', 'USDC', 'USDT', 'CBBTC'],
  [ChainType.BSC]: ['USDC', 'USDT', 'BTCB'],
  [ChainType.BASE_SEPOLIA]: ['USDC'],
};

export function normalizeWalletAssets(
  response: WalletPositionsResponse | WalletPosition[],
): WithdrawableWalletAsset[] {
  const positions = Array.isArray(response) ? response : response.data ?? [];

  return positions.flatMap((position) => {
    const fungible = position.attributes.fungible_info;
    const chain = normalizePositionChain(position.relationships.chain.data.id);
    const balance = position.attributes.quantity.float;
    const balanceText = position.attributes.quantity.numeric || String(balance);

    if (!fungible || !chain || !position.attributes.flags.displayable || !Number.isFinite(balance) || balance <= 0) {
      return [];
    }

    return [{
      key: `${position.id}:${chain}:${fungible.symbol}`,
      symbol: fungible.symbol,
      name: fungible.name,
      chain,
      balance,
      balanceText,
      valueUsd: position.attributes.value ?? undefined,
    }];
  }).sort((left, right) => (right.valueUsd ?? 0) - (left.valueUsd ?? 0));
}

export function supportsWithdrawal(
  asset: WithdrawableWalletAsset,
) {
  return EVM_TRANSFER_ASSETS[asset.chain]?.includes(normalizeSymbol(asset.symbol)) ?? false;
}

export function normalizeWithdrawStatus(response: WithdrawalStatusResponse): WithdrawalProgress {
  const data = response.data;
  const state = data.workflowState;
  const stage = state?.stage ?? data.status ?? 'PROCESSING';
  const normalizedStage = stage.toUpperCase();
  const transactionHash = data.transactionDetails?.transactionHash
    ?? state?.transactionHash;
  const failed = normalizedStage === 'FAILED'
    || normalizedStage === 'ERROR'
    || normalizedStage === 'CANCELLED';

  return {
    stage,
    transactionHash,
    error: state?.error,
    completed: normalizedStage === 'COMPLETED',
    failed,
  };
}

export function withdrawalExplorerUrl(
  chain: ChainType,
  transactionHash?: string,
) {
  if (!transactionHash) return undefined;
  const explorers: Partial<Record<ChainType, string>> = {
    [ChainType.BASE]: 'https://basescan.org/tx/',
    [ChainType.BASE_SEPOLIA]: 'https://sepolia.basescan.org/tx/',
    [ChainType.ETHEREUM]: 'https://etherscan.io/tx/',
    [ChainType.ARBITRUM]: 'https://arbiscan.io/tx/',
    [ChainType.OPTIMISM]: 'https://optimistic.etherscan.io/tx/',
    [ChainType.POLYGON]: 'https://polygonscan.com/tx/',
    [ChainType.BSC]: 'https://bscscan.com/tx/',
  };
  const explorer = explorers[chain];
  return explorer ? `${explorer}${transactionHash}` : undefined;
}

export function formatWalletChain(chain: ChainType) {
  const labels: Partial<Record<ChainType, string>> = {
    [ChainType.BASE]: 'Base',
    [ChainType.BASE_SEPOLIA]: 'Base Sepolia',
    [ChainType.ETHEREUM]: 'Ethereum',
    [ChainType.ARBITRUM]: 'Arbitrum',
    [ChainType.OPTIMISM]: 'Optimism',
    [ChainType.POLYGON]: 'Polygon',
    [ChainType.BSC]: 'BNB Smart Chain',
  };
  return labels[chain] ?? chain;
}

function normalizePositionChain(value: string): ChainType | undefined {
  const normalized = value.toLowerCase().replaceAll('_', '-');
  const chainId = normalized.startsWith('eip155:') ? normalized.slice('eip155:'.length) : normalized;
  return CHAIN_ALIASES[chainId]
    ?? Object.values(ChainType).find((chain) => chain.toLowerCase().replaceAll('_', '-') === normalized);
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}
