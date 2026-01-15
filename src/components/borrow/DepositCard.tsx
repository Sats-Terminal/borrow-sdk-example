import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        variant: 'success' as 'default',
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
    <Card className="border-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Deposit Required</CardTitle>
          </div>
          <Badge variant="warning">Action Required</Badge>
        </div>
        <CardDescription>
          Send the exact amount of BTC to the address below to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-1">Deposit Amount</p>
          <p className="text-3xl font-bold">{amountBTC.toFixed(8)} BTC</p>
          <p className="text-sm text-muted-foreground">{amount.toLocaleString()} sats</p>
        </div>

        {/* Address Display */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Deposit Address</p>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="text-sm font-mono flex-1 break-all">
              {address}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="shrink-0"
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
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium">Important</p>
            <p>Send the exact amount shown. Sending a different amount may result in failed or delayed processing.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSendDeposit}
            disabled={loading || sending}
            className="flex-1"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send from Wallet
              </>
            )}
          </Button>
          <Button variant="outline" onClick={copyAddress}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Address
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
