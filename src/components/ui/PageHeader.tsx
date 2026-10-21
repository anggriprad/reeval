'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { setMobileHeaderBackTrigger, MobileHeaderSyncDetail } from '@/components/layout/MobileHeader';

export interface PageHeaderActionMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export interface PageHeaderProps {
  title: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  actions?: React.ReactNode;
  actionMenuItems?: PageHeaderActionMenuItem[];
  children?: React.ReactNode;
  className?: string;
  search?: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  };
  filter?: {
    isActive?: boolean;
    onOpen?: () => void;
  };
}

// Helper to inspect React node text content recursively
function getNodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join(' ');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return getNodeText(props.children);
  }
  return '';
}

// Helper to check if a React element represents a Configuration button/link
function extractConfigInfo(node: React.ReactNode): { isConfig: boolean; href?: string; onClick?: () => void } {
  if (!React.isValidElement(node)) return { isConfig: false };
  const props = node.props as { href?: string; onClick?: () => void; children?: React.ReactNode };
  const text = getNodeText(node).toLowerCase();
  const href = typeof props.href === 'string' ? props.href : undefined;

  // Only consider as config if it is an actual link/button or leaf element, not a generic container
  if ((href && href.includes('config')) || text.includes('konfigurasi')) {
    return { isConfig: true, href, onClick: props.onClick };
  }
  return { isConfig: false };
}

// Recursively separate Config elements from Primary Action elements
function separateMobileActions(node: React.ReactNode): {
  configLinks: Array<{ href?: string; onClick?: () => void }>;
  primaryNodes: React.ReactNode[];
} {
  const configLinks: Array<{ href?: string; onClick?: () => void }> = [];
  const primaryNodes: React.ReactNode[] = [];

  const traverse = (child: React.ReactNode) => {
    if (!child || typeof child === 'boolean') return;
    if (Array.isArray(child)) {
      child.forEach(traverse);
      return;
    }
    if (React.isValidElement(child)) {
      const props = child.props as { children?: React.ReactNode };
      // If it's a layout wrapper div or Fragment, always drill down into children first
      if (child.type === React.Fragment || child.type === 'div') {
        traverse(props.children);
        return;
      }
      
      const info = extractConfigInfo(child);
      if (info.isConfig) {
        configLinks.push({ href: info.href, onClick: info.onClick });
        return;
      }

      primaryNodes.push(child);
    }
  };

  traverse(node);
  return { configLinks, primaryNodes };
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
  search,
  filter,
}: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Locate #mobile-header-right-slot in MobileHeader
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('mobile-header-right-slot');
      if (el) {
        setPortalTarget(el);
      } else {
        const timer = setTimeout(() => {
          setPortalTarget(document.getElementById('mobile-header-right-slot'));
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname]);

  // Sync title, back navigation, search, and filter with MobileHeader
  useEffect(() => {
    setMobileHeaderBackTrigger(onBack || null);
    const detail: MobileHeaderSyncDetail = {
      title,
      backHref,
      hasCustomBack: Boolean(onBack),
      search,
      filter,
    };
    window.dispatchEvent(new CustomEvent('mobile-header-sync', { detail }));

    return () => {
      setMobileHeaderBackTrigger(null);
      window.dispatchEvent(new CustomEvent('mobile-header-sync', { detail: null }));
    };
  }, [title, backHref, onBack, search?.value, search?.placeholder, filter?.isActive]);


  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
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
        className="group border-slate-200/90 dark:border-slate-700/80 cursor-pointer shrink-0"
        title="Kembali"
        aria-label="Kembali"
      >
        <ArrowLeft className="h-4 w-4 transition-transform" />
      </Button>
    );
  };

  const actionElements = actions || children;
  const hasActions = actionElements || (actionMenuItems && actionMenuItems.length > 0);
  const { configLinks, primaryNodes } = separateMobileActions(actionElements);
  const showMobileBottomAction = pathname !== '/' && primaryNodes.length > 0;

  return (
    <>
      {/* Desktop PageHeader (Hidden on Mobile View) */}
      <div className={cn('hidden md:flex mb-4 flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {renderBackButton()}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
              {title}
            </h1>
          </div>
        </div>

        {hasActions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {actionElements}

            {actionMenuItems && actionMenuItems.length > 0 && (
              <ActionMenu
                items={actionMenuItems.map((item) => {
                  const Icon = item.icon;
                  return {
                    label: item.label,
                    onClick: item.onClick,
                    variant: item.variant,
                    icon: Icon ? <Icon className="h-4 w-4" /> : undefined,
                  };
                })}
                triggerSize="md"
                triggerTitle="Opsi Lanjutan"
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile Portal: Move Configuration Button & ActionMenuItems to Top Bar Header Right Corner */}
      {portalTarget &&
        createPortal(
          <>
            {configLinks.map((cfg, idx) =>
              cfg.href ? (
                <Link
                  key={`cfg-${idx}`}
                  href={cfg.href}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:text-slate-900 active:bg-slate-100/80 dark:text-slate-200 dark:hover:text-white dark:active:bg-slate-800/80 transition-colors active:scale-95 touch-manipulation cursor-pointer"
                  title="Konfigurasi"
                  aria-label="Konfigurasi"
                >
                  <Settings className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  key={`cfg-${idx}`}
                  type="button"
                  onClick={cfg.onClick}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:text-slate-900 active:bg-slate-100/80 dark:text-slate-200 dark:hover:text-white dark:active:bg-slate-800/80 transition-colors active:scale-95 touch-manipulation cursor-pointer"
                  title="Konfigurasi"
                  aria-label="Konfigurasi"
                >
                  <Settings className="h-5 w-5" />
                </button>
              )
            )}

            {actionMenuItems && actionMenuItems.length > 0 && (
              <ActionMenu
                items={actionMenuItems.map((item) => {
                  const Icon = item.icon;
                  return {
                    label: item.label,
                    onClick: item.onClick,
                    variant: item.variant,
                    icon: Icon ? <Icon className="h-4 w-4" /> : undefined,
                  };
                })}
                triggerSize="md"
                triggerTitle="Opsi Lanjutan"
              />
            )}
          </>,
          portalTarget
        )}

      {/* Mobile Fixed Bottom Action Bar (Full Width Action Button on Mobile) */}
      {mounted &&
        showMobileBottomAction &&
        createPortal(
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 dark:border-slate-800/90 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pt-3 px-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] after:content-[''] after:absolute after:top-full after:left-0 after:right-0 after:h-24 after:bg-white dark:after:bg-slate-900 pointer-events-auto">
            <div
              className={cn(
                'flex gap-2.5 w-full [&>*]:flex-1 [&>*]:w-full [&_a]:w-full [&_a]:block [&_button]:w-full [&_button]:h-12 [&_button]:text-[15px] [&_button]:font-bold [&_button]:justify-center [&_button]:rounded-xl',
                primaryNodes.length > 2 ? 'flex-col' : 'flex-row'
              )}
            >
              {primaryNodes.map((node, i) => (
                <React.Fragment key={i}>{node}</React.Fragment>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
