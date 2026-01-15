import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useToast } from '@/hooks/use-toast';
import { ChainType } from '@satsterminal-sdk/borrow';
import { Loader2, Send, Zap, DollarSign } from 'lucide-react';

const SUPPORTED_CHAINS = [
  { value: ChainType.BASE, label: 'Base' },
  { value: ChainType.ETHEREUM, label: 'Ethereum' },
  { value: ChainType.ARBITRUM, label: 'Arbitrum' },
];

export function WithdrawToEVMDialog() {
  const { withdrawToEVM, loading } = useBorrowSDK();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [chain, setChain] = useState<ChainType>(ChainType.BASE);
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');

  const handleWithdraw = async () => {
    if (!amount || !destinationAddress) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    // Basic EVM address validation
    if (!destinationAddress.startsWith('0x') || destinationAddress.length !== 42) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid EVM address',
        variant: 'destructive',
      });
      return;
    }

    try {
      const txHash = await withdrawToEVM(chain, amount, destinationAddress);
      toast({
        title: 'Withdrawal Successful',
        description: `Transaction: ${txHash.slice(0, 16)}...`,
      });
      setOpen(false);
      setAmount('');
      setDestinationAddress('');
    } catch (err) {
      toast({
        title: 'Withdrawal Failed',
        description: err instanceof Error ? err.message : 'Failed to withdraw',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Send className="h-4 w-4" />
          Withdraw to EVM
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Withdraw to EVM
            <Badge variant="secondary" className="ml-2">
              <Zap className="h-3 w-3 mr-1" />
              Gasless
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Send USDC from your smart account to any EVM address without gas fees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Chain Selection */}
          <div className="space-y-2">
            <Label>Destination Chain</Label>
            <Select value={chain} onValueChange={(v) => setChain(v as ChainType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CHAINS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="evmAmount">Amount (USDC)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="evmAmount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                placeholder="100.00"
              />
            </div>
          </div>

          {/* Destination Address */}
          <div className="space-y-2">
            <Label htmlFor="evmAddress">Destination Address</Label>
            <Input
              id="evmAddress"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>

          {/* Info */}
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Gasless Transfer</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              This transfer is sponsored - you don't pay any gas fees!
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={loading || !amount || !destinationAddress}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Send USDC'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
