// ========================================
// Reeval ERP — Role & Access Control Matrix
// ========================================

export type RoleType =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'ADMIN_PRODUCT'
  | 'ADMIN_INVENTORY'
  | 'ADMIN_PRODUCTION'
  | 'ADMIN_SALES'
  | 'ADMIN_DELIVERY'
  | 'ADMIN_FINANCE'
  | 'VIEWER'
  | 'SALES'
  | 'PRODUKSI'
  | 'DRIVER'
  | 'GUDANG'
  | 'PURCHASING';

export interface UserAccount {
  id: string;
  name: string;
  role: RoleType;
  roles?: string[];
  permissions?: string[];
  roleLabel: string;
  initials: string;
  email: string;
  phone?: string;
  is_superadmin?: boolean;
}

export const USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'admin-1',
    name: 'Dewi Handayani',
    role: 'ADMIN',
    roleLabel: 'Super Admin',
    initials: 'DH',
    email: 'admin@reeval.id',
    phone: '628119876543',
    is_superadmin: true,
  },
  {
    id: 'sales-1',
    name: 'Budi Santoso',
    role: 'SALES',
    roleLabel: 'Sales Executive',
    initials: 'BS',
    email: 'sales@reeval.id',
    phone: '6281298765432',
  },
  {
    id: 'produksi-1',
    name: 'Suryadi Pratama',
    role: 'PRODUKSI',
    roleLabel: 'Kepala Produksi',
    initials: 'SP',
    email: 'production@reeval.id',
    phone: '6281398765431',
  },
  {
    id: 'driver-1',
    name: 'Hasan Basri',
    role: 'DRIVER',
    roleLabel: 'Logistik & Driver',
    initials: 'HB',
    email: 'driver@reeval.id',
    phone: '6281598765430',
  },
  {
    id: 'gudang-1',
    name: 'Joko Widodo',
    role: 'GUDANG',
    roleLabel: 'Staff Inventaris',
    initials: 'JW',
    email: 'gudang@reeval.id',
    phone: '6281798765439',
  },
  {
    id: 'purchasing-1',
    name: 'Rina Maharani',
    role: 'PURCHASING',
    roleLabel: 'Staff Purchasing',
    initials: 'RM',
    email: 'purchasing@reeval.id',
    phone: '6281898765438',
  },
];

export const DEFAULT_USER_ID = 'admin-1';

export function getUserById(id: string): UserAccount {
  return USER_ACCOUNTS.find(u => u.id === id) ?? USER_ACCOUNTS[0];
}

export function normalizeRole(rawRole: string | undefined): RoleType {
  if (!rawRole) return 'ADMIN';
  const upper = rawRole.toUpperCase().trim();
  if (upper === 'SUPER_ADMIN' || upper === 'SUPERADMIN') return 'SUPER_ADMIN';
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'ADMIN_PRODUCT') return 'ADMIN_PRODUCT';
  if (upper === 'ADMIN_INVENTORY') return 'ADMIN_INVENTORY';
  if (upper === 'ADMIN_PRODUCTION') return 'ADMIN_PRODUCTION';
  if (upper === 'ADMIN_SALES') return 'ADMIN_SALES';
  if (upper === 'ADMIN_DELIVERY') return 'ADMIN_DELIVERY';
  if (upper === 'ADMIN_FINANCE') return 'ADMIN_FINANCE';
  if (upper === 'VIEWER') return 'VIEWER';
  if (upper.includes('SALES')) return 'SALES';
  if (upper.includes('PRODUCTION') || upper.includes('PRODUKSI')) return 'PRODUKSI';
  if (upper.includes('DELIVERY') || upper.includes('DRIVER')) return 'DRIVER';
  if (upper.includes('INVENTORY') || upper.includes('GUDANG')) return 'GUDANG';
  if (upper.includes('PURCHASING')) return 'PURCHASING';
  return 'ADMIN';
}

const ALL_SYSTEM_ROUTES = [
  '/',
  '/order',
  '/sales',
  '/sales-order',
  '/production',
  '/inventory',
  '/products',
  '/delivery',
  '/finance',
  '/purchasing',
  '/settings',
  '/company',
  '/users',
  '/roles',
  '/customers',
  '/suppliers',
];

