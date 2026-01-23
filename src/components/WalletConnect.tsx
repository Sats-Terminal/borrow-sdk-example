import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export function WalletConnect() {
  const { isConnected, btcAddress, walletType, connectingWallet, connect, disconnect } = useBorrowSDK();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-[0.5px] bg-card">
          <div className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center">
            <Wallet className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-mono text-sm hidden sm:inline">
            {btcAddress?.slice(0, 4)}...{btcAddress?.slice(-4)}
          </span>
          <Badge variant="secondary" className="capitalize hidden sm:inline-flex">
            {walletType}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="h-9 w-9 p-0 text-muted-foreground hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => connect('unisat')}
        disabled={connectingWallet}
        variant="accent"
        className="h-10 gap-2"
      >
        {connectingWallet ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">UniSat</span>
      </Button>
      <Button
        variant="outline"
        onClick={() => connect('xverse')}
        disabled={connectingWallet}
        className="h-10 gap-2"
      >
        {connectingWallet ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Xverse</span>
      </Button>
    </div>
  );
}
