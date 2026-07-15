"use client";

import { BorrowApp } from "@/components/borrow-app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBtcWallet } from "@/hooks/useBtcWallet";

const apiKey = process.env.NEXT_PUBLIC_SATSTERMINAL_API_KEY;

export function BorrowPageClient() {
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
      <BorrowShell>
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
      </BorrowShell>
    );
  }

  if (!walletProvider) {
    return (
      <BorrowShell>
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
      </BorrowShell>
    );
  }

  return (
    <BorrowApp
      apiKey={apiKey}
      wallet={walletProvider}
      accountLabel={`${walletType} ${btcAddress?.slice(0, 6)}...${btcAddress?.slice(-6)}`}
      defaultBitcoinAddress={btcAddress ?? ""}
      onDisconnect={disconnect}
    />
  );
}

function BorrowShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <div className="w-full">{children}</div>
    </main>
  );
}
