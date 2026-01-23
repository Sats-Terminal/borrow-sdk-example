import { Card, CardContent } from '@/components/ui/card';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { Bitcoin, DollarSign, TrendingUp } from 'lucide-react';
import { Units } from '@satsterminal-sdk/borrow';

export function LoanSummary() {
  const { transactions } = useBorrowSDK();

  const activeLoans = transactions.filter(t => t.status?.toLowerCase() === 'active');
  const totalBorrowed = transactions.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  const totalCollateral = transactions.reduce((sum, t) => {
    const collateral = t.borrowTransaction?.collateralAmount || '0';
    return sum + parseFloat(Units.normalizeToBtc(collateral));
  }, 0);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Active Loans</p>
          <p className="text-2xl font-bold font-mono">{activeLoans.length}</p>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Borrowed</p>
            <p className="font-semibold font-mono">${totalBorrowed.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Bitcoin className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Collateral</p>
            <p className="font-semibold font-mono">{totalCollateral.toFixed(4)} BTC</p>
          </div>
        </div>

        {activeLoans.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg. Loan Size</p>
                <p className="font-semibold font-mono">
                  ${(totalBorrowed / activeLoans.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
