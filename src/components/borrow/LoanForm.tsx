import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useBtcPrice } from '@/hooks/useBtcPrice';
import { useToast } from '@/hooks/use-toast';
import { Units } from '@/lib/units';
import { Loader2, Bitcoin, ChevronRight } from 'lucide-react';

type ProtocolFilter = 'all' | 'aave' | 'morpho';

export function LoanForm() {
  const { isConnected, fetchQuotes, quotesLoading, filteredQuotes, error, protocolFilter, setProtocolFilter } = useBorrowSDK();
  const { toast } = useToast();
  const btcPrice = useBtcPrice();

  const [collateral, setCollateral] = useState('0.01');
  const [ltv, setLtv] = useState(50);
  const MIN_COLLATERAL_BTC = 0.0001;

  const collateralValue = btcPrice ? parseFloat(collateral) * btcPrice : 0;
  const estimatedLoan = collateralValue * (ltv / 100);

  // Store latest fetch params for auto-refresh
  const lastFetchParams = useRef<{ collateral: string; loanAmount: string; ltv: number } | null>(null);

  // Auto-refresh quotes every 30 seconds when quotes are displayed
  useEffect(() => {
    if (!filteredQuotes || filteredQuotes.length === 0) return;

    const interval = setInterval(() => {
      if (lastFetchParams.current) {
        const { collateral: c, loanAmount, ltv: l } = lastFetchParams.current;
        fetchQuotes(c, loanAmount, l).catch(() => {});
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [filteredQuotes, fetchQuotes]);

  const handleGetQuotes = async () => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first',
        variant: 'destructive'
      });
      return;
    }

    if (!collateral || parseFloat(collateral) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid collateral amount',
        variant: 'destructive'
      });
      return;
    }

    if (parseFloat(collateral) < MIN_COLLATERAL_BTC) {
      const minSats = Units.btcToSats(MIN_COLLATERAL_BTC.toString());
      toast({
        title: 'Collateral Too Low',
        description: `Minimum collateral is ${MIN_COLLATERAL_BTC} BTC (${Units.formatSats(minSats)} sats)`,
        variant: 'destructive'
      });
      return;
    }

    try {
      lastFetchParams.current = { collateral, loanAmount: estimatedLoan.toFixed(2), ltv };
      await fetchQuotes(collateral, estimatedLoan.toFixed(2), ltv);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to fetch quotes',
        variant: 'destructive'
      });
    }
  };

  const getLtvVariant = () => {
    if (ltv <= 40) return 'success';
    if (ltv <= 60) return 'warning';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center">
            <Bitcoin className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle>New Loan</CardTitle>
            <CardDescription>BTC to USDC</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Collateral Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Collateral</Label>
            {btcPrice && (
              <span className="text-xs text-muted-foreground font-mono">
                1 BTC = ${btcPrice.toLocaleString()}
              </span>
            )}
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Bitcoin className="h-4 w-4 text-orange-500" />
            </div>
            <Input
              type="number"
              step="0.001"
              min={MIN_COLLATERAL_BTC}
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              placeholder="0.01"
              className="pl-9 pr-12 h-10 font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              BTC
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            = ${collateralValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
          </p>
        </div>

        {/* Protocol Select */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Protocol</Label>
          <Select value={protocolFilter} onValueChange={(v) => setProtocolFilter(v as ProtocolFilter)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select protocol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Protocols</SelectItem>
              <SelectItem value="aave">Aave</SelectItem>
              <SelectItem value="morpho">Morpho</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* LTV Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Loan-to-Value</Label>
            <Badge variant={getLtvVariant()} className="font-mono">
              {ltv}%
            </Badge>
          </div>
          <Slider
            value={[ltv]}
            onValueChange={(value) => setLtv(value[0])}
            min={10}
            max={75}
            step={5}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Safer</span>
            <span>Higher risk</span>
          </div>
        </div>

        {/* Estimated Output */}
        <div className="p-4 rounded-xl border-[0.5px] bg-zinc-50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono mb-1">You'll receive</p>
          <p className="text-2xl font-bold font-mono">
            ${estimatedLoan.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-muted-foreground">USDC</p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/5 border-[0.5px] border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* CTA Button */}
        <Button
          onClick={handleGetQuotes}
          disabled={quotesLoading}
          variant="accent"
          className="w-full h-10"
        >
          {quotesLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding rates...
            </>
          ) : (
            <>
              Get Quotes
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
