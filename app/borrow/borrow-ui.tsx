"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ActiveBorrowFlow } from "@/components/active-borrow-flow";
import { AvailableOffers } from "@/components/available-offers";
import { useBorrowContext } from "@/components/borrow-context";
import { LoanComposer } from "@/components/loan-composer";
import { UserLoans } from "@/components/user-loans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BorrowUi() {
  const router = useRouter();

  return (
    <>
      <RedirectOnExecutedLoan />
      <BorrowSessionGate>
        <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <section className="flex flex-col gap-6">
          <LoanComposer />
        </section>
        <section className="flex min-w-0 flex-col gap-6">
          <AvailableOffers />
        </section>
        <ActiveBorrowFlow className="lg:col-span-2" />
        <UserLoans
          className="lg:col-span-2"
          onManageLoan={(loan) => {
            const query = new URLSearchParams({
              manage: "1",
              loanId: loan.originalBorrowId,
              currency: loan.currency,
            });
            if (loan.chain) query.set("chain", loan.chain);
            router.push(`/borrow/transaction/${encodeURIComponent(loan.originalBorrowId)}?${query.toString()}`);
          }}
          onTrackLoan={(loan) => router.push(`/borrow/transaction/${encodeURIComponent(loan.workflowId ?? loan.originalBorrowId)}?loanId=${encodeURIComponent(loan.originalBorrowId)}`)}
        />
        </main>
      </BorrowSessionGate>
    </>
  );
}

function BorrowSessionGate({ children }: { children: React.ReactNode }) {
  const { state, actions } = useBorrowContext();

  if (state.phase === "idle" || state.phase === "session_setup" || state.phase === "failed_to_execute") {
    const error = state.phase === "failed_to_execute" ? state.error : null;

    return (
      <main className="mx-auto flex w-full max-w-3xl px-6 py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{error ? "Authorization failed" : "Loading SatsTerminal Borrow"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <>
                <p className="text-sm text-destructive" role="alert">{error}</p>
                <Button onClick={() => void actions.startSession()}>Try again</Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Restoring your saved session and loading account data…</p>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return children;
}

function RedirectOnExecutedLoan() {
  const router = useRouter();
  const { state } = useBorrowContext();

  useEffect(() => {
    if (state.phase !== "executed") return;

    router.push(`/borrow/transaction/${encodeURIComponent(state.workflowId)}`);
  }, [router, state]);

  return null;
}
