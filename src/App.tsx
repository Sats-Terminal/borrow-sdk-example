import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { WalletConnect } from '@/components/WalletConnect';
import { LoanForm } from '@/components/borrow/LoanForm';
import { QuoteDisplay } from '@/components/borrow/QuoteDisplay';
import { WorkflowStatus } from '@/components/borrow/WorkflowStatus';
import { LoanHistory } from '@/components/loans/LoanHistory';
import { LoanSummary } from '@/components/loans/LoanSummary';
import { useBorrowSDK, BorrowSDKProvider } from '@/hooks/useBorrowSDK';
import { Bitcoin, Wallet, TrendingUp, Shield, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

function AppContent() {
  const { isConnected, transactions } = useBorrowSDK();
  const [activeTab, setActiveTab] = useState<'borrow' | 'loans'>('borrow');
  const activeLoansCount = transactions.filter(t => t.status?.toLowerCase() === 'active').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-[0.5px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-app px-6 h-[70px] flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-500">
              <Bitcoin className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-semibold tracking-tight-2">SatsTerminal</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">Borrow</p>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container-app px-6 py-6">
        {!isConnected ? (
          /* Hero Section - Not Connected */
          <div className="py-16 max-w-xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-orange-500/5 text-orange-600 text-sm font-mono mb-6">
              <Zap className="h-3.5 w-3.5" />
              Bitcoin-Backed DeFi
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight-3 mb-4">
              Borrow USDC with your Bitcoin
            </h2>

            <p className="text-base text-muted-foreground mb-10">
              Unlock liquidity from your BTC without selling. Get instant USDC loans on Base or Arbitrum.
            </p>

            {/* Feature Cards */}
            <div className="grid sm:grid-cols-3 gap-4 text-left">
              <div className="p-5 rounded-xl border-[0.5px] bg-card">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                  <Shield className="h-4 w-4 text-orange-500" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Non-Custodial</h3>
                <p className="text-sm text-muted-foreground">Your BTC stays secure in smart contracts</p>
              </div>
              <div className="p-5 rounded-xl border-[0.5px] bg-card">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Best Rates</h3>
                <p className="text-sm text-muted-foreground">Aggregated from top DeFi protocols</p>
              </div>
              <div className="p-5 rounded-xl border-[0.5px] bg-card">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Instant</h3>
                <p className="text-sm text-muted-foreground">Get USDC in minutes, not days</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-10">
              Connect your Bitcoin wallet to get started
            </p>
          </div>
        ) : (
          /* Connected State - Custom Tabs */
          <>
            {/* Tab Buttons */}
            <div className="inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground mb-6">
              <button
                onClick={() => setActiveTab('borrow')}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors gap-2",
                  activeTab === 'borrow'
                    ? "bg-background text-foreground shadow-sm"
                    : "hover:bg-background/50"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Borrow</span>
              </button>
              <button
                onClick={() => setActiveTab('loans')}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors gap-2",
                  activeTab === 'loans'
                    ? "bg-background text-foreground shadow-sm"
                    : "hover:bg-background/50"
                )}
              >
                <Wallet className="h-4 w-4" />
                <span className="font-medium">My Loans</span>
                {activeLoansCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-mono rounded-sm bg-orange-500 text-white">
                    {activeLoansCount}
                  </span>
                )}
              </button>
            </div>

            {/* Stable Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
              {/* Sidebar */}
              <div className="lg:sticky lg:top-[94px] lg:self-start">
                {activeTab === 'borrow' ? <LoanForm /> : <LoanSummary />}
              </div>

              {/* Main content */}
              <div className="space-y-6">
                {activeTab === 'borrow' ? (
                  <>
                    <QuoteDisplay />
                    <WorkflowStatus />
                  </>
                ) : (
                  <LoanHistory />
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-[0.5px] mt-auto">
        <div className="container-app px-6 py-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-mono">SatsTerminal SDK</span>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <BorrowSDKProvider>
      <AppContent />
    </BorrowSDKProvider>
  );
}
