import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { DepositCard } from './DepositCard';
import { CheckCircle2, Clock, AlertTriangle, Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function WorkflowStatus() {
  const { workflowStatus, depositInfo, loading, error } = useBorrowSDK();
  const { toast } = useToast();

  if (!workflowStatus && !depositInfo && !loading) {
    return null;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
  };

  const getStatusIcon = () => {
    if (workflowStatus?.isFailed) {
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    }
    if (workflowStatus?.isComplete) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (loading) {
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusBadge = () => {
    if (workflowStatus?.isFailed) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (workflowStatus?.isComplete) {
      return <Badge variant="success">Complete</Badge>;
    }
    return <Badge variant="warning">In Progress</Badge>;
  };

  // Calculate progress based on step
  const totalSteps = 5; // Typical number of steps in borrow workflow
  const currentStep = workflowStatus?.step || 0;
  const progressPercent = Math.min((currentStep / totalSteps) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-zinc-100">
              {getStatusIcon()}
            </div>
            <div>
              <CardTitle>Workflow Status</CardTitle>
              <CardDescription>
                {workflowStatus?.label || 'Initializing...'}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Step {currentStep} of {totalSteps}</span>
            <span className="font-mono font-semibold">{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Current Stage Info */}
        {workflowStatus && (
          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg">
            <p className="text-sm font-semibold mb-1">{workflowStatus.stage}</p>
            <p className="text-sm text-muted-foreground">{workflowStatus.description}</p>
          </div>
        )}

        {/* Deposit Card */}
        {depositInfo && (
          <DepositCard
            address={depositInfo.address}
            amount={depositInfo.amount}
            amountBTC={depositInfo.amountBTC}
          />
        )}

        {/* Workflow Address Info */}
        {workflowStatus?.depositAddress && !depositInfo && (
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Deposit Address</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono flex-1 truncate">
                {workflowStatus.depositAddress}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(workflowStatus.depositAddress!)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {workflowStatus.depositAmount && (
              <p className="text-sm mt-2">
                Amount: <span className="font-medium">{workflowStatus.depositAmount} sats</span>
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-destructive mt-1">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && !workflowStatus && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Processing workflow...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
