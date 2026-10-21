import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'outline-primary' | 'primary-outline' | 'danger' | 'ghost' | 'cancel' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const variantClasses: Record<string, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm dark:bg-indigo-500 dark:hover:bg-indigo-600',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  'outline-primary': 'border border-indigo-600 bg-transparent text-indigo-600 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950/40 shadow-xs',
  'primary-outline': 'border border-indigo-600 bg-transparent text-indigo-600 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950/40 shadow-xs',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm dark:bg-red-500 dark:hover:bg-red-600',
  ghost: 'bg-transparent border-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
  cancel: 'bg-transparent border-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm dark:bg-emerald-500 dark:hover:bg-emerald-600',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-9 md:h-8 px-3.5 md:px-3 text-[13px] md:text-xs font-semibold md:font-medium rounded-lg md:rounded-md gap-1.5',
  md: 'h-11 md:h-9 px-4 text-sm font-semibold md:font-medium rounded-xl md:rounded-md gap-2',
  lg: 'h-12 md:h-10 px-6 text-[15px] md:text-sm font-semibold rounded-xl md:rounded-md gap-2',
  icon: 'h-10 w-10 md:h-9 md:w-9 p-0 rounded-lg md:rounded-md justify-center shrink-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer touch-manipulation select-none active:scale-[0.98]',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
