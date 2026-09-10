'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface PageHeaderActionMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface PageHeaderProps {
  title: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  actions?: React.ReactNode;
  actionMenuItems?: PageHeaderActionMenuItem[];
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  backHref,
  onBack,
  showBackButton,
  actions,
  actionMenuItems,
  children,
  className,
}: PageHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const renderBackButton = () => {
    if (!backHref && !onBack && !showBackButton) return null;

    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleBack}
        className="group border-slate-200/90 dark:border-slate-700/80 active:scale-95 cursor-pointer shrink-0"
        title="Kembali"
        aria-label="Kembali"
      >
        <ArrowLeft className="h-4 w-4 transition-transform" />
      </Button>
    );
  };

  const actionElements = actions || children;
  const hasActions = actionElements || (actionMenuItems && actionMenuItems.length > 0);

  return (
    <div className={cn('mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-center gap-4 min-w-0">
        {renderBackButton()}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3 flex-wrap">
            {title}
          </h1>
        </div>
      </div>

      {hasActions && (
        <div className="flex items-center gap-2 shrink-0">
          {actionElements}

          {actionMenuItems && actionMenuItems.length > 0 && (
            <div className="relative" ref={menuRef}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMenuOpen(!menuOpen)}
                title="Opsi Lanjutan"
                aria-label="Opsi Lanjutan"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 z-30 py-1.5 text-xs">
                  {actionMenuItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isDanger = item.variant === 'danger';
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          item.onClick();
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3.5 py-2 text-left font-medium cursor-pointer transition-colors text-xs',
                          isDanger
                            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 border-t border-slate-100 dark:border-slate-700/60'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                        )}
                      >
                        {Icon && <Icon className={cn('h-3.5 w-3.5', isDanger ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400')} />}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
