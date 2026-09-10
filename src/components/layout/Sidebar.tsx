'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Warehouse,
  PackageOpen,
  ShoppingCart,
  Factory,
  Truck,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  RotateCcw,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { ROLE_ALLOWED_ROUTES, isRouteAllowed } from '@/lib/roles';

const allNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/order', label: 'Sales Order', icon: ShoppingCart },
  { href: '/production', label: 'Production', icon: Factory },
  { href: '/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/products', label: 'Product Catalog', icon: PackageOpen },
  { href: '/delivery', label: 'Delivery', icon: Truck },
  { href: '/finance', label: 'Finance', icon: DollarSign },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { currentUser, resetData, logout } = useApp();

  const [darkMode, setDarkMode] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Sync dark mode state with document class on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleDark = () => {
    const nextDark = !darkMode;
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

  // Filter navigation items strictly based on active user's role
  const visibleNavItems = allNavItems.filter(item => isRouteAllowed(currentUser.role, item.href));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900',
        collapsed ? 'w-[68px]' : 'w-[220px]'
      )}
    >
      {/* Diary Book Style Expand/Collapse Tab (Positioned outside sidebar in the middle) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-50 flex h-12 w-4 items-center justify-center rounded-r-md border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 hover:scale-105 cursor-pointer transition-all duration-200"
        title={collapsed ? 'Perluas Menu' : 'Perkecil Menu'}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-sm">
          R
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">Reeval ERP</h1>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">Manufacturing System</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Controls & Footer */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800 space-y-2">
        {/* Active User Persona (Clickable for Profile & Logout) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors text-left group"
            title="Klik profil untuk melihat detail & Logout"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs">
              {currentUser.initials}
            </div>
            {!collapsed && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.roleLabel}
                </p>
              </div>
            )}
            {!collapsed && <LogOut className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-500 shrink-0 ml-auto" />}
          </button>

          {/* Profile Popover / Dropdown Menu */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl dark:border-slate-700 dark:bg-slate-800 z-50 text-xs space-y-3">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs">
                    {currentUser.initials}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</div>
                    <div className="mt-0.5">
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px] font-bold">
                        {currentUser.roleLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <div>Password default: <strong className="text-slate-700 dark:text-slate-200 font-mono">123456</strong></div>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/60 font-semibold transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Keluar (Logout)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="space-y-1 pt-1">
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white w-full text-left"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-indigo-500" />}
            {!collapsed && <span>{darkMode ? 'Mode Terang' : 'Mode Gelap'}</span>}
          </button>

          <button
            onClick={async () => {
              const isOk = await confirm({
                title: 'Reset Data Demo',
                message: 'Apakah Anda yakin ingin mengembalikan seluruh data aplikasi ke kondisi awal demo?',
                confirmText: 'Reset Data',
                variant: 'danger',
              });
              if (isOk) {
                resetData();
                toast.success('Data Direset', 'Seluruh data aplikasi telah dikembalikan ke kondisi awal.');
              }
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 w-full text-left"
          >
            <RotateCcw className="h-4.5 w-4.5" />
            {!collapsed && <span>Reset Demo</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