// Menu Access Matrix per Role
export const ROLE_ALLOWED_ROUTES: Record<RoleType, string[]> = {
  SUPER_ADMIN: ALL_SYSTEM_ROUTES,
  ADMIN: ALL_SYSTEM_ROUTES,
  ADMIN_PRODUCT: [
    '/',
    '/products',
    '/inventory',
  ],
  ADMIN_INVENTORY: [
    '/',
    '/inventory',
    '/products',
    '/purchasing',
    '/suppliers',
  ],
  ADMIN_PRODUCTION: [
    '/',
    '/production',
    '/products',
    '/inventory',
  ],
  ADMIN_SALES: [
    '/',
    '/order',
    '/sales',
    '/sales-order',
    '/products',
    '/customers',
  ],
  ADMIN_DELIVERY: [
    '/',
    '/delivery',
  ],
  ADMIN_FINANCE: [
    '/',
    '/finance',
    '/order',
    '/sales',
    '/sales-order',
    '/purchasing',
  ],
  VIEWER: [
    '/',
    '/order',
    '/sales',
    '/sales-order',
    '/production',
    '/inventory',
    '/products',
    '/delivery',
    '/finance',
    '/purchasing',
    '/customers',
    '/suppliers',
  ],
  SALES: [
    '/',
    '/order',
    '/sales',
    '/sales-order',
    '/products',
    '/customers',
  ],
  PRODUKSI: [
    '/',
    '/production',
    '/products',
    '/inventory',
  ],
  DRIVER: [
    '/',
    '/delivery',
  ],
  GUDANG: [
    '/',
    '/inventory',
    '/products',
    '/purchasing',
    '/suppliers',
  ],
  PURCHASING: [
    '/',
    '/inventory',
    '/products',
    '/purchasing',
    '/suppliers',
  ],
};

export function isRouteAllowed(role: RoleType | string | string[] | undefined, path: string): boolean {
  if (!role) return false;
  if (Array.isArray(role)) {
    if (role.length === 0) return false;
    return role.some(r => isRouteAllowed(r, path));
  }
  const cleanPath = path.split('?')[0].split('#')[0] || '/';
  const upper = String(role).toUpperCase().trim();
  if (upper === 'SUPER_ADMIN' || upper === 'SUPERADMIN' || upper === 'ADMIN') {
    return true;
  }
  const normalized = normalizeRole(upper);
  if (normalized === 'SUPER_ADMIN' || normalized === 'ADMIN') {
    return true;
  }
  const allowed = ROLE_ALLOWED_ROUTES[normalized] || [];
  return allowed.some(route => (route === '/' ? cleanPath === '/' : cleanPath.startsWith(route)));
}

function hasAnyMatchingRole(role: RoleType | string | string[], predicate: (norm: RoleType) => boolean): boolean {
  if (Array.isArray(role)) {
    return role.some(r => predicate(normalizeRole(r)));
  }
  return predicate(normalizeRole(role));
}

export function canCreateOrder(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'SALES' || norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'ADMIN_SALES');
}

export function canApproveOrder(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'ADMIN_SALES');
}

export function canIssueSPK(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'PRODUKSI' || norm === 'ADMIN_PRODUCTION');
}

export function canManageProduction(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'PRODUKSI' || norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'ADMIN_PRODUCTION');
}

export function canDeliverOrder(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'DRIVER' || norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'ADMIN_DELIVERY');
}

export function canManageInventory(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'GUDANG' || norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'ADMIN_INVENTORY');
}

export function canCreatePO(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'PURCHASING' || norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'ADMIN_INVENTORY');
}

export function canRequestPO(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(
    role,
    norm =>
      norm === 'GUDANG' ||
      norm === 'ADMIN' ||
      norm === 'SUPER_ADMIN' ||
      norm === 'PURCHASING' ||
      norm === 'PRODUKSI' ||
      norm === 'ADMIN_INVENTORY' ||
      norm === 'ADMIN_PRODUCTION'
  );
}

export function canAccessPurchasing(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'PURCHASING' || norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'GUDANG' || norm === 'ADMIN_INVENTORY');
}

export function canConfirmPayment(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'SALES' || norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'ADMIN_SALES' || norm === 'ADMIN_FINANCE');
}

export function canViewFinance(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(role, norm => norm === 'ADMIN' || norm === 'SUPER_ADMIN' || norm === 'ADMIN_FINANCE');
}

export function canSeeCosts(role: RoleType | string | string[]): boolean {
  return hasAnyMatchingRole(
    role,
    norm =>
      norm === 'ADMIN' ||
      norm === 'SUPER_ADMIN' ||
      norm === 'PRODUKSI' ||
      norm === 'ADMIN_PRODUCTION' ||
      norm === 'GUDANG' ||
      norm === 'ADMIN_INVENTORY' ||
      norm === 'PURCHASING' ||
      norm === 'ADMIN_FINANCE'
  );
}
