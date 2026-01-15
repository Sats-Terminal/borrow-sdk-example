import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useToast } from '@/hooks/use-toast';
import { ChainType } from '@satsterminal-sdk/borrow';
import { Loader2, Bitcoin, ArrowRight, DollarSign, AlertTriangle } from 'lucide-react';

const SOURCE_CHAINS = [
  { value: ChainType.BASE, label: 'Base' },
  { value: ChainType.ETHEREUM, label: 'Ethereum' },
  { value: ChainType.ARBITRUM, label: 'Arbitrum' },
];

export function WithdrawToBitcoinDialog() {
  const { withdrawToBitcoin, btcAddress, loading } = useBorrowSDK();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [chain, setChain] = useState<ChainType>(ChainType.BASE);
  const [amount, setAmount] = useState('');
  const [btcWithdrawAddress, setBtcWithdrawAddress] = useState(btcAddress || '');

  // Mock exchange rate
  const btcPrice = 95000;
  const estimatedBtc = parseFloat(amount) ? parseFloat(amount) / btcPrice : 0;

  const handleWithdraw = async () => {
    if (!amount || !btcWithdrawAddress) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const txId = await withdrawToBitcoin(chain, amount, 'USDC', btcWithdrawAddress);
      toast({
        title: 'Cross-Chain Withdrawal Initiated',
        description: `Transaction ID: ${txId}`,
      });
      setOpen(false);
      setAmount('');
    } catch (err) {
      toast({
        title: 'Withdrawal Failed',
        description: err instanceof Error ? err.message : 'Failed to initiate withdrawal',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bitcoin className="h-4 w-4" />
          Withdraw to Bitcoin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-orange-500" />
            Withdraw to Bitcoin
          </DialogTitle>
          <DialogDescription>
            Convert USDC to BTC and send to your Bitcoin address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Chain */}
          <div className="space-y-2">
            <Label>Source Chain</Label>
            <Select value={chain} onValueChange={(v) => setChain(v as ChainType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_CHAINS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="btcAmount">Amount (USDC)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="btcAmount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                placeholder="1000.00"
              />
            </div>
          </div>

          {/* Conversion Preview */}
          {parseFloat(amount) > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">You Send</span>
                <span className="font-medium">${parseFloat(amount).toLocaleString()} USDC</span>
              </div>
              <div className="flex items-center justify-center py-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">You Receive (est.)</span>
                <span className="font-medium text-orange-500">
                  ~{estimatedBtc.toFixed(8)} BTC
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Rate: 1 BTC = ${btcPrice.toLocaleString()}
              </p>
            </div>
          )}

          {/* Bitcoin Address */}
          <div className="space-y-2">
            <Label htmlFor="btcAddress">Bitcoin Address</Label>
            <Input
              id="btcAddress"
              value={btcWithdrawAddress}
              onChange={(e) => setBtcWithdrawAddress(e.target.value)}
              placeholder="bc1q..."
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Cross-Chain Transfer</p>
              <p>This process involves bridging and swapping. It may take 10-30 minutes to complete.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={loading || !amount || !btcWithdrawAddress}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Start Withdrawal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
