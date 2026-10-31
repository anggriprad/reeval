'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import CustomTable, { Column } from '@/components/ui/CustomTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { userService, UserDetail } from '@/services/user.service';
import { roleService, RoleSummary } from '@/services/role.service';
import {
  Search,
  Shield,
  Edit2,
  Trash2,
  Phone,
  Mail,
  SlidersHorizontal,
  Loader2,
  Eye,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserTableSection() {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can, isSuperAdmin } = usePermission();

  const canUpdate = isSuperAdmin || can(PERMISSIONS.USER.UPDATE);
  const canDelete = isSuperAdmin || can(PERMISSIONS.USER.DELETE);

  const { filters, setFilter } = useTableFilters({
    page: 1,
    per_page: 20,
    search: '',
    status: 'all',
    role_id: undefined as number | undefined,
  });

  const [users, setUsers] = useState<UserDetail[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Role options for filter dropdown
  const [roleOptions, setRoleOptions] = useState<RoleSummary[]>([]);

  useEffect(() => {
    let active = true;
    async function loadRoles() {
      try {
        const res = await roleService.getRoleOptions();
        if (active && res.success && res.data) {
          setRoleOptions(res.data);
        }
      } catch {
        // Fallback silently if role options fail
      }
    }
    loadRoles();
    return () => {
      active = false;
    };
  }, []);

  const roleFilterOptions = useMemo(() => [
    { value: '', label: 'Semua Peran (Role)' },
    ...roleOptions.map((role) => ({
      value: String(role.id),
      label: role.name,
    })),
  ], [roleOptions]);

  const statusFilterOptions = useMemo(() => [
    { value: 'all', label: 'Semua Status' },
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
    { value: 'ready', label: 'Siap Kerja' },
  ], []);

  // Search input with 600ms debounce
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        setFilter('search', searchInput.trim());
        setFilter('page', 1);
      }
      setIsDebouncing(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const parsedRoleId = filters.role_id ? Number(filters.role_id) : undefined;
      const res = await userService.getUsers({
        page: filters.page,
        per_page: filters.per_page,
        search: filters.search?.trim() || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        role_id: parsedRoleId && parsedRoleId > 0 ? parsedRoleId : undefined,
      });

      if (res.success && res.data) {
        setUsers(res.data);
        if (res.meta) {
          setTotalUsers(res.meta.total);
          setTotalPages(res.meta.total_pages || 1);
        } else {
          setTotalUsers(res.data.length);
          setTotalPages(1);
        }
      } else {
        toast.error('Gagal Memuat Pengguna', res.message || 'Terjadi kesalahan sistem.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal terhubung ke endpoint users.';
      toast.error('Kesalahan Sistem', msg);
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.per_page, filters.search, filters.status, filters.role_id, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDeleteUser = async (user: UserDetail, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (user.is_superadmin) {
      toast.warning('Aksi Ditolak', 'Akun Super Admin sistem tidak dapat dihapus.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Hapus Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun "${user.full_name}" (${user.email}) dari perusahaan ini? Akses operasional karyawan ini akan segera dicabut.`,
      confirmText: 'Hapus Pengguna',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      setDeletingId(user.id);
      const res = await userService.deleteUser(user.id);
      if (res.success) {
        toast.success('Pengguna Dihapus', `Akun ${user.full_name} berhasil dihapus.`);
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setTotalUsers(prev => Math.max(0, prev - 1));
      } else {
        toast.error('Gagal Menghapus', res.message || 'Gagal menghapus pengguna.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat menghapus pengguna.';
      toast.error('Gagal Menghapus', msg);
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column[] = useMemo(() => [
    {
      id: 'user_info',
      header: 'Pengguna',
      width: '32%',
      cell: ({ row }) => {
        const u = row as UserDetail;
        const initials = u.full_name
          ? u.full_name
            .trim()
            .split(/\s+/)
            .map(n => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
          : 'U';

        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-white truncate text-xs">
                  {u.full_name}
                </span>
               
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3 shrink-0" />
                {u.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'phone',
      header: 'No. Telepon',
      width: '16%',
      cell: ({ row }) => {
        const u = row as UserDetail;
        return (
          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            {u.phone ? (
              <>
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-mono">{u.phone}</span>
              </>
            ) : (
              <span className="text-slate-400 italic">-</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'roles',
      header: 'Peran (Role)',
      width: '18%',
      cell: ({ row }) => {
        const u = row as UserDetail;
        const roleItems = Array.isArray(u.roles) ? u.roles : [];

        if (roleItems.length === 0) {
          return <span className="text-xs text-slate-400 italic">Belum ada role</span>;
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {roleItems.map((item, idx) => {
              const isObj = typeof item === 'object' && item !== null;
              const rid = isObj ? item.id : item;
              const label = isObj && item.name
                ? item.name
                : roleOptions.find(ro => ro.id === rid)?.name || `Role #${rid}`;
              return (
                <Badge key={isObj ? item.id : `${item}-${idx}`} variant="default" className="text-[10px] font-semibold">
                  <Shield className="h-3 w-3 mr-1" />
                  {label}
                </Badge>
              );
            })}
          </div>
        );
      },
    },
    {
      id: 'overrides',
      header: 'Hak Akses Khusus',
      width: '14%',
      cell: ({ row }) => {
        const u = row as UserDetail;
        const count = (u.overrides || []).length;
        if (count === 0) {
          return (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Standar Peran
            </span>
          );
        }
        return (
          <Badge
            variant="warning"
            className="text-[10px] font-bold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40"
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            {count} Override
          </Badge>
        );
      },
    },
    {
      id: 'ready',
      header: 'Kesiapan',
      width: '10%',
      cell: ({ row }) => {
        const u = row as UserDetail;
        return u.is_ready ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            Siap Kerja
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 border border-slate-200 dark:border-slate-800">
            Belum Siap
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      align: 'right',
      cell: ({ row }) => {
        const u = row as UserDetail;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              size="md"
              variant="ghost"
              title="Lihat Detail"
              onClick={() => router.push(`/users/${u.id}`)}
              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
            >
              <Eye className="h-4 w-4" />
            </Button>

            {canUpdate && (
              <Button
                type="button"
                size="md"
                variant="ghost"
                title="Edit Pengguna"
                onClick={() => router.push(`/users/${u.id}/edit`)}
                className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}

            {!u.is_superadmin && canDelete && (
              <Button
                type="button"
                size="md"
                variant="ghost"
                title="Hapus Pengguna"
                disabled={deletingId === u.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteUser(u, e);
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                {deletingId === u.id ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        );
      },
    },
  ], [canUpdate, canDelete, deletingId, router]);

  return (
    <div className="space-y-4">
      {/* Search, Role Filter & Status Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 flex-wrap">
          {/* Debounced Search */}
          <div className="relative w-full sm:w-72">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setFilter('search', searchInput.trim());
                  setFilter('page', 1);
                }
              }}
              placeholder="Cari nama pengguna atau email..."
              inputSize="sm"
            />
            {isDebouncing && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
              </div>
            )}
          </div>

          {/* Role Filter Dropdown (Custom UI Select) */}
          <div className="w-full sm:w-52">
            <Select
              value={filters.role_id ? String(filters.role_id) : ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setFilter('role_id', val);
                setFilter('page', 1);
              }}
              options={roleFilterOptions}
              inputSize="sm"
            />
          </div>

          {/* Status Filter Dropdown (Custom UI Select) */}
          <div className="w-full sm:w-44">
            <Select
              value={filters.status || 'all'}
              onChange={(e) => {
                setFilter('status', e.target.value);
                setFilter('page', 1);
              }}
              options={statusFilterOptions}
              inputSize="sm"
            />
          </div>
        </div>
      </div>

      {/* Server-Side Paginated Table */}
      <CustomTable
        data={users}
        columns={columns}
        pagination={true}
        currentPage={filters.page}
        lastPage={totalPages}
        total={totalUsers}
        perPage={filters.per_page}
        onPageChange={page => setFilter('page', page)}
        onPerPageChange={perPage => {
          setFilter('per_page', perPage);
          setFilter('page', 1);
        }}
        loading={loading}
        selection={false}
        onRowClick={user => router.push(`/users/${user.id}`)}
        emptyTitle="Tidak Ada Pengguna"
        emptyDescription="Belum ada data pengguna yang sesuai dengan filter yang dipilih."
      />
    </div>
  );
}
