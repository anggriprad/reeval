'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/signin' || pathname === '/change-password';

  useEffect(() => {
    setMounted(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setHasToken(Boolean(token));
  }, []);

  const authenticated = isLoggedIn || hasToken;
  const mustChange = mounted && typeof window !== 'undefined' && localStorage.getItem('mustChangePassword') === '1';

  useEffect(() => {
    if (mounted) {
      if (authenticated && mustChange && pathname !== '/change-password') {
        router.push('/change-password');
      } else if (!authenticated && !isAuthPage) {
        router.push('/login');
      }
    }
  }, [authenticated, isAuthPage, mounted, mustChange, pathname, router]);

  // Dynamically sync browser status bar / theme-color with the active dark/light mode
  useEffect(() => {
    const updateThemeMeta = () => {
      const isDark = document.documentElement.classList.contains('dark');
      let meta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', isDark ? '#020617' : '#f0f2f5');
    };

    updateThemeMeta();

    const observer = new MutationObserver(() => {
      updateThemeMeta();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // If on auth page (login, change-password), render full screen without sidebar
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </div>
    );
  }

  // Prevent hydration mismatch: render null during SSR & before client mount on protected routes
  if (!mounted || !authenticated || (mustChange && pathname !== '/change-password')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <PullToRefresh />
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <MobileHeader />
      <main
        className={cn(
          'transition-all duration-300 min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-16 ml-0',
          sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-[220px]'
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
