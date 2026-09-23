import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

const variantClasses: Record<string, string> = {
  default: 'bg-slate-100/70 text-slate-600 border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600/50',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/40',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/40',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/40',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/40',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/40',
};

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
