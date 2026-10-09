import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export type AlertVariant = 'danger' | 'warning' | 'info' | 'success' | 'neutral';

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<AlertVariant, {
  container: string;
  icon: string;
  title: string;
  description: string;
  defaultIcon: React.ReactNode;
}> = {
  danger: {
    container: 'border-red-200/70 bg-red-50/50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    description: 'text-red-800/85 dark:text-red-300/85',
    defaultIcon: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />,
  },
  warning: {
    container: 'border-amber-200/70 bg-amber-50/50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-100',
    description: 'text-amber-800/85 dark:text-amber-300/85',
    defaultIcon: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
  },
  info: {
    container: 'border-blue-200/70 bg-blue-50/50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    description: 'text-blue-800/85 dark:text-blue-300/85',
    defaultIcon: <Info className="w-4 h-4 shrink-0 mt-0.5" />,
  },
  success: {
    container: 'border-emerald-200/70 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-900 dark:text-emerald-100',
    description: 'text-emerald-800/85 dark:text-emerald-300/85',
    defaultIcon: <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />,
  },
  neutral: {
    container: 'border-slate-200 bg-slate-50/80 text-slate-800 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200',
    icon: 'text-slate-500 dark:text-slate-400',
    title: 'text-slate-900 dark:text-white',
    description: 'text-slate-600 dark:text-slate-400',
    defaultIcon: <Info className="w-4 h-4 shrink-0 mt-0.5" />,
  },
};

export function Alert({
  variant = 'info',
  title,
  description,
  icon,
  action,
  className,
  children,
  ...props
}: AlertProps) {
  const styles = variantStyles[variant];
  const renderedIcon = icon !== undefined ? icon : styles.defaultIcon;

  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border p-3.5 sm:p-4 text-xs flex items-start gap-3 transition-colors',
        styles.container,
        className
      )}
      {...props}
    >
      {renderedIcon && (
        <span className={cn('shrink-0', styles.icon)}>
          {renderedIcon}
        </span>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        {title && (
          <h4 className={cn('font-semibold leading-snug', styles.title)}>
            {title}
          </h4>
        )}
        {description && (
          <div className={cn('leading-relaxed', styles.description)}>
            {description}
          </div>
        )}
        {children && (
          <div className={cn('leading-relaxed', styles.description)}>
            {children}
          </div>
        )}
      </div>

      {action && (
        <div className="shrink-0 self-start ml-2">
          {action}
        </div>
      )}
    </div>
  );
}
