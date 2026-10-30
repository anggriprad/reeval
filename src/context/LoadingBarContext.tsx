'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

type LoadingBarListener = (state: { progress: number; visible: boolean }) => void;

class LoadingBarManager {
  private activeRequests = 0;
  private progress = 0;
  private visible = false;
  private trickleTimer: ReturnType<typeof setInterval> | null = null;
  private finishTimer: ReturnType<typeof setTimeout> | null = null;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<LoadingBarListener> = new Set();

  public subscribe(listener: LoadingBarListener) {
    this.listeners.add(listener);
    listener({ progress: this.progress, visible: this.visible });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ progress: this.progress, visible: this.visible });
    }
  }

  public start() {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      if (this.finishTimer) clearTimeout(this.finishTimer);
      if (this.resetTimer) clearTimeout(this.resetTimer);
      if (this.trickleTimer) clearInterval(this.trickleTimer);

      this.visible = true;
      this.progress = 15;
      this.notify();

      this.trickleTimer = setInterval(() => {
        if (this.progress < 60) {
          this.progress += Math.floor(Math.random() * 8) + 4;
        } else if (this.progress < 85) {
          this.progress += Math.floor(Math.random() * 3) + 1;
        }
        this.notify();
      }, 250);
    }
  }

  public finish() {
    if (this.activeRequests <= 0) return;
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    if (this.activeRequests === 0) {
      if (this.trickleTimer) clearInterval(this.trickleTimer);
      this.progress = 100;
      this.notify();

      this.finishTimer = setTimeout(() => {
        this.visible = false;
        this.notify();

        this.resetTimer = setTimeout(() => {
          this.progress = 0;
          this.notify();
        }, 300);
      }, 200);
    }
  }

  public forceFinish() {
    this.activeRequests = 0;
    if (this.trickleTimer) clearInterval(this.trickleTimer);
    if (this.finishTimer) clearTimeout(this.finishTimer);
    if (this.resetTimer) clearTimeout(this.resetTimer);

    if (this.visible || this.progress > 0) {
      this.progress = 100;
      this.notify();

      this.finishTimer = setTimeout(() => {
        this.visible = false;
        this.notify();

        this.resetTimer = setTimeout(() => {
          this.progress = 0;
          this.notify();
        }, 300);
      }, 200);
    }
  }
}

export const loadingBarManager = new LoadingBarManager();

interface LoadingBarContextValue {
  start: () => void;
  finish: () => void;
  forceFinish: () => void;
  withLoading: <T>(fn: () => Promise<T> | T) => Promise<T>;
  isLoading: boolean;
}

const LoadingBarContext = createContext<LoadingBarContextValue | undefined>(undefined);

export function LoadingBarProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return loadingBarManager.subscribe((state) => {
      setIsLoading(state.visible);
    });
  }, []);

  const start = useCallback(() => {
    loadingBarManager.start();
  }, []);

  const finish = useCallback(() => {
    loadingBarManager.finish();
  }, []);

  const forceFinish = useCallback(() => {
    loadingBarManager.forceFinish();
  }, []);

  const withLoading = useCallback(async <T,>(fn: () => Promise<T> | T): Promise<T> => {
    loadingBarManager.start();
    try {
      const result = await fn();
      return result;
    } finally {
      loadingBarManager.finish();
    }
  }, []);

  return (
    <LoadingBarContext.Provider value={{ start, finish, forceFinish, withLoading, isLoading }}>
      {children}
    </LoadingBarContext.Provider>
  );
}

export function useLoadingBar(): LoadingBarContextValue {
  const context = useContext(LoadingBarContext);
  if (!context) {
    return {
      start: () => loadingBarManager.start(),
      finish: () => loadingBarManager.finish(),
      forceFinish: () => loadingBarManager.forceFinish(),
      withLoading: async <T,>(fn: () => Promise<T> | T): Promise<T> => {
        loadingBarManager.start();
        try {
          return await fn();
        } finally {
          loadingBarManager.finish();
        }
      },
      isLoading: false,
    };
  }
  return context;
}
