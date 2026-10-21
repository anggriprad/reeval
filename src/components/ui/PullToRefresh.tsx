'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

export function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);

  const THRESHOLD = 65;

  useEffect(() => {
    // Only enable on touch devices
    if (typeof window === 'undefined' || !('ontouchstart' in window)) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Do NOT trigger pull-to-refresh if any modal, sheet, or overlay is open
      if (document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden') {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest('.fixed') || target?.closest('[role="dialog"]') || target?.closest('.overflow-y-auto')) {
        return;
      }

      // Only initiate pull-to-refresh if we are at the very top of the page
      if (window.scrollY <= 0 && !isRefreshing) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      if (document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden') {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diffY = currentY - touchStartY.current;

      if (diffY > 0 && window.scrollY <= 0) {
        // Damped pull distance formula
        const distance = Math.min(Math.pow(diffY, 0.82) * 1.5, 90);
        setPullDistance(distance);
        // Prevent default only when actively pulling down at top
        if (distance > 10 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      setPullDistance((currentDistance) => {
        if (currentDistance >= THRESHOLD) {
          setIsRefreshing(true);
          // Haptic vibration feedback if available on mobile
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate(30);
            } catch {
              // Ignore
            }
          }

          // Trigger reload
          setTimeout(() => {
            window.location.reload();
          }, 350);

          return 52; // Keep indicator visible while reloading
        } else {
          return 0; // Snap back
        }
      });
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing]);

  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = isRefreshing ? 0 : progress * 280;

  return (
    <div
      className="md:hidden fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all"
      style={{
        top: `${68 + (pullDistance > 0 ? pullDistance * 0.7 : 0)}px`,
        opacity: isRefreshing ? 1 : Math.max(0.2, progress),
        transform: `translate(-50%, ${pullDistance > 0 ? 0 : -20}px) scale(${0.75 + progress * 0.25})`,
        transition: isPulling.current ? 'none' : 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xl border border-slate-200/90 dark:border-slate-700/90">
        <RefreshCw
          className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            transition: isPulling.current ? 'none' : 'transform 0.15s ease',
          }}
        />
      </div>
    </div>
  );
}
