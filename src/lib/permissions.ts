/**
 * Reeval ERP — Granular Permission System (PBAC)
 * Penulisan kode permission 100% selaras dengan Seeder Backend api-reeval.
 */

export const PERMISSIONS = {
  GLOBAL: '*',

  // Company & Tenant Administration
  COMPANY: {
    READ: 'company:read',
    UPDATE: 'company:update',
    SETTINGS: 'company:settings',
  },

  // User & Role Access Control (UAC)
  USER: {
    READ: 'user:read',
    CREATE: 'user:create',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
  },
  ROLE: {
    READ: 'role:read',
    CREATE: 'role:create',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
  },

  // Sales & Commercial
  SALES: {
    READ: 'sales:read',
    CREATE: 'sales:create',
    UPDATE: 'sales:update',
    APPROVE: 'sales:approve',
    DELETE: 'sales:delete',
  },

  // Production & Factory Floor
  PRODUCTION: {
    READ: 'production:read',
    CREATE: 'production:create',
    UPDATE: 'production:update',
    DELETE: 'production:delete',
    COMPLETE: 'production:complete',
    OPERATION_READ: 'production-operation:read',
    OPERATION_CREATE: 'production-operation:create',
    OPERATION_UPDATE: 'production-operation:update',
    OPERATION_DELETE: 'production-operation:delete',
    OPERATION_COMPLETE: 'production-operation:complete',
    ROUTING_READ: 'production-routing:read',
    ROUTING_CREATE: 'production-routing:create',
    ROUTING_UPDATE: 'production-routing:update',
    ROUTING_DELETE: 'production-routing:delete',
    ROUTING_COMPLETE: 'production-routing:complete',
    OPERATOR_READ: 'production-operator:read',
    OPERATOR_CREATE: 'production-operator:create',
    OPERATOR_UPDATE: 'production-operator:update',
    OPERATOR_DELETE: 'production-operator:delete',
    OPERATOR_COMPLETE: 'production-operator:complete',
  },

  // Delivery & Logistics
  DELIVERY: {
    READ: 'delivery:read',
    CREATE: 'delivery:create',
    UPDATE: 'delivery:update',
    DISPATCH: 'delivery:dispatch',
    VEHICLE_READ: 'vehicle:read',
    VEHICLE_CREATE: 'vehicle:create',
    VEHICLE_UPDATE: 'vehicle:update',
    VEHICLE_DELETE: 'vehicle:delete',
    DRIVER_READ: 'driver:read',
    DRIVER_CREATE: 'driver:create',
    DRIVER_UPDATE: 'driver:update',
    DRIVER_DELETE: 'driver:delete',
  },

  // Inventory & Materials
  INVENTORY: {
    READ: 'material:read',
    CREATE: 'material:create',
    UPDATE: 'material:update',
    DELETE: 'material:delete',
    ADJUST: 'stock-movement:adjust',
    STOCK_MOVEMENT_READ: 'stock-movement:read',
    STOCK_MOVEMENT_ADJUST: 'stock-movement:adjust',
    CATEGORY_READ: 'material-category:read',
    CATEGORY_CREATE: 'material-category:create',
    CATEGORY_UPDATE: 'material-category:update',
    CATEGORY_DELETE: 'material-category:delete',
    ASSET_READ: 'asset:read',
    ASSET_CREATE: 'asset:create',
    ASSET_UPDATE: 'asset:update',
    ASSET_DELETE: 'asset:delete',
    ASSET_CATEGORY_READ: 'asset-category:read',
    ASSET_CATEGORY_CREATE: 'asset-category:create',
    ASSET_CATEGORY_UPDATE: 'asset-category:update',
    ASSET_CATEGORY_DELETE: 'asset-category:delete',
  },

  // Purchasing & Procurement
  PURCHASING: {
    READ: 'procurement:read',
    CREATE: 'procurement:create',
    UPDATE: 'procurement:update',
    DELETE: 'procurement:delete',
  },

  // Product Catalog & Configuration
  PRODUCT: {
    READ: 'product:read',
    CREATE: 'product:create',
    UPDATE: 'product:update',
    DELETE: 'product:delete',
    CATEGORY_READ: 'product-category:read',
    CATEGORY_CREATE: 'product-category:create',
    CATEGORY_UPDATE: 'product-category:update',
    CATEGORY_DELETE: 'product-category:delete',
    BOM_READ: 'bom-preset:read',
    BOM_CREATE: 'bom-preset:create',
    BOM_UPDATE: 'bom-preset:update',
    BOM_DELETE: 'bom-preset:delete',
    ATTRIBUTE_READ: 'product-attribute:read',
    ATTRIBUTE_CREATE: 'product-attribute:create',
    ATTRIBUTE_UPDATE: 'product-attribute:update',
    ATTRIBUTE_DELETE: 'product-attribute:delete',
    MODIFIER_READ: 'modifier-group:read',
    MODIFIER_CREATE: 'modifier-group:create',
    MODIFIER_UPDATE: 'modifier-group:update',
    MODIFIER_DELETE: 'modifier-group:delete',
  },

  // Finance & Accounting
  FINANCE: {
    READ: 'finance:read',
    CREATE: 'finance:create',
    UPDATE: 'finance:update',
    POST: 'finance:post',
  },
} as const;

