'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpFromLine, CircleCheck, LoaderCircle, RefreshCw } from 'lucide-react';
import type { LoanCollateralInfo, RepayTransactionStatusResponse, WorkflowCallbacks } from '@satsterminal-sdk/borrow';

import { useBorrowContext } from '@/components/borrow-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface WithdrawCollateralProps {
  loanId: string;
  defaultBitcoinAddress?: string;
  className?: string;
  onTransactionCreated?: (transactionId: string) => void;
  onComplete?: () => void;
}

type ExtendedLoanCollateralInfo = LoanCollateralInfo & { healthFactor?: string };

type SubmissionState = {
  busy: boolean;
  status?: string;
  error?: string;
  transactionId?: string;
};

const initialSubmission: SubmissionState = { busy: false };
const MIN_COLLATERAL_WITHDRAWAL_BTC = 0.0001;

export function WithdrawCollateral({
  loanId,
  defaultBitcoinAddress = '',
  className,
  onTransactionCreated,
  onComplete,
}: WithdrawCollateralProps) {
  const { sdk, state: borrowState } = useBorrowContext();
  const [amount, setAmount] = useState('');
  const [bitcoinAddress, setBitcoinAddress] = useState(defaultBitcoinAddress);
  const [loanInfo, setLoanInfo] = useState<ExtendedLoanCollateralInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string>();
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

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadLoanInfo(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadLoanInfo]);

  async function submit() {
    const normalizedLoanId = loanId.trim();
    const normalizedAmount = amount.trim();
    const normalizedAddress = bitcoinAddress.trim();
    const numericAmount = Number(normalizedAmount);
    const maxWithdrawable = Number(loanInfo?.maxWithdrawable);

    if (!normalizedLoanId) {
      setSubmission({ busy: false, error: 'A loan ID is required.' });
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setSubmission({ busy: false, error: 'Enter a collateral amount greater than zero.' });
      return;
    }
    if (numericAmount < MIN_COLLATERAL_WITHDRAWAL_BTC) {
      setSubmission({ busy: false, error: `The minimum collateral withdrawal is ${MIN_COLLATERAL_WITHDRAWAL_BTC} BTC.` });
      return;
    }
    if (Number.isFinite(maxWithdrawable) && numericAmount > maxWithdrawable) {
      setSubmission({ busy: false, error: `You can withdraw at most ${formatAmount(loanInfo!.maxWithdrawable)} BTC.` });
      return;
    }
    if (!normalizedAddress) {
      setSubmission({ busy: false, error: 'Enter the Bitcoin address that should receive the collateral.' });
      return;
    }

    setSubmission({ busy: true, status: 'Preparing withdrawal' });
    const callbacks: WorkflowCallbacks = {
      onStatusUpdate: (status) =>
        setSubmission((current) => ({ ...current, status: status.label ?? 'Processing withdrawal' })),
      onComplete: () => {
        setSubmission((current) => ({ ...current, busy: false, status: 'Withdrawal completed' }));
        void loadLoanInfo();
        onComplete?.();
      },
      onError: (error) =>
        setSubmission((current) => ({ ...current, busy: false, error: errorMessage(error) })),
    };

    try {
      const transactionId = await sdk.withdrawCollateral(
        normalizedLoanId,
        normalizedAmount,
        normalizedAddress,
        { trackWorkflow: false },
      );
      setSubmission((current) => ({
        ...current,
        transactionId,
        status: current.status ?? 'Withdrawal created',
      }));
      onTransactionCreated?.(transactionId);
      const workflowId = repayWorkflowId(await sdk.getRepayStatus(transactionId));
      if (!workflowId) {
        callbacks.onError?.('Withdrawal was created, but workflow tracking could not be started.');
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
          <CardTitle>Withdraw collateral</CardTitle>
          {submission.status && <Badge variant="secondary">{submission.status}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
          <Metric label="Total collateral" value={loanInfo ? `${formatAmount(loanInfo.totalCollateral)} BTC` : '—'} />
          <Metric label="Max withdrawable" value={loanInfo ? `${formatAmount(loanInfo.maxWithdrawable)} BTC` : '—'} />
          <Metric label="Health factor" value={formatHealthFactor(loanInfo?.healthFactor)} />
          <div className="sm:col-span-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={!sessionReady || loadingInfo}
              onClick={() => void loadLoanInfo()}
            >
              {loadingInfo ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
              Refresh position
            </Button>
          </div>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          <span>Collateral amount (BTC)</span>
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.0001"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!loanInfo?.maxWithdrawable || Number(loanInfo.maxWithdrawable) < MIN_COLLATERAL_WITHDRAWAL_BTC}
              onClick={() => setAmount(loanInfo?.maxWithdrawable ?? '')}
            >
              Max
            </Button>
          </div>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          <span>Receiving Bitcoin address</span>
          <Input
            value={bitcoinAddress}
            onChange={(event) => setBitcoinAddress(event.target.value)}
            placeholder="bc1q…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <p className="text-xs text-muted-foreground">
          Minimum withdrawal is 0.0001 BTC. The maximum is calculated from the live loan position; withdrawing more would make the position unsafe.
        </p>

        <Button
          className="w-full"
          size="lg"
          disabled={!sessionReady || submission.busy || Number(loanInfo?.maxWithdrawable ?? 0) < MIN_COLLATERAL_WITHDRAWAL_BTC}
          onClick={() => void submit()}
        >
          {submission.busy ? <LoaderCircle className="animate-spin" /> : <ArrowUpFromLine />}
          {!sessionReady ? 'Preparing SDK…' : submission.busy ? 'Processing…' : 'Withdraw collateral'}
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
        <p className="text-sm font-medium">Withdrawal transaction</p>
        <p className="break-all font-mono text-xs text-muted-foreground">{transactionId}</p>
      </div>
    </div>
  );
}

function formatAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(amount)
    : value;
}

function formatHealthFactor(value?: string) {
  if (!value) return '—';
  const healthFactor = Number(value);
  return Number.isFinite(healthFactor)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(healthFactor)
    : value;
}

function repayWorkflowId(status: RepayTransactionStatusResponse) {
  const currentStatus = status as RepayTransactionStatusResponse & { workflowId?: string };
  return currentStatus.workflowId ?? status.transactionDetails?.workflowId;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : 'Something went wrong.';
}
