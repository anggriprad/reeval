'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function useTableFilters<T extends Record<string, any>>(defaultFilters: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultFiltersRef = useRef<T>(defaultFilters);

  // Helper to extract filters from current URL search params
  const parseParams = useCallback((params: URLSearchParams): T => {
    const parsed = { ...defaultFiltersRef.current };

    Object.keys(defaultFiltersRef.current).forEach((key) => {
      const paramValue = params.get(key) ?? (key === 'status' ? params.get('tab') : null);
      if (paramValue !== null) {
        const defVal = defaultFiltersRef.current[key];
        if (typeof defVal === 'number') {
          (parsed as any)[key] = Number(paramValue);
        } else if (typeof defVal === 'boolean') {
          (parsed as any)[key] = paramValue === 'true';
        } else {
          (parsed as any)[key] = paramValue;
        }
      }
    });

    return parsed;
  }, []);

  const [filters, setFilters] = useState<T>(() => parseParams(searchParams));

  // Flag to avoid infinite loops between searchParams listener and filter updates
  const isInternalUrlUpdate = useRef(false);

  // 1. Sync searchParams -> state (Handles browser Back / Forward buttons)
  useEffect(() => {
    if (isInternalUrlUpdate.current) {
      isInternalUrlUpdate.current = false;
      return;
    }

    const fromUrl = parseParams(searchParams);
    setFilters((prev) => {
      let isDifferent = false;
      for (const key of Object.keys(defaultFiltersRef.current)) {
        if (prev[key] !== fromUrl[key]) {
          isDifferent = true;
          break;
        }
      }
      return isDifferent ? fromUrl : prev;
    });
  }, [searchParams, parseParams]);

  // 2. Sync state -> searchParams (Handles user actions like selecting a tab or typing search)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      Object.keys(filters).forEach((key) => {
        const val = filters[key];
        const defaultVal = defaultFiltersRef.current[key];
        if (val !== defaultVal && val !== '' && val !== null && val !== undefined) {
          params.set(key, String(val));
          if (key === 'status' && params.has('tab')) {
            params.delete('tab');
          }
        } else {
          params.delete(key);
          if (key === 'status' && params.has('tab')) {
            params.delete('tab');
          }
        }
      });

      const newQuery = params.toString();
      const currentQuery = searchParams.toString();

      if (newQuery !== currentQuery) {
        isInternalUrlUpdate.current = true;
        const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
        router.replace(newUrl, { scroll: false });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, pathname, router, searchParams]);

  const setFilter = useCallback((key: keyof T, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { filters, setFilter, setFilters };
}
