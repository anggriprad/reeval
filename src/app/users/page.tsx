'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import CustomTable, { Column } from '@/components/ui/CustomTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { userService, UserDetail } from '@/services/user.service';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Edit2,
  Trash2,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Loader2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function UsersTableContent() {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can, isSuperAdmin } = usePermission();

  const canCreate = isSuperAdmin || can(PERMISSIONS.USER.CREATE);
  const canUpdate = isSuperAdmin || can(PERMISSIONS.USER.UPDATE);
  const canDelete = isSuperAdmin || can(PERMISSIONS.USER.DELETE);

  const { filters, setFilter } = useTableFilters({
    page: 1,
    per_page: 20,
    search: '',
  });

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'ready'>('all');
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Search input with 800ms debounce
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setFilter('search', searchInput);
      setFilter('page', 1);
      setIsDebouncing(false);
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers({
        page: filters.page,
        per_page: filters.per_page,
        search: filters.search?.trim() || undefined,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page, filters.search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const displayedUsers = useMemo(() => {
    if (statusFilter === 'active') {
      return users.filter(u => u.is_active);
    }
    if (statusFilter === 'inactive') {
      return users.filter(u => !u.is_active);
    }
    if (statusFilter === 'ready') {
      return users.filter(u => u.is_ready);
    }
    return users;
  }, [users, statusFilter]);

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

  const columns: Column[] = [
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
        const roles = u.roles || [];
        if (roles.length === 0) {
          return <span className="text-xs text-slate-400 italic">Belum ada role</span>;
        }
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {roles.map(r => (
              <Badge key={r.id} variant="default" className="text-[10px] font-semibold">
                <Shield className="h-3 w-3 mr-1" />
                {r.name}
              </Badge>
            ))}
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
              Default Role
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
        const isDeleting = deletingId === u.id;
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

            {!row.is_system && (
              <>
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
                    disabled={deletingId === row.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(u, e);
                    }}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {deletingId === row.id ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        )
      }
    },

  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title=" Manajemen Pengguna"
        backHref="/settings"
      >
        {canCreate && (
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push(`/users/create`)}
            className="gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Tambah Pengguna
          </Button>
        )}
      </PageHeader>


      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setFilter('search', searchInput.trim());
                setFilter('page', 1);
              }
            }}
            placeholder="Cari nama pengguna..."
            inputSize="sm"
          />
          {isDebouncing && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            </div>
          )}
        </div>

      </div>

      {/* Single Table View */}
      <CustomTable
        data={displayedUsers}
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
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader title="Manajemen Pengguna" backHref="/settings" />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Memuat halaman pengguna...</p>
          </div>
        </div>
      }
    >
      <UsersTableContent />
    </Suspense>
  );
}
