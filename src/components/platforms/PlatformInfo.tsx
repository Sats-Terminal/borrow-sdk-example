import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Percent, Coins, ExternalLink, CheckCircle2 } from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  description: string;
  chains: string[];
  tvl: string;
  apy: { min: number; max: number };
  ltv: { min: number; max: number };
  features: string[];
  website: string;
  logo?: string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'aave',
    name: 'Aave',
    description: 'Leading DeFi lending protocol with deep liquidity and proven security',
    chains: ['Ethereum', 'Base', 'Arbitrum', 'Optimism', 'Polygon'],
    tvl: '$12.5B',
    apy: { min: 2.5, max: 8.5 },
    ltv: { min: 65, max: 80 },
    features: ['Flash Loans', 'Credit Delegation', 'Rate Switching', 'Multi-collateral'],
    website: 'https://aave.com',
  },
  {
    id: 'morpho',
    name: 'Morpho',
    description: 'Peer-to-peer layer on top of lending pools for optimized rates',
    chains: ['Ethereum', 'Base'],
    tvl: '$2.1B',
    apy: { min: 3.0, max: 12.0 },
    ltv: { min: 70, max: 85 },
    features: ['P2P Matching', 'Better Rates', 'Gasless', 'Risk Management'],
    website: 'https://morpho.org',
  },
];

export function PlatformInfo() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Lending Platforms</h2>
        <p className="text-muted-foreground">
          Available DeFi protocols for BTC-backed loans
        </p>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-6">
        {PLATFORMS.map((platform) => (
          <Card key={platform.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{platform.name}</CardTitle>
                    <CardDescription>{platform.description}</CardDescription>
                  </div>
                </div>
                <a
                  href={platform.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Coins className="h-3 w-3" />
                    <span className="text-xs">TVL</span>
                  </div>
                  <p className="font-semibold">{platform.tvl}</p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Percent className="h-3 w-3" />
                    <span className="text-xs">Borrow APY</span>
                  </div>
                  <p className="font-semibold">
                    {platform.apy.min}% - {platform.apy.max}%
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Shield className="h-3 w-3" />
                    <span className="text-xs">LTV Range</span>
                  </div>
                  <p className="font-semibold">
                    {platform.ltv.min}% - {platform.ltv.max}%
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <span className="text-xs">Chains</span>
                  </div>
                  <p className="font-semibold">{platform.chains.length} networks</p>
                </div>
              </div>

              <Separator />

              {/* Supported Chains */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Supported Chains</p>
                <div className="flex flex-wrap gap-2">
                  {platform.chains.map((chain) => (
                    <Badge key={chain} variant="outline">
                      {chain}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Features</p>
                <div className="grid grid-cols-2 gap-2">
                  {platform.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Note */}
      <Card className="bg-secondary/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">How it works</p>
              <p className="text-sm text-muted-foreground">
                When you borrow through SatsTerminal, your BTC collateral is bridged to the EVM chain
                and deposited into one of these lending protocols. The SDK automatically selects the
                best rates and manages the entire process seamlessly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
