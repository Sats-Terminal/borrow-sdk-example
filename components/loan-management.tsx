"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, CircleCheck, HandCoins, LoaderCircle } from "lucide-react";
import type { LoanCollateralInfo, WorkflowCallbacks } from "@satsterminal-sdk/borrow";

import { useBorrowContext } from "@/components/borrow-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Operation = "deposit" | "borrow";

type OperationState = {
  busy: boolean;
  error?: string;
  status?: string;
  transactionId?: string;
  deposit?: { address: string; amountBTC: number };
};

const initialState: OperationState = { busy: false };

export function LoanManagement({
  defaultLoanId = "",
  className,
}: {
  defaultLoanId?: string;
  className?: string;
}) {
  const { sdk, state: borrowState } = useBorrowContext();
  const [loanId, setLoanId] = useState(defaultLoanId);
  const [operation, setOperation] = useState<Operation>("deposit");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<OperationState>(initialState);
  const [loanInfo, setLoanInfo] = useState<LoanCollateralInfo | null>(null);
  const [loadingLoanInfo, setLoadingLoanInfo] = useState(false);
  const [loanInfoError, setLoanInfoError] = useState<string>();
  const sessionReady = borrowState.phase !== "idle" && borrowState.phase !== "session_setup";
  const fullyRepaid = loanInfo !== null && Number(loanInfo.remainingDebt) <= 0;
  const managementDisabled = !sessionReady || loadingLoanInfo || !loanInfo || fullyRepaid;

  const loadLoanInfo = useCallback(async () => {
    if (!sessionReady || !loanId.trim()) return;
    setLoadingLoanInfo(true);
    setLoanInfoError(undefined);
    try {
      setLoanInfo(await sdk.getLoanCollateralInfo(loanId.trim()));
    } catch (error) {
      setLoanInfo(null);
      setLoanInfoError(errorMessage(error));
    } finally {
      setLoadingLoanInfo(false);
    }
  }, [loanId, sdk, sessionReady]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadLoanInfo(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadLoanInfo]);

  async function submit() {
    const normalizedLoanId = loanId.trim();
    const normalizedAmount = amount.trim();
    const numericAmount = Number(normalizedAmount);

    if (!normalizedLoanId) {
      setResult({ busy: false, error: "Enter the original borrow ID." });
      return;
    }
    if (fullyRepaid) {
      setResult({ busy: false, error: "This loan is fully repaid. Start a new loan to borrow again." });
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setResult({ busy: false, error: "Enter an amount greater than zero." });
      return;
    }
    if (operation === "deposit" && numericAmount < 0.0001) {
      setResult({ busy: false, error: "The minimum collateral deposit is 0.0001 BTC." });
      return;
    }

    setResult({ busy: true, status: "Preparing transaction" });
    const callbacks: WorkflowCallbacks = {
      onStatusUpdate: (status) =>
        setResult((current) => ({
          ...current,
          status: status.label ?? "Processing",
        })),
      onDepositReady: (info) =>
        setResult((current) => ({ ...current, deposit: info, status: "Awaiting BTC deposit" })),
      onComplete: () => {
        setResult((current) => ({ ...current, busy: false, status: "Completed" }));
        void loadLoanInfo();
      },
      onError: (error: unknown) =>
        setResult((current) => ({ ...current, busy: false, error: errorMessage(error) })),
    };

    try {
      const response = operation === "deposit"
        ? await sdk.depositMore(normalizedLoanId, normalizedAmount, {
            trackWorkflow: true,
            callbacks,
          })
        : await sdk.borrowMore(normalizedLoanId, normalizedAmount, {
            trackWorkflow: true,
            callbacks,
          });

      setResult((current) => ({
        ...current,
        transactionId: response.transactionId,
        status: current.status ?? response.status ?? "Transaction created",
      }));
    } catch (error) {
      setResult({ busy: false, error: errorMessage(error) });
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Manage active loan</CardTitle>
          {result.status && <Badge variant="secondary">{result.status}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          <ModeButton disabled={managementDisabled} active={operation === "deposit"} onClick={() => setOperation("deposit")}>
            <ArrowDownToLine /> Deposit more
          </ModeButton>
          <ModeButton disabled={managementDisabled} active={operation === "borrow"} onClick={() => setOperation("borrow")}>
            <HandCoins /> Borrow more
          </ModeButton>
        </div>

        {fullyRepaid && (
          <div className="rounded-xl border border-dashed p-4">
            <p className="text-sm font-medium">Loan fully repaid</p>
            <p className="mt-1 text-xs text-muted-foreground">Deposit more and Borrow more are unavailable. Start a new loan to borrow again.</p>
          </div>
        )}

        {loanInfoError && (
          <p className="text-sm text-destructive" role="alert">{loanInfoError}</p>
        )}

        <Field label="Original borrow ID">
          <Input value={loanId} onChange={(event) => setLoanId(event.target.value)} placeholder="Borrow transaction ID" />
        </Field>
        <Field label={operation === "deposit" ? "Collateral amount (BTC)" : "Additional borrow amount"}>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={operation === "deposit" ? "0.001" : "500"}
          />
        </Field>

        <p className="text-xs text-muted-foreground">
          {operation === "deposit"
            ? "Adds Bitcoin collateral to lower your LTV. Minimum 0.0001 BTC."
            : "Draws against the loan’s available capacity and sends funds to its existing destination."}
        </p>

        <Button className="w-full" size="lg" disabled={managementDisabled || result.busy} onClick={() => void submit()}>
          {result.busy ? <LoaderCircle className="animate-spin" /> : operation === "deposit" ? <ArrowDownToLine /> : <HandCoins />}
          {!sessionReady ? "Preparing SDK…" : result.busy ? "Processing…" : operation === "deposit" ? "Deposit more" : "Borrow more"}
        </Button>

        {result.error && <p className="text-sm text-destructive" role="alert">{result.error}</p>}

        {result.deposit && (
          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">Send {result.deposit.amountBTC} BTC</p>
            <p className="break-all font-mono text-xs text-muted-foreground">{result.deposit.address}</p>
            <Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(result.deposit!.address)}>
              Copy address
            </Button>
          </div>
        )}

        {result.transactionId && (
          <div className="flex items-start gap-2 rounded-xl border border-border p-4">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Transaction created</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{result.transactionId}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModeButton({ active, className, ...props }: React.ComponentProps<"button"> & { active: boolean }) {
  return <button type="button" className={cn("flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors [&_svg]:size-4", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground", className)} {...props} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium"><span>{label}</span>{children}</label>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong.";
}
