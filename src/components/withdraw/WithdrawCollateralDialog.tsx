import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bitcoin, ArrowDownToLine, AlertTriangle } from 'lucide-react';

export function WithdrawCollateralDialog() {
  const { transactions, withdrawCollateral, btcAddress, loading } = useBorrowSDK();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState(btcAddress || '');

  const activeLoans = transactions.filter(t => t.status === 'active');

  const handleWithdraw = async () => {
    if (!selectedLoan || !amount || !withdrawAddress) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const txId = await withdrawCollateral(selectedLoan, amount, withdrawAddress);
      toast({
        title: 'Withdrawal Initiated',
        description: `Transaction ID: ${txId}`,
      });
      setOpen(false);
      setAmount('');
    } catch (err) {
      toast({
        title: 'Withdrawal Failed',
        description: err instanceof Error ? err.message : 'Failed to withdraw collateral',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bitcoin className="h-4 w-4" />
          Withdraw Collateral
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Withdraw Collateral
          </DialogTitle>
          <DialogDescription>
            Withdraw excess BTC collateral from your active loans
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {activeLoans.length === 0 ? (
            <div className="text-center py-6">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No active loans</p>
              <p className="text-sm text-muted-foreground">
                You need an active loan to withdraw collateral
              </p>
            </div>
          ) : (
            <>
              {/* Loan Selection */}
              <div className="space-y-2">
                <Label>Select Loan</Label>
                <Select value={selectedLoan} onValueChange={setSelectedLoan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a loan" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLoans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id}>
                        ${parseFloat(loan.amount).toLocaleString()} USDC - {loan.borrowTransaction?.protocol || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="withdrawAmount">Amount (BTC)</Label>
                <div className="relative">
                  <Input
                    id="withdrawAmount"
                    type="number"
                    step="0.00001"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.001"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    BTC
                  </span>
                </div>
              </div>

              {/* Withdrawal Address */}
              <div className="space-y-2">
                <Label htmlFor="withdrawAddress">BTC Withdrawal Address</Label>
                <Input
                  id="withdrawAddress"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="bc1q..."
                />
                <p className="text-xs text-muted-foreground">
                  Default: Your connected wallet address
                </p>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  Withdrawing too much collateral may affect your health factor and increase liquidation risk.
                </p>
              </div>
            </>
          )}
        </div>

        {activeLoans.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={loading || !selectedLoan || !amount || !withdrawAddress}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Withdraw Collateral'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
