'use client';

import { useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions';

export function usePermission() {
  const { currentUser } = useApp();

  const isSuperAdmin = useMemo(() => {
    return Boolean(
      currentUser.is_superadmin ||
      currentUser.role === 'SUPER_ADMIN' ||
      (Array.isArray(currentUser.roles) && currentUser.roles.includes('SUPER_ADMIN')) ||
      (Array.isArray(currentUser.permissions) && (currentUser.permissions.includes('*') || currentUser.permissions.includes('system:*')))
    );
  }, [currentUser]);

  const permissions = useMemo(() => {
    return currentUser.permissions || [];
  }, [currentUser.permissions]);

  const can = useCallback(
    (permission: string) => {
      return hasPermission(permissions, permission, isSuperAdmin);
    },
    [permissions, isSuperAdmin]
  );

  const canAny = useCallback(
    (perms: string[]) => {
      return hasAnyPermission(permissions, perms, isSuperAdmin);
    },
    [permissions, isSuperAdmin]
  );

  const canAll = useCallback(
    (perms: string[]) => {
      return hasAllPermissions(permissions, perms, isSuperAdmin);
    },
    [permissions, isSuperAdmin]
  );

  return {
    can,
    canAny,
    canAll,
    isSuperAdmin,
    permissions,
  };
}
