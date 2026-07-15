'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';
import {
  BorrowSDK,
  type BorrowSDKConfig,
  type Quote,
  type WalletProvider,
} from '@satsterminal-sdk/borrow';
import type { BorrowEvent, BorrowState } from '@/lib/borrow-events';
import {
  initialBorrowState,
  providerReducer,
} from '@/lib/provider-reducer';
import {
  useBorrowActions,
  type BorrowActions,
} from '@/hooks/use-borrow-actions';

export interface BorrowProviderProps {
  /** API key for the SatsTerminal Borrow SDK. Ignored when `sdkOverride` is set. */
  apiKey?: string;
  /** Wallet adapter used by the SDK for signing + on-chain interactions. */
  wallet?: WalletProvider;
  /** Additional SDK options (rpcUrl, bundlerUrl, etc.). Merged with apiKey + wallet. */
  sdkConfig?: Omit<BorrowSDKConfig, 'apiKey' | 'wallet'>;
  /** Pre-built SDK instance. Useful for tests. */
  sdkOverride?: BorrowSDK;
  /** Silently restore a valid persisted SDK session on mount. Default `true`. */
  autoRestore?: boolean;
  /** Call `sdk.setup()` when no session can be restored. Default `false`. */
  autoStart?: boolean;
  children: ReactNode;
}

export interface BorrowContextValue {
  sdk: BorrowSDK;
  state: BorrowState;
  dispatch: Dispatch<BorrowEvent>;
  actions: BorrowActions;
}

const BorrowContext = createContext<BorrowContextValue | null>(null);

export function BorrowProvider({
  apiKey,
  wallet,
  sdkConfig,
  sdkOverride,
  autoRestore = true,
  autoStart = false,
  children,
}: BorrowProviderProps) {
  const sdk = useMemo<BorrowSDK>(() => {
    if (sdkOverride) return sdkOverride;
    if (!apiKey || !wallet) {
      throw new Error(
        '<BorrowProvider> requires `apiKey` and `wallet` props (or pass `sdkOverride`).',
      );
    }
    return new BorrowSDK({ apiKey, wallet, ...sdkConfig });
  }, [apiKey, wallet, sdkConfig, sdkOverride]);

  const [state, dispatch] = useReducer(providerReducer, initialBorrowState);
  const stateRef = useRef(state);
  const bootstrapStartedRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const actions = useBorrowActions({ sdk, dispatch, stateRef });

  useEffect(() => {
    if (bootstrapStartedRef.current) return;
    if (stateRef.current.phase !== 'idle') return;
    bootstrapStartedRef.current = true;

    if (autoRestore) {
      void actions.restoreSession().then((restored) => {
        if (!restored && autoStart) void actions.startSession();
      });
      return;
    }

    if (autoStart) void actions.startSession();
  }, [actions, autoRestore, autoStart]);

  const value = useMemo<BorrowContextValue>(
    () => ({ sdk, state, dispatch, actions }),
    [sdk, state, actions],
  );

  return <BorrowContext.Provider value={value}>{children}</BorrowContext.Provider>;
}

export function useBorrowContext(): BorrowContextValue {
  const ctx = useContext(BorrowContext);
  if (!ctx) {
    throw new Error('useBorrowContext must be used inside <BorrowProvider>.');
  }
  return ctx;
}

/** Helper for components that only need to drive a quote selection imperatively. */
export function useBorrowQuoteSelection() {
  const { state, dispatch } = useBorrowContext();
  const selected =
    state.phase === 'quotes_ready' ? state.selected : (undefined as Quote | undefined);
  return {
    selected,
    select: (quote: Quote) => dispatch({ type: 'quote/select', quote }),
  };
}
