'use client';

import { useId, useState, type ChangeEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps {
  value: number;
  onValueChange: (value: number) => void;
  prefix?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Slot rendered after the input — typically an asset badge. */
  trailing?: ReactNode;
  /** Label shown above the input. */
  label?: string;
  /** Optional id; auto-generated when absent. */
  id?: string;
  className?: string;
}

/**
 * Numeric currency input with a `$` (or custom) prefix.
 * Hand-rolled to keep the registry dependency-free (no react-number-format).
 */
export function CurrencyInput({
  value,
  onValueChange,
  prefix = '$',
  placeholder = '0',
  disabled,
  trailing,
  label,
  id,
  className,
}: CurrencyInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [draft, setDraft] = useState<string>(formatDisplay(value));

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setDraft(raw);
    const parsed = Number(raw);
    onValueChange(Number.isFinite(parsed) ? parsed : 0);
  };

  const onBlur = () => setDraft(formatDisplay(value));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm text-muted-foreground">
          {label}
        </label>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-medium leading-none text-foreground">
            {prefix}
          </span>
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            placeholder={placeholder}
            value={draft}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            className={cn(
              'min-w-0 flex-1 bg-transparent text-2xl font-medium leading-none outline-none',
              'placeholder:text-muted-foreground/60',
              disabled && 'opacity-60',
            )}
          />
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    </div>
  );
}

function formatDisplay(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '';
  return Number.isInteger(value) ? String(value) : value.toString();
}
