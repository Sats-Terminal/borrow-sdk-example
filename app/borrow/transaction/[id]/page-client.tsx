"use client";

import Link from "next/link";

import { BorrowFlow } from "@/components/borrow-flow";
import { BorrowProvider, useBorrowContext } from "@/components/borrow-context";
import { LoanManagement } from "@/components/loan-management";
import { RepayLoan } from "@/components/repay-loan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WithdrawCollateral } from "@/components/withdraw-collateral";
import { useBtcWallet } from "@/hooks/useBtcWallet";

const apiKey = process.env.NEXT_PUBLIC_SATSTERMINAL_API_KEY;

export function BorrowTransactionPageClient({
  transactionId,
  loanId,
  showManagement,
  currency,
  chain,
}: {
  transactionId: string;
  loanId: string;
  showManagement: boolean;
  currency: string;
  chain?: string;
}) {
  const {
    btcAddress,
    walletProvider,
    walletType,
    connectingWallet,
    error,
    connect,
    disconnect,
  } = useBtcWallet();

  if (!apiKey) {
    return (
      <TransactionShell>
        <Card>
          <CardHeader>
            <CardTitle>Missing API key</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set NEXT_PUBLIC_SATSTERMINAL_API_KEY in your local environment.
            </p>
          </CardContent>
        </Card>
      </TransactionShell>
    );
  }

  if (!walletProvider) {
    return (
      <TransactionShell>
        <Card>
          <CardHeader>
            <CardTitle>Connect Bitcoin wallet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => void connect("unisat")}
                disabled={connectingWallet}
              >
                {connectingWallet ? "Connecting..." : "UniSat"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void connect("xverse")}
                disabled={connectingWallet}
              >
                {connectingWallet ? "Connecting..." : "Xverse"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </TransactionShell>
    );
  }

  return (
    <BorrowProvider apiKey={apiKey} wallet={walletProvider} autoStart={false}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-6">
            <div>
              <p className="text-sm font-medium">Borrow transaction</p>
              <p className="font-mono text-xs text-muted-foreground">
                {walletType} {btcAddress?.slice(0, 6)}...{btcAddress?.slice(-6)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/borrow">New loan</Link>
              </Button>
              <Button variant="outline" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
          {!showManagement && (
            <Card>
              <CardHeader>
                <CardTitle>Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="break-all font-mono text-sm text-muted-foreground">
                  {transactionId}
                </code>
              </CardContent>
            </Card>
          )}
          {!showManagement && <TransactionTracker transactionId={transactionId} />}
          {showManagement && (
            <div className="flex flex-col gap-6">
              <LoanManagement defaultLoanId={loanId} />
              <RepayLoan loanId={loanId} currency={currency} chain={chain} />
              <WithdrawCollateral
                loanId={loanId}
                defaultBitcoinAddress={btcAddress ?? ""}
              />
            </div>
          )}
        </main>
      </div>
    </BorrowProvider>
  );
}

function TransactionTracker({ transactionId }: { transactionId: string }) {
  const { state, actions } = useBorrowContext();

  if (state.phase === "idle" || state.phase === "session_setup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Restoring your saved session before loading this transaction…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state.phase === "failed_to_execute") {
    return (
      <Card>
        <CardHeader><CardTitle>Authorization failed</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive" role="alert">{state.error}</p>
          <Button onClick={() => void actions.startSession()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return <BorrowFlow loanId={transactionId} />;
}

function TransactionShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <div className="w-full">{children}</div>
    </main>
  );
}
