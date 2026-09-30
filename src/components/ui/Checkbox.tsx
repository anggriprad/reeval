'use client';

import React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  containerClassName?: string;
  id?: string;
  title?: string;
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5 rounded',
  md: 'h-4 w-4 rounded',
  lg: 'h-5 w-5 rounded-md',
};

const iconSizes = {
  sm: 'h-2.5 w-2.5 stroke-[2.5]',
  md: 'h-3 w-3 stroke-[2.5]',
  lg: 'h-3.5 w-3.5 stroke-[2.5]',
};

export function Checkbox({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md',
  className = '',
  containerClassName = '',
  id,
  title,
}: CheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && onChange) {
        onChange(!checked);
      }
    }
  };

  const isCheckedOrIndeterminate = checked || indeterminate;

  return (
    <div
      id={id}
      title={title}
      className={cn(
        'inline-flex items-center gap-2 select-none',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        containerClassName
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex items-center justify-center border transition-all shrink-0 cursor-pointer',
          sizeClasses[size],
          isCheckedOrIndeterminate
            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs dark:border-indigo-500 dark:bg-indigo-500'
            : 'border-slate-300 bg-white hover:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-indigo-400',
          'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900',
          className
        )}
      >
        {indeterminate ? (
          <Minus className={iconSizes[size]} />
        ) : checked ? (
          <Check className={iconSizes[size]} />
        ) : null}
      </button>

      {(label || description) && (
        <div className="text-left cursor-pointer" onClick={handleClick}>
          {label && (
            <span className="font-medium text-slate-800 dark:text-slate-200 block text-xs leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
