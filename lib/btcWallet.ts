import {
  AddressPurpose,
  BitcoinNetworkType,
  getAddress,
  sendBtcTransaction,
  signMessage as signXverseMessage,
} from "sats-connect";

export const BTC_WALLET_STORAGE_KEY = "btc_wallet_connection";
const BORROW_SDK_CONNECTION_STORAGE_KEY = "borrow_sdk_connection";

export type BtcWalletType = "unisat" | "xverse";

export type BtcWalletAccount = {
  address: string;
  publicKey?: string;
  walletType: BtcWalletType;
};

export type BtcWalletProvider = {
  address: string;
  publicKey?: string;
  signMessage: (message: string) => Promise<string>;
  sendBitcoin: (toAddress: string, satoshis: number) => Promise<string>;
};

export type BtcWalletOptions = {
  network?: BitcoinNetworkType;
  xverseConnectMessage?: string;
};

type StoredBtcWalletAccount = {
  address?: unknown;
  publicKey?: unknown;
  pubKey?: unknown;
  walletType?: unknown;
  type?: unknown;
};

type UniSatProvider = {
  requestAccounts: () => Promise<string[]>;
  signMessage: (message: string, type?: string) => Promise<string>;
  getPublicKey?: () => Promise<string>;
  sendBitcoin: (toAddress: string, satoshis: number) => Promise<string>;
};

declare global {
  interface Window {
    unisat?: UniSatProvider;
  }
}

const getNetwork = (options?: BtcWalletOptions) =>
  options?.network ?? BitcoinNetworkType.Mainnet;

const getXverseConnectMessage = (options?: BtcWalletOptions) =>
  options?.xverseConnectMessage ?? "Connect your Bitcoin wallet";

const assertBrowser = () => {
  if (typeof window === "undefined") {
    throw new Error("Bitcoin wallets are only available in the browser");
  }
};

const normalizeWalletType = (value: unknown): BtcWalletType | null => {
  if (value === "unisat" || value === "xverse") return value;
  return null;
};

const normalizeStoredAccount = (
  stored: StoredBtcWalletAccount,
): BtcWalletAccount | null => {
  const walletType = normalizeWalletType(stored.walletType ?? stored.type);
  const publicKey = stored.publicKey ?? stored.pubKey;

  if (!walletType || typeof stored.address !== "string") return null;

  return {
    address: stored.address,
    publicKey: typeof publicKey === "string" ? publicKey : undefined,
    walletType,
  };
};

const readStorageAccount = (key: string): BtcWalletAccount | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return normalizeStoredAccount(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const restoreBtcWalletAccount = (): BtcWalletAccount | null =>
  readStorageAccount(BTC_WALLET_STORAGE_KEY) ??
  readStorageAccount(BORROW_SDK_CONNECTION_STORAGE_KEY);

export const persistBtcWalletAccount = (account: BtcWalletAccount) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    BTC_WALLET_STORAGE_KEY,
    JSON.stringify(account),
  );
};

export const clearBtcWalletAccount = () => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(BTC_WALLET_STORAGE_KEY);
};

export const connectBtcWallet = async (
  walletType: BtcWalletType = "unisat",
  options?: BtcWalletOptions,
): Promise<BtcWalletAccount> => {
  assertBrowser();

  if (walletType === "unisat") {
    if (!window.unisat) {
      throw new Error("UniSat wallet not installed");
    }

    const accounts = await window.unisat.requestAccounts();
    const address = accounts[0];

    if (!address) {
      throw new Error("No UniSat account selected");
    }

    return {
      address,
      publicKey: await window.unisat.getPublicKey?.(),
      walletType,
    };
  }

  return new Promise<BtcWalletAccount>((resolve, reject) => {
    void getAddress({
      payload: {
        purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
        message: getXverseConnectMessage(options),
        network: { type: getNetwork(options) },
      },
      onFinish: (response) => {
        const paymentAddress =
          response.addresses.find(
            (address) => address.purpose === AddressPurpose.Payment,
          ) ?? response.addresses[0];

        if (!paymentAddress) {
          reject(new Error("No Xverse account selected"));
          return;
        }

        resolve({
          address: paymentAddress.address,
          publicKey: paymentAddress.publicKey,
          walletType,
        });
      },
      onCancel: () => reject(new Error("User cancelled")),
    });
  });
};

export const createBtcWalletProvider = (
  account: BtcWalletAccount,
  options?: BtcWalletOptions,
): BtcWalletProvider => ({
  address: account.address,
  publicKey: account.publicKey,
  signMessage: async (message: string) => {
    assertBrowser();

    if (account.walletType === "unisat") {
      if (!window.unisat) {
        throw new Error("UniSat wallet not available");
      }

      return window.unisat.signMessage(message, "ecdsa");
    }

    return new Promise<string>((resolve, reject) => {
      void signXverseMessage({
        payload: {
          address: account.address,
          message,
          network: { type: getNetwork(options) },
        },
        onFinish: (signature) => resolve(signature),
        onCancel: () => reject(new Error("User cancelled")),
      });
    });
  },
  sendBitcoin: async (toAddress: string, satoshis: number) => {
    assertBrowser();

    if (account.walletType === "unisat") {
      if (!window.unisat) {
        throw new Error("UniSat wallet not available");
      }

      return window.unisat.sendBitcoin(toAddress, satoshis);
    }

    return new Promise<string>((resolve, reject) => {
      void sendBtcTransaction({
        payload: {
          recipients: [{ address: toAddress, amountSats: BigInt(satoshis) }],
          senderAddress: account.address,
          network: { type: getNetwork(options) },
        },
        onFinish: (transactionId) => resolve(transactionId),
        onCancel: () => reject(new Error("User cancelled")),
      });
    });
  },
});
