"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type BtcWalletAccount,
  type BtcWalletOptions,
  type BtcWalletType,
  clearBtcWalletAccount,
  connectBtcWallet,
  createBtcWalletProvider,
  persistBtcWalletAccount,
  restoreBtcWalletAccount,
} from "@/lib/btcWallet";

export type UseBtcWalletOptions = BtcWalletOptions & {
  restoreOnMount?: boolean;
};

export function useBtcWallet(options?: UseBtcWalletOptions) {
  const [account, setAccount] = useState<BtcWalletAccount | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<Promise<BtcWalletAccount> | null>(null);

  const network = options?.network;
  const restoreOnMount = options?.restoreOnMount ?? true;
  const xverseConnectMessage = options?.xverseConnectMessage;

  const walletOptions = useMemo<BtcWalletOptions>(
    () => ({ network, xverseConnectMessage }),
    [network, xverseConnectMessage],
  );

  const restore = useCallback(() => {
    const restoredAccount = restoreBtcWalletAccount();
    setAccount(restoredAccount);
    return restoredAccount;
  }, []);

  useEffect(() => {
    if (!restoreOnMount) return;

    const timeoutId = window.setTimeout(() => {
      setAccount(restoreBtcWalletAccount());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [restoreOnMount]);

  const walletProvider = useMemo(
    () =>
      account ? createBtcWalletProvider(account, walletOptions) : null,
    [account, walletOptions],
  );

  const connect = useCallback(
    (walletType: BtcWalletType = "unisat") => {
      if (connectionRef.current) return connectionRef.current;

      setConnectingWallet(true);
      setError(null);

      const connection = connectBtcWallet(walletType, walletOptions)
        .then((nextAccount) => {
          persistBtcWalletAccount(nextAccount);
          setAccount(nextAccount);
          return nextAccount;
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : "Failed to connect wallet";
          setError(message);
          throw err;
        })
        .finally(() => {
          connectionRef.current = null;
          setConnectingWallet(false);
        });

      connectionRef.current = connection;
      return connection;
    },
    [walletOptions],
  );

  const disconnect = useCallback(() => {
    clearBtcWalletAccount();
    setAccount(null);
    setError(null);
  }, []);

  const signMessage = useCallback(
    async (message: string) => {
      if (!walletProvider) {
        throw new Error("Bitcoin wallet not connected");
      }

      return walletProvider.signMessage(message);
    },
    [walletProvider],
  );

  const sendBitcoin = useCallback(
    async (toAddress: string, satoshis: number) => {
      if (!walletProvider) {
        throw new Error("Bitcoin wallet not connected");
      }

      return walletProvider.sendBitcoin(toAddress, satoshis);
    },
    [walletProvider],
  );

  return {
    account,
    btcAddress: account?.address ?? null,
    publicKey: account?.publicKey ?? null,
    walletType: account?.walletType ?? null,
    walletProvider,
    isConnected: Boolean(account),
    connectingWallet,
    error,
    clearError: () => setError(null),
    connect,
    disconnect,
    restore,
    signMessage,
    sendBitcoin,
  };
}
