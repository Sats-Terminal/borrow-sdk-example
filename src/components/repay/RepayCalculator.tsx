import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, TrendingUp, Shield } from 'lucide-react';

interface RepayCalculatorProps {
  repayAmount: number;
  remainingDebt: number;
  currentCollateralBtc: number;
  btcPrice: number;
  useCollateral?: boolean;
  collateralUsed?: number;
}

export function RepayCalculator({
  repayAmount,
  remainingDebt,
  currentCollateralBtc,
  btcPrice,
  useCollateral = false,
  collateralUsed = 0
}: RepayCalculatorProps) {
  const newDebt = Math.max(0, remainingDebt - repayAmount);
  const repaymentPercent = (repayAmount / remainingDebt) * 100;
  const isFullRepayment = repayAmount >= remainingDebt;

  // Aave-style health factor with 0.8 liquidation threshold
  const newCollateral = useCollateral ? currentCollateralBtc - collateralUsed : currentCollateralBtc;
  const currentHealthFactor = remainingDebt > 0 ? (currentCollateralBtc * btcPrice * 0.8) / remainingDebt : Infinity;
  const newHealthFactor = newDebt > 0 ? (newCollateral * btcPrice * 0.8) / newDebt : Infinity;

  return (
    <Card className="bg-secondary/30">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4" />
          <span>After Repayment</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Repayment</span>
            <span className="font-medium text-green-600">-${repayAmount.toLocaleString()}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">New Debt</span>
            <span className="font-medium">
              {isFullRepayment ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Paid Off
                </span>
              ) : (
                `$${newDebt.toLocaleString()}`
              )}
            </span>
          </div>

          {useCollateral && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collateral Used</span>
              <span className="font-medium">{collateralUsed.toFixed(6)} BTC</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Health Factor
            </span>
            <div className="text-right">
              <span className={currentHealthFactor === Infinity || currentHealthFactor > 1.5 ? 'text-green-600' : 'text-yellow-600'}>
                {currentHealthFactor === Infinity ? '∞' : currentHealthFactor.toFixed(2)}
              </span>
              <span className="mx-1 text-muted-foreground">→</span>
              <span className={newHealthFactor === Infinity || newHealthFactor > 1.5 ? 'text-green-600' : 'text-yellow-600'}>
                {newHealthFactor === Infinity ? '∞' : newHealthFactor.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Repayment Progress</span>
            <span>{Math.min(repaymentPercent, 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${Math.min(repaymentPercent, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
