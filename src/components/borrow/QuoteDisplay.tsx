import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useToast } from '@/hooks/use-toast';
import { Units } from '@satsterminal-sdk/borrow';
import { Loader2, ArrowRight, Bitcoin, DollarSign } from 'lucide-react';
import type { Quote } from '@satsterminal-sdk/borrow';

export function QuoteDisplay() {
  const { filteredQuotes, borrow, borrowing, baseAddress, protocolFilter, quotesLoading } = useBorrowSDK();
  const { toast } = useToast();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const quotes = filteredQuotes;

  const handleBorrow = async (quote: Quote) => {
    setSelectedQuote(quote);
    try {
      const workflowId = await borrow(quote, baseAddress || undefined);
      toast({
        title: 'Borrow Initiated',
        description: 'Check the workflow status below for deposit instructions.',
      });
      console.log('[QuoteDisplay] Borrow initiated, workflowId:', workflowId);
    } catch (err) {
      toast({
        title: 'Borrow Failed',
        description: err instanceof Error ? err.message : 'Failed to initiate borrow',
        variant: 'destructive'
      });
      setSelectedQuote(null);
    }
  };

  // Skeleton for loading
  const SkeletonQuote = () => (
    <div className="p-4 rounded-xl border-[0.5px] bg-zinc-50 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-200" />
          <div className="space-y-1">
            <div className="h-4 w-16 bg-zinc-200 rounded" />
            <div className="h-3 w-12 bg-zinc-200 rounded" />
          </div>
        </div>
        <div className="h-6 w-16 bg-zinc-200 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="h-16 bg-zinc-100 rounded-lg" />
        <div className="h-16 bg-zinc-100 rounded-lg" />
      </div>
      <div className="h-10 bg-zinc-200 rounded-lg" />
    </div>
  );

  return (
    <Card className="min-h-[320px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {quotes.length > 0 ? `${quotes.length} Quote${quotes.length !== 1 ? 's' : ''} Found` : 'Available Quotes'}
            </CardTitle>
            <CardDescription>
              {protocolFilter !== 'all'
                ? `Showing ${protocolFilter.toUpperCase()} quotes only`
                : quotes.length > 0 ? 'From all protocols' : 'Enter loan details and click "Get Quotes"'}
            </CardDescription>
          </div>
          {quotes.length > 0 && <Badge variant="success">Best rate first</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {/* Loading state */}
        {quotesLoading && (
          <div className="space-y-3">
            <SkeletonQuote />
            <SkeletonQuote />
          </div>
        )}

        {/* Empty state */}
        {!quotesLoading && quotes.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[180px]">
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Configure your loan parameters and we'll find the best rates
            </p>
          </div>
        )}

        {/* Quotes list */}
        {!quotesLoading && quotes.length > 0 && (
          <div className="space-y-3">
            {quotes.map((quote, index) => {
              const variableApy = parseFloat(quote.borrowApy?.variable || '0') || 0;
              const isBest = index === 0;
              const isSelected = selectedQuote === quote;

              return (
                <div
                  key={`${quote.protocol}-${index}`}
                  className={`p-4 rounded-xl border-[0.5px] transition-colors ${
                    isBest ? 'bg-orange-500/5 border-orange-200' : 'bg-zinc-50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm capitalize">{quote.protocol}</span>
                      <Badge variant="secondary" className="text-xs capitalize">{quote.chain}</Badge>
                      {isBest && <Badge variant="success" className="text-xs">Best</Badge>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold font-mono text-orange-600">
                        {variableApy.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground">APY</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white border-[0.5px]">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Loan</p>
                        <p className="font-semibold font-mono text-sm">
                          ${parseFloat(quote.loanAmount).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white border-[0.5px]">
                      <Bitcoin className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Collateral</p>
                        <p className="font-semibold font-mono text-sm">
                          {Units.formatBtc(Units.normalizeToBtc(quote.collateralAmount), 6)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <Button
                    onClick={() => handleBorrow(quote)}
                    disabled={borrowing}
                    variant={isBest ? "accent" : "secondary"}
                    className="w-full h-9"
                  >
                    {isSelected ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Initiating...
                      </>
                    ) : (
                      <>
                        Borrow with {quote.protocol}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
