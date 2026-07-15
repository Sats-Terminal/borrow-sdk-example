'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import {
  COMPOSER_LTV_MAX,
  COMPOSER_LTV_MIN,
} from '@/lib/composer-events';
import { cn } from '@/lib/utils';

export interface LtvSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  /** Override the slider max (default 80). Useful when an offer caps LTV lower. */
  max?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Radix-based LTV slider with the percentage inside the thumb.
 * The track keeps a light risk-zone treatment without extra badges or icons.
 */
export function LtvSlider({
  value,
  onValueChange,
  max = COMPOSER_LTV_MAX,
  disabled,
  className,
}: LtvSliderProps) {
  const isMax = value >= max;
  const trackBackground = getTrackBackground(max, value);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center">
        <span className="text-sm text-muted-foreground">Loan-to-value</span>
      </div>

      <SliderPrimitive.Root
        value={[value]}
        min={COMPOSER_LTV_MIN}
        max={max}
        step={1}
        disabled={disabled}
        onValueChange={(values: number[]) => onValueChange(values[0] ?? COMPOSER_LTV_MIN)}
        className="relative flex h-10 w-full touch-none select-none items-center"
      >
        <SliderPrimitive.Track
          className="relative h-2 grow overflow-hidden rounded-full"
          style={{ background: trackBackground }}
        >
          <SliderPrimitive.Range className="absolute h-full bg-transparent" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            'flex h-10 min-w-12 items-center justify-center rounded-full',
            'border border-border bg-background px-3 text-xs font-semibold shadow-sm',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
          aria-label="Loan-to-value"
        >
          {isMax ? 'Max' : `${value}%`}
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
    </div>
  );
}

function getTrackBackground(max: number, value: number): string {
  const safeMax = Math.max(COMPOSER_LTV_MIN, max);
  const current = clampPercent((value / safeMax) * 100);
  const medium = clampPercent((60 / safeMax) * 100);
  const high = clampPercent((75 / safeMax) * 100);

  return [
    'linear-gradient(to right',
    `#22c55e 0%, #22c55e ${current}%`,
    `#fef3c7 ${current}%, #fef3c7 ${Math.max(current, medium)}%`,
    `#fed7aa ${Math.max(current, medium)}%, #fed7aa ${Math.max(current, high)}%`,
    `#fecaca ${Math.max(current, high)}%, #fecaca 100%)`,
  ].join(', ');
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
