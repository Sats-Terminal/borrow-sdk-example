'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import type {
  BorrowSDK,
  BorrowSDKConfig,
  WalletProvider,
} from '@satsterminal-sdk/borrow';

import { AvailableOffers } from '@/components/available-offers';
import { ActiveBorrowFlow } from '@/components/active-borrow-flow';
import { BorrowFlow } from '@/components/borrow-flow';
import {
  BorrowProvider,
  useBorrowContext,
} from '@/components/borrow-context';
import { LoanComposer } from '@/components/loan-composer';
import { LoanManagement } from '@/components/loan-management';
import { PlatformWalletAddress } from '@/components/platform-wallet-address';
import { RepayLoan } from '@/components/repay-loan';
import { UserLoans } from '@/components/user-loans';
import {
  isPendingLoan,
  type LoanSummary,
} from '@/lib/loan-summary';
import { WalletWithdrawal } from '@/components/wallet-withdrawal';
import { WithdrawCollateral } from '@/components/withdraw-collateral';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface BorrowAppProps {
  apiKey?: string;
  wallet?: WalletProvider;
  sdkConfig?: Omit<BorrowSDKConfig, 'apiKey' | 'wallet'>;
  sdkOverride?: BorrowSDK;
  autoRestore?: boolean;
  autoStart?: boolean;
  destinationAddress?: string;
  defaultBitcoinAddress?: string;
  defaultEvmAddress?: string;
  title?: string;
  accountLabel?: string;
  className?: string;
  onDisconnect?: () => void;
  onLoanSelected?: (loan: LoanSummary) => void;
}

type ManagementView = 'manage' | 'repay' | 'withdraw';

/**
 * Complete one-page borrowing experience. The host only supplies an API key
 * and connected Bitcoin wallet adapter (or a pre-built SDK instance).
 */
