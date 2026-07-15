'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircleCheck,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Send,
  WalletCards,
} from 'lucide-react';

import { useBorrowContext } from '@/components/borrow-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  formatWalletChain,
  normalizeWalletAssets,
  normalizeWithdrawStatus,
  supportsWithdrawal,
  withdrawalExplorerUrl,
  type WithdrawalProgress,
  type WithdrawableWalletAsset,
} from '@/lib/wallet-assets';

export interface WalletWithdrawalProps {
  defaultEvmAddress?: string;
  pollIntervalMs?: number;
  className?: string;
  onTransactionCreated?: (transactionId: string) => void;
  onComplete?: (progress: WithdrawalProgress) => void;
}

type SubmissionState = {
  busy: boolean;
  transactionId?: string;
  stage?: string;
  transactionHash?: string;
  error?: string;
  completed?: boolean;
  failed?: boolean;
};

const initialSubmission: SubmissionState = { busy: false };

export function WalletWithdrawal({
  defaultEvmAddress = '',
  pollIntervalMs = 5_000,
  className,
  onTransactionCreated,
  onComplete,
}: WalletWithdrawalProps) {
  const { sdk, state: borrowState } = useBorrowContext();
  const [assets, setAssets] = useState<WithdrawableWalletAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string>();
  const [selectedAssetKey, setSelectedAssetKey] = useState('');
  const [amount, setAmount] = useState('');
  const [evmAddress, setEvmAddress] = useState(defaultEvmAddress);
  const [submission, setSubmission] = useState<SubmissionState>(initialSubmission);
  const sessionReady = borrowState.phase !== 'idle' && borrowState.phase !== 'session_setup';

  const availableAssets = useMemo(
    () => assets.filter(supportsWithdrawal),
    [assets],
  );
  const selectedAsset = availableAssets.find((asset) => asset.key === selectedAssetKey);

  const loadAssets = useCallback(async () => {
    if (!sessionReady) return;
    setLoadingAssets(true);
    setAssetsError(undefined);
    try {
      const response = await sdk.getWalletPositions({
        filterPositions: 'only_simple',
        filterTrash: 'only_non_trash',
      });
      setAssets(normalizeWalletAssets(response));
    } catch (error) {
      setAssetsError(errorMessage(error));
    } finally {
      setLoadingAssets(false);
    }
  }, [sdk, sessionReady]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadAssets(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadAssets]);

  useEffect(() => {
    if (availableAssets.some((asset) => asset.key === selectedAssetKey)) return;
    setSelectedAssetKey(availableAssets[0]?.key ?? '');
    setAmount('');
  }, [availableAssets, selectedAssetKey]);

  useEffect(() => {
    if (!submission.transactionId || submission.completed || submission.failed) return;

    let cancelled = false;
    let timeout: number | undefined;

    const poll = async () => {
      try {
        const progress = normalizeWithdrawStatus(
          await sdk.getWithdrawStatus(submission.transactionId!),
        );
        if (cancelled) return;

        setSubmission((current) => ({
          ...current,
          busy: !progress.completed && !progress.failed,
          stage: progress.stage,
          transactionHash: progress.transactionHash,
          error: progress.error,
          completed: progress.completed,
          failed: progress.failed,
        }));

        if (progress.completed) {
          void loadAssets();
          onComplete?.(progress);
          return;
        }
        if (progress.failed) return;
      } catch (error) {
        if (!cancelled) {
          setSubmission((current) => ({
            ...current,
            error: `Status temporarily unavailable: ${errorMessage(error)}`,
          }));
        }
      }

      if (!cancelled) timeout = window.setTimeout(() => void poll(), pollIntervalMs);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [loadAssets, onComplete, pollIntervalMs, sdk, submission.completed, submission.failed, submission.transactionId]);

  async function submit() {
    if (!selectedAsset) {
      setSubmission({ busy: false, error: 'Select an asset to withdraw.' });
      return;
    }

    const normalizedAmount = amount.trim();
    const numericAmount = Number(normalizedAmount);
    const destinationAddress = evmAddress.trim();

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setSubmission({ busy: false, error: 'Enter an amount greater than zero.' });
      return;
    }
    if (numericAmount > selectedAsset.balance) {
      setSubmission({ busy: false, error: `The amount exceeds your ${formatAmount(selectedAsset.balance)} ${selectedAsset.symbol} balance.` });
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(destinationAddress)) {
      setSubmission({ busy: false, error: 'Enter a valid EVM destination address.' });
      return;
    }

    setSubmission({ busy: true, stage: 'Preparing withdrawal' });

    try {
      const transactionId = await sdk.withdrawToEVM({
        chain: selectedAsset.chain,
        amount: normalizedAmount,
        assetSymbol: selectedAsset.symbol,
        destinationAddress,
      });

      if (!transactionId) {
        throw new Error('The withdrawal may have been created, but the SDK returned no transaction ID. Do not retry until you verify the request response or update to Borrow SDK 1.7.2+.');
      }

      setSubmission({ busy: true, transactionId, stage: 'Withdrawal created' });
      onTransactionCreated?.(transactionId);
    } catch (error) {
      setSubmission({ busy: false, error: errorMessage(error) });
    }
  }

  const explorerUrl = selectedAsset
    ? withdrawalExplorerUrl(selectedAsset.chain, submission.transactionHash)
    : undefined;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WalletCards className="size-5" />
            <CardTitle>Withdraw platform assets</CardTitle>
          </div>
          {submission.stage && <Badge variant="secondary">{formatStage(submission.stage)}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="grid gap-2 text-sm font-medium">
          <span>Asset</span>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedAssetKey}
            disabled={!sessionReady || loadingAssets || submission.busy}
            onChange={(event) => {
              setSelectedAssetKey(event.target.value);
              setAmount('');
            }}
          >
            {availableAssets.length === 0 && <option value="">No supported assets</option>}
            {availableAssets.map((asset) => (
              <option key={asset.key} value={asset.key}>
                {asset.symbol} · {formatWalletChain(asset.chain)} · {formatAmount(asset.balance)} available
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          <span>Amount {selectedAsset ? `(${selectedAsset.symbol})` : ''}</span>
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              value={amount}
              disabled={!selectedAsset || submission.busy}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!selectedAsset || submission.busy}
              onClick={() => setAmount(selectedAsset?.balanceText ?? '')}
            >
              Max
            </Button>
          </div>
          {selectedAsset && (
            <span className="text-xs font-normal text-muted-foreground">
              Balance: {formatAmount(selectedAsset.balance)} {selectedAsset.symbol} on {formatWalletChain(selectedAsset.chain)}
            </span>
          )}
        </label>

        <label className="grid gap-2 text-sm font-medium">
          <span>Destination EVM address</span>
          <Input
            value={evmAddress}
            disabled={submission.busy}
            onChange={(event) => setEvmAddress(event.target.value)}
            placeholder="0x…"
          />
          <span className="text-xs font-normal text-muted-foreground">
            The transfer stays on the selected source chain and is gas sponsored.
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1"
            size="lg"
            disabled={!sessionReady || !selectedAsset || submission.busy}
            onClick={() => void submit()}
          >
            {submission.busy ? <LoaderCircle className="animate-spin" /> : <Send />}
            {!sessionReady ? 'Preparing SDK…' : submission.busy ? 'Processing…' : 'Withdraw assets'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Refresh wallet assets"
            disabled={!sessionReady || loadingAssets || submission.busy}
            onClick={() => void loadAssets()}
          >
            <RefreshCw className={cn(loadingAssets && 'animate-spin')} />
          </Button>
        </div>

        {loadingAssets && assets.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading platform wallet assets…</p>
        )}
        {!loadingAssets && !assetsError && availableAssets.length === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No platform-wallet assets support EVM withdrawal.
          </p>
        )}
        {(assetsError || submission.error) && (
          <p className="text-sm text-destructive" role="alert">{submission.error ?? assetsError}</p>
        )}

        {submission.transactionId && (
          <div className="flex items-start gap-3 rounded-xl border p-4">
            {submission.completed
              ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              : <LoaderCircle className={cn('mt-0.5 size-4 shrink-0', !submission.failed && 'animate-spin')} />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Withdrawal transaction</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{submission.transactionId}</p>
              {submission.transactionHash && (
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{submission.transactionHash}</p>
              )}
            </div>
            {explorerUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={explorerUrl} target="_blank" rel="noreferrer">
                  Explorer <ExternalLink />
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatAmount(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(value);
}

function formatStage(stage: string) {
  return stage.toLowerCase().replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase());
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : 'Something went wrong.';
}
