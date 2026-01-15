import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export function WalletConnect() {
  const { isConnected, btcAddress, walletType, loading, connect, disconnect } = useBorrowSDK();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2.5 px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-lg">
          <div className="p-1.5 rounded-full bg-green-500/10">
            <Wallet className="h-3.5 w-3.5 text-green-600" />
          </div>
          <span className="text-sm font-mono font-medium">
            {btcAddress?.slice(0, 6)}...{btcAddress?.slice(-4)}
          </span>
          <span className="text-xs text-muted-foreground capitalize bg-zinc-100 px-1.5 py-0.5 rounded">
            {walletType}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={disconnect} className="text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button onClick={() => connect('unisat')} disabled={loading} variant="accent" className="font-semibold">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'UniSat'}
      </Button>
      <Button variant="outline" onClick={() => connect('xverse')} disabled={loading} className="font-semibold">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xverse'}
      </Button>
    </div>
  );
}
