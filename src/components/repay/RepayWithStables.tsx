import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useBtcPrice } from '@/hooks/useBtcPrice';
import { useToast } from '@/hooks/use-toast';
import { RepayCalculator } from './RepayCalculator';
import { Units } from '@/lib/units';
import { Loader2, DollarSign } from 'lucide-react';

interface RepayWithStablesProps {
  loanId: string;
  remainingDebt: number;
  onSuccess: () => void;
}

export function RepayWithStables({ loanId, remainingDebt, onSuccess }: RepayWithStablesProps) {
  const { repay, repaying, getLoanCollateralInfo } = useBorrowSDK();
  const { toast } = useToast();
  const btcPrice = useBtcPrice();

  const [repayAmount, setRepayAmount] = useState(remainingDebt.toString());
  const [currentCollateralBtc, setCurrentCollateralBtc] = useState(0);

  useEffect(() => {
    getLoanCollateralInfo(loanId)
      .then(info => {
        if (info?.totalCollateral) {
          setCurrentCollateralBtc(parseFloat(Units.normalizeToBtc(info.totalCollateral)));
        }
      })
      .catch(err => console.error('[RepayWithStables] Failed to load collateral info:', err));
  }, [loanId, getLoanCollateralInfo]);

  const handleRepay = async () => {
    try {
      const txId = await repay(loanId, repayAmount);

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

  const setMaxAmount = () => {
    setRepayAmount(remainingDebt.toString());
  };

  return (
    <div className="space-y-4">
      {/* Debt Summary */}
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">Remaining Debt</p>
        <p className="text-xl font-semibold">${remainingDebt.toLocaleString()} USDC</p>
      </div>

      {/* Repay Amount */}
      <div className="space-y-2">
        <Label htmlFor="repayAmount">Repay Amount (USDC)</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="repayAmount"
            type="number"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            className="pl-9"
            min="0"
            max={remainingDebt}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={setMaxAmount}
          >
            Max
          </Button>
        </div>
      </div>

      {/* Calculator */}
      <RepayCalculator
        repayAmount={parseFloat(repayAmount) || 0}
        remainingDebt={remainingDebt}
        currentCollateralBtc={currentCollateralBtc}
        btcPrice={btcPrice ?? 0}
      />

      {/* Submit Button */}
      <Button
        onClick={handleRepay}
        disabled={repaying || !repayAmount || parseFloat(repayAmount) <= 0}
        className="w-full"
      >
        {repaying ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Repay $${parseFloat(repayAmount).toLocaleString()}`
        )}
      </Button>
    </div>
  );
}
