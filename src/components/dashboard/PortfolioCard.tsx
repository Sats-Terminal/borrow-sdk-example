import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { RefreshCw, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

export function PortfolioCard() {
  const { isConnected, walletPortfolio, getWalletPortfolio, loading } = useBorrowSDK();

  useEffect(() => {
    if (isConnected) {
      getWalletPortfolio();
    }
  }, [isConnected, getWalletPortfolio]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
          <CardDescription>Connect wallet to view</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalValue = walletPortfolio?.attributes?.total?.positions || 0;
  const change1d = walletPortfolio?.attributes?.changes?.absolute_1d || 0;
  const changePercent1d = walletPortfolio?.attributes?.changes?.percent_1d || 0;
  const isPositive = change1d >= 0;

  const chainDistribution = walletPortfolio?.attributes?.positions_distribution_by_chain || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio</CardTitle>
            <CardDescription>Your wallet holdings overview</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => getWalletPortfolio()} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Value */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Total Value</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">${totalValue.toLocaleString()}</span>
            <div className={`flex items-center text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span>{isPositive ? '+' : ''}{change1d.toFixed(2)} ({changePercent1d.toFixed(2)}%)</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">24h change</p>
        </div>

        {/* Chain Distribution */}
        {Object.keys(chainDistribution).length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">Distribution by Chain</p>
            <div className="space-y-2">
              {Object.entries(chainDistribution)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([chain, value]) => (
                  <div key={chain} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{chain}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min((value as number) / totalValue * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        ${(value as number).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {!walletPortfolio && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No portfolio data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
