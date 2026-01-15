import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useToast } from '@/hooks/use-toast';
import { Units } from '@satsterminal-sdk/borrow';
import { Loader2, Calculator, Bitcoin } from 'lucide-react';

export function LoanForm() {
  const { isConnected, fetchQuotes, loading, error } = useBorrowSDK();
  const { toast } = useToast();

  // Minimum 0.0001 BTC (10,000 sats) - bridge minimum
  const [collateral, setCollateral] = useState('0.001');
  const [ltv, setLtv] = useState(50);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const MIN_COLLATERAL_BTC = 0.0001; // 10,000 sats minimum

  // Calculate loan amount based on collateral and LTV
  const collateralValue = btcPrice ? parseFloat(collateral) * btcPrice : 0;
  const estimatedLoan = collateralValue * (ltv / 100);

  // Fetch BTC price on mount
  useEffect(() => {
    // Mock BTC price - in production, fetch from API
    setBtcPrice(95000);
  }, []);

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
      await fetchQuotes(collateral, estimatedLoan.toFixed(2), ltv);
      toast({
        title: 'Quotes Retrieved',
        description: 'Available loan quotes are now displayed',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to fetch quotes',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-orange-500/10">
            <Bitcoin className="h-5 w-5 text-orange-500" />
          </div>
          New Loan
        </CardTitle>
        <CardDescription>
          Enter your collateral details to get loan quotes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* BTC Price Display */}
        {btcPrice && (
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-100">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">BTC Price</p>
              <p className="text-lg font-semibold font-mono">${btcPrice.toLocaleString()}</p>
            </div>
            <div className="p-2 rounded-full bg-orange-500/10">
              <Bitcoin className="h-4 w-4 text-orange-500" />
            </div>
          </div>
        )}

        {/* Collateral Input */}
        <div className="space-y-3">
          <Label htmlFor="collateral" className="text-sm font-medium">Collateral Amount</Label>
          <div className="relative">
            <Input
              id="collateral"
              type="number"
              step="0.0001"
              min={MIN_COLLATERAL_BTC}
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              placeholder="0.001"
              className="pr-16 text-lg font-mono h-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground bg-zinc-100 px-2 py-1 rounded">
              BTC
            </span>
          </div>
          {btcPrice && (
            <p className="text-sm text-muted-foreground">
              ≈ ${collateralValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
            </p>
          )}
        </div>

        {/* LTV Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Loan-to-Value (LTV)</Label>
            <span className="text-sm font-semibold font-mono bg-zinc-100 px-2 py-1 rounded">{ltv}%</span>
          </div>
          <Slider
            value={[ltv]}
            onValueChange={(value) => setLtv(value[0])}
            min={10}
            max={75}
            step={5}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              10% Safer
            </span>
            <span className="flex items-center gap-1">
              75% Higher Risk
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            </span>
          </div>
        </div>

        {/* Estimated Loan */}
        <div className="p-5 border-2 border-orange-500/20 rounded-xl bg-orange-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">You'll receive</span>
            <Calculator className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-3xl font-bold font-mono">
            ${estimatedLoan.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">USDC</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
            <Calculator className="h-4 w-4 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Get Quotes Button */}
        <Button onClick={handleGetQuotes} disabled={loading} variant="accent" className="w-full h-12 uppercase tracking-wide font-semibold">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching Quotes...
            </>
          ) : (
            'Get Loan Quotes'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
