'use client';

import React from 'react';
import { usePermission } from '@/hooks/usePermission';

export interface PermissionGuardProps {
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative component that only renders children if the active user possesses the required permission(s).
 * If unauthorized, renders fallback (default: null / hidden).
 */
export function PermissionGuard({
  permission,
  anyPermissions,
  allPermissions,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { can, canAny, canAll } = usePermission();

  if (permission && !can(permission)) {
    return <>{fallback}</>;
  }

  if (anyPermissions && anyPermissions.length > 0 && !canAny(anyPermissions)) {
    return <>{fallback}</>;
  }

  if (allPermissions && allPermissions.length > 0 && !canAll(allPermissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default PermissionGuard;
