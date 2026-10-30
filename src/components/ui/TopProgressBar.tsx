'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { loadingBarManager } from '@/context/LoadingBarContext';

export function TopProgressBar() {
  const [state, setState] = useState({ progress: 0, visible: false });
  const pathname = usePathname();

  useEffect(() => {
    return loadingBarManager.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  // Selesaikan loading bar saat rute berpindah
  useEffect(() => {
    loadingBarManager.forceFinish();
  }, [pathname]);

  if (!state.visible && state.progress === 0) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[2.5px] overflow-hidden"
    >
      <div
        className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-out"
        style={{
          width: `${state.progress}%`,
          opacity: state.visible ? 1 : 0,
          transitionProperty: 'width, opacity',
        }}
      />
    </div>
  );
}
