import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RepayWithStables } from './RepayWithStables';

interface RepayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  remainingDebt: number;
}

export function RepayDialog({
  open,
  onOpenChange,
  loanId,
  remainingDebt
}: RepayDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Repay Loan</DialogTitle>
          <DialogDescription>
            Repay your loan with stablecoins
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <RepayWithStables
            loanId={loanId}
            remainingDebt={remainingDebt}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
