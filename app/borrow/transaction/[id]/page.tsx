import { BorrowTransactionPageClient } from "./page-client";

export default async function BorrowTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ loanId?: string; manage?: string; currency?: string; chain?: string }>;
}) {
  const { id } = await params;
  const { loanId, manage, currency, chain } = await searchParams;

  return (
    <BorrowTransactionPageClient
      transactionId={id}
      loanId={loanId ?? id}
      showManagement={manage === "1"}
      currency={currency ?? "USDC"}
      chain={chain}
    />
  );
}
