import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useToast } from '@/hooks/use-toast';
import { Units } from '@satsterminal-sdk/borrow';
import { Loader2, ArrowRight, Percent, Shield, Zap, Bitcoin, DollarSign, Link } from 'lucide-react';
import type { Quote } from '@satsterminal-sdk/borrow';

export function QuoteDisplay() {
  const { filteredQuotes, borrow, loading, baseAddress, protocolFilter } = useBorrowSDK();
  const { toast } = useToast();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // Use filtered quotes for display
  const quotes = filteredQuotes;

  const handleBorrow = async (quote: Quote) => {
    setSelectedQuote(quote);
    try {
      const workflowId = await borrow(quote, baseAddress || undefined);
      toast({
        title: 'Borrow Initiated',
        description: 'Workflow started. See status below for deposit address and progress.',
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
    // Don't reset selectedQuote here - keep showing loading state until workflow updates come in
  };

  if (quotes.length === 0) {
    const protocolName = protocolFilter === 'all' ? 'all protocols' : protocolFilter.toUpperCase();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-zinc-100">
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
            Loan Quotes
          </CardTitle>
          <CardDescription>
            {protocolFilter !== 'all'
              ? `Showing ${protocolFilter.toUpperCase()} quotes only`
              : 'Available quotes will appear here'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-50 flex items-center justify-center">
              <Zap className="h-8 w-8 text-zinc-300" />
            </div>
            <p className="text-muted-foreground">
              Enter your loan details and click "Get Loan Quotes" to see available options from {protocolName}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-green-500/10">
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          Available Quotes
        </CardTitle>
        <CardDescription>
          {quotes.length} quote{quotes.length !== 1 ? 's' : ''} found
          {protocolFilter !== 'all' && ` (${protocolFilter.toUpperCase()} only)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotes.map((quote, index) => {
          const variableApy = parseFloat(quote.borrowApy?.variable || '0') || 0;
          const rawEffectiveApy = quote.effectiveApy?.variable
            ? parseFloat(quote.effectiveApy.variable)
            : null;
          // Only use effectiveApy if it's a valid finite number
          const effectiveApy = (rawEffectiveApy !== null && isFinite(rawEffectiveApy))
            ? rawEffectiveApy
            : variableApy;

          return (
            <div
              key={`${quote.protocol}-${index}`}
              className={`p-5 border rounded-xl transition-all ${index === 0 ? 'border-orange-500/50 bg-orange-500/5' : 'hover:border-orange-500/30'}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-zinc-100">
                    <Shield className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div>
                    <span className="font-semibold capitalize">{quote.protocol}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="capitalize text-xs">
                        <Link className="h-3 w-3 mr-1" />
                        {quote.chain}
                      </Badge>
                    </div>
                  </div>
                </div>
                {index === 0 && (
                  <Badge variant="success" className="text-xs">Best Rate</Badge>
                )}
              </div>

              {/* Metrics Grid - 3 columns */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <DollarSign className="h-3 w-3" />
                    <span className="text-xs">Loan</span>
                  </div>
                  <p className="font-semibold font-mono">
                    ${parseFloat(quote.loanAmount).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Bitcoin className="h-3 w-3" />
                    <span className="text-xs">Collateral</span>
                  </div>
                  <p className="font-semibold font-mono">
                    {Units.formatBtc(Units.normalizeToBtc(quote.collateralAmount), 6)}
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Percent className="h-3 w-3" />
                    <span className="text-xs">APY</span>
                  </div>
                  <p className="font-semibold font-mono text-orange-600">
                    {variableApy.toFixed(2)}%
                  </p>
                </div>
              </div>

              {effectiveApy !== variableApy && isFinite(effectiveApy) && (
                <div className="text-sm text-green-600 mb-4 flex items-center gap-1.5 bg-green-500/10 px-3 py-2 rounded-lg">
                  <Zap className="h-3.5 w-3.5" />
                  Effective APY after rewards: <span className="font-semibold font-mono">{effectiveApy.toFixed(2)}%</span>
                </div>
              )}

              <Button
                onClick={() => handleBorrow(quote)}
                disabled={loading && selectedQuote === quote}
                variant={index === 0 ? "accent" : "outline"}
                className="w-full h-11 uppercase tracking-wide font-semibold"
              >
                {loading && selectedQuote === quote ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
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
      </CardContent>
    </Card>
  );
}
