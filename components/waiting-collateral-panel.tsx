'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DEPOSIT_DETECTION_TIMEOUT_SECONDS,
  type WaitingCollateralMode,
} from '@/lib/borrow-events';
import { cn } from '@/lib/utils';

export interface WaitingCollateralPanelProps {
  mode: WaitingCollateralMode;
  /** Required when mode === 'manual'. */
  address?: string;
  /** Required when mode === 'manual'. */
  amountSats?: number;
  /** Required when mode === 'manual'. */
  amountBtc?: number;
  /** Bitcoin deposit transaction ID, available after the deposit is detected. */
  depositTxHash?: string;
  /** ms since epoch — workflow start. Drives the deposit-window countdown. */
  startedAt?: number;
  /** Seconds before the deposit window expires. Default 24h. */
  depositWindowSeconds?: number;
  className?: string;
}

export function WaitingCollateralPanel({
  mode,
  address,
  amountSats,
  amountBtc,
  depositTxHash,
  startedAt,
  depositWindowSeconds = DEPOSIT_DETECTION_TIMEOUT_SECONDS,
  className,
}: WaitingCollateralPanelProps) {
  if (mode === 'manual' && address && amountBtc != null && amountSats != null) {
    return (
      <ManualDepositCard
        address={address}
        amountSats={amountSats}
        amountBtc={amountBtc}
        startedAt={startedAt}
        depositWindowSeconds={depositWindowSeconds}
        className={className}
      />
    );
  }
  // `mode === 'manual'` without address/amount falls through to the
  // confirming card — we have nothing to show the user yet.
  const fallbackMode: 'auto' | 'confirming' | 'confirmed' =
    mode === 'manual' ? 'confirming' : mode;
  return <StatusCard mode={fallbackMode} depositTxHash={depositTxHash} className={className} />;
}

function ManualDepositCard({
  address,
  amountSats,
  amountBtc,
  startedAt,
  depositWindowSeconds,
  className,
}: {
  address: string;
  amountSats: number;
  amountBtc: number;
  startedAt?: number;
  depositWindowSeconds: number;
  className?: string;
}) {
  const uri = `bitcoin:${address}?amount=${amountBtc}`;
  return (
    <section className={cn('flex flex-col gap-5 rounded-lg border p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-medium">Send Bitcoin to deposit collateral</h2>
        {startedAt != null && (
          <Countdown
            startedAt={startedAt}
            durationSeconds={depositWindowSeconds}
          />
        )}
      </div>

      <div className="flex justify-start">
        <QRCodeSVG value={uri} size={192} />
      </div>

      <Field label="Amount">
        <div className="flex flex-col">
          <span className="text-base font-medium">{amountBtc} BTC</span>
          <span className="text-sm text-muted-foreground">
            {amountSats.toLocaleString()} sats
          </span>
        </div>
        <CopyButton value={String(amountBtc)} label="Copy amount" />
      </Field>

      <Field label="Address">
        <code className="break-all text-sm">{address}</code>
        <CopyButton value={address} label="Copy address" />
      </Field>

      <p className="text-sm text-muted-foreground">
        Send the exact amount in a single transaction. The deposit will be detected
        automatically.
      </p>
    </section>
  );
}

function StatusCard({
  mode,
  depositTxHash,
  className,
}: {
  mode: Exclude<WaitingCollateralMode, 'manual'>;
  depositTxHash?: string;
  className?: string;
}) {
  const copy = STATUS_COPY[mode];
  return (
    <section className={cn('flex flex-col gap-2 rounded-lg border p-5', className)}>
      <h2 className="text-lg font-medium">{copy.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.body}</p>
      {depositTxHash && (
        <a
          href={`https://mempool.space/tx/${encodeURIComponent(depositTxHash)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          View Bitcoin transaction
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </section>
  );
}

const STATUS_COPY: Record<
  Exclude<WaitingCollateralMode, 'manual'>,
  { title: string; body: string }
> = {
  auto: {
    title: 'Sending Bitcoin to DeFi protocol',
    body:
      'Your connected wallet is auto-transferring the collateral. This usually takes a few minutes.',
  },
  confirming: {
    title: 'Confirming deposit',
    body:
      'We detected your deposit. Waiting for confirmations on the Bitcoin network (typically 10-30 minutes).',
  },
  confirmed: {
    title: 'Deposit confirmed',
    body: 'Bitcoin deposit confirmed. Preparing to deposit collateral into the lending pool.',
  },
};

function Countdown({
  startedAt,
  durationSeconds,
}: {
  startedAt: number;
  durationSeconds: number;
}) {
  const [remaining, setRemaining] = useState(() =>
    secondsRemaining(startedAt, durationSeconds),
  );
  useEffect(() => {
    const id = setInterval(
      () => setRemaining(secondsRemaining(startedAt, durationSeconds)),
      1000,
    );
    return () => clearInterval(id);
  }, [startedAt, durationSeconds]);
  if (remaining <= 0) {
    return <span className="text-sm text-destructive">Deposit window expired</span>;
  }
  return (
    <span className="text-sm text-muted-foreground">
      {formatRemaining(remaining)}
    </span>
  );
}

function secondsRemaining(startedAt: number, durationSeconds: number): number {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return Math.max(0, durationSeconds - elapsed);
}

function formatRemaining(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  }
  return `${minutes}:${seconds}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center justify-between gap-3">{children}</div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — integrator can swap this for a toast
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={onCopy} aria-label={label}>
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}
