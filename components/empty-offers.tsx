'use client';

import { Button } from '@/components/ui/button';
import { useBorrowContext } from '@/components/borrow-context';

export function EmptyOffers() {
  const { dispatch } = useBorrowContext();
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">No offers available</h3>
      <p className="text-sm text-muted-foreground">
        No protocol returned a quote for these inputs. Try adjusting your loan
        amount or LTV.
      </p>
      <Button variant="outline" onClick={() => dispatch({ type: 'composer/reset' })}>
        Edit inputs
      </Button>
    </div>
  );
}
