'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

let hasNavigatedInSession = false;

export function markAppNavigated() {
  hasNavigatedInSession = true;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('reeval_has_navigated', '1');
    } catch {}
  }
}

export function canGoBack(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasNavigatedInSession) return true;
  try {
    return sessionStorage.getItem('reeval_has_navigated') === '1' && window.history.length > 1;
  } catch {
    return window.history.length > 1;
  }
}

export function navigateBack(router: AppRouterInstance, fallbackHref?: string) {
  if (canGoBack()) {
    router.back();
  } else if (fallbackHref) {
    router.push(fallbackHref);
  } else {
    router.back();
  }
}
