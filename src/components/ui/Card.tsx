import React from 'react';
import { cn } from '@/lib/utils';

export interface CardContextValue {
  inCard: boolean;
  isOnlyChild: boolean;
}

export const CardContext = React.createContext<CardContextValue>({
  inCard: false,
  isOnlyChild: false,
});

export function useCardContext() {
  return React.useContext(CardContext);
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  noPadding?: boolean;
}

function isSoleTableChild(children: React.ReactNode): boolean {
  const childArray = React.Children.toArray(children).filter(
    (c) => c !== null && c !== undefined && typeof c !== 'boolean'
  );
  if (childArray.length !== 1) return false;
  const single = childArray[0];
  if (!React.isValidElement(single)) return false;

  const type: any = single.type;
  if (type === 'table') return true;
  if (type?.displayName === 'Table' || type?.name === 'Table') return true;
  if (single.props && 'columns' in (single.props as any) && 'data' in (single.props as any)) return true;

  return false;
}

export function Card({ children, className, hover, noPadding, ...props }: CardProps) {
  const isOnlyTable = React.useMemo(() => isSoleTableChild(children), [children]);
  const shouldRemovePadding = noPadding || isOnlyTable;

  return (
    <CardContext.Provider value={{ inCard: true, isOnlyChild: isOnlyTable }}>
      <div
        {...props}
        className={cn(
          'rounded-xl border border-slate-200 bg-white shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900',
          shouldRemovePadding ? 'p-0 overflow-hidden' : 'p-5',
          hover && 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer',
          className
        )}
      >
        {children}
      </div>
    </CardContext.Provider>
  );
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function KPICard({ title, value, subtitle, icon, trend, trendValue, className }: KPICardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
          {trend && trendValue && (
            <p className={cn(
              'text-xs font-medium',
              trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
              trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'
            )}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
