'use client';

import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { cn } from '@/lib/utils';

export interface TableActionItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  buttonVariant?: ButtonProps['variant'];
  menuVariant?: 'default' | 'danger';
  showIconInButton?: boolean;
  disabled?: boolean;
  title?: string;
}

export interface TableRowActionsProps {
  actions: (TableActionItem | null | undefined | false)[];
  menuWidth?: string;
  containerWidth?: string;
  className?: string;
  emptyFallback?: React.ReactNode;
  reserveOverflowSlot?: boolean;
}

export function TableRowActions({
  actions,
  menuWidth = 'w-max min-w-[130px]',
  containerWidth = 'w-auto',
  className,
  emptyFallback = '-',
  reserveOverflowSlot = false,
}: TableRowActionsProps) {
  const validActions = actions.filter((a): a is TableActionItem => Boolean(a));

  if (validActions.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center mx-auto text-slate-300 dark:text-slate-600 font-mono text-xs select-none',
          containerWidth
        )}
      >
        {emptyFallback}
      </div>
    );
  }

  const primaryAction = validActions[0];
  const moreActions = validActions.slice(1);
  const primaryVariant =
    primaryAction.buttonVariant ??
    (primaryAction.menuVariant === 'danger' ? 'outline-danger' : 'secondary');

  return (
    <div
      className={cn(
        'flex items-center justify-end gap-1.5 mx-auto whitespace-nowrap',
        containerWidth,
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        size="sm"
        variant={primaryVariant}
        disabled={primaryAction.disabled}
        className="flex-1 min-w-0 px-2.5 text-xs"
        onClick={(e) => {
          e.stopPropagation();
          if (!primaryAction.disabled) {
            primaryAction.onClick();
          }
        }}
        title={primaryAction.title || primaryAction.label}
      >
        {primaryAction.showIconInButton && primaryAction.icon && (
          <span className="shrink-0">{primaryAction.icon}</span>
        )}
        <span className="truncate">{primaryAction.label}</span>
      </Button>

      {moreActions.length > 0 ? (
        <ActionMenu
          className="shrink-0"
          menuWidth={menuWidth}
          items={moreActions.map((act) => ({
            label: act.label,
            icon: act.icon,
            variant:
              act.menuVariant ??
              (act.buttonVariant === 'danger' ||
                act.buttonVariant === 'outline-danger' ||
                act.buttonVariant === 'danger-outline'
                ? 'danger'
                : 'default'),
            disabled: act.disabled,
            onClick: act.onClick,
          }))}
        />
      ) : reserveOverflowSlot ? (
        <span className="w-9 md:w-8 shrink-0" aria-hidden="true" />
      ) : null}
    </div>
  );
}

