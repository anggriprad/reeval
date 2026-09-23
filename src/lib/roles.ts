// ========================================
// Reeval ERP — Role & Access Control Matrix
// ========================================

export type RoleType = 'ADMIN' | 'SALES' | 'PRODUKSI' | 'DRIVER' | 'GUDANG';

export interface UserAccount {
  id: string;
  name: string;
  role: RoleType;
  roleLabel: string;
  initials: string;
  email: string;
  phone?: string;
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
];

export const DEFAULT_USER_ID = 'admin-1';

export function getUserById(id: string): UserAccount {
  return USER_ACCOUNTS.find(u => u.id === id) ?? USER_ACCOUNTS[0];
}

// Menu Access Matrix per Role
export const ROLE_ALLOWED_ROUTES: Record<RoleType, string[]> = {
  ADMIN: [
    '/',
    '/order',
    '/sales',
    '/sales-order',
    '/production',
    '/inventory',
    '/products',
    '/delivery',
    '/finance',
  ],
  SALES: [
    '/',
    '/order',
    '/sales',
    '/sales-order',
    '/products',
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
  ],
};

export function isRouteAllowed(role: RoleType, path: string): boolean {
  const allowed = ROLE_ALLOWED_ROUTES[role] || [];
  return allowed.some(route => (route === '/' ? path === '/' : path.startsWith(route)));
}

export function canCreateOrder(role: RoleType): boolean {
  return role === 'SALES' || role === 'ADMIN';
}

export function canApproveOrder(role: RoleType): boolean {
  return role === 'ADMIN';
}

export function canIssueSPK(role: RoleType): boolean {
  return role === 'ADMIN';
}

export function canManageProduction(role: RoleType): boolean {
  return role === 'PRODUKSI' || role === 'ADMIN';
}

export function canDeliverOrder(role: RoleType): boolean {
  return role === 'DRIVER' || role === 'ADMIN';
}

export function canManageInventory(role: RoleType): boolean {
  return role === 'GUDANG' || role === 'ADMIN';
}

export function canCreatePO(role: RoleType): boolean {
  return role === 'GUDANG' || role === 'ADMIN' || role === 'PRODUKSI';
}

export function canConfirmPayment(role: RoleType): boolean {
  return role === 'SALES' || role === 'ADMIN';
}

export function canViewFinance(role: RoleType): boolean {
  return role === 'ADMIN';
}

export function canSeeCosts(role: RoleType): boolean {
  return role === 'ADMIN' || role === 'PRODUKSI' || role === 'GUDANG';
}
