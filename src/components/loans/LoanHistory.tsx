import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { LoanDetailsDialog } from './LoanDetailsDialog';
import type { UserTransaction } from '@satsterminal-sdk/borrow';
import { Units } from '@satsterminal-sdk/borrow';
import {
  RefreshCw, Loader2, ChevronRight,
  Bitcoin, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';

export function LoanHistory() {
  const { isConnected, transactions, loadTransactions, transactionsLoading } = useBorrowSDK();
  const [selectedLoan, setSelectedLoan] = useState<UserTransaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadTransactions().finally(() => setHasLoaded(true));
    }
  }, [isConnected, loadTransactions]);

  const handleLoanClick = (loan: UserTransaction) => {
    setSelectedLoan(loan);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setSelectedLoan(null);
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    switch (s) {
      case 'active':
        return (
          <Badge variant="success" className="gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Active
          </Badge>
        );
      case 'completed':
      case 'repaid':
      case 'closed':
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Repaid
          </Badge>
        );
      case 'pending':
      case 'awaiting_deposit':
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const isClickable = (status: string) => {
    const s = status?.toLowerCase() || '';
    return s === 'active' || s === 'completed' || s === 'repaid';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Skeleton row for loading state
  const SkeletonRow = () => (
    <div className="flex items-center justify-between px-4 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-100" />
        <div className="space-y-2">
          <div className="h-4 w-20 bg-zinc-100 rounded" />
          <div className="h-3 w-28 bg-zinc-100 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-5 w-16 bg-zinc-100 rounded" />
        <div className="h-4 w-12 bg-zinc-100 rounded" />
      </div>
    </div>
  );

  return (
    <>
      {/* Fixed container - always the same structure */}
      <div className="rounded-xl border-[0.5px] bg-card overflow-hidden min-h-[400px] flex flex-col">
        {/* Header - always visible */}
        <div className="flex items-center justify-between p-4 border-b-[0.5px]">
          <div>
            <h2 className="font-semibold">My Loans</h2>
            <p className="text-sm text-muted-foreground">
              {hasLoaded ? `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}` : 'Loading...'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadTransactions()}
            disabled={transactionsLoading}
            className="gap-2"
          >
            {transactionsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Content area - fixed height container */}
        <div className="flex-1">
          {/* Loading state */}
          {!hasLoaded && (
            <div className="divide-y divide-border">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {/* Empty state */}
          {hasLoaded && transactions.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No loans yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first loan in the Borrow tab
                </p>
              </div>
            </div>
          )}

          {/* Transactions list */}
          {hasLoaded && transactions.length > 0 && (
            <div className="divide-y divide-border">
              {transactions.map((tx) => {
                const collateralAmount = tx.borrowTransaction?.collateralAmount || '0';
                const collateralBtc = parseFloat(Units.normalizeToBtc(collateralAmount));
                const protocol = tx.borrowTransaction?.protocol || 'AAVE';
                const chain = tx.borrowTransaction?.chain || 'Base';
                const clickable = isClickable(tx.status);

                return (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between px-4 py-3 transition-colors ${
                      clickable ? 'cursor-pointer hover:bg-zinc-50' : ''
                    }`}
                    onClick={() => clickable && handleLoanClick(tx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                        <Bitcoin className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold font-mono">
                          ${parseFloat(tx.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {collateralBtc.toFixed(4)} BTC · {protocol} · {chain}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(tx.status)}
                      <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                        {formatDate(tx.timestamp)}
                      </span>
                      {clickable && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <LoanDetailsDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        loan={selectedLoan}
        onActionComplete={() => loadTransactions()}
      />
    </>
  );
}
