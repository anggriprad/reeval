'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';

export function useUrlTab<T extends string>(validTabs: readonly T[], defaultTab: T): [T, (tab: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab = (tabParam && validTabs.includes(tabParam as T) ? tabParam : defaultTab) as T;

  const setTab = useCallback(
    (newTab: T) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', newTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  useEffect(() => {
    if (!searchParams.has('tab')) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', defaultTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, pathname, router, defaultTab]);

  return [activeTab, setTab];
}
