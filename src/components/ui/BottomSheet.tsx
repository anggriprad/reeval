'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showCancel?: boolean;
  cancelLabel?: string;
  showDragHandle?: boolean;
  showClose?: boolean;
  showTitle?: boolean;
  height?: 'auto' | 'sm' | 'md' | 'lg' | 'full';
  sheetHeight?: 'auto' | 'sm' | 'md' | 'lg' | 'full';
}

export function BottomSheet({
  isOpen,
  onClose,
  onBack,
  title,
  description,
  children,
  className,
  showCancel = false,
  cancelLabel = 'Batal',
  showDragHandle = true,
  showClose = true,
  showTitle = true,
  height,
  sheetHeight,
}: BottomSheetProps) {
  const resolvedHeight = sheetHeight || height || 'auto';
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    const exitHeight = sheetRef.current?.offsetHeight || 600;
    setDragY(exitHeight);
    setTimeout(() => {
      setIsClosing(false);
      setDragY(0);
      setIsDragging(false);
      onClose();
    }, 250);
  }, [isClosing, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  // Touch handlers for drag-down dismiss
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
      const exitHeight = sheetRef.current?.offsetHeight || 600;
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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9998] touch-none transition-opacity',
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
        )}
        onClick={handleClose}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Bottom Sheet Container */}
      <div
        ref={sheetRef}
        style={{
          transform: isDragging || dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[9999] bg-white dark:bg-slate-900 shadow-2xl flex flex-col',
          resolvedHeight === 'full'
            ? 'h-[100dvh] max-h-[100dvh] rounded-none border-0 p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]'
            : resolvedHeight === 'sm'
            ? 'max-h-[45vh] rounded-t-2xl border-t border-slate-200 dark:border-slate-800 p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]'
            : resolvedHeight === 'md'
            ? 'max-h-[65vh] rounded-t-2xl border-t border-slate-200 dark:border-slate-800 p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]'
            : resolvedHeight === 'lg'
            ? 'max-h-[88vh] rounded-t-2xl border-t border-slate-200 dark:border-slate-800 p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]'
            : 'max-h-[85vh] rounded-t-2xl border-t border-slate-200 dark:border-slate-800 p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]',
          !isClosing && dragY === 0 ? 'animate-sheet-in' : '',
          className
        )}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle (no border-b above title!) */}
        {showDragHandle && (
          <div
            className={cn(
              "w-full flex flex-col items-center pb-2 cursor-grab active:cursor-grabbing touch-none select-none shrink-0",
              resolvedHeight === 'full' ? "pt-1" : "pt-0"
            )}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors" />
          </div>
        )}

        {/* Title Container: can show/hide based on title presence */}
        {Boolean(title) && showTitle !== false && (
          <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
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
                onBack ? "text-center" : "text-left"
              )}
            >
              <h2
                className={cn(
                  "font-bold text-base text-slate-900 dark:text-white leading-snug truncate",
                  onBack ? "text-center" : "text-left"
                )}
              >
                {title}
              </h2>
              {description && (
                <p className={cn("text-xs text-slate-500 dark:text-slate-400 mt-0.5", onBack ? "text-center" : "text-left")}>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Optional Cancel Button (tanpa border atas) */}
        {showCancel && (
          <div className="pt-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="w-full h-11 text-[15px] font-semibold rounded-xl"
            >
              {cancelLabel}
            </Button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
