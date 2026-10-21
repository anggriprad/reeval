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

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoggedIn && !isLoginPage) {
      router.push('/login');
    }
  }, [isLoggedIn, isLoginPage, router]);

  // If on login page, render full screen without sidebar
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </div>
    );
  }

  // If not logged in, render null while redirecting
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
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
