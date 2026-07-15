import { cn } from '@/lib/utils';

export function LoanOfferCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>
    </div>
  );
}

function SkeletonMetric() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}
