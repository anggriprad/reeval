'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
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
import {
  roleService,
  RoleDetail,
} from '@/services/role.service';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Key,
  Search,
  Loader2,
} from 'lucide-react';

function RolesPageContent() {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can, isSuperAdmin } = usePermission();

  const canCreate = isSuperAdmin || can(PERMISSIONS.ROLE.CREATE);
  const canUpdate = isSuperAdmin || can(PERMISSIONS.ROLE.UPDATE);
  const canDelete = isSuperAdmin || can(PERMISSIONS.ROLE.DELETE);

  const { filters, setFilter } = useTableFilters({
    page: 1,
    per_page: 20,
    search: '',
  });

  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [totalRoles, setTotalRoles] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const isInitialMount = useRef(true);

  // Debounce search input: wait 800ms after user stops typing before triggering filter/API
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      setFilter('search', searchInput.trim());
      setFilter('page', 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [searchInput, setFilter]);

  // Fetch roles only when pagination or debounced search changes
  useEffect(() => {
    let active = true;

    async function fetchRoles() {
      // Only show full-card loading on initial load when data is empty
      if (roles.length === 0) {
        setLoadingRoles(true);
      }
      setIsSearching(true);

      try {
        const res = await roleService.getRoles({
          page: filters.page,
          per_page: filters.per_page,
          search: filters.search?.trim() || undefined,
        });

        if (!active) return;
        if (res.success && res.data) {
          setRoles(res.data);
          if (res.meta) {
            setTotalRoles(res.meta.total);
            setTotalPages(res.meta.total_pages || 1);
          } else {
            setTotalRoles(res.data.length);
            setTotalPages(1);
          }
        } else {
          toast.error('Gagal Memuat Role', res.message || 'Terjadi kesalahan sistem');
        }
      } catch (err: unknown) {
        if (!active) return;
        const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
        const msg = errorObj?.response?.data?.message || errorObj?.message || 'Gagal terhubung ke endpoint roles';
        toast.error('Kesalahan', msg);
      } finally {
        if (active) {
          setLoadingRoles(false);
          setIsSearching(false);
        }
      }
    }

    fetchRoles();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page, filters.search]);

  const handleDeleteRole = async (role: RoleDetail) => {
    if (role.is_system) {
      toast.error('Operasi Ditolak', 'System role bawaan platform tidak boleh dihapus');
      return;
    }

    const ok = await confirm({
      title: 'Hapus Role',
      message: `Apakah Anda yakin ingin menghapus role "${role.name}" (${role.code})? Pengguna dengan role ini akan kehilangan hak akses terkait.`,
      confirmText: 'Hapus Role',
      cancelText: 'Batal',
      variant: 'danger',
    });

    // If user cancels: STOP. NO refetch, NO table reload.
    if (!ok) return;

    // Only proceed when user explicitly approves
    setDeletingId(role.id);
    try {
      const res = await roleService.deleteRole(role.id);
      if (res.success) {
        toast.success('Role Dihapus', `Role "${role.name}" telah dihapus`);
        // Smoothly remove role from state without unmounting table or flashing full-page spinner
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
        setTotalRoles((prev) => Math.max(0, prev - 1));

        // If current page becomes empty after deletion and we are past page 1, adjust page
        if (roles.length === 1 && (filters.page || 1) > 1) {
          setFilter('page', (filters.page || 1) - 1);
        }
      } else {
        toast.error('Gagal Menghapus', res.message || 'Role tidak dapat dihapus');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj?.response?.data?.message || errorObj?.message || 'Gagal menghapus role';
      toast.error('Kesalahan', msg);
    } finally {
      setDeletingId(null);
    }
  };

  const roleColumns: Column<RoleDetail>[] = [
    {
      id: 'name',
      header: 'Kode & Nama Role',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 dark:bg-teal-950/60 dark:border-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-xs shadow-2xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-white truncate">
              {row.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
              {row.code}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Deskripsi',
      cell: ({ row }) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-sm">
          {row.description || '-'}
        </span>
      ),
    },
    {
      id: 'is_system',
      header: 'Tipe Role',
      align: 'center',
      cell: ({ row }) => (
        <Badge variant={row.is_system ? 'purple' : 'info'} className="text-[11px]">
          {row.is_system ? 'System Role' : 'Custom Role'}
        </Badge>
      ),
    },
    {
      id: 'permissions_count',
      header: 'Cakupan Hak Akses',
      align: 'center',
      cell: ({ row }) => {
        const count = (row.permissions || []).length;
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Key className="h-3 w-3 text-slate-400" />
            {count} Hak Akses
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      align: 'right',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            size="md"
            variant="ghost"
            title="Lihat Detail Hak Akses"
            onClick={() => router.push(`/roles/${row.id}`)}
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
                  title="Edit Konfigurasi Role"
                  onClick={() => router.push(`/roles/${row.id}/edit`)}
                  className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  type="button"
                  size="md"
                  variant="ghost"
                  title="Hapus Role"
                  disabled={deletingId === row.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRole(row);
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
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role dan Hak Akses"
        backHref="/settings"
      >
        {canCreate && (
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push('/roles/create')}
            className="gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Tambah Role Baru
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
            placeholder="Cari nama atau kode role..."
            inputSize="sm"
          />
          {isSearching && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            </div>
          )}
        </div>
       
      </div>

      <CustomTable<RoleDetail>
        data={roles}
        columns={roleColumns}
        loading={loadingRoles}
        pagination={true}
        currentPage={filters.page}
        perPage={filters.per_page}
        total={totalRoles}
        lastPage={totalPages}
        onPageChange={(p) => {
          setFilter('page', p);
        }}
        onPerPageChange={(pp) => {
          setFilter('per_page', pp);
          setFilter('page', 1);
        }}
        onRowClick={(row) => router.push(`/roles/${row.id}`)}
        emptyTitle="Belum Ada Role"
        emptyDescription="Tambahkan role baru untuk mengatur wewenang akses staf di modul ERP."
      />
    </div>
  );
}

export default function RolesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[320px] space-y-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Memuat konfigurasi role...</span>
        </div>
      }
    >
      <RolesPageContent />
    </Suspense>
  );
}
