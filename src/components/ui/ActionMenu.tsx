'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: 'left' | 'right';
  className?: string;
  triggerTitle?: string;
  menuWidth?: string;
}

export function ActionMenu({
  items,
  align = 'right',
  className,
  triggerTitle = 'Opsi',
  menuWidth,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left?: number; right?: number; placement: 'top' | 'bottom' } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const approxHeight = items.length * 36 + 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Buka ke atas jika ruang di bawah tidak mencukupi dan ruang di atas lebih besar
    const openUpward = spaceBelow < approxHeight && spaceAbove > spaceBelow;

    const top = openUpward ? Math.max(8, rect.top - approxHeight - 4) : rect.bottom + 4;

    if (align === 'right') {
      const right = Math.max(8, window.innerWidth - rect.right);
      setCoords({ top, right, placement: openUpward ? 'top' : 'bottom' });
    } else {
      const left = Math.max(8, rect.left);
      setCoords({ top, left, placement: openUpward ? 'top' : 'bottom' });
    }
  }, [items.length, align]);

  // Handle open/close toggle
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click, scroll, resize, or escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScroll() {
      setIsOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={cn('relative inline-block text-left', className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        title={triggerTitle}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && mounted && coords && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: coords.top,
            ...(coords.right !== undefined ? { right: coords.right } : { left: coords.left }),
          }}
          className={cn(
            'min-w-[108px] w-max rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800 z-[9999] animate-in fade-in zoom-in-95 duration-100',
            menuWidth
          )}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, idx) => {
            const isDanger = item.variant === 'danger';
            return (
              <button
                key={idx}
                type="button"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  item.onClick();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer text-left disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
                  isDanger
                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70'
                )}
                role="menuitem"
              >
                {item.icon && (
                  <span className={cn('shrink-0', isDanger ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
