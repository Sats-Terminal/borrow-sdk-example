import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { DepositCard } from './DepositCard';
import { CheckCircle2, Clock, AlertTriangle, Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function WorkflowStatus() {
  const { workflowStatus, depositInfo, borrowing, error } = useBorrowSDK();
  const { toast } = useToast();

  // Don't render anything if no workflow is active
  if (!workflowStatus && !depositInfo && !borrowing) {
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
      return <AlertTriangle className="h-4 w-4 text-white" />;
    }
    if (workflowStatus?.isComplete) {
      return <CheckCircle2 className="h-4 w-4 text-white" />;
    }
    if (borrowing) {
      return <Loader2 className="h-4 w-4 animate-spin text-white" />;
    }
    return <Clock className="h-4 w-4 text-white" />;
  };

  const getStatusBadge = () => {
    if (workflowStatus?.isFailed) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (workflowStatus?.isComplete) {
      return <Badge variant="success">Complete</Badge>;
    }
    return <Badge variant="warning" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />In Progress</Badge>;
  };

  const totalSteps = 5;
  const currentStep = workflowStatus?.step || 0;
  const progressPercent = Math.min((currentStep / totalSteps) * 100, 100);

  const bgColor = workflowStatus?.isFailed
    ? 'bg-red-500'
    : workflowStatus?.isComplete
    ? 'bg-green-600'
    : 'bg-orange-500';

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 ${bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              {getStatusIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                {workflowStatus?.isComplete ? 'Loan Complete' : 'Workflow Status'}
              </h3>
              <p className="text-xs text-white/80">
                {workflowStatus?.label || 'Initializing...'}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Progress */}
        {!workflowStatus?.isComplete && !workflowStatus?.isFailed && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Step {currentStep} of {totalSteps}</span>
              <span className="font-mono font-medium">{progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        {/* Stage Info */}
        {workflowStatus && !workflowStatus.isComplete && (
          <div className="p-3 bg-zinc-50 rounded-lg border-[0.5px]">
            <p className="text-sm font-medium">{workflowStatus.stage}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{workflowStatus.description}</p>
          </div>
        )}

        {/* Success Message */}
        {workflowStatus?.isComplete && (
          <div className="p-3 bg-green-500/5 rounded-lg border-[0.5px] border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium text-sm">Your loan is now active!</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              USDC has been deposited to your smart account. View it in the Loans tab.
            </p>
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

        {/* Fallback Deposit Address */}
        {workflowStatus?.depositAddress && !depositInfo && (
          <div className="p-3 border-[0.5px] rounded-lg">
            <p className="text-xs text-muted-foreground mb-1.5">Deposit Address</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono flex-1 truncate bg-zinc-100 px-2 py-1.5 rounded">
                {workflowStatus.depositAddress}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => copyToClipboard(workflowStatus.depositAddress!)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            {workflowStatus.depositAmount && (
              <p className="text-xs mt-1.5">
                Amount: <span className="font-mono">{workflowStatus.depositAmount} sats</span>
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/5 border-[0.5px] border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">Error</span>
            </div>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {borrowing && !workflowStatus && (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span className="text-sm text-muted-foreground">Initializing workflow...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
