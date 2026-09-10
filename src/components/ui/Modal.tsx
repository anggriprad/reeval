'use client';

import React, { useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  bodyClassName?: string;
  actionsClassName?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
  full: 'max-w-[95vw]',
};

export function Modal({
  isOpen,
  onClose,
  onBack,
  title,
  description,
  children,
  actions,
  size = 'md',
  className,
  bodyClassName,
  actionsClassName,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog Window Container */}
      <div
        className={cn(
          'relative z-10 flex flex-col w-full max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all animate-pop-in',
          sizeClasses[size] || sizeClasses.md,
          className
        )}
      >
        {/* Fixed Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white shrink-0 -ml-1.5"
                title="Kembali"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug truncate">{title}</h2>
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
              )}
            </div>
          </div>

          {!onBack && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 shrink-0 ml-4"
              title="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className={cn("flex-1 overflow-y-auto px-6 py-5 space-y-4", bodyClassName)}>
          {children}
        </div>

        {/* Fixed Bottom Actions Container */}
        {actions && (
          <div className={cn("flex shrink-0 items-center justify-end gap-2 border-t border-slate-200/80 px-6 py-3.5 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80", actionsClassName)}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

