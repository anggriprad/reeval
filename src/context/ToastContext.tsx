'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, AlertTriangle, HelpCircle, X } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  isExiting?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isExiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 220);
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${generateId()}`;
    const textMessage = message || title;
    const newToast: ToastItem = { id, type, message: textMessage, isExiting: false };

    setToasts(prev => [...prev, newToast].slice(-3));

    setTimeout(() => {
      dismissToast(id);
    }, 3500);
  }, [dismissToast]);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: ConfirmOptions = typeof options === 'string'
        ? { title: 'Konfirmasi', message: options, confirmText: 'Ya, Lanjutkan', variant: 'danger' }
        : options;

      setConfirmState({
        isOpen: true,
        title: opts.title || 'Konfirmasi',
        message: opts.message || '',
        confirmText: opts.confirmText || (opts.variant === 'danger' ? 'Hapus' : 'Ya, Lanjutkan'),
        cancelText: opts.cancelText || 'Batal',
        variant: opts.variant || 'danger',
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  };

  const toast = {
    success: (title: string, message?: string) => showToast('success', title, message),
    error: (title: string, message?: string) => showToast('error', title, message),
    warning: (title: string, message?: string) => showToast('warning', title, message),
    info: (title: string, message?: string) => showToast('info', title, message),
  };

  return (
    <ToastContext.Provider value={{ toast, confirm, showToast }}>
      {children}

      {/* ── Top-Center Noticeable Theme-Adaptive Toast Container ────────────────── */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-2.5 max-w-lg w-full px-4">
        {toasts.map((t) => {
          const Icon = {
            success: CheckCircle2,
            error: XCircle,
            warning: AlertCircle,
            info: Info,
          }[t.type];

          const iconColorStyle = {
            success: 'text-emerald-500 dark:text-emerald-400',
            error: 'text-red-500 dark:text-red-400',
            warning: 'text-amber-500 dark:text-amber-400',
            info: 'text-indigo-500 dark:text-indigo-400',
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between gap-3.5 px-4 py-3 rounded-xl bg-white text-slate-900 border border-slate-200 shadow-xl shadow-slate-400/20 dark:bg-slate-900 dark:text-white dark:border-slate-700/80 dark:shadow-2xl dark:shadow-black/80 transition-all ${
                t.isExiting ? 'animate-toast-out' : 'animate-toast-in'
              } max-w-full`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`h-5 w-5 shrink-0 ${iconColorStyle}`} />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-snug">
                  {t.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Custom Theme-Adaptive Confirm Dialog Modal ────────────────────────────────────── */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div
            className="w-full max-w-md bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white rounded-xl shadow-2xl overflow-hidden animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  confirmState.variant === 'danger'
                    ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                    : confirmState.variant === 'warning'
                    ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
                }`}>
                  {confirmState.variant === 'danger' || confirmState.variant === 'warning' ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <HelpCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {confirmState.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {confirmState.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleConfirmClose(false)}
                >
                  {confirmState.cancelText || 'Batal'}
                </Button>
                <Button
                  type="button"
                  variant={confirmState.variant === 'danger' ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => handleConfirmClose(true)}
                  autoFocus
                >
                  {confirmState.confirmText || 'Konfirmasi'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function useConfirm() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ToastProvider');
  }
  return context.confirm;
}
