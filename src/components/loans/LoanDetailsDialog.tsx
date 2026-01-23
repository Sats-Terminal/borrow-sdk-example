import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { useToast } from '@/hooks/use-toast';
import type { UserTransaction } from '@satsterminal-sdk/borrow';
import { Units } from '@satsterminal-sdk/borrow';
import {
  Loader2, Bitcoin, DollarSign, Shield, TrendingUp,
  ArrowDownToLine, Send, Wallet, AlertTriangle, Zap,
  ExternalLink, Copy, Check
} from 'lucide-react';

interface LoanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: UserTransaction | null;
  onActionComplete?: () => void;
}

export function LoanDetailsDialog({ open, onOpenChange, loan, onActionComplete }: LoanDetailsDialogProps) {
  const {
    repay, withdrawCollateral, withdrawToEVM,
    btcAddress, baseAddress, repaying, getLoanCollateralInfo
  } = useBorrowSDK();
  const { toast } = useToast();

  // Loan info state
  const [collateralInfo, setCollateralInfo] = useState<{
    totalCollateral: string;
    availableCollateral: string;
    maxWithdrawable: string;
    totalDebt: string;
    remainingDebt: string;
  } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Repay state
  const [repayAmount, setRepayAmount] = useState('');
  const [withdrawAfterRepay, setWithdrawAfterRepay] = useState(false);
  const [collateralToWithdrawAfterRepay, setCollateralToWithdrawAfterRepay] = useState('');

  // Withdraw collateral state
  const [withdrawBtcAmount, setWithdrawBtcAmount] = useState('');
  const [withdrawBtcAddress, setWithdrawBtcAddress] = useState('');

  // Withdraw USDC state
  const [withdrawUsdcAmount, setWithdrawUsdcAmount] = useState('');
  const [withdrawUsdcAddress, setWithdrawUsdcAddress] = useState('');

  // Copy state
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Load loan info when dialog opens
  useEffect(() => {
    if (open && loan) {
      setLoadingInfo(true);
      getLoanCollateralInfo(loan.id)
        .then(info => {
          setCollateralInfo(info);
          if (info) {
            setRepayAmount(info.remainingDebt);
          }
        })
        .catch(err => console.error('Failed to load collateral info:', err))
        .finally(() => setLoadingInfo(false));

      // Reset form states
      setWithdrawBtcAddress(btcAddress || '');
      setWithdrawUsdcAddress('');
      setWithdrawBtcAmount('');
      setWithdrawUsdcAmount('');
      setWithdrawAfterRepay(false);
      setCollateralToWithdrawAfterRepay('');
    }
  }, [open, loan, btcAddress, getLoanCollateralInfo]);

  if (!loan) return null;

  // Parse loan details
  const loanAmount = parseFloat(loan.amount) || 0;
  const protocol = loan.borrowTransaction?.protocol || 'AAVE';
  const chain = loan.borrowTransaction?.chain || 'BASE';
  // Base wallet (where borrowed USDC is sent and used for repayment)
  const usdcWalletAddress = baseAddress || '';

  // Parse collateral info - use SDK's Units utility for type-safe conversion
  const parseCollateralValue = (value: string | undefined): number => {
    if (!value) return 0;
    // Units.normalizeToBtc handles both satoshis and BTC inputs
    const btcValue = Units.normalizeToBtc(value);
    return parseFloat(btcValue);
  };

  const totalCollateralBtc = collateralInfo ? parseCollateralValue(collateralInfo.totalCollateral) : 0;
  const maxWithdrawableBtc = collateralInfo ? parseCollateralValue(collateralInfo.maxWithdrawable) : 0;
  const remainingDebt = collateralInfo ? parseFloat(collateralInfo.remainingDebt) : loanAmount;

  // Calculate health factor (simplified)
  const btcPrice = 95000;
  const collateralValue = totalCollateralBtc * btcPrice;
  const healthFactor = remainingDebt > 0 ? collateralValue / remainingDebt : 0;
  const healthColor = healthFactor > 1.5 ? 'text-green-500' : healthFactor > 1.2 ? 'text-yellow-500' : 'text-red-500';

  const isFullRepayment = parseFloat(repayAmount) >= remainingDebt;

  // Handle repay - always from base wallet
  const handleRepay = async () => {
    try {
      const repayAmountNum = parseFloat(repayAmount);
      const isPartialRepay = repayAmountNum < remainingDebt;
      const hasCollateralWithdraw = withdrawAfterRepay && parseFloat(collateralToWithdrawAfterRepay) > 0;

      const options = {
        isPartialRepay,
        isPartialWithdrawCollateral: hasCollateralWithdraw,
        ...(hasCollateralWithdraw ? {
          collateralToWithdraw: collateralToWithdrawAfterRepay,
          userBtcWithdrawAddress: btcAddress || undefined
        } : {})
      };

      console.log('[handleRepay] Repaying from base wallet:', {
        loanId: loan.id,
        repayAmount,
        remainingDebt,
        isPartialRepay,
        hasCollateralWithdraw,
        options
      });

      const txId = await repay(loan.id, repayAmount, options);
      toast({
        title: 'Repayment Initiated',
        description: txId ? `Transaction ID: ${txId.slice(0, 16)}...` : 'Transaction submitted',
      });
      onOpenChange(false);
      onActionComplete?.();
    } catch (err) {
      toast({
        title: 'Repayment Failed',
        description: err instanceof Error ? err.message : 'Failed to process repayment',
        variant: 'destructive',
      });
    }
  };

  // Handle withdraw collateral
  const handleWithdrawCollateral = async () => {
    if (!withdrawBtcAmount || !withdrawBtcAddress) {
      toast({
        title: 'Missing Information',
        description: 'Please enter amount and withdrawal address',
        variant: 'destructive',
      });
      return;
    }

    try {
      const txId = await withdrawCollateral(loan.id, withdrawBtcAmount, withdrawBtcAddress);
      toast({
        title: 'Withdrawal Initiated',
        description: txId ? `Transaction ID: ${txId.slice(0, 16)}...` : 'Transaction submitted',
      });
      onOpenChange(false);
      onActionComplete?.();
    } catch (err) {
      toast({
        title: 'Withdrawal Failed',
        description: err instanceof Error ? err.message : 'Failed to withdraw collateral',
        variant: 'destructive',
      });
    }
  };

  // Handle withdraw USDC - from base wallet
  const handleWithdrawUsdc = async () => {
    if (!withdrawUsdcAmount || !withdrawUsdcAddress) {
      toast({
        title: 'Missing Information',
        description: 'Please enter amount and destination address',
        variant: 'destructive',
      });
      return;
    }

    if (!withdrawUsdcAddress.startsWith('0x') || withdrawUsdcAddress.length !== 42) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid EVM address',
        variant: 'destructive',
      });
      return;
    }

    try {
      const chainType = chain === 'ARBITRUM' ? 'arbitrum' : 'base';
      const txId = await withdrawToEVM(chainType as any, withdrawUsdcAmount, withdrawUsdcAddress);
      toast({
        title: 'USDC Transfer Initiated',
        description: txId ? `Transaction: ${txId.slice(0, 16)}...` : 'Transaction submitted',
      });
      onOpenChange(false);
      onActionComplete?.();
    } catch (err) {
      toast({
        title: 'Transfer Failed',
        description: err instanceof Error ? err.message : 'Failed to transfer USDC',
        variant: 'destructive',
      });
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Loan Details
            <Badge variant="outline" className="ml-2 capitalize">{chain}</Badge>
            <Badge variant="secondary">{protocol}</Badge>
          </DialogTitle>
          <DialogDescription>
            Manage your loan - repay, withdraw collateral, or transfer USDC
          </DialogDescription>
        </DialogHeader>

        {/* Loan Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              <span className="text-xs">Borrowed</span>
            </div>
            <p className="font-semibold">${loanAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">USDC</p>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Bitcoin className="h-3 w-3" />
              <span className="text-xs">Collateral</span>
            </div>
            {loadingInfo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <p className="font-semibold">{totalCollateralBtc.toFixed(6)}</p>
                <p className="text-xs text-muted-foreground">BTC</p>
              </>
            )}
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Shield className="h-3 w-3" />
              <span className="text-xs">Health Factor</span>
            </div>
            {loadingInfo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <p className={`font-semibold ${healthColor}`}>
                  {healthFactor > 0 ? healthFactor.toFixed(2) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {healthFactor > 1.5 ? 'Healthy' : healthFactor > 1.2 ? 'Moderate' : 'At Risk'}
                </p>
              </>
            )}
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Remaining Debt</span>
            </div>
            {loadingInfo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <p className="font-semibold">${remainingDebt.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">USDC</p>
              </>
            )}
          </div>
        </div>

        {/* Base Wallet Address (where borrowed USDC goes) */}
        {usdcWalletAddress && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Base Wallet:</span>
            <code className="font-mono text-xs">
              {usdcWalletAddress.slice(0, 10)}...{usdcWalletAddress.slice(-8)}
            </code>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyAddress(usdcWalletAddress)}>
              {copiedAddress ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
            <a
              href={`https://${chain === 'ARBITRUM' ? 'arbiscan.io' : 'basescan.org'}/address/${usdcWalletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto"
            >
              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </a>
          </div>
        )}

        <Separator />

        {/* Action Tabs */}
        <Tabs defaultValue="repay" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="repay" className="gap-1">
              <DollarSign className="h-3 w-3" />
              Repay
            </TabsTrigger>
            <TabsTrigger value="withdraw-btc" className="gap-1">
              <Bitcoin className="h-3 w-3" />
              Withdraw BTC
            </TabsTrigger>
            <TabsTrigger value="withdraw-usdc" className="gap-1">
              <Send className="h-3 w-3" />
              Transfer USDC
            </TabsTrigger>
          </TabsList>

          {/* Repay Tab */}
          <TabsContent value="repay" className="mt-4 space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Remaining Debt</p>
              <p className="text-xl font-semibold">${remainingDebt.toLocaleString()} USDC</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repayAmount">Repay Amount (USDC)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="repayAmount"
                  type="number"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="pl-9"
                  min="0"
                  max={remainingDebt}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setRepayAmount(remainingDebt.toString())}
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Repaying from base wallet: {usdcWalletAddress ? `${usdcWalletAddress.slice(0, 10)}...${usdcWalletAddress.slice(-8)}` : 'Not set'}
              </p>
            </div>

            {isFullRepayment && (
              <div className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="withdrawAfterRepay"
                    checked={withdrawAfterRepay}
                    onCheckedChange={(checked) => setWithdrawAfterRepay(!!checked)}
                  />
                  <Label htmlFor="withdrawAfterRepay" className="text-sm">
                    Withdraw collateral after full repayment
                  </Label>
                </div>

                {withdrawAfterRepay && (
                  <div className="space-y-2">
                    <Label htmlFor="collateralAfterRepay">Collateral to Withdraw (BTC)</Label>
                    <div className="relative">
                      <Input
                        id="collateralAfterRepay"
                        type="number"
                        value={collateralToWithdrawAfterRepay}
                        onChange={(e) => setCollateralToWithdrawAfterRepay(e.target.value)}
                        step="0.0001"
                        min="0"
                        max={maxWithdrawableBtc}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setCollateralToWithdrawAfterRepay(maxWithdrawableBtc.toFixed(8))}
                      >
                        Max
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Max withdrawable: {maxWithdrawableBtc.toFixed(8)} BTC
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleRepay}
              disabled={repaying || !repayAmount || parseFloat(repayAmount) <= 0}
              className="w-full"
            >
              {repaying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Repay $${parseFloat(repayAmount || '0').toLocaleString()}`
              )}
            </Button>
          </TabsContent>

          {/* Withdraw BTC Tab */}
          <TabsContent value="withdraw-btc" className="mt-4 space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Available to Withdraw</p>
              <p className="text-xl font-semibold">{maxWithdrawableBtc.toFixed(8)} BTC</p>
              <p className="text-xs text-muted-foreground">
                Total Collateral: {totalCollateralBtc.toFixed(8)} BTC
              </p>
            </div>

            {/* Warning when debt prevents full withdrawal */}
            {remainingDebt > 0 && maxWithdrawableBtc < totalCollateralBtc && (
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Outstanding Debt Detected</p>
                  <p>
                    You have ${remainingDebt.toFixed(6)} USDC debt remaining.
                    {remainingDebt < 0.01 ? (
                      <span> This small amount prevents full collateral withdrawal. <strong>Repay all debt first</strong> to withdraw your full collateral.</span>
                    ) : (
                      <span> Repay your debt to increase the amount you can withdraw.</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="withdrawBtcAmount">Amount (BTC)</Label>
              <div className="relative">
                <Input
                  id="withdrawBtcAmount"
                  type="number"
                  step="0.00001"
                  min="0"
                  max={maxWithdrawableBtc}
                  value={withdrawBtcAmount}
                  onChange={(e) => setWithdrawBtcAmount(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setWithdrawBtcAmount(maxWithdrawableBtc.toFixed(8))}
                >
                  Max
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawBtcAddress">BTC Withdrawal Address</Label>
              <Input
                id="withdrawBtcAddress"
                value={withdrawBtcAddress}
                onChange={(e) => setWithdrawBtcAddress(e.target.value)}
                placeholder="bc1q..."
              />
              <p className="text-xs text-muted-foreground">
                Default: Your connected wallet address
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                Withdrawing collateral will reduce your health factor and may increase liquidation risk.
              </p>
            </div>

            <Button
              onClick={handleWithdrawCollateral}
              disabled={repaying || !withdrawBtcAmount || !withdrawBtcAddress || parseFloat(withdrawBtcAmount) <= 0}
              className="w-full"
            >
              {repaying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Withdraw {withdrawBtcAmount || '0'} BTC
                </>
              )}
            </Button>
          </TabsContent>

          {/* Transfer USDC Tab */}
          <TabsContent value="withdraw-usdc" className="mt-4 space-y-4">
            <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transfer USDC from Base Wallet</p>
                <p className="text-xl font-semibold">${loanAmount.toLocaleString()}</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" />
                Gasless
              </Badge>
            </div>

            {usdcWalletAddress && (
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">From Base Wallet:</span>
                  <code className="ml-1 font-mono">{usdcWalletAddress.slice(0, 10)}...{usdcWalletAddress.slice(-8)}</code>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="withdrawUsdcAmount">Amount (USDC)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="withdrawUsdcAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={withdrawUsdcAmount}
                  onChange={(e) => setWithdrawUsdcAmount(e.target.value)}
                  className="pl-9"
                  placeholder="100.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawUsdcAddress">Destination EVM Address</Label>
              <Input
                id="withdrawUsdcAddress"
                value={withdrawUsdcAddress}
                onChange={(e) => setWithdrawUsdcAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>

            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Gasless Transfer</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Transfer USDC from your base wallet without paying gas fees.
              </p>
            </div>

            <Button
              onClick={handleWithdrawUsdc}
              disabled={repaying || !withdrawUsdcAmount || !withdrawUsdcAddress || parseFloat(withdrawUsdcAmount) <= 0}
              className="w-full"
            >
              {repaying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send ${withdrawUsdcAmount || '0'} USDC
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
