import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
// Import SDK with clean named exports (ESM/CJS compatible)
import {
  BorrowSDK,
  ChainType,
  ResponseNormalizer,
} from "@satsterminal-sdk/borrow";
import type * as BorrowSDKModule from "@satsterminal-sdk/borrow";
import { Units } from "@/lib/units";

// Map API status to user-friendly status
// Note: "COMPLETED" from backend means borrow workflow completed (loan disbursed), not loan repaid
// A loan is "active" until it's fully repaid. "REPAID" or "CLOSED" would indicate a finished loan.
const mapStatus = (apiStatus: string): string => {
  const normalizedStatus = apiStatus?.toUpperCase() || "";
  const statusMap: Record<string, string> = {
    INITIALIZING: "pending",
    AWAITING_DEPOSIT: "awaiting_deposit",
    AWAITING_DEPOSIT_CONFIRMATION: "awaiting_deposit",
    PREPARING_BORROW_DEPOSIT: "processing",
    PREPARING_LOAN: "processing",
    LOAN_CONFIRMED: "active",
    COMPLETED: "active", // Borrow workflow completed = loan is now active
    LOAN_ACTIVE: "active",
    ACTIVE: "active",
    FAILED: "failed",
    // These would indicate a truly completed/closed loan
    REPAID: "completed",
    CLOSED: "completed",
    FULLY_REPAID: "completed",
  };
  return statusMap[normalizedStatus] || apiStatus.toLowerCase();
};

// Extract the current status from transaction
// Backend may provide status in transactionStatuses array (latest entry is current)
const extractStatus = (tx: any): string => {
  // First check transactionStatuses array - the last entry is the current status
  const statuses = tx.transactionStatuses;
  if (statuses && Array.isArray(statuses) && statuses.length > 0) {
    const latestStatus = statuses[statuses.length - 1];
    return latestStatus?.status || latestStatus || "";
  }
  // Fall back to direct status field
  return tx.status || "";
};

// Transform API transaction to UserTransaction type
const transformTransaction = (tx: any): UserTransaction => {
  // Use Units.normalizeToBtc for clean conversion, then convert back to sats
  const collateralRaw = tx.collateralAmount || tx.amountBTC || "0";
  const collateralBtc = Units.normalizeToBtc(collateralRaw);
  const collateralSats = Units.btcToSats(collateralBtc);
  const loanChainAddress = tx.loanChainAddress || "";

  // Extract status from transactionStatuses array or direct status field
  const rawStatus = extractStatus(tx);
  const mappedStatus = mapStatus(rawStatus);

  // Debug: log status transformation
  console.debug("[transformTransaction] Status:", {
    id: tx.transactionId || tx.id,
    rawStatus,
    mappedStatus,
    transactionStatuses: tx.transactionStatuses?.slice(-3), // Last 3 statuses
  });

  return {
    id: tx.transactionId || tx.id || "",
    type: "borrow",
    amount: tx.loanAmount || tx.borrowAmount || "0",
    currency: tx.outputToken || "USDC",
    status: mappedStatus as UserTransaction["status"],
    timestamp: tx.createdAt ? new Date(tx.createdAt).getTime() : Date.now(),
    txHash: tx.txHash || "",
    borrowTransaction: {
      protocol: tx.protocol || "AAVE",
      chain: tx.loanChain || "BASE",
      collateralAmount: collateralSats.toString(),
      loanAmount: tx.loanAmount || tx.borrowAmount || "0",
      loanChainAddress,
      bitcoinAddress: tx.bitcoinAddress || "",
      workflowId: tx.workflowId || "",
      transactionStatuses: tx.transactionStatuses || [],
    },
  };
};

// Type imports
type UserStatus = BorrowSDKModule.UserStatus;
type Quote = BorrowSDKModule.Quote;
type ActiveSession = BorrowSDKModule.ActiveSession;
type UserTransaction = BorrowSDKModule.UserTransaction;
type RepayTransaction = BorrowSDKModule.RepayTransaction;
type SDKWorkflowStatus = BorrowSDKModule.WorkflowStatus;
type WalletPositionsResponse = BorrowSDKModule.WalletPositionsResponse;
import {
  getAddress,
  signMessage,
  sendBtcTransaction,
  AddressPurpose,
  BitcoinNetworkType,
} from "sats-connect";

const API_KEY = import.meta.env.VITE_API_KEY || "";

const normalizeChainType = (
  chain: string | ChainType | null | undefined,
): ChainType =>
  String(chain ?? ChainType.BASE)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_") === ChainType.ARBITRUM
    ? ChainType.ARBITRUM
    : ChainType.BASE;

