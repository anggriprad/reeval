'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function ConfigSection({
  title,
  description,
  icon: Icon,
  iconWrapperClass,
  children,
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  onToggle,
}: {
  title: string;
  description: string;
  icon: any;
  iconWrapperClass: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const handleClick = () => {
    const next = !isExpanded;
    if (!isControlled) {
      setInternalExpanded(next);
    }
    onToggle?.(next);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      <div
        className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
        onClick={handleClick}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconWrapperClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <div className="text-slate-400">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}
