import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/toaster';
import { WalletConnect } from '@/components/WalletConnect';
import { LoanForm } from '@/components/borrow/LoanForm';
import { QuoteDisplay } from '@/components/borrow/QuoteDisplay';
import { WorkflowStatus } from '@/components/borrow/WorkflowStatus';
import { LoanHistory } from '@/components/loans/LoanHistory';
import { useBorrowSDK, BorrowSDKProvider } from '@/hooks/useBorrowSDK';

function AppContent() {
  const { isConnected } = useBorrowSDK();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Borrow SDK Example</h1>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {!isConnected ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-8">
              Connect your Bitcoin wallet to start borrowing USDC against your BTC
            </p>
          </div>
        ) : (
          <Tabs defaultValue="borrow" className="space-y-6">
            <TabsList>
              <TabsTrigger value="borrow">Borrow</TabsTrigger>
              <TabsTrigger value="loans">Loans</TabsTrigger>
            </TabsList>

            <TabsContent value="borrow" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <LoanForm />
                <QuoteDisplay />
              </div>
              <WorkflowStatus />
            </TabsContent>

            <TabsContent value="loans">
              <LoanHistory />
            </TabsContent>
          </Tabs>
        )}
      </main>

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