// Workflow status type
interface WorkflowStatus {
  stage: string;
  step: number;
  label: string;
  description: string;
  depositAddress?: string;
  depositAmount?: number;
  isComplete: boolean;
  isFailed: boolean;
}

// Deposit info type
interface DepositInfo {
  address: string;
  amount: number;
  amountBTC: number;
}

// Collateral info type
interface LoanCollateralInfo {
  totalCollateral: string;
  availableCollateral: string;
  maxWithdrawable: string;
  totalDebt: string;
  remainingDebt: string;
}

// UniSat wallet interface
interface UniSatProvider {
  requestAccounts: () => Promise<string[]>;
  signMessage: (msg: string, type?: string) => Promise<string>;
  getPublicKey: () => Promise<string>;
  sendBitcoin: (toAddress: string, satoshis: number) => Promise<string>;
}

declare global {
  interface Window {
    unisat?: UniSatProvider;
  }
}

export type WalletType = "unisat" | "xverse";
export type ProtocolFilter = "all" | "aave" | "morpho";

// Context type definition
interface BorrowSDKContextType {
  // Connection
  isConnected: boolean;
  btcAddress: string | null;
  walletType: WalletType | null;
  connect: (type?: WalletType) => Promise<void>;
  disconnect: () => void;

  // SDK state
  userStatus: UserStatus | null;
  session: ActiveSession | null;
  baseAddress: string | null;
  getBaseAddressForChain: (
    chain?: string | ChainType,
  ) => Promise<string | null>;

  // Protocol filter
  protocolFilter: ProtocolFilter;
  setProtocolFilter: (filter: ProtocolFilter) => void;
  filteredQuotes: Quote[];

  // Loans
  quotes: Quote[];
  transactions: UserTransaction[];
  repayTransactions: RepayTransaction[];

  // Wallet data
  walletPortfolio: any;
  walletPositions: any;
  getWalletPositionsForChain: (
    chain?: string | ChainType,
  ) => Promise<WalletPositionsResponse | null>;

  // Workflow
  workflowStatus: WorkflowStatus | null;
  depositInfo: DepositInfo | null;

  // UI - Granular loading states
  loading: boolean; // General loading (any operation in progress)
  connectingWallet: boolean;
  quotesLoading: boolean;
  transactionsLoading: boolean;
  borrowing: boolean;
  repaying: boolean;
  portfolioLoading: boolean;
  error: string | null;

  // Methods
  restoreSession: () => Promise<any>;
  setupForLoan: () => Promise<any>;
  startNewLoan: () => Promise<any>;
  fetchQuotes: (
    collateral: string,
    loanAmount: string,
    ltv: number,
  ) => Promise<any>;
  borrow: (quote: Quote, destinationAddress?: string) => Promise<string>;
  getStatus: (workflowId: string) => Promise<any>;
  resumeLoan: (workflowId: string) => Promise<void>;
  loadTransactions: () => Promise<void>;
  repay: (
    originalBorrowId: string,
    repayAmount: string,
    options?: any,
  ) => Promise<string>;
  getRepayStatus: (transactionId: string) => Promise<any>;
  loadRepayTransactions: (loanId?: string) => Promise<void>;
  resumeRepayWorkflow: (transactionId: string) => Promise<void>;
  getLoanCollateralInfo: (loanId: string) => Promise<LoanCollateralInfo | null>;
  sendBitcoin: (toAddress: string, satoshis: number) => Promise<string>;
  // Wallet methods
  getWalletPortfolio: () => Promise<void>;
  getWalletPositions: () => Promise<void>;
  // Withdraw methods
  withdrawCollateral: (
    loanId: string,
    amount: string,
    address: string,
    chain?: any,
  ) => Promise<string>;
  withdrawToEVM: (
    chain: any,
    amount: string,
    destinationAddress: string,
  ) => Promise<string>;
  withdrawToBitcoin: (
    chain: any,
    amount: string,
    assetSymbol: string,
    btcAddress: string,
  ) => Promise<string>;
  getWithdrawStatus: (transactionId: string) => Promise<any>;
}

// Create context with default values
const BorrowSDKContext = createContext<BorrowSDKContextType | null>(null);

