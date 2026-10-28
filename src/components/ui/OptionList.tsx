import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface OptionItem<T = string | number> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  avatar?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface OptionListItemProps {
  isSelected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  avatar?: React.ReactNode;
  badge?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showCheckmark?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: 'min-h-[38px] md:min-h-[34px] px-3 py-2 text-[13.5px] md:text-xs rounded-lg md:rounded-md gap-2.5',
  md: 'min-h-[44px] md:min-h-[38px] px-3.5 py-2.5 md:py-2 text-[14px] md:text-xs rounded-xl md:rounded-lg gap-3',
  lg: 'min-h-[48px] md:min-h-[42px] px-4 py-3 md:py-2.5 text-[15px] md:text-sm rounded-xl md:rounded-lg gap-3.5',
};

const checkIconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4 md:h-3.5 md:w-3.5',
  lg: 'h-4.5 w-4.5 md:h-4 md:w-4',
};

export const OptionListItem = React.forwardRef<HTMLButtonElement, OptionListItemProps>(
  (
    {
      isSelected,
      disabled,
      onClick,
      label,
      description,
      icon: Icon,
      avatar,
      badge,
      size = 'md',
      showCheckmark = true,
      className,
      children,
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        role="option"
        aria-selected={isSelected}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'w-full flex items-center justify-between text-left transition-all duration-150 border cursor-pointer select-none active:scale-[0.99] touch-manipulation',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1',
          sizeClasses[size],
          isSelected
            ? 'bg-indigo-50/80 text-indigo-900 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800/80 font-semibold shadow-2xs'
            : 'bg-slate-50/60 hover:bg-slate-100/70 text-slate-800 border-slate-200/70 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700/60 font-medium hover:border-slate-300 dark:hover:border-slate-600',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none active:scale-100',
          className
        )}
      >
        {children ? (
          children
        ) : (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {avatar && <div className="shrink-0">{avatar}</div>}
            {Icon && (
              <Icon
                className={cn(
                  'shrink-0 h-4 w-4 md:h-3.5 md:w-3.5',
                  isSelected
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate leading-snug">{label}</div>
              {description && (
                <div
                  className={cn(
                    'text-[12px] md:text-[11px] truncate mt-0.5 leading-tight',
                    isSelected
                      ? 'text-indigo-700/80 dark:text-indigo-300/80 font-normal'
                      : 'text-slate-500 dark:text-slate-400 font-normal'
                  )}
                >
                  {description}
                </div>
              )}
            </div>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
        )}

        {showCheckmark && isSelected && (
          <Check
            className={cn(
              'shrink-0 text-indigo-600 dark:text-indigo-400 stroke-[2.5]',
              checkIconSizes[size]
            )}
          />
        )}
      </button>
    );
  }
);

OptionListItem.displayName = 'OptionListItem';

export interface OptionListProps<T = string | number> {
  options: OptionItem<T>[];
  value?: T | null;
  onChange?: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
  showCheckmark?: boolean;
  emptyMessage?: string;
  emptyState?: React.ReactNode;
  className?: string;
  itemClassName?: string;
}

export function OptionList<T = string | number>({
  options,
  value,
  onChange,
  size = 'md',
  showCheckmark = true,
  emptyMessage = 'Tidak ada opsi yang ditemukan.',
  emptyState,
  className,
  itemClassName,
}: OptionListProps<T>) {
  if (options.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="py-8 px-4 text-center">
        <p className="text-[13px] md:text-xs text-slate-400 dark:text-slate-500 font-medium">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div role="listbox" className={cn('space-y-1.5', className)}>
      {options.map((opt, idx) => {
        const isSelected = value !== undefined && value !== null && opt.value === value;
        return (
          <OptionListItem
            key={String(opt.value ?? idx)}
            isSelected={isSelected}
            disabled={opt.disabled}
            label={opt.label}
            description={opt.description}
            icon={opt.icon}
            avatar={opt.avatar}
            badge={opt.badge}
            size={size}
            showCheckmark={showCheckmark}
            className={itemClassName}
            onClick={() => {
              if (!opt.disabled && onChange) {
                onChange(opt.value);
              }
            }}
          />
        );
      })}
    </div>
  );
}

export default OptionList;
