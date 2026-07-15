'use client';

import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserLoans } from '@/hooks/use-user-loans';
import { isPendingLoan, type LoanHistoryFilter, type LoanSummary } from '@/lib/loan-summary';
import { cn } from '@/lib/utils';

export function UserLoans({ defaultFilter = 'active', pageSize = 10, onManageLoan, onTrackLoan, className }: { defaultFilter?: LoanHistoryFilter; pageSize?: number; onManageLoan?: (loan: LoanSummary) => void; onTrackLoan?: (loan: LoanSummary) => void; className?: string }) {
  const history = useUserLoans({ initialFilter: defaultFilter, pageSize });
  return <Card className={className}>
    <CardHeader className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Your loans</CardTitle><p className="mt-1 text-sm text-muted-foreground">{history.totalLoans} loan transactions</p></div><Button variant="outline" size="sm" disabled={history.loading || !history.sessionReady} onClick={() => void history.refresh()}><RefreshCw className={cn(history.loading && 'animate-spin')} /> Refresh</Button></div>
      <div className="flex gap-1 rounded-lg bg-muted p-1">{(['active', 'pending', 'all'] as const).map((filter) => <button key={filter} type="button" onClick={() => history.setFilter(filter)} className={cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors', history.filter === filter ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{filter}</button>)}</div>
    </CardHeader>
    <CardContent className="space-y-3">
      {!history.sessionReady && <Message title="SDK authorization required" body="Authorize the Borrow SDK before loading loan history." />}
      {history.error && <Message title="Couldn’t load loans" body={history.error} action={<Button variant="outline" size="sm" onClick={() => void history.refresh()}>Try again</Button>} />}
      {history.loading && history.loans.length === 0 && Array.from({ length: 3 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-xl bg-muted" />)}
      {!history.loading && !history.error && history.sessionReady && history.loans.length === 0 && <Message title="No loans found" body={`There are no ${history.filter === 'all' ? '' : `${history.filter} `}loans for this wallet.`} />}
      {history.loans.map((loan, index) => <LoanCard key={`${loan.originalBorrowId}-${loan.workflowId ?? loan.id}-${index}`} loan={loan} onManageLoan={onManageLoan} onTrackLoan={onTrackLoan} />)}
    </CardContent>
    {history.totalPages > 1 && <CardFooter className="justify-between border-t pt-4"><Button variant="outline" size="sm" disabled={history.page <= 1 || history.loading} onClick={() => history.setPage(history.page - 1)}><ArrowLeft /> Previous</Button><span className="text-xs text-muted-foreground">Page {history.page} of {history.totalPages}</span><Button variant="outline" size="sm" disabled={history.page >= history.totalPages || history.loading} onClick={() => history.setPage(history.page + 1)}>Next <ArrowRight /></Button></CardFooter>}
  </Card>;
}

function LoanCard({ loan, onManageLoan, onTrackLoan }: { loan: LoanSummary; onManageLoan?: (loan: LoanSummary) => void; onTrackLoan?: (loan: LoanSummary) => void }) {
  const pending = isPendingLoan(loan);
  return <article className="space-y-4 rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-semibold">{formatAmount(loan.amount)} {loan.currency}</p><p className="text-xs text-muted-foreground">{loan.timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(loan.timestamp) : 'Date unavailable'}</p></div><Badge variant="outline" className="capitalize">{formatLabel(loan.status)}</Badge></div><dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3"><Detail label="Protocol" value={loan.protocol ? formatLabel(loan.protocol) : '—'} /><Detail label="Chain" value={loan.chain ? formatLabel(loan.chain) : '—'} /><Detail label="Loan ID" value={shortId(loan.originalBorrowId)} mono /></dl>{(onManageLoan || (pending && onTrackLoan)) && <div className="flex flex-wrap gap-2 border-t pt-3">{pending && onTrackLoan && <Button size="sm" variant="outline" onClick={() => onTrackLoan(loan)}>Track loan</Button>}{onManageLoan && <Button size="sm" onClick={() => onManageLoan(loan)}>Manage loan</Button>}</div>}</article>;
}
function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={cn('truncate font-medium', mono && 'font-mono')}>{value}</dd></div>; }
function Message({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) { return <div className="space-y-2 rounded-xl border border-dashed p-6 text-center"><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{body}</p>{action}</div>; }
function formatAmount(value: string) { const amount = Number(value); return Number.isFinite(amount) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(amount) : value; }
function formatLabel(value: string) { return value.replaceAll('_', ' ').toLowerCase(); }
function shortId(value: string) { return value.length > 16 ? `${value.slice(0, 7)}…${value.slice(-6)}` : value; }
