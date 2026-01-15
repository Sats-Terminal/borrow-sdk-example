import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useToast } from '@/hooks/use-toast';
import { RepayCalculator } from './RepayCalculator';
import { Loader2, Bitcoin, AlertTriangle } from 'lucide-react';

interface RepayWithCollateralProps {
  loanId: string;
  remainingDebt: number;
  onSuccess: () => void;
}

export function RepayWithCollateral({ loanId, remainingDebt, onSuccess }: RepayWithCollateralProps) {
  const { repay, btcAddress, loading } = useBorrowSDK();
  const { toast } = useToast();

  const [repayAmount, setRepayAmount] = useState(remainingDebt.toString());

  // Mock BTC price for calculation
  const btcPrice = 95000;
  const collateralNeeded = parseFloat(repayAmount) / btcPrice;

  const handleRepay = async () => {
    try {
      const txId = await repay(loanId, repayAmount, {
        useCollateral: true,
        userBtcWithdrawAddress: btcAddress || undefined
      });

      toast({
        title: 'Repayment Initiated',
        description: `Transaction ID: ${txId}`,
      });
      onSuccess();
    } catch (err) {
      toast({
        title: 'Repayment Failed',
        description: err instanceof Error ? err.message : 'Failed to process repayment',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Warning */}
      <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-700">
          <p className="font-medium">Using Collateral</p>
          <p>Your BTC collateral will be sold to repay the loan. The remaining collateral (if any) will be returned to your wallet.</p>
        </div>
      </div>

      {/* Debt Summary */}
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">Remaining Debt</p>
        <p className="text-xl font-semibold">${remainingDebt.toLocaleString()} USDC</p>
      </div>

      {/* Repay Amount */}
      <div className="space-y-2">
        <Label htmlFor="repayAmount">Repay Amount (USDC)</Label>
        <Input
          id="repayAmount"
          type="number"
          value={repayAmount}
          onChange={(e) => setRepayAmount(e.target.value)}
          min="0"
          max={remainingDebt}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRepayAmount(remainingDebt.toString())}
        >
          Set Full Amount
        </Button>
      </div>

      {/* Collateral Calculation */}
      <div className="p-4 border rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5 text-orange-500" />
          <span className="font-medium">Collateral Required</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">BTC Amount</p>
            <p className="font-semibold">{collateralNeeded.toFixed(8)} BTC</p>
          </div>
          <div>
            <p className="text-muted-foreground">At Current Price</p>
            <p className="font-semibold">${btcPrice.toLocaleString()}/BTC</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          * Actual amount may vary based on market conditions and slippage
        </p>
      </div>

      {/* Calculator */}
      <RepayCalculator
        repayAmount={parseFloat(repayAmount) || 0}
        remainingDebt={remainingDebt}
        useCollateral
        collateralUsed={collateralNeeded}
      />

      {/* Submit Button */}
      <Button
        onClick={handleRepay}
        disabled={loading || !repayAmount || parseFloat(repayAmount) <= 0}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Repay with ${collateralNeeded.toFixed(6)} BTC`
        )}
      </Button>
    </div>
  );
}
