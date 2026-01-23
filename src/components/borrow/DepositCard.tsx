import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useToast } from '@/hooks/use-toast';
import { Copy, CheckCircle2, Bitcoin, Send, Loader2, AlertCircle } from 'lucide-react';

interface DepositCardProps {
  address: string;
  amount: number;
  amountBTC: number;
}

export function DepositCard({ address, amount, amountBTC }: DepositCardProps) {
  const { sendBitcoin, loading } = useBorrowSDK();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast({
      title: 'Address Copied',
      description: 'Deposit address copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendDeposit = async () => {
    setSending(true);
    try {
      const txHash = await sendBitcoin(address, amount);
      toast({
        title: 'Deposit Sent',
        description: `Transaction: ${txHash.slice(0, 16)}...`,
      });
    } catch (err) {
      toast({
        title: 'Failed to Send',
        description: err instanceof Error ? err.message : 'Transaction failed',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border-[0.5px] border-orange-200 bg-orange-500/5 overflow-hidden">
      {/* Header */}
      <div className="bg-orange-500/10 px-4 py-3 border-b-[0.5px] border-orange-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Bitcoin className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Deposit BTC</span>
          </div>
          <Badge variant="warning" className="gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Action Required
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Amount */}
        <div className="text-center p-4 bg-white rounded-xl border-[0.5px]">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono mb-1">Deposit Amount</p>
          <p className="text-2xl font-bold font-mono">{amountBTC.toFixed(8)}</p>
          <p className="text-sm text-muted-foreground font-mono">{amount.toLocaleString()} sats</p>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Deposit Address</p>
          <div className="flex items-center gap-2 p-3 bg-white rounded-lg border-[0.5px]">
            <code className="text-xs font-mono flex-1 break-all text-muted-foreground">
              {address}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="shrink-0 h-8 w-8 p-0"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border-[0.5px] border-amber-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700">
            <p className="font-semibold">Send exact amount</p>
            <p className="text-amber-600">Different amounts may cause delays or failures</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSendDeposit}
            disabled={loading || sending}
            variant="accent"
            className="flex-1 h-10"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send from Wallet
              </>
            )}
          </Button>
          <Button variant="outline" onClick={copyAddress} className="h-10">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
