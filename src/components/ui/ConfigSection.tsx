'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface ConfigSectionProps {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  isControlled?: boolean;
  isExpandedControlled?: boolean;
  hideChevron?: boolean;
  isLoading?: boolean;
  onToggle?: (expanded: boolean) => void;
  className?: string;
  iconWrapperClass?: string;
  collapsedIconWrapperClass?: string;
}

export function ConfigSection({
  title,
  description,
  icon: Icon,
  children,
  headerAction,
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  isControlled,
  isExpandedControlled,
  hideChevron = false,
  isLoading = false,
  onToggle,
  className = '',
  iconWrapperClass,
  collapsedIconWrapperClass,
}: ConfigSectionProps) {
  const isControlledMode = isControlled !== undefined
    ? isControlled
    : controlledExpanded !== undefined;

  const resolvedExpandedControlled = isExpandedControlled !== undefined
    ? isExpandedControlled
    : controlledExpanded;

  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = isControlledMode ? Boolean(resolvedExpandedControlled) : internalExpanded;

  const handleClick = () => {
    if (!hideChevron) {
      const next = !isExpanded;
      if (!isControlledMode) {
        setInternalExpanded(next);
      }
      onToggle?.(next);
    }
  };

  const currentIconWrapperClass = isExpanded
    ? (iconWrapperClass || 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400')
    : (collapsedIconWrapperClass || 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400');

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all ${className}`}>
      <div
        className={`flex items-center gap-3.5 p-3.5 sm:p-4 transition-colors select-none ${hideChevron ? '' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70'
          }`}
        onClick={handleClick}
      >
        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${currentIconWrapperClass}`}>
          <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-sm text-slate-900 dark:text-white truncate">{title}</h3>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {headerAction && (
            <div onClick={(e) => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
          {isLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          )}
          {!hideChevron && (
            <div className="text-slate-400">
              {isExpanded ? <ChevronUp className="h-4.5 w-4.5 sm:h-5 sm:w-5" /> : <ChevronDown className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 sm:p-4 pt-0 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}

