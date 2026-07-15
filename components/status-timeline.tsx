'use client';

import { Loader2, Check } from 'lucide-react';
import {
  UI_GROUP_ORDER,
  type WorkflowUiGroup,
} from '@/lib/borrow-events';
import type { WorkflowState } from '@/lib/tracker-events';
import { cn } from '@/lib/utils';

export interface StatusTimelineProps {
  state: WorkflowState;
  className?: string;
}

/**
 * 5-step progress timeline mirroring the production web app.
 * Reads the active UI group from <BorrowFlow>'s local tracker state.
 */
export function StatusTimeline({ state, className }: StatusTimelineProps) {
  const activeOrder = getActiveOrder(state);

  return (
    <ol className={cn('flex flex-col gap-3', className)}>
      {UI_GROUP_ORDER.map(({ id, order, label }) => {
        const status = stepStatus(order, activeOrder, state);
        return <Step key={id} order={order} label={label} status={status} />;
      })}
    </ol>
  );
}

type StepStatus = 'upcoming' | 'active' | 'completed';

function Step({
  order,
  label,
  status,
}: {
  order: number;
  label: string;
  status: StepStatus;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
          status === 'completed' && 'bg-foreground text-background',
          status === 'active' && 'border border-foreground text-foreground',
          status === 'upcoming' && 'bg-muted text-muted-foreground',
        )}
      >
        {status === 'completed' ? <Check className="h-3.5 w-3.5" /> : order}
      </span>
      <span
        className={cn(
          'flex-1 text-sm',
          status === 'upcoming' && 'text-muted-foreground',
          status === 'active' && 'font-medium',
        )}
      >
        {label}
      </span>
      {status === 'active' && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
      )}
    </li>
  );
}

function stepStatus(
  stepOrder: number,
  activeOrder: number | null,
  state: WorkflowState,
): StepStatus {
  if (state.phase === 'completed') return 'completed';
  if (activeOrder == null) return 'upcoming';
  if (stepOrder < activeOrder) return 'completed';
  if (stepOrder === activeOrder) return 'active';
  return 'upcoming';
}

function getActiveOrder(state: WorkflowState): number | null {
  if (state.phase === 'completed') return UI_GROUP_ORDER.length;
  if (state.phase !== 'tracking') return null;
  return groupOrder(state.ui.group);
}

function groupOrder(group: WorkflowUiGroup): number {
  return UI_GROUP_ORDER.find((g) => g.id === group)?.order ?? 1;
}
