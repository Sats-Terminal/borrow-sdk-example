'use client';

import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, HandCoins, LoaderCircle, RefreshCw } from 'lucide-react';
import type {
  ChainType,
  LoanCollateralInfo,
  RepayTransactionStatusResponse,
  WalletPosition,
  WalletPositionsResponse,
  WorkflowCallbacks,
} from '@satsterminal-sdk/borrow';

import { useBorrowContext } from '@/components/borrow-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface RepayLoanProps {
  loanId: string;
  currency?: string;
  chain?: ChainType | string | null;
  defaultAmount?: string;
  className?: string;
  onTransactionCreated?: (transactionId: string) => void;
  onComplete?: () => void;
}

type SubmissionState = {
  busy: boolean;
  status?: string;
  error?: string;
  transactionId?: string;
};

const initialSubmission: SubmissionState = { busy: false };

export function RepayLoan({
  loanId,
  currency = 'USD',
  chain,
  defaultAmount = '',
  className,
  onTransactionCreated,
  onComplete,
}: RepayLoanProps) {
  const { sdk, state: borrowState } = useBorrowContext();
  const [amount, setAmount] = useState(defaultAmount);
  const [loanInfo, setLoanInfo] = useState<LoanCollateralInfo | null>(null);
  const [assetBalance, setAssetBalance] = useState<number | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [infoError, setInfoError] = useState<string>();
  const [balanceError, setBalanceError] = useState<string>();
  const [submission, setSubmission] = useState<SubmissionState>(initialSubmission);
  const sessionReady = borrowState.phase !== 'idle' && borrowState.phase !== 'session_setup';

  const loadLoanInfo = useCallback(async () => {
    if (!sessionReady || !loanId.trim()) return;
    setLoadingInfo(true);
    setInfoError(undefined);
    try {
      setLoanInfo(await sdk.getLoanCollateralInfo(loanId.trim()));
    } catch (error) {
      setInfoError(errorMessage(error));
    } finally {
      setLoadingInfo(false);
    }
  }, [loanId, sdk, sessionReady]);

  const loadAssetBalance = useCallback(async () => {
    if (!sessionReady) return;
    setLoadingBalance(true);
    setBalanceError(undefined);
    try {
      const positions = await sdk.getWalletPositions({
        chain,
        filterPositions: 'only_simple',
        filterTrash: 'only_non_trash',
      });
      setAssetBalance(assetBalanceFromPositions(positions, currency, chain));
    } catch (error) {
      setAssetBalance(null);
      setBalanceError(errorMessage(error));
    } finally {
      setLoadingBalance(false);
    }
  }, [chain, currency, sdk, sessionReady]);

  const refreshPosition = useCallback(async () => {
    await Promise.all([loadLoanInfo(), loadAssetBalance()]);
  }, [loadAssetBalance, loadLoanInfo]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refreshPosition(), 0);
    return () => window.clearTimeout(timeout);
  }, [refreshPosition]);

  async function submit() {
    const normalizedLoanId = loanId.trim();
    const normalizedAmount = amount.trim();
    const numericAmount = Number(normalizedAmount);
    const remainingDebt = Number(loanInfo?.remainingDebt);

    if (!normalizedLoanId) {
      setSubmission({ busy: false, error: 'A loan ID is required.' });
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setSubmission({ busy: false, error: 'Enter a repayment amount greater than zero.' });
      return;
    }
    if (Number.isFinite(remainingDebt) && remainingDebt > 0 && numericAmount > remainingDebt) {
      setSubmission({ busy: false, error: `The repayment cannot exceed ${formatAmount(loanInfo!.remainingDebt)} ${currency}.` });
      return;
    }

    setSubmission({ busy: true, status: 'Preparing repayment' });
    const callbacks: WorkflowCallbacks = {
      onStatusUpdate: (status) =>
        setSubmission((current) => ({ ...current, status: status.label ?? 'Processing repayment' })),
      onComplete: () => {
        setSubmission((current) => ({ ...current, busy: false, status: 'Repayment completed' }));
        void refreshPosition();
        onComplete?.();
      },
      onError: (error) =>
        setSubmission((current) => ({ ...current, busy: false, error: errorMessage(error) })),
    };

    try {
      const transactionId = await sdk.repay(normalizedLoanId, normalizedAmount, {
        trackWorkflow: false,
      });
      setSubmission((current) => ({
        ...current,
        transactionId,
        status: current.status ?? 'Repayment created',
      }));
      onTransactionCreated?.(transactionId);
      const workflowId = repayWorkflowId(await sdk.getRepayStatus(transactionId));
      if (!workflowId) {
        callbacks.onError?.('Repayment was created, but workflow tracking could not be started.');
        return;
      }
      void sdk.trackWorkflow(workflowId, callbacks, 'repay').catch(callbacks.onError);
    } catch (error) {
      setSubmission({ busy: false, error: errorMessage(error) });
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Repay loan</CardTitle>
          {submission.status && <Badge variant="secondary">{submission.status}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
          <Metric
            label="Remaining debt"
            value={loanInfo ? `${formatAmount(loanInfo.remainingDebt)} ${currency}` : '—'}
          />
          <Metric
            label={chain ? `Wallet balance · ${formatChain(chain)}` : 'Wallet balance'}
            value={loadingBalance ? 'Loading…' : assetBalance === null ? '—' : `${formatAmount(assetBalance)} ${currency}`}
          />
          <Metric
            label="Total collateral"
            value={loanInfo ? `${formatAmount(loanInfo.totalCollateral)} BTC` : '—'}
          />
          <div className="sm:col-span-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={!sessionReady || loadingInfo || loadingBalance}
              onClick={() => void refreshPosition()}
            >
              {loadingInfo || loadingBalance ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
              Refresh position
            </Button>
          </div>
        </div>

        {balanceError && (
          <p className="text-xs text-muted-foreground">Wallet balance is temporarily unavailable.</p>
        )}

        <label className="grid gap-2 text-sm font-medium">
          <span>Repayment amount ({currency})</span>
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="500"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!loanInfo?.remainingDebt || assetBalance === null}
              onClick={() => setAmount(maximumRepayAmount(loanInfo?.remainingDebt, assetBalance))}
            >
              Full
            </Button>
          </div>
        </label>

        <Button
          className="w-full"
          size="lg"
          disabled={!sessionReady || submission.busy}
          onClick={() => void submit()}
        >
          {submission.busy ? <LoaderCircle className="animate-spin" /> : <HandCoins />}
          {!sessionReady ? 'Preparing SDK…' : submission.busy ? 'Processing…' : 'Repay loan'}
        </Button>

        {(infoError || submission.error) && (
          <p className="text-sm text-destructive" role="alert">{submission.error ?? infoError}</p>
        )}

        {submission.transactionId && (
          <TransactionResult transactionId={submission.transactionId} />
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>;
}

function TransactionResult({ transactionId }: { transactionId: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border p-4">
      <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-sm font-medium">Repayment transaction</p>
        <p className="break-all font-mono text-xs text-muted-foreground">{transactionId}</p>
      </div>
    </div>
  );
}

function assetBalanceFromPositions(
  response: WalletPositionsResponse | WalletPosition[],
  symbol: string,
  chain?: ChainType | string | null,
) {
  const positions = Array.isArray(response) ? response : response.data ?? [];
  return positions
    .filter((position) => {
      const positionSymbol = position.attributes.fungible_info?.symbol;
      const positionChain = position.relationships.chain.data.id;
      return positionSymbol?.toLowerCase() === symbol.toLowerCase()
        && (!chain || chainsMatch(positionChain, chain));
    })
    .reduce((total, position) => total + position.attributes.quantity.float, 0);
}

function chainsMatch(positionChain: string, loanChain: ChainType | string) {
  return normalizeChain(positionChain) === normalizeChain(loanChain);
}

function normalizeChain(chain: ChainType | string) {
  const normalized = chain.toLowerCase().replaceAll('_', '-');
  if (normalized === 'bnb-smart-chain' || normalized === 'bsc') return 'binance-smart-chain';
  return normalized;
}

function formatChain(chain: ChainType | string) {
  return normalizeChain(chain).replaceAll('-', ' ');
}

function maximumRepayAmount(remainingDebt: string | undefined, walletBalance: number | null) {
  if (!remainingDebt || walletBalance === null) return '';
  const debt = Number(remainingDebt);
  if (!Number.isFinite(debt)) return '';
  return walletBalance < debt ? String(walletBalance) : remainingDebt;
}

function repayWorkflowId(status: RepayTransactionStatusResponse) {
  const currentStatus = status as RepayTransactionStatusResponse & { workflowId?: string };
  return currentStatus.workflowId ?? status.transactionDetails?.workflowId;
}

function formatAmount(value: string | number) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(amount)
    : value;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : 'Something went wrong.';
}
