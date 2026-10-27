import React from 'react';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: 'card' | 'plain';
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  variant = 'card',
}: EmptyStateProps) {
  const isCard = variant === 'card';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCard
          ? 'py-12 sm:py-16 md:py-12 px-4 border-0 bg-transparent md:bg-white dark:md:bg-slate-900 md:border md:border-slate-200 dark:md:border-slate-800 md:rounded-xl md:shadow-xs'
          : 'py-8 px-4 border-0 bg-transparent',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-transparent md:bg-slate-100 text-slate-400 dark:bg-transparent dark:md:bg-slate-800 dark:text-slate-500 shadow-none md:shadow-2xs">
        {icon || <Inbox className="h-6 w-6 text-slate-400 dark:text-slate-500" />}
      </div>
      <h3 className="mt-3 text-[15px] md:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-[13.5px] md:text-xs text-slate-500 dark:text-slate-400 max-w-xs md:max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';

