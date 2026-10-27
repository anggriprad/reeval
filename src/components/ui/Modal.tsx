'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  mobileFullScreen?: boolean;
  mobileBottomSheet?: boolean;
  sheetHeight?: 'auto' | 'sm' | 'md' | 'lg' | 'full';
  bottomSheetHeight?: 'auto' | 'sm' | 'md' | 'lg' | 'full';
  showClose?: boolean;
  showTitle?: boolean;
  noPadding?: boolean;
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
  mobileFullScreen,
  mobileBottomSheet = true,
  sheetHeight,
  bottomSheetHeight,
  showClose = true,
  showTitle = true,
  noPadding = false,
}: ModalProps) {
  const resolvedSheetHeight = sheetHeight || bottomSheetHeight || 'lg';
  const [modalEntered, setModalEntered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      setIsClosing(false);
      setDragY(0);
      setIsDragging(false);
      setModalEntered(false);
      const timer = setTimeout(() => {
        setModalEntered(true);
      }, 320);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    } else {
      setModalEntered(false);
      setIsClosing(false);
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if ((mobileBottomSheet || mobileFullScreen) && typeof window !== 'undefined' && window.innerWidth < 768) {
      setDragY(window.innerHeight);
    }
    setTimeout(() => {
      setIsClosing(false);
      setDragY(0);
      setIsDragging(false);
      onClose();
    }, 250);
  }, [isClosing, mobileBottomSheet, mobileFullScreen, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 60) {
      const exitHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      setDragY(exitHeight);
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        setDragY(0);
        setIsDragging(false);
        onClose();
      }, 250);
    } else {
      setDragY(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden overscroll-none',
        mobileFullScreen && 'max-md:p-0 max-md:items-stretch',
        mobileBottomSheet && (
          resolvedSheetHeight === 'full'
            ? 'max-md:p-0 max-md:items-stretch'
            : 'max-md:p-0 max-md:items-end'
        )
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 transition-opacity touch-none',
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-fade-in'
        )}
        onClick={handleClose}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
      />

      {/* Dialog Window Container */}
      <div
        style={{
          transform: isDragging || dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={cn(
          'relative z-10 flex flex-col w-full max-h-[92vh] md:max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden',
          mobileFullScreen
            ? cn(
                'max-md:h-full max-md:max-h-full max-md:rounded-none max-md:border-0',
                !modalEntered && dragY === 0 && !isClosing ? 'max-md:animate-sheet-in' : '',
                'md:animate-pop-in'
              )
            : mobileBottomSheet
            ? cn(
                resolvedSheetHeight === 'full'
                  ? 'max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none max-md:border-0'
                  : resolvedSheetHeight === 'sm'
                  ? 'max-md:max-h-[45vh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 max-md:shadow-[0_-8px_30px_rgba(0,0,0,0.25)]'
                  : resolvedSheetHeight === 'md'
                  ? 'max-md:max-h-[65vh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 max-md:shadow-[0_-8px_30px_rgba(0,0,0,0.25)]'
                  : 'max-md:max-h-[88vh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 max-md:shadow-[0_-8px_30px_rgba(0,0,0,0.25)]',
                !modalEntered && dragY === 0 && !isClosing ? 'max-md:animate-sheet-in' : '',
                'md:animate-pop-in'
              )
            : cn(isClosing ? 'animate-sheet-out' : 'animate-pop-in'),
          sizeClasses[size] || sizeClasses.md,
          className
        )}
      >
        {/* Mobile Drag Handle (on mobileFullScreen or mobileBottomSheet - no border-b above title!) */}
        {(mobileFullScreen || mobileBottomSheet) && (
          <div
            className={cn(
              "md:hidden w-full flex flex-col items-center pb-1 cursor-grab active:cursor-grabbing touch-none select-none bg-white dark:bg-slate-900 shrink-0",
              resolvedSheetHeight === 'full' ? "pt-[max(12px,env(safe-area-inset-top,12px))]" : "pt-3"
            )}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors" />
          </div>
        )}

        {/* Header / Title Container */}
        {Boolean(title) && showTitle !== false && (
          <div
            className={cn(
              "flex shrink-0 items-center border-b border-slate-200/80 px-4 md:px-6 py-3 md:py-3.5 dark:border-slate-800 bg-white dark:bg-slate-900 justify-between gap-2"
            )}
          >
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white shrink-0 cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}

            <div
              className={cn(
                "min-w-0 flex-1",
                onBack ? "text-center md:text-left md:ml-1" : "text-left"
              )}
            >
              <h2
                className={cn(
                  "font-bold text-slate-900 dark:text-white leading-snug truncate text-base md:text-lg",
                  onBack ? "text-center md:text-left" : "text-left"
                )}
              >
                {title}
              </h2>
              {description && (
                <p
                  className={cn(
                    "text-xs text-slate-500 dark:text-slate-400 mt-0.5",
                    onBack ? "text-center md:text-left" : "text-left"
                  )}
                >
                  {description}
                </p>
              )}
            </div>

            {showClose !== false && (
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 shrink-0 cursor-pointer ml-auto"
                title="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Body (Completely independent touch scrolling without drag interception) */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain text-[13.5px] md:text-xs",
            noPadding ? "p-0 space-y-0" : "px-4 sm:px-6 py-4 sm:py-5 space-y-4",
            bodyClassName
          )}
        >
          {children}
        </div>

        {/* Fixed Bottom Actions Container */}
        {actions ? (
          <div className={cn(
            "flex shrink-0 flex-col-reverse md:flex-row md:items-center md:justify-end gap-2 border-t border-slate-200/80 px-4 md:px-6 py-3 md:py-3.5 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 [&>button]:w-full [&>button]:md:w-auto max-md:[&_button]:w-full max-md:[&_button]:h-11 max-md:[&_button]:text-sm max-md:[&_button]:font-semibold max-md:[&_button]:rounded-xl",
            mobileFullScreen
              ? "max-md:pb-7 max-md:pt-3.5"
              : mobileBottomSheet
              ? "max-md:pb-[max(14px,calc(env(safe-area-inset-bottom,0px)+6px))] max-md:pt-3"
              : "max-md:pb-5",
            actionsClassName
          )}>
            {actions}
          </div>
        ) : (
          mobileBottomSheet && (
            <div className="md:hidden w-full pb-[env(safe-area-inset-bottom,0px)] shrink-0 bg-white dark:bg-slate-900" />
          )
        )}
      </div>
    </div>
  );
}

