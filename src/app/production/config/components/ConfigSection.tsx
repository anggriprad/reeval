'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface ConfigSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconWrapperClass: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  defaultExpanded?: boolean;
  isControlled?: boolean;
  isExpandedControlled?: boolean;
  hideChevron?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export function ConfigSection({
  title,
  description,
  icon: Icon,
  iconWrapperClass,
  children,
  headerAction,
  defaultExpanded = false,
  isControlled = false,
  isExpandedControlled = false,
  hideChevron = false,
  onToggle,
}: ConfigSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = isControlled ? isExpandedControlled : internalExpanded;

  const handleClick = () => {
    if (!hideChevron) {
      const next = !isExpanded;
      if (!isControlled) {
        setInternalExpanded(next);
      }
      onToggle?.(next);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all">
      <div
        className={`flex items-center gap-3.5 p-4 sm:p-5 transition-colors select-none ${
          hideChevron ? '' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70'
        }`}
        onClick={handleClick}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconWrapperClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {headerAction && (
            <div onClick={(e) => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
          {!hideChevron && (
            <div className="text-slate-400">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}
