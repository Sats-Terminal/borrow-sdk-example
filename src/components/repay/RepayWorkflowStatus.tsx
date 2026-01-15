import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface RepayWorkflowStatusProps {
  workflowId: string;
}

export function RepayWorkflowStatus({ workflowId }: RepayWorkflowStatusProps) {
  const { resumeRepayWorkflow, workflowStatus, loading, error } = useBorrowSDK();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started && workflowId) {
      resumeRepayWorkflow(workflowId);
      setStarted(true);
    }
  }, [workflowId, started, resumeRepayWorkflow]);

  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      INITIALIZING: 'Initializing repayment',
      TRANSFERRING_TO_KERNEL: 'Transferring to kernel',
      REPAYING_LOAN: 'Repaying loan',
      WITHDRAWING_COLLATERAL: 'Withdrawing collateral',
      BRIDGE_INITIALIZING: 'Initializing bridge',
      BRIDGE_EXECUTING_APPROVAL: 'Approving bridge transaction',
      BRIDGE_AWAITING_BRIDGE_COMPLETION: 'Waiting for bridge completion',
      BRIDGE_COMPLETED: 'Bridge completed',
      COMPLETED: 'Repayment complete',
      FAILED: 'Repayment failed',
    };
    return labels[stage] || stage;
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

  const totalSteps = 6;
  const currentStep = workflowStatus?.step || 0;
  const progressPercent = Math.min((currentStep / totalSteps) * 100, 100);

  if (!workflowId) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">Repayment Status</CardTitle>
              <CardDescription>
                {workflowStatus?.label || 'Processing...'}
              </CardDescription>
            </div>
          </div>
          {workflowStatus?.isComplete && (
            <Badge variant="success">Complete</Badge>
          )}
          {workflowStatus?.isFailed && (
            <Badge variant="destructive">Failed</Badge>
          )}
          {!workflowStatus?.isComplete && !workflowStatus?.isFailed && (
            <Badge variant="warning">In Progress</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercent} />
        </div>

        {/* Stage Info */}
        {workflowStatus && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">
              {getStageLabel(workflowStatus.stage)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {workflowStatus.description}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-destructive mt-1">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
