import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { LoanActions } from './LoanActions';
import type { UserTransaction, LoanCollateralInfo } from '@satsterminal-sdk/borrow';
import { Units } from '@satsterminal-sdk/borrow';
import { Bitcoin, DollarSign, Shield } from 'lucide-react';

interface LoanCardProps {
  transaction: UserTransaction;
}

export function LoanCard({ transaction }: LoanCardProps) {
  const { getLoanCollateralInfo } = useBorrowSDK();
  const [collateralInfo, setCollateralInfo] = useState<LoanCollateralInfo | null>(null);

  useEffect(() => {
    const fetchCollateralInfo = async () => {
      const info = await getLoanCollateralInfo(transaction.id);
      setCollateralInfo(info);
    };
    fetchCollateralInfo();
  }, [transaction.id, getLoanCollateralInfo]);

  const borrowDetails = transaction.borrowTransaction;

  // Parse amounts using Units utility for type-safe conversion
  const loanAmount = parseFloat(transaction.amount) || 0;
  const totalCollateral = collateralInfo?.totalCollateral
    ? parseFloat(Units.normalizeToBtc(collateralInfo.totalCollateral))
    : 0;
  const totalDebt = collateralInfo?.totalDebt
    ? parseFloat(collateralInfo.totalDebt)
    : loanAmount;
  const remainingDebt = collateralInfo?.remainingDebt
    ? parseFloat(collateralInfo.remainingDebt)
    : loanAmount;

  // Calculate health factor (simplified)
  const btcPrice = 95000; // Mock price
  const collateralValue = totalCollateral * btcPrice;
  const healthFactor = remainingDebt > 0 ? collateralValue / remainingDebt : 0;
  const healthColor = healthFactor > 1.5 ? 'text-green-500' : healthFactor > 1.2 ? 'text-yellow-500' : 'text-red-500';

  // Repayment progress
  const repaymentProgress = totalDebt > 0
    ? ((totalDebt - remainingDebt) / totalDebt) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-orange-500/10">
              <DollarSign className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-mono">
                ${loanAmount.toLocaleString()}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {borrowDetails?.protocol || 'Unknown Protocol'} • USDC
              </p>
            </div>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Bitcoin className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs uppercase tracking-wide">Collateral</span>
            </div>
            <p className="font-semibold font-mono">{totalCollateral.toFixed(6)} BTC</p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ ${(totalCollateral * btcPrice).toLocaleString()}
            </p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-xs uppercase tracking-wide">Debt</span>
            </div>
            <p className="font-semibold font-mono">${remainingDebt.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              of ${totalDebt.toLocaleString()}
            </p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Shield className="h-3.5 w-3.5" />
              <span className="text-xs uppercase tracking-wide">Health</span>
            </div>
            <p className={`font-semibold font-mono ${healthColor}`}>
              {healthFactor > 0 ? healthFactor.toFixed(2) : '-'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {healthFactor > 1.5 ? 'Healthy' : healthFactor > 1.2 ? 'Moderate' : 'At Risk'}
            </p>
          </div>
        </div>

        {/* Repayment Progress */}
        <div className="space-y-3 p-4 bg-zinc-50 border border-zinc-100 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Repayment Progress</span>
            <span className="font-mono font-semibold">{repaymentProgress.toFixed(1)}%</span>
          </div>
          <Progress value={repaymentProgress} className="h-2" />
        </div>

        <Separator />

        {/* Loan Actions */}
        <LoanActions
          loanId={transaction.id}
          remainingDebt={remainingDebt}
        />
      </CardContent>
    </Card>
  );
}
