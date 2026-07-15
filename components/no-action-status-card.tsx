'use client';

import { cn } from '@/lib/utils';

export interface NoActionStatusCardProps {
  title: string;
  body: string;
  etaLabel?: string;
  className?: string;
}

/**
 * Shared shell for the "in progress, no user action" workflow phases:
 * deposit-into-pool, disburse-loan, etc. Mirrors the production web app's
 * deposit-into-pool-status.tsx / disburse-loan-status.tsx pattern.
 */
export function NoActionStatusCard({
  title,
  body,
  etaLabel,
  className,
}: NoActionStatusCardProps) {
  return (
    <section className={cn('flex flex-col gap-2 rounded-lg border p-5', className)}>
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      {etaLabel && (
        <p className="text-sm text-muted-foreground">
          Estimated time: {etaLabel}
        </p>
      )}
    </section>
  );
}
