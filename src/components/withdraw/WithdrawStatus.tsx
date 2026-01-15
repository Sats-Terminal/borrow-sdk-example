import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { CheckCircle2, Clock, AlertTriangle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

interface WithdrawStatusProps {
  transactionId: string;
  type: 'evm' | 'bitcoin' | 'collateral';
}

export function WithdrawStatus({ transactionId, type }: WithdrawStatusProps) {
  const { getWithdrawStatus, loading } = useBorrowSDK();
  const [status, setStatus] = useState<{
    status: string;
    txHash?: string;
    amount: string;
    chain: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const result = await getWithdrawStatus(transactionId);
      setStatus(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  };

  useEffect(() => {
    if (transactionId) {
      fetchStatus();
      // Poll every 10 seconds
      const interval = setInterval(fetchStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [transactionId]);

  const getStatusBadge = () => {
    if (!status) return null;
    switch (status.status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status.status}</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (!status) return <Loader2 className="h-5 w-5 animate-spin" />;
    switch (status.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getExplorerUrl = () => {
    if (!status?.txHash) return null;
    if (type === 'bitcoin') {
      return `https://mempool.space/tx/${status.txHash}`;
    }
    // For EVM chains
    const explorers: Record<string, string> = {
      base: 'https://basescan.org/tx/',
      ethereum: 'https://etherscan.io/tx/',
      arbitrum: 'https://arbiscan.io/tx/',
    };
    const explorer = explorers[status.chain] || 'https://etherscan.io/tx/';
    return `${explorer}${status.txHash}`;
  };

  const getProgress = () => {
    if (!status) return 0;
    switch (status.status) {
      case 'completed':
        return 100;
      case 'processing':
        return 60;
      case 'pending':
        return 30;
      default:
        return 0;
    }
  };

  if (!transactionId) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">Withdrawal Status</CardTitle>
              <CardDescription className="font-mono text-xs">
                {transactionId.slice(0, 12)}...
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <Progress value={getProgress()} className="h-2" />

        {/* Details */}
        {status && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium">{status.amount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Chain</p>
              <p className="font-medium capitalize">{status.chain}</p>
            </div>
          </div>
        )}

        {/* Transaction Hash */}
        {status?.txHash && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Transaction Hash</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono flex-1 truncate">
                {status.txHash}
              </code>
              {getExplorerUrl() && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={getExplorerUrl()!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
