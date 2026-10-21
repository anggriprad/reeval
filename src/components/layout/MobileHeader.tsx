'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Moon,
  Sun,
  RotateCcw,
  LogOut,
  User,
  LayoutGrid,
  X,
  Search,
  Filter,
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Warehouse,
  PackageOpen,
  Truck,
  DollarSign,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Toggle } from '@/components/ui/Toggle';
import { isRouteAllowed } from '@/lib/roles';
import { cn } from '@/lib/utils';

export interface MobileHeaderSyncDetail {
  title?: React.ReactNode;
  backHref?: string;
  hasCustomBack?: boolean;
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

export interface MobileControlsSyncDetail {
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

// Global callback reference for custom onBack handlers from PageHeader
let customBackTrigger: (() => void) | null = null;
export function setMobileHeaderBackTrigger(fn: (() => void) | null) {
  customBackTrigger = fn;
}

const moduleRootRoutes = [
  '/order',
  '/production',
  '/inventory',
  '/products',
  '/customers',
  '/suppliers',
  '/users',
  '/delivery',
  '/finance',
  '/purchasing',
];

// Helper to determine fallback module title, root vs subpage, & backHref from pathname
function getSectionMeta(pathname: string): { title: string; isSubpage: boolean; isModuleRoot: boolean; defaultBackHref: string } {
  const isModuleRoot = moduleRootRoutes.includes(pathname);
  if (pathname === '/') return { title: 'Dashboard', isSubpage: false, isModuleRoot: false, defaultBackHref: '/' };
  if (pathname === '/order') return { title: 'Sales Order', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  if (pathname === '/order/create') return { title: 'Buat Pesanan', isSubpage: true, isModuleRoot: false, defaultBackHref: '/order' };
  if (pathname.startsWith('/order/')) return { title: 'Sales Order', isSubpage: true, isModuleRoot: false, defaultBackHref: '/order' };
  if (pathname === '/production') return { title: 'Produksi', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  if (pathname.startsWith('/production/')) return { title: 'Produksi', isSubpage: true, isModuleRoot: false, defaultBackHref: '/production' };
  if (pathname === '/inventory') return { title: 'Inventory', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  if (pathname.startsWith('/inventory/')) return { title: 'Inventory', isSubpage: true, isModuleRoot: false, defaultBackHref: '/inventory' };
  if (pathname === '/products') return { title: 'Katalog Produk', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  if (pathname.startsWith('/products/')) return { title: 'Katalog Produk', isSubpage: true, isModuleRoot: false, defaultBackHref: '/products' };
  if (pathname === '/delivery') return { title: 'Pengiriman', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  if (pathname.startsWith('/delivery/')) return { title: 'Pengiriman', isSubpage: true, isModuleRoot: false, defaultBackHref: '/delivery' };
  if (pathname === '/finance') return { title: 'Keuangan', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  if (pathname.startsWith('/finance/')) return { title: 'Keuangan', isSubpage: true, isModuleRoot: false, defaultBackHref: '/finance' };
  if (pathname === '/purchasing') return { title: 'Pengadaan', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  if (pathname.startsWith('/purchasing/')) return { title: 'Pengadaan', isSubpage: true, isModuleRoot: false, defaultBackHref: '/purchasing' };
  if (pathname === '/customers') return { title: 'Pelanggan', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  if (pathname === '/suppliers') return { title: 'Supplier', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  if (pathname === '/users') return { title: 'Pengguna', isSubpage: true, isModuleRoot: true, defaultBackHref: '/' };
  return { title: 'Reeval ERP', isSubpage: true, isModuleRoot, defaultBackHref: '/' };
}

export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { currentUser, resetData, logout, salesOrders = [], workOrders = [], materials = [] } = useApp();

  const [darkMode, setDarkMode] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [isSheetClosing, setIsSheetClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number>(0);
  const [syncedHeader, setSyncedHeader] = useState<MobileHeaderSyncDetail | null>(null);
  const [syncedControls, setSyncedControls] = useState<MobileControlsSyncDetail | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close search mode when pathname changes
  useEffect(() => {
    setIsSearchMode(false);
  }, [pathname]);

  // Auto focus input when search mode opens
  useEffect(() => {
    if (isSearchMode) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchMode]);

  // Sync dark mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  // Lock body scroll when bottom sheet is open
  useEffect(() => {
    if (showMenuSheet) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [showMenuSheet]);

  const [sheetEntered, setSheetEntered] = useState(false);

  // Reset menus on pathname change
  useEffect(() => {
    setShowProfileMenu(false);
    setShowMenuSheet(false);
    setIsSheetClosing(false);
    setSheetEntered(false);
    setDragY(0);
    setIsDragging(false);
  }, [pathname]);

  const openMenuSheet = () => {
    setIsSheetClosing(false);
    setSheetEntered(false);
    setDragY(0);
    setIsDragging(false);
    setShowMenuSheet(true);
    setTimeout(() => {
      setSheetEntered(true);
    }, 320);
  };

  const closeMenuSheet = () => {
    if (isSheetClosing) return;
    setIsSheetClosing(true);
    setSheetEntered(false);
    setTimeout(() => {
      setShowMenuSheet(false);
      setIsSheetClosing(false);
      setDragY(0);
      setIsDragging(false);
    }, 200);
  };

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
    if (dragY > 70) {
      closeMenuSheet();
    } else {
      setDragY(0);
    }
  };

  // Listen to PageHeader synchronization events
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<MobileHeaderSyncDetail | null>;
      setSyncedHeader(customEvent.detail);
    };
    const handleControlsSync = (e: Event) => {
      const customEvent = e as CustomEvent<MobileControlsSyncDetail | null>;
      setSyncedControls(customEvent.detail);
    };
    window.addEventListener('mobile-header-sync', handleSync);
    window.addEventListener('mobile-controls-sync', handleControlsSync);
    return () => {
      window.removeEventListener('mobile-header-sync', handleSync);
      window.removeEventListener('mobile-controls-sync', handleControlsSync);
    };
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const toggleDark = (nextVal?: boolean) => {
    const nextDark = typeof nextVal === 'boolean' ? nextVal : !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    logout();
    router.push('/login');
  };

  if (!currentUser) return null;

  const { title: fallbackTitle, isSubpage, isModuleRoot, defaultBackHref } = getSectionMeta(pathname);
  const displayTitle = syncedHeader?.title || fallbackTitle;
  const targetBackHref = syncedHeader?.backHref || defaultBackHref;
  const activeSearch = syncedControls?.search || syncedHeader?.search;
  const activeFilter = syncedControls?.filter || syncedHeader?.filter;

  // Badge counts for Bottom Sheet Super App Menu
  const activeOrdersCount = salesOrders.filter(o => o.status !== 'CANCELED' && o.status !== 'SENT').length;
  const activeWorkOrdersCount = workOrders.filter(w => w.status !== 'COMPLETED').length;
  const lowStockCount = materials.filter(m => m.stock <= m.minStock).length;

  const sheetModules = [
    {
      href: '/order',
      label: 'Sales Order',
      icon: ShoppingCart,
      colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900/60',
      badgeCount: activeOrdersCount,
    },
    {
      href: '/production',
      label: 'Produksi',
      icon: Factory,
      colorClass: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60',
      badgeCount: activeWorkOrdersCount,
    },
    {
      href: '/inventory',
      label: 'Inventory',
      icon: Warehouse,
      colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60',
      badgeCount: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      href: '/products',
      label: 'Katalog',
      icon: PackageOpen,
      colorClass: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900/60',
    },
    {
      href: '/delivery',
      label: 'Pengiriman',
      icon: Truck,
      colorClass: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60',
    },
    {
      href: '/finance',
      label: 'Keuangan',
      icon: DollarSign,
      colorClass: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60',
    },
  ].filter(item => isRouteAllowed(currentUser.role, item.href));

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/95">
        {/* SEARCH MODE FULL WIDTH HEADER */}
        {isSearchMode && activeSearch && (
          <div className="flex items-center gap-2.5 w-full h-full animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => {
                setIsSearchMode(false);
                activeSearch.onChange('');
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl -ml-2 text-slate-700 hover:bg-slate-100 active:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800/80 transition-colors cursor-pointer"
              title="Tutup Pencarian"
              aria-label="Tutup Pencarian"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="relative flex-1 min-w-0">
              <input
                ref={searchInputRef}
                type="text"
                value={activeSearch.value}
                onChange={(e) => activeSearch.onChange(e.target.value)}
                placeholder={activeSearch.placeholder || 'Cari...'}
                className="w-full h-10 pl-3.5 pr-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-[16px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:border-indigo-500/30"
              />
              {activeSearch.value ? (
                <button
                  type="button"
                  onClick={() => {
                    activeSearch.onChange('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  title="Hapus Teks"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* NORMAL HEADER (Kept permanently in DOM so React portal target #mobile-header-right-slot is never destroyed) */}
        <div className={cn("items-center justify-between w-full h-full", isSearchMode && activeSearch ? "hidden" : "flex")}>
          {/* Left: Brand (on Dashboard) or Back Navigation + Title (on Module/Subpage) */}
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            {isSubpage ? (
              <>
                {syncedHeader?.hasCustomBack && customBackTrigger ? (
                  <button
                    type="button"
                    onClick={() => customBackTrigger && customBackTrigger()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl -ml-2 text-slate-700 hover:bg-slate-100 active:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800/80 transition-colors touch-manipulation cursor-pointer"
                    title="Kembali"
                    aria-label="Kembali"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <Link
                    href={targetBackHref}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl -ml-2 text-slate-700 hover:bg-slate-100 active:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800/80 transition-colors touch-manipulation cursor-pointer"
                    title="Kembali"
                    aria-label="Kembali"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                )}
                <h1 className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white truncate flex items-center gap-2 min-w-0 [&_span]:truncate">
                  {displayTitle}
                </h1>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-xs">
                  R
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                    REEVAL ERP
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight">
                    {currentUser.roleLabel}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Contextual Search Button (Mobile) */}
            {activeSearch && (
              <button
                type="button"
                onClick={() => setIsSearchMode(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 active:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800/80 transition-colors cursor-pointer"
                title="Cari"
                aria-label="Cari"
              >
                <Search className="h-5 w-5" />
              </button>
            )}

            {/* Contextual Filter Button (Mobile) with active badge dot */}
            {activeFilter && (
              <button
                type="button"
                onClick={() => activeFilter.onOpen?.()}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 active:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800/80 transition-colors cursor-pointer"
                title="Filter"
                aria-label="Filter"
              >
                <Filter className="h-5 w-5" />
                {activeFilter.isActive && (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            )}

            {/* PageHeader Config button & ActionMenu portal target */}
            <div id="mobile-header-right-slot" className="flex items-center gap-1 empty:hidden" />

            {!isSubpage ? (
              /* On Dashboard ('/'): Show Profile Icon Button with Theme Toggle Switch inside */
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition-colors touch-manipulation font-bold text-sm"
                  title="Menu Pengguna"
                >
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-2.5 px-1">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {currentUser.email}
                      </p>
                      <div className="mt-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[11px] font-bold">
                          {currentUser.roleLabel}
                        </span>
                      </div>
                    </div>

                    {/* Theme Toggle Switch inside Profile Menu */}
                    <div
                      onClick={() => toggleDark(!darkMode)}
                      className="flex items-center justify-between w-full px-2.5 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer mb-1"
                    >
                      <div className="flex items-center gap-2.5">
                        {darkMode ? (
                          <Moon className="h-4 w-4 text-indigo-400" />
                        ) : (
                          <Sun className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Tema Gelap
                        </span>
                      </div>
                      <Toggle
                        size="sm"
                        checked={darkMode}
                        onChange={(val) => toggleDark(val)}
                      />
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-1.5 space-y-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setShowProfileMenu(false);
                          const isOk = await confirm({
                            title: 'Reset Data Demo',
                            message: 'Apakah Anda yakin ingin mengembalikan seluruh data demo aplikasi?',
                            confirmText: 'Reset Data',
                            variant: 'danger',
                          });
                          if (isOk) {
                            resetData();
                            toast.success('Data Direset', 'Berhasil mereset data demo.');
                          }
                        }}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors text-left"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Reset Demo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Bottom Sheet Menu Aplikasi (Triggered by Grid Icon on Mobile) */}
      {showMenuSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop: plain dark without blur, with touch scroll-lock */}
          <div
            className={cn(
              'fixed inset-0 bg-slate-950/70 touch-none',
              isSheetClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
            )}
            onClick={closeMenuSheet}
            onTouchMove={(e) => e.preventDefault()}
          />

          {/* Sheet Container: Gesture drag-to-dismiss & smooth entrance/exit */}
          <div
            style={{
              transform: isDragging || dragY > 0 ? `translateY(${dragY}px)` : undefined,
              transition: isDragging ? 'none' : isSheetClosing ? undefined : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={cn(
              'relative z-10 w-full rounded-t-[28px] border-t border-slate-200/90 bg-white px-5 pt-3 pb-8 shadow-2xl dark:border-slate-800/90 dark:bg-slate-900',
              isSheetClosing ? 'animate-sheet-out' : !sheetEntered ? 'animate-sheet-in' : ''
            )}
          >
            {/* Gesture Drag Handle Area (Touch down to drag sheet downwards) */}
            <div
              className="w-full flex flex-col items-center pt-1 pb-5 cursor-grab active:cursor-grabbing touch-none select-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors" />
            </div>

            {/* Module Grid: Clean neutral presentation without active state highlight */}
            <div className="grid grid-cols-3 gap-3">
              {sheetModules.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenuSheet}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-150 active:scale-95 touch-manipulation hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="relative">
                      <div
                        className={cn(
                          'flex h-14 w-14 items-center justify-center rounded-2xl shadow-xs border',
                          item.colorClass
                        )}
                      >
                        <Icon className="h-6 w-6 shrink-0" />
                      </div>
                      {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-bold shadow-xs">
                          {item.badgeCount > 99 ? '99+' : item.badgeCount}
                        </span>
                      )}
                    </div>
                    <span className="mt-2 text-xs font-semibold text-center text-slate-800 dark:text-slate-200 line-clamp-1">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
