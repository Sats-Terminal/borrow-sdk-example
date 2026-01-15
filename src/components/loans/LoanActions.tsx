import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RepayDialog } from '@/components/repay/RepayDialog';
import { CreditCard } from 'lucide-react';

interface LoanActionsProps {
  loanId: string;
  remainingDebt: number;
}

export function LoanActions({ loanId, remainingDebt }: LoanActionsProps) {
  const [repayDialogOpen, setRepayDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => setRepayDialogOpen(true)}
          disabled={remainingDebt <= 0}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Repay
        </Button>
      </div>

      <RepayDialog
        open={repayDialogOpen}
        onOpenChange={setRepayDialogOpen}
        loanId={loanId}
        remainingDebt={remainingDebt}
      />
    </>
  );
}