export type PermissionCode =
  | '*'
  | (string & {});

/**
 * Evaluates whether a set of user permissions contains the required permission.
 * Accounts for superadmin wildcard '*' and system:* automatically.
 */
export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: string,
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*') || userPermissions.includes('system:*')) return true;
  return userPermissions.includes(requiredPermission);
}

/**
 * Returns true if the user satisfies at least one of the provided permissions.
 */
export function hasAnyPermission(
  userPermissions: string[] | undefined,
  requiredPermissions: string[],
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*') || userPermissions.includes('system:*')) return true;
  return requiredPermissions.some(perm => userPermissions.includes(perm));
}

/**
 * Returns true if the user satisfies all of the provided permissions.
 */
export function hasAllPermissions(
  userPermissions: string[] | undefined,
  requiredPermissions: string[],
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*') || userPermissions.includes('system:*')) return true;
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}

export interface RoutePermissionRule {
  path: string;
  requiredPermission: string | string[];
  exact?: boolean;
}

/**
 * Centralized Route-to-Permission Mapping for Edge Proxy URL Protection.
 */
export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  // Settings & System Management
  { path: '/settings', requiredPermission: ['role:read', 'user:read', 'company:read'] },
  { path: '/company', requiredPermission: 'company:read' },
  { path: '/users/create', requiredPermission: 'user:create' },
  { path: '/users', requiredPermission: 'user:read' },
  { path: '/roles/create', requiredPermission: 'role:create' },
  { path: '/roles', requiredPermission: 'role:read' },

  // Sales Order
  { path: '/order/create', requiredPermission: 'sales:create' },
  { path: '/order', requiredPermission: 'sales:read' },

  // Production
  { path: '/production', requiredPermission: 'production:read' },

  // Inventory & Purchasing
  { path: '/inventory', requiredPermission: ['material:read', 'asset:read', 'procurement:read'] },
  { path: '/purchasing', requiredPermission: 'procurement:read' },

  // Products
  { path: '/products/create', requiredPermission: 'product:create' },
  { path: '/products', requiredPermission: 'product:read' },

  // Delivery
  { path: '/delivery', requiredPermission: 'delivery:read' },

  // Finance
  { path: '/finance', requiredPermission: 'finance:read' },
];

/**
 * Resolves the required permission(s) for a given URL pathname.
 * Returns null if the path is public or requires no specific permission (e.g. /, /login).
 */
export function getRequiredPermissionForPath(pathname: string): string | string[] | null {
  const clean = pathname.split('?')[0].split('#')[0] || '/';
  if (clean === '/' || clean === '/login' || clean === '/change-password' || clean === '/403') {
    return null;
  }

  // Sort by path length descending so specific sub-routes (/order/create) match before (/order)
  const sorted = [...ROUTE_PERMISSION_RULES].sort((a, b) => b.path.length - a.path.length);
  for (const rule of sorted) {
    if (rule.exact) {
      if (clean === rule.path) return rule.requiredPermission;
    } else {
      if (clean === rule.path || clean.startsWith(`${rule.path}/`)) {
        return rule.requiredPermission;
      }
    }
  }

  return null;
}