// Provider component
export function BorrowSDKProvider({ children }: { children: ReactNode }) {
  // Connection state
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);

  // SDK state
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [baseAddress, setBaseAddress] = useState<string | null>(null);

  // Loan state
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [repayTransactions, setRepayTransactions] = useState<
    RepayTransaction[]
  >([]);

  // Protocol filter state
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>("all");

  // Filtered quotes based on protocol selection
  const filteredQuotes = useMemo(() => {
    if (protocolFilter === "all") return quotes;
    return quotes.filter((q) => q.protocol.toLowerCase() === protocolFilter);
  }, [quotes, protocolFilter]);

  // Wallet data state
  const [walletPortfolio, setWalletPortfolio] = useState<any>(null);
  const [walletPositions, setWalletPositions] = useState<any>(null);

  // Workflow state
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(
    null,
  );
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);

  // UI state - Granular loading states
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [repaying, setRepaying] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed general loading state for backward compatibility
  const loading =
    connectingWallet ||
    quotesLoading ||
    transactionsLoading ||
    borrowing ||
    repaying ||
    portfolioLoading;

  const walletProvider = useMemo(() => {
    if (!btcAddress || !walletType) return null;

    return {
      address: btcAddress,
      publicKey: publicKey || undefined,
      signMessage: async (msg: string) => {
        if (walletType === "unisat") {
          if (!window.unisat) throw new Error("UniSat not available");
          return window.unisat.signMessage(msg, "ecdsa");
        } else if (walletType === "xverse") {
          return new Promise<string>((resolve, reject) => {
            signMessage({
              payload: {
                address: btcAddress!,
                message: msg,
                network: { type: BitcoinNetworkType.Mainnet },
              },
              onFinish: (signature) => resolve(signature),
              onCancel: () => reject(new Error("User cancelled")),
            });
          });
        }
        throw new Error("Wallet not available");
      },
      sendBitcoin: async (toAddress: string, satoshis: number) => {
        if (walletType === "unisat") {
          if (!window.unisat) throw new Error("UniSat not available");
          return window.unisat.sendBitcoin(toAddress, satoshis);
        } else if (walletType === "xverse") {
          return new Promise<string>((resolve, reject) => {
            sendBtcTransaction({
              payload: {
                recipients: [
                  { address: toAddress, amountSats: BigInt(satoshis) },
                ],
                senderAddress: btcAddress!,
                network: { type: BitcoinNetworkType.Mainnet },
              },
              onFinish: (response) => resolve(response),
              onCancel: () => reject(new Error("User cancelled")),
            });
          });
        }
        throw new Error("Wallet not available");
      },
    };
  }, [btcAddress, publicKey, walletType]);

  // Create SDK instance
  const sdk = useMemo(() => {
    if (!walletProvider) return null;

    return new BorrowSDK({
      apiKey: API_KEY,
      chain: ChainType.BASE,
      wallet: walletProvider,
    });
  }, [walletProvider]);

  const createSdkForChain = useCallback(
    (chain?: string | ChainType | null) => {
      if (!walletProvider) return null;

      return new BorrowSDK({
        apiKey: API_KEY,
        chain: normalizeChainType(chain),
        wallet: walletProvider,
      });
    },
    [walletProvider],
  );

  const ensureBaseWalletAddressForChain = useCallback(
    async (chain?: string | ChainType | null) => {
      const chainType = normalizeChainType(chain);
      const chainSdk =
        chainType === ChainType.BASE ? sdk : createSdkForChain(chainType);

      if (!chainSdk) return null;

      const existingBaseWallet = await chainSdk.ensureBaseWallet();
      if (existingBaseWallet) {
        if (chainType === ChainType.BASE) {
          setBaseAddress(existingBaseWallet);
        }
        return existingBaseWallet;
      }

      try {
        const restored = await chainSdk.restoreSession();
        if (restored && chainSdk.baseWalletAddress) {
          if (chainType === ChainType.BASE) {
            setBaseAddress(chainSdk.baseWalletAddress);
          }
          return chainSdk.baseWalletAddress;
        }
      } catch (err) {
        console.warn(
          `[ensureBaseWalletAddressForChain] Failed to restore ${chainType} session:`,
          err,
        );
      }

      return null;
    },
    [sdk, createSdkForChain],
  );

  // Connect wallet
  const connect = useCallback(async (type: WalletType = "unisat") => {
    setConnectingWallet(true);
    setError(null);
    try {
      let address: string;
      let pubKey: string;

      if (type === "unisat") {
        if (!window.unisat) throw new Error("UniSat wallet not installed");
        const accounts = await window.unisat.requestAccounts();
        if (accounts.length === 0) throw new Error("No accounts");
        address = accounts[0];
        pubKey = await window.unisat.getPublicKey();
      } else if (type === "xverse") {
        const result = await new Promise<{ address: string; pubKey: string }>(
          (resolve, reject) => {
            getAddress({
              payload: {
                purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
                message: "Connect your Xverse Wallet",
                network: { type: BitcoinNetworkType.Mainnet },
              },
              onFinish: (response) => {
                const paymentAddr = response.addresses.find(
                  (a) => a.purpose === AddressPurpose.Payment,
                );
                resolve({
                  address:
                    paymentAddr?.address || response.addresses[0].address,
                  pubKey:
                    paymentAddr?.publicKey ||
                    response.addresses[0].publicKey ||
                    "",
                });
              },
              onCancel: () => reject(new Error("User cancelled")),
            });
          },
        );
        address = result.address;
        pubKey = result.pubKey;
      } else {
        throw new Error("Invalid wallet type");
      }

      setBtcAddress(address);
      setPublicKey(pubKey);
      setWalletType(type);

      // Save to localStorage
      localStorage.setItem(
        "borrow_sdk_connection",
        JSON.stringify({ address, pubKey, type }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnectingWallet(false);
    }
  }, []);

  // Restore connection on mount
  useEffect(() => {
    const stored = localStorage.getItem("borrow_sdk_connection");
    if (stored) {
      try {
        const { address, pubKey, type } = JSON.parse(stored);
        setBtcAddress(address);
        setPublicKey(pubKey);
        setWalletType(type);
      } catch {
        // Invalid stored data
      }
    }
  }, []);

  // Auto-restore session when SDK is initialized
  useEffect(() => {
    if (sdk && !session) {
      const activeSession = sdk.getActiveSession?.();
      if (activeSession) {
        setSession(activeSession);
        setUserStatus(sdk.userStatus);
        if (sdk.baseWalletAddress) {
          setBaseAddress(sdk.baseWalletAddress);
        }
        console.log("[SDK] Auto-restored session from storage");
      }
    }
  }, [sdk, session]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (sdk) sdk.clearSession();
    setBtcAddress(null);
    setPublicKey(null);
    setWalletType(null);
    setUserStatus(null);
    setSession(null);
    setQuotes([]);
    setTransactions([]);
    setRepayTransactions([]);
    setWalletPortfolio(null);
    setWalletPositions(null);
    setError(null);
    setBaseAddress(null);
    setWorkflowStatus(null);
    setDepositInfo(null);
    localStorage.removeItem("borrow_sdk_connection");
  }, [sdk]);

  const ensureBaseWalletAddress = useCallback(async () => {
    if (!sdk) return null;

    const existingBaseWallet = await sdk.ensureBaseWallet();
    if (existingBaseWallet) {
      setBaseAddress(existingBaseWallet);
      return existingBaseWallet;
    }

    try {
      const restored = await sdk.restoreSession();
      if (restored && sdk.baseWalletAddress) {
        setUserStatus(restored.userStatus);
        setSession(restored.activeSession);
        setBaseAddress(sdk.baseWalletAddress);
        return sdk.baseWalletAddress;
      }
    } catch (err) {
      console.warn("[ensureBaseWalletAddress] Failed to restore session:", err);
    }

    return null;
  }, [sdk]);

  const getBaseAddressForChain = useCallback(
    async (chain?: string | ChainType) =>
      ensureBaseWalletAddressForChain(chain),
    [ensureBaseWalletAddressForChain],
  );

  // Restore existing session (no new signature required if session is valid)
  const restoreSession = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");
    setTransactionsLoading(true);
    setError(null);
    try {
      const restored = await sdk.restoreSession();
      if (restored) {
        setUserStatus(restored.userStatus);
        setSession(restored.activeSession);
        // Handle various response formats (cast to any for runtime flexibility)
        const res = restored as any;
        const rawTxs =
          res?.transactions ||
          res?.data?.transactions ||
          res?.additional?.transactions ||
          [];
        setTransactions(rawTxs.map(transformTransaction));
        if (sdk.baseWalletAddress) {
          setBaseAddress(sdk.baseWalletAddress);
        }
        console.log("[restoreSession] Session restored successfully");
        return restored;
      }
      console.log("[restoreSession] No valid session found");
      return null;
    } catch (err) {
      console.error("[restoreSession] Error:", err);
      setError(err instanceof Error ? err.message : "Restore failed");
      return null;
    } finally {
      setTransactionsLoading(false);
    }
  }, [sdk]);

  // Setup for loan (creates new loan wallet - requires signature)
  const setupForLoan = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");

    if (session && sdk.hasValidSession?.()) {
      console.log("[setupForLoan] Session already active, skipping restore");
      return {
        userStatus,
        activeSession: session,
        transactions,
      };
    }

    setTransactionsLoading(true);
    setError(null);
    try {
      const restored = await sdk.restoreSession();
      if (restored) {
        setUserStatus(restored.userStatus);
        setSession(restored.activeSession);
        // Handle various response formats (cast to any for runtime flexibility)
        const res = restored as any;
        const rawTxs =
          res?.transactions ||
          res?.data?.transactions ||
          res?.additional?.transactions ||
          [];
        setTransactions(rawTxs.map(transformTransaction));
        if (sdk.baseWalletAddress) {
          setBaseAddress(sdk.baseWalletAddress);
        }
        console.log(
          "[setupForLoan] Existing session restored, no signature needed",
        );
        return restored;
      }

      console.log("[setupForLoan] No valid session, performing full setup");
      const result = await sdk.setupForLoan();
      setUserStatus(result.userStatus);
      setSession(result.activeSession);
      // Handle various response formats (cast to any for runtime flexibility)
      const res = result as any;
      const rawTxs =
        res?.transactions ||
        res?.data?.transactions ||
        res?.additional?.transactions ||
        [];
      setTransactions(rawTxs.map(transformTransaction));
      setBaseAddress(result.baseWallet.address);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
      throw err;
    } finally {
      setTransactionsLoading(false);
    }
  }, [sdk, session, userStatus, transactions]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!sdk) return;
    setTransactionsLoading(true);
    try {
      const history = await sdk.getUserTransactions(1, 50, "all");
      // Handle various response formats (cast to any for runtime flexibility)
      const res = history as any;
      const rawTxs =
        res?.transactions ||
        res?.data?.transactions ||
        res?.additional?.transactions ||
        [];
      const transformedTxs = rawTxs.map(transformTransaction);
      console.log(
        "[loadTransactions] Transformed transactions:",
        transformedTxs.slice(0, 2),
      );
      setTransactions(transformedTxs);
    } catch (err) {
      console.error("Failed to load transactions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load transactions",
      );
    } finally {
      setTransactionsLoading(false);
    }
  }, [sdk]);

  // Fetch quotes
  const fetchQuotes = useCallback(
    async (collateral: string, loanAmount: string, ltv: number) => {
      if (!sdk) throw new Error("SDK not initialized");
      setQuotesLoading(true);
      setError(null);
      try {
        console.log("[fetchQuotes] Requesting quotes with:", {
          collateralAmountBtc: collateral,
          loanAmount,
          ltv,
        });

        const quotesData = await sdk.getQuotes({
          collateralAmount: collateral,
          loanAmount,
          ltv,
        });

        console.log("[fetchQuotes] Received quotes:", quotesData);

        const extractedQuotes = ResponseNormalizer.normalizeQuotes(quotesData);
        console.log(
          "[fetchQuotes] Normalized quotes count:",
          extractedQuotes.length,
        );

        setQuotes(extractedQuotes);
        return quotesData;
      } catch (err) {
        console.error("[fetchQuotes] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch quotes");
        throw err;
      } finally {
        setQuotesLoading(false);
      }
    },
    [sdk],
  );

  // Execute borrow and automatically track workflow
  const borrow = useCallback(
    async (quote: Quote, destinationAddress?: string) => {
      if (!sdk) throw new Error("SDK not initialized");
      setBorrowing(true);
      setError(null);
      setWorkflowStatus(null);
      setDepositInfo(null);
      try {
        if (!sdk.baseWalletAddress) {
          console.log(
            "[borrow] Base wallet not set, checking for existing session...",
          );
          const restored = await sdk.restoreSession();
          if (restored && sdk.baseWalletAddress) {
            console.log(
              "[borrow] Session restored, base wallet:",
              sdk.baseWalletAddress,
            );
            setSession(restored.activeSession);
            setUserStatus(restored.userStatus);
            setBaseAddress(sdk.baseWalletAddress);
          }
        }

        if (!sdk.baseWalletAddress) {
          console.log("[borrow] No base wallet, calling setup first...");
          const setup = await sdk.setup();
          setSession(setup.activeSession);
          setUserStatus(setup.userStatus);
          setBaseAddress(setup.baseWallet.address);
          console.log(
            "[borrow] Setup complete, base wallet:",
            setup.baseWallet.address,
          );
        }

        const finalDestination = destinationAddress || sdk.baseWalletAddress;

        console.log("[borrow] Starting borrow with executeBorrow...");
        console.log("[borrow] Destination (base wallet):", finalDestination);

        const workflowId = await sdk.executeBorrow(quote, {
          destinationAddress: finalDestination || undefined,
        });

        console.log("[borrow] Loan initiated, workflowId:", workflowId);

        if (sdk.userStatus) {
          setUserStatus(sdk.userStatus);
        }
        const activeSession = sdk.getActiveSession?.();
        if (activeSession) {
          setSession(activeSession);
        }

        console.log("[borrow] Starting workflow tracking...");
        await sdk.resumeLoan(workflowId, {
          onStatusUpdate: (status: SDKWorkflowStatus) => {
            console.log("[borrow] Workflow status update:", status);
            setWorkflowStatus(status as WorkflowStatus);
          },
          onDepositReady: (info: DepositInfo) => {
            console.log("[borrow] Deposit ready:", info);
            setDepositInfo(info);
          },
          onComplete: () => {
            console.log("[borrow] Workflow complete");
            setBorrowing(false);
            loadTransactions();
          },
          onError: (err: string) => {
            console.error("[borrow] Workflow error:", err);
            setError(err);
            setBorrowing(false);
          },
        });

        return workflowId;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Borrow failed");
        setBorrowing(false);
        throw err;
      }
    },
    [sdk, loadTransactions],
  );

  // Get workflow status
  const getStatus = useCallback(
    async (workflowId: string) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.getStatus(workflowId);
    },
    [sdk],
  );

  // Resume loan
  const resumeLoan = useCallback(
    async (workflowId: string) => {
      if (!sdk) throw new Error("SDK not initialized");
      setBorrowing(true);
      setError(null);
      setWorkflowStatus(null);
      setDepositInfo(null);
      try {
        await sdk.resumeLoan(workflowId, {
          onStatusUpdate: (status: SDKWorkflowStatus) =>
            setWorkflowStatus(status as WorkflowStatus),
          onDepositReady: (info: DepositInfo) => setDepositInfo(info),
          onComplete: () => {
            setBorrowing(false);
            loadTransactions();
          },
          onError: (err: string) => {
            setError(err);
            setBorrowing(false);
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resume");
        setBorrowing(false);
      }
    },
    [sdk, loadTransactions],
  );

  // Start new loan
  const startNewLoan = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");
    setBorrowing(true);
    setError(null);
    try {
      const result = await sdk.startNewLoan();
      setSession(result.activeSession);
      setUserStatus(result.userStatus);
      setQuotes([]);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start new loan");
      throw err;
    } finally {
      setBorrowing(false);
    }
  }, [sdk]);

  // Repay (supports options for collateral, partial repay, etc.)
  const repay = useCallback(
    async (originalBorrowId: string, repayAmount: string, options?: any) => {
      if (!sdk) throw new Error("SDK not initialized");
      setRepaying(true);
      setError(null);
      try {
        const sourceChain = normalizeChainType(options?.chain);
        const chainSdk =
          sourceChain === ChainType.BASE
            ? sdk
            : createSdkForChain(sourceChain);

        if (!chainSdk) {
          throw new Error("SDK not initialized");
        }

        console.log(
          `[repay] Ensuring ${sourceChain} base wallet with signature...`,
        );
        const {
          address: sourceWallet,
          signature: sourceWalletSignature,
        } = await chainSdk.ensureBaseWalletWithSignature();

        if (sourceChain === ChainType.BASE) {
          setBaseAddress(sourceWallet);
        }

        console.log("[repay] Using source wallet for repayment:", {
          chain: sourceChain,
          address: sourceWallet,
          hasSignature: !!sourceWalletSignature,
        });

        if (!sourceWalletSignature) {
          throw new Error(
            "Failed to obtain wallet signature. Please try again.",
          );
        }

        const loan = transactions.find((t) => t.id === originalBorrowId);
        const loanAmount = loan ? parseFloat(loan.amount) : 0;
        const repayAmountNum = parseFloat(repayAmount);
        const isPartialRepay = repayAmountNum < loanAmount;

        console.log("[repay] Repaying loan:", {
          originalBorrowId,
          repayAmount,
          loanAmount,
          isPartialRepay,
          sourceChain,
          sourceWallet,
          options,
        });

        const { chain: _sourceChain, ...repayOptions } = options ?? {};
        const transactionId = await chainSdk.repay(originalBorrowId, repayAmount, {
          trackWorkflow: false,
          sourceWalletAddress: sourceWallet,
          sourceWalletSignature: sourceWalletSignature,
          ...repayOptions,
        });
        await loadTransactions();
        return transactionId;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Repay failed");
        throw err;
      } finally {
        setRepaying(false);
      }
    },
    [sdk, createSdkForChain, loadTransactions, transactions],
  );

  // Get repay status
  const getRepayStatus = useCallback(
    async (transactionId: string) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.getRepayStatus(transactionId);
    },
    [sdk],
  );

  // Load repay transactions
  const loadRepayTransactions = useCallback(
    async (loanId?: string) => {
      if (!sdk) return;
      try {
        const txs = await sdk.getRepayTransactions(loanId);
        setRepayTransactions(txs);
      } catch (err) {
        console.error("Failed to load repay transactions:", err);
      }
    },
    [sdk],
  );

  // Resume repay workflow
  const resumeRepayWorkflow = useCallback(
    async (transactionId: string) => {
      if (!sdk) throw new Error("SDK not initialized");
      setRepaying(true);
      setError(null);
      setWorkflowStatus(null);
      try {
        await sdk.trackWorkflow(
          transactionId,
          {
            onStatusUpdate: (status: SDKWorkflowStatus) =>
              setWorkflowStatus(status as WorkflowStatus),
            onComplete: () => {
              setRepaying(false);
              loadTransactions();
            },
            onError: (err: string) => {
              setError(err);
              setRepaying(false);
            },
          },
          "repay",
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resume");
        setRepaying(false);
      }
    },
    [sdk, loadTransactions],
  );

  const getLoanCollateralInfo = useCallback(
    async (loanId: string): Promise<LoanCollateralInfo | null> => {
      if (sdk && sdk.getLoanCollateralInfo) {
        try {
          const info = await sdk.getLoanCollateralInfo(loanId);
          if (info) return info;
        } catch (err) {
          console.warn(
            "[getLoanCollateralInfo] SDK call failed, falling back to transaction data:",
            err,
          );
        }
      }

      const tx = transactions.find((t) => t.id === loanId);
      if (tx) {
        const collateralSats = tx.borrowTransaction?.collateralAmount || "0";
        const loanAmount = tx.amount || "0";
        return {
          totalCollateral: collateralSats,
          availableCollateral: collateralSats,
          maxWithdrawable: "0",
          totalDebt: loanAmount,
          remainingDebt: loanAmount,
        };
      }

      return null;
    },
    [sdk, transactions],
  );

  // Send bitcoin
  const sendBitcoin = useCallback(
    async (toAddress: string, satoshis: number) => {
      if (!sdk) throw new Error("SDK not initialized");
      try {
        return await sdk.sendBitcoin(toAddress, satoshis);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Send failed");
        throw err;
      }
    },
    [sdk],
  );

  const getWalletPositionsForChain = useCallback(
    async (chain?: string | ChainType): Promise<WalletPositionsResponse | null> => {
      const chainType = normalizeChainType(chain);
      const chainSdk =
        chainType === ChainType.BASE ? sdk : createSdkForChain(chainType);

      if (!chainSdk) return null;

      setPortfolioLoading(true);
      try {
        const baseWallet = await ensureBaseWalletAddressForChain(chainType);
        if (!baseWallet) {
          if (chainType === ChainType.BASE) {
            setWalletPositions(null);
          }
          return null;
        }

        const result = await chainSdk.getWalletPositions();
        if (chainType === ChainType.BASE) {
          setWalletPositions(result);
        }
        return result;
      } catch (err) {
        console.error(
          `[getWalletPositionsForChain] ${chainType} error:`,
          err,
        );
        return null;
      } finally {
        setPortfolioLoading(false);
      }
    },
    [sdk, createSdkForChain, ensureBaseWalletAddressForChain],
  );

  // Get wallet portfolio
  const getWalletPortfolio = useCallback(async () => {
    if (!sdk) return;
    setPortfolioLoading(true);
    try {
      const baseWallet = await ensureBaseWalletAddress();
      if (!baseWallet) {
        setWalletPortfolio(null);
        return;
      }

      const result = await sdk.getWalletPortfolio();
      // Handle both { data: WalletPortfolio } and direct WalletPortfolio
      const portfolio = result?.data || result;
      setWalletPortfolio(portfolio);
    } catch (err) {
      console.error("[getWalletPortfolio] Error:", err);
    } finally {
      setPortfolioLoading(false);
    }
  }, [sdk, ensureBaseWalletAddress]);

  // Get wallet positions
  const getWalletPositions = useCallback(async () => {
    await getWalletPositionsForChain(ChainType.BASE);
  }, [getWalletPositionsForChain]);

  // Withdraw collateral
  const withdrawCollateral = useCallback(
    async (loanId: string, amount: string, address: string, chain?: any) => {
      if (!sdk) throw new Error("SDK not initialized");
      setRepaying(true); // Use repaying state for withdraw operations
      setError(null);
      try {
        const sourceChain = normalizeChainType(chain);
        const chainSdk =
          sourceChain === ChainType.BASE
            ? sdk
            : createSdkForChain(sourceChain);

        if (!chainSdk) {
          throw new Error("SDK not initialized");
        }

        console.log(
          `[withdrawCollateral] Ensuring ${sourceChain} base wallet with signature...`,
        );
        const {
          address: sourceWallet,
          signature: sourceWalletSignature,
        } = await chainSdk.ensureBaseWalletWithSignature();

        if (sourceChain === ChainType.BASE) {
          setBaseAddress(sourceWallet);
        }

        console.log("[withdrawCollateral] Using source wallet:", {
          chain: sourceChain,
          address: sourceWallet,
          hasSignature: !!sourceWalletSignature,
        });

        if (!sourceWalletSignature) {
          throw new Error(
            "Failed to obtain wallet signature. Please try again.",
          );
        }

        // Get the loan to find its loanIndex
        const loan = transactions.find((t) => t.id === loanId);
        const loanIndex = loan?.borrowTransaction?.loanIndex ?? 0;

        const transactionId = await chainSdk.withdrawCollateral(
          loanId,
          amount,
          address,
          {
            sourceWalletAddress: sourceWallet,
            sourceWalletSignature: sourceWalletSignature,
            loanIndex,
          },
        );

        await loadTransactions();
        return transactionId;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Withdraw failed");
        throw err;
      } finally {
        setRepaying(false);
      }
    },
    [sdk, createSdkForChain, transactions, loadTransactions],
  );

  // Withdraw to EVM (adapt signature to match SDK's object-based params)
  const withdrawToEVM = useCallback(
    async (chain: any, amount: string, destinationAddress: string) => {
      if (!sdk) throw new Error("SDK not initialized");

      const sourceChain = normalizeChainType(chain);
      const chainSdk =
        sourceChain === ChainType.BASE
          ? sdk
          : createSdkForChain(sourceChain);

      if (!chainSdk) {
        throw new Error("SDK not initialized");
      }

      const { address: sourceWallet } =
        await chainSdk.ensureBaseWalletWithSignature();
      if (sourceChain === ChainType.BASE) {
        setBaseAddress(sourceWallet);
      }

      return chainSdk.withdrawToEVM({
        chain: sourceChain,
        amount,
        destinationAddress,
      });
    },
    [sdk, createSdkForChain],
  );

  // Withdraw to Bitcoin (adapt signature to match SDK's object-based params)
  const withdrawToBitcoin = useCallback(
    async (
      chain: any,
      amount: string,
      assetSymbol: string,
      btcAddress: string,
    ) => {
      if (!sdk) throw new Error("SDK not initialized");

      const sourceChain = normalizeChainType(chain);
      const chainSdk =
        sourceChain === ChainType.BASE
          ? sdk
          : createSdkForChain(sourceChain);

      if (!chainSdk) {
        throw new Error("SDK not initialized");
      }

      const { address: sourceWallet } =
        await chainSdk.ensureBaseWalletWithSignature();
      if (sourceChain === ChainType.BASE) {
        setBaseAddress(sourceWallet);
      }

      return chainSdk.withdrawToBitcoin({
        chain: sourceChain,
        amount,
        assetSymbol,
        btcAddress,
      });
    },
    [sdk, createSdkForChain],
  );

  // Get withdraw status
  const getWithdrawStatus = useCallback(
    async (transactionId: string) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.getWithdrawStatus(transactionId);
    },
    [sdk],
  );

  const value: BorrowSDKContextType = {
    // Connection
    isConnected: !!btcAddress,
    btcAddress,
    walletType,
    connect,
    disconnect,

    // SDK state
    userStatus,
    session,
    baseAddress,
    getBaseAddressForChain,

    // Protocol filter
    protocolFilter,
    setProtocolFilter,
    filteredQuotes,

    // Loans
    quotes,
    transactions,
    repayTransactions,

    // Wallet data
    walletPortfolio,
    walletPositions,

    // Workflow
    workflowStatus,
    depositInfo,

    // UI - Granular loading states
    loading,
    connectingWallet,
    quotesLoading,
    transactionsLoading,
    borrowing,
    repaying,
    portfolioLoading,
    error,

    // Methods
    restoreSession,
    setupForLoan,
    startNewLoan,
    fetchQuotes,
    borrow,
    getStatus,
    resumeLoan,
    loadTransactions,
    repay,
    getRepayStatus,
    loadRepayTransactions,
    resumeRepayWorkflow,
    getLoanCollateralInfo,
    sendBitcoin,
    // Wallet methods
    getWalletPortfolio,
    getWalletPositions,
    getWalletPositionsForChain,
    // Withdraw methods
    withdrawCollateral,
    withdrawToEVM,
    withdrawToBitcoin,
    getWithdrawStatus,
  };

  return (
    <BorrowSDKContext.Provider value={value}>
      {children}
    </BorrowSDKContext.Provider>
  );
}

// Hook to use the context
export function useBorrowSDK(): BorrowSDKContextType {
  const context = useContext(BorrowSDKContext);
  if (!context) {
    throw new Error("useBorrowSDK must be used within a BorrowSDKProvider");
  }
  return context;
}
