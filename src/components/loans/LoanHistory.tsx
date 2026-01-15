import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { LoanDetailsDialog } from './LoanDetailsDialog';
import type { UserTransaction } from '@satsterminal-sdk/borrow';
import { Units } from '@satsterminal-sdk/borrow';
import {
  RefreshCw, Loader2, FileText, History, ChevronRight,
  Bitcoin, DollarSign, Wallet
} from 'lucide-react';

export function LoanHistory() {
  const { isConnected, transactions, loadTransactions, loading } = useBorrowSDK();
  const [selectedLoan, setSelectedLoan] = useState<UserTransaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadTransactions();
    }
  }, [isConnected, loadTransactions]);

  const handleLoanClick = (loan: UserTransaction) => {
    setSelectedLoan(loan);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedLoan(null);
    }
  };

  const handleActionComplete = () => {
    loadTransactions();
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    switch (normalizedStatus) {
      case 'active':
      case 'loan_confirmed':
      case 'loan_active':
        return <Badge variant="success">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'pending':
      case 'initializing':
        return <Badge variant="warning">Pending</Badge>;
      case 'awaiting_deposit':
      case 'awaiting_deposit_confirmation':
        return <Badge variant="warning">Awaiting Deposit</Badge>;
      case 'processing':
      case 'preparing_borrow_deposit':
      case 'preparing_loan':
        return <Badge variant="outline">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const isLoanActive = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    return normalizedStatus === 'active' || normalizedStatus === 'loan_confirmed' || normalizedStatus === 'loan_active';
  };

  const isLoanClickable = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    return normalizedStatus === 'active' || normalizedStatus === 'loan_confirmed' ||
           normalizedStatus === 'loan_active' || normalizedStatus === 'completed';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeLoans = transactions.filter(t => isLoanActive(t.status));
  const otherTransactions = transactions.filter(t => !isLoanActive(t.status));

  return (
    <div className="space-y-6">
      {/* Active Loans - Clickable Cards */}
      {activeLoans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Wallet className="h-5 w-5 text-orange-500" />
              </div>
              Active Loans
            </h2>
            <Button variant="outline" size="sm" onClick={loadTransactions} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="grid gap-3">
            {activeLoans.map((loan) => {
              const collateralAmount = loan.borrowTransaction?.collateralAmount || '0';
              const collateralBtc = parseFloat(Units.normalizeToBtc(collateralAmount));
              const protocol = loan.borrowTransaction?.protocol || 'AAVE';
              const chain = loan.borrowTransaction?.chain || 'BASE';

              return (
                <Card
                  key={loan.id}
                  className="cursor-pointer hover:border-orange-500/50 transition-all hover:shadow-md"
                  onClick={() => handleLoanClick(loan)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-full bg-orange-500/10">
                          <DollarSign className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-xl font-mono">
                              ${parseFloat(loan.amount).toLocaleString()}
                            </p>
                            <Badge variant="success">Active</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1.5 font-mono">
                              <Bitcoin className="h-3.5 w-3.5 text-orange-500" />
                              {collateralBtc.toFixed(6)} BTC
                            </span>
                            <span>•</span>
                            <span>{protocol}</span>
                            <Badge variant="secondary" className="text-xs capitalize">{chain}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground font-mono">
                          {formatDate(loan.timestamp)}
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Click on a loan to repay, withdraw collateral, or transfer USDC
          </p>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-zinc-100">
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  {transactions.length} total transaction{transactions.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadTransactions} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {otherTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan</TableHead>
                  <TableHead>Collateral</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherTransactions.map((tx) => {
                  const collateralAmount = tx.borrowTransaction?.collateralAmount || '0';
                  const collateralBtc = parseFloat(Units.normalizeToBtc(collateralAmount));
                  const clickable = isLoanClickable(tx.status);

                  return (
                    <TableRow
                      key={tx.id}
                      className={clickable ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => clickable && handleLoanClick(tx)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            ${parseFloat(tx.amount).toLocaleString()} {tx.currency}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Bitcoin className="h-3 w-3" />
                          <span>{collateralBtc.toFixed(6)} BTC</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{formatDate(tx.timestamp)}</span>
                          <span className="text-xs">{formatTime(tx.timestamp)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {clickable && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : activeLoans.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-50 flex items-center justify-center">
                <FileText className="h-8 w-8 text-zinc-300" />
              </div>
              <p className="text-muted-foreground font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your loan history will appear here
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>All your loans are active. Click on them above to manage.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Details Dialog */}
      <LoanDetailsDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        loan={selectedLoan}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}
