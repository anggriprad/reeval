/**
 * Reeval ERP — Granular Permission System (PBAC)
 * Penulisan kode permission 100% selaras dengan Seeder Backend api-reeval (Contract UAC).
 */

export const PERMISSIONS = {
  GLOBAL: '*',

  // 2. Company & Tenant Administration
  COMPANY: {
    READ: 'company:read',
    UPDATE: 'company:update',
    SETTINGS: 'company:settings',
  },

  // 3. User & Role Access Control (UAC)
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

  // 4. Sales & Complaint
  SALES: {
    READ: 'sales:read',
    CREATE: 'sales:create',
    UPDATE: 'sales:update',
    APPROVE: 'sales:approve',
    CUSTOM: 'sales:custom',
    CALL: 'sales:call',
    CONFIG: 'sales:config',
    DELETE: 'sales:delete',
    DELETE_APPROVE: 'sales:delete-approve',
  },
  COMPLAINT: {
    READ: 'complaint:read',
    CREATE: 'complaint:create',
    UPDATE: 'complaint:update',
    RESPONS: 'complaint:respons',
    CANCEL: 'complaint:cancel',
    DELETE: 'complaint:delete',
  },

  // 5. Production & Factory Floor
  PRODUCTION: {
    READ: 'production:read',
    KPI: 'production:kpi',
    CREATE: 'production:create',
    UPDATE: 'production:update',
    ASSIGN: 'production:assign',
    OPERATE: 'production:operate',
    COMPLETE: 'production:complete',
    DELETE: 'production:delete',
    OPERATION_READ: 'production-operation:read',
    OPERATION_CREATE: 'production-operation:create',
    OPERATION_UPDATE: 'production-operation:update',
    OPERATION_DELETE: 'production-operation:delete',
    ROUTING_READ: 'production-routing:read',
    ROUTING_CREATE: 'production-routing:create',
    ROUTING_UPDATE: 'production-routing:update',
    ROUTING_DELETE: 'production-routing:delete',
  },

  // 6. Inventory & Purchasing
  FINISHED_GOOD: {
    READ: 'finished-good:read',
    ALLOCATE: 'finished-good:allocate',
  },
  RETURNED_GOOD: {
    READ: 'returned-good:read',
    RECEIVE: 'returned-good:receive',
    ACTION: 'returned-good:action',
  },
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
    ASSET_SERVICE: 'asset:service',
    ASSET_DELETE: 'asset:delete',
    ASSET_CATEGORY_READ: 'asset-category:read',
    ASSET_CATEGORY_CREATE: 'asset-category:create',
    ASSET_CATEGORY_UPDATE: 'asset-category:update',
    ASSET_CATEGORY_DELETE: 'asset-category:delete',
    FINISHED_GOOD_READ: 'finished-good:read',
    FINISHED_GOOD_ALLOCATE: 'finished-good:allocate',
    RETURNED_GOOD_READ: 'returned-good:read',
    RETURNED_GOOD_RECEIVE: 'returned-good:receive',
    RETURNED_GOOD_ACTION: 'returned-good:action',
  },
  PURCHASING: {
    READ: 'procurement:read',
    CREATE: 'procurement:create',
    UPDATE: 'procurement:update',
    ORDER: 'procurement:order',
    RECEIVE: 'procurement:receive',
    REJECT: 'procurement:reject',
    CANCEL: 'procurement:cancel',
    DELETE: 'procurement:delete',
  },

  // 7. Delivery & Logistics
  DELIVERY: {
    READ: 'delivery:read',
    CREATE: 'delivery:create',
    UPDATE: 'delivery:update',
    LOAD: 'delivery:load',
    DELIVER: 'delivery:deliver',
    FAIL: 'delivery:fail',
    RESCHEDULE: 'delivery:reschedule',
    CANCEL: 'delivery:cancel',
    CALL: 'delivery:call',
    VEHICLE_READ: 'vehicle:read',
    VEHICLE_CREATE: 'vehicle:create',
    VEHICLE_UPDATE: 'vehicle:update',
    VEHICLE_DELETE: 'vehicle:delete',
    SHIPPING_RATE_READ: 'shipping-rate:read',
    SHIPPING_RATE_UPDATE: 'shipping-rate:update',
  },

  // 8. Product Catalog & Configuration
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

  // 9. Finance & Accounting
  FINANCE: {
    READ: 'finance:read',
    REPORT: 'finance:report',
    PAYMENT: 'finance:payment',
    EXPENSE: 'finance:expense',
    BANK: 'finance:bank',
    COA: 'finance:coa',
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

  // Sales Order & Complaint
  { path: '/order/config', requiredPermission: 'sales:config' },
  { path: '/order/complaint', requiredPermission: 'complaint:read' },
  { path: '/order/create', requiredPermission: ['sales:create', 'sales:update'] },
  { path: '/order', requiredPermission: 'sales:read' },

  // Production
  { path: '/production/config', requiredPermission: ['production-operation:read', 'production-routing:read'] },
  { path: '/production', requiredPermission: 'production:read' },

  // Inventory & Purchasing
  {
    path: '/inventory/config',
    requiredPermission: ['material-category:read', 'asset-category:read'],
  },
  {
    path: '/inventory',
    requiredPermission: [
      'material:read',
      'asset:read',
      'procurement:read',
      'finished-good:read',
      'returned-good:read',
      'stock-movement:read',
    ],
  },
  { path: '/purchasing', requiredPermission: 'procurement:read' },

  // Products
  {
    path: '/products/config',
    requiredPermission: [
      'product-category:read',
      'bom-preset:read',
      'product-attribute:read',
      'modifier-group:read',
    ],
  },
  { path: '/products/create', requiredPermission: 'product:create' },
  { path: '/products', requiredPermission: 'product:read' },

  // Delivery
  { path: '/delivery/config', requiredPermission: ['vehicle:read', 'shipping-rate:read'] },
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