export function BorrowApp({
  apiKey,
  wallet,
  sdkConfig,
  sdkOverride,
  autoRestore = true,
  autoStart = true,
  destinationAddress,
  defaultBitcoinAddress,
  defaultEvmAddress,
  title = 'SatsTerminal Borrow',
  accountLabel,
  className,
  onDisconnect,
  onLoanSelected,
}: BorrowAppProps) {
  if (!sdkOverride && (!apiKey || !wallet)) {
    return (
      <Card className={cn('mx-auto my-8 w-full max-w-3xl', className)}>
        <CardHeader>
          <CardTitle>Borrow configuration required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pass an API key and connected Bitcoin wallet adapter, or provide an SDK instance with <code>sdkOverride</code>.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <BorrowProvider
      apiKey={apiKey}
      wallet={wallet}
      sdkConfig={sdkConfig}
      sdkOverride={sdkOverride}
      autoRestore={autoRestore}
      autoStart={autoStart}
    >
      <BorrowAppContent
        title={title}
        accountLabel={accountLabel ?? shortAddress(wallet?.address)}
        destinationAddress={destinationAddress}
        defaultBitcoinAddress={defaultBitcoinAddress ?? wallet?.address ?? ''}
        defaultEvmAddress={defaultEvmAddress}
        className={className}
        onDisconnect={onDisconnect}
        onLoanSelected={onLoanSelected}
      />
    </BorrowProvider>
  );
}

function BorrowAppContent({
  title,
  accountLabel,
  destinationAddress,
  defaultBitcoinAddress,
  defaultEvmAddress,
  className,
  onDisconnect,
  onLoanSelected,
}: {
  title: string;
  accountLabel?: string;
  destinationAddress?: string;
  defaultBitcoinAddress: string;
  defaultEvmAddress?: string;
  className?: string;
  onDisconnect?: () => void;
  onLoanSelected?: (loan: LoanSummary) => void;
}) {
  const { state, actions } = useBorrowContext();
  const [selectedLoan, setSelectedLoan] = useState<LoanSummary | null>(null);
  const managementRef = useRef<HTMLElement>(null);

  function selectLoan(loan: LoanSummary) {
    setSelectedLoan(loan);
    onLoanSelected?.(loan);
    window.requestAnimationFrame(() => {
      managementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className={cn('min-h-screen bg-background text-foreground', className)}>
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div>
            <p className="font-medium">{title}</p>
            {accountLabel && <p className="font-mono text-xs text-muted-foreground">{accountLabel}</p>}
          </div>
          <div className="flex items-center gap-2">
            <PlatformWalletAddress />
            {onDisconnect && <Button variant="outline" onClick={onDisconnect}>Disconnect</Button>}
          </div>
        </div>
      </header>

      {state.phase === 'idle' || state.phase === 'session_setup' ? (
        <SessionMessage title="Loading SatsTerminal Borrow" body="Restoring your saved session and loading account data…" />
      ) : state.phase === 'failed_to_execute' ? (
        <SessionMessage
          title="Borrow action failed"
          body={state.error}
          action={<Button onClick={() => void actions.startSession()}>Try again</Button>}
        />
      ) : (
        <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
          <LoanComposer />
          <AvailableOffers destinationAddress={destinationAddress} />
          <ActiveBorrowFlow className="lg:col-span-2" />

          <UserLoans
            className="lg:col-span-2"
            onManageLoan={selectLoan}
            onTrackLoan={selectLoan}
          />

          {selectedLoan && (
            <SelectedLoanPanel
              key={selectedLoan.originalBorrowId}
              ref={managementRef}
              loan={selectedLoan}
              defaultBitcoinAddress={defaultBitcoinAddress}
              onClose={() => setSelectedLoan(null)}
            />
          )}

          <WalletWithdrawal
            className="lg:col-span-2"
            defaultEvmAddress={defaultEvmAddress}
          />
        </main>
      )}
    </div>
  );
}

function SelectedLoanPanel({
  ref,
  loan,
  defaultBitcoinAddress,
  onClose,
}: {
  ref: React.Ref<HTMLElement>;
  loan: LoanSummary;
  defaultBitcoinAddress: string;
  onClose: () => void;
}) {
  const [view, setView] = useState<ManagementView>('manage');
  const pending = isPendingLoan(loan);

  return (
    <section ref={ref} className="scroll-mt-6 space-y-4 lg:col-span-2">
      <div className="rounded-xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Selected loan</p>
            <h2 className="text-xl font-semibold">{formatAmount(loan.amount)} {loan.currency}</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{loan.originalBorrowId}</p>
          </div>
          <Button variant="ghost" size="icon" title="Close loan management" onClick={onClose}><X /></Button>
        </div>

        {!pending && (
          <div className="mt-5 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            <ViewButton active={view === 'manage'} onClick={() => setView('manage')}>Manage</ViewButton>
            <ViewButton active={view === 'repay'} onClick={() => setView('repay')}>Repay</ViewButton>
            <ViewButton active={view === 'withdraw'} onClick={() => setView('withdraw')}>Collateral</ViewButton>
          </div>
        )}
      </div>

      {pending ? (
        <BorrowFlow
          loanId={loan.workflowId ?? loan.originalBorrowId}
          startedAt={loan.timestamp || undefined}
          onReset={onClose}
        />
      ) : view === 'manage' ? (
        <LoanManagement defaultLoanId={loan.originalBorrowId} />
      ) : view === 'repay' ? (
        <RepayLoan loanId={loan.originalBorrowId} currency={loan.currency} chain={loan.chain} />
      ) : (
        <WithdrawCollateral
          loanId={loan.originalBorrowId}
          defaultBitcoinAddress={defaultBitcoinAddress}
        />
      )}
    </section>
  );
}

function ViewButton({ active, ...props }: React.ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
      {...props}
    />
  );
}

function SessionMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl px-6 py-8">
      <Card className="w-full">
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{body}</p>
          {action}
        </CardContent>
      </Card>
    </main>
  );
}

function shortAddress(address?: string) {
  return address ? `${address.slice(0, 7)}…${address.slice(-6)}` : undefined;
}

function formatAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(amount)
    : value;
}
