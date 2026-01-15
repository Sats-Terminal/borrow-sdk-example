import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function LoanOverview() {
  const {
    isConnected,
    userStatus,
    session,
    baseAddress,
    transactions,
    loading,
    error,
    setupForLoan,
    restoreSession,
    loadTransactions
  } = useBorrowSDK();

  // Only show setup button, don't auto-setup
  // This prevents asking for signature on every page load
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleSetup = async () => {
    setSetupError(null);
    setIsRetrying(true);
    try {
      // First try to restore existing session (no signature needed)
      const restored = await restoreSession();
      if (restored) {
        console.log('[LoanOverview] Session restored successfully');
        setIsRetrying(false);
        return;
      }
      // If no session to restore, do full setup
      await setupForLoan();
    } catch (err) {
      console.error('Setup failed:', err);
      setSetupError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setIsRetrying(false);
    }
  };

  // Auto-load transactions if we have a session (user already set up)
  useEffect(() => {
    if (isConnected && session) {
      loadTransactions();
    }
  }, [isConnected, session, loadTransactions]);

  // Show message if wallet not connected
  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Connect your wallet to view your loan overview</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate loan stats
  const activeLoans = transactions.filter(t => t.status === 'active');
  const pendingLoans = transactions.filter(t => t.status === 'pending' || t.status === 'awaiting_deposit');
  const totalBorrowed = activeLoans.reduce((sum, t) => {
    const amount = parseFloat(t.amount) || 0;
    return sum + amount;
  }, 0);

  // Calculate health factor (mock - would need actual collateral/debt data)
  const healthFactor = activeLoans.length > 0 ? 1.85 : 0;
  const healthColor = healthFactor > 1.5 ? 'text-green-500' : healthFactor > 1.2 ? 'text-yellow-500' : 'text-red-500';

  if ((loading || isRetrying) && !userStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Setting up...</span>
        </CardContent>
      </Card>
    );
  }

  if ((error || setupError) && !isRetrying) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-destructive mb-4">
            <AlertTriangle className="h-5 w-5" />
            <span>{setupError || error}</span>
          </div>
          <Button onClick={handleSetup} variant="outline" disabled={isRetrying}>
            {isRetrying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Setup
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show setup prompt if not yet initialized
  if (!session && !loading && !isRetrying) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Setup Required</h3>
          <p className="text-muted-foreground mb-4">
            Initialize your smart account to start borrowing. This requires a one-time signature.
          </p>
          <Button onClick={handleSetup} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              'Initialize Account'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Borrowed</CardDescription>
            <CardTitle className="text-2xl">${totalBorrowed.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm text-muted-foreground">USDC</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Loans</CardDescription>
            <CardTitle className="text-2xl">{activeLoans.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={activeLoans.length > 0 ? 'default' : 'secondary'}>
              {activeLoans.length > 0 ? 'Active' : 'None'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">{pendingLoans.length}</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoans.length > 0 && (
              <Badge variant="warning">Awaiting Action</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Health Factor</CardDescription>
            <CardTitle className={`text-2xl ${healthColor}`}>
              {healthFactor > 0 ? healthFactor.toFixed(2) : '-'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthFactor > 0 && (
              <Progress value={Math.min(healthFactor / 2 * 100, 100)} className="h-2" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session & Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Status</CardTitle>
          <CardDescription>Your session and smart wallet information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Session Status</p>
              <div className="flex items-center gap-2">
                {session ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Active until {new Date(session.validUntil * 1000).toLocaleString()}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">No active session</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Smart Account</p>
              {baseAddress ? (
                <span className="text-sm font-mono">
                  {baseAddress.slice(0, 10)}...{baseAddress.slice(-8)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Not deployed</span>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Account Deployed</p>
              <Badge variant={userStatus?.isDeployed ? 'success' : 'secondary'}>
                {userStatus?.isDeployed ? 'Yes' : 'No'}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Session Scope</p>
              <Badge variant="outline">{session?.scope || 'N/A'}</Badge>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={loadTransactions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
