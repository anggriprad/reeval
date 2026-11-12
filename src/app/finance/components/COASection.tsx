'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTableFilters } from '@/hooks/useTableFilters';
import { usePermission } from '@/hooks/usePermission';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { PERMISSIONS } from '@/lib/permissions';
import { canViewFinance } from '@/lib/roles';
import { resolveAuthorName, type AccountCode } from '@/lib/types';
import {
  coaService,
  mapCoaResponseToAccountCode,
  type ChartOfAccountOptionDTO,
} from '@/services/coa.service';
import { userService, type UserOption } from '@/services/user.service';
import { COAModal } from './COAModal';
import {
  Edit2,
  FolderTree,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';

interface COASectionProps {
  onAccountsSynced?: (accounts: AccountCode[]) => void;
}

const COA_TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Kategori' },
  { value: 'ASSET', label: 'ASSET' },
  { value: 'LIABILITY', label: 'LIABILITY' },
  { value: 'EQUITY', label: 'EQUITY' },
  { value: 'REVENUE', label: 'REVENUE' },
  { value: 'COGS', label: 'COGS' },
  { value: 'EXPENSE', label: 'EXPENSE' },
];

export function COASection({ onAccountsSynced }: COASectionProps) {
  const { toast, confirm } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const { currentUser } = useApp();
  const { can, permissions } = usePermission();
  const hasRoleFallback =
    permissions.length === 0 &&
    canViewFinance(
      currentUser.roles && currentUser.roles.length > 0
        ? currentUser.roles
        : currentUser.role
    );
  const canCoaCreate = can(PERMISSIONS.FINANCE.COA_CREATE) || hasRoleFallback;
  const canCoaUpdate = can(PERMISSIONS.FINANCE.COA_UPDATE) || hasRoleFallback;
  const canCoaDelete = can(PERMISSIONS.FINANCE.COA_DELETE) || hasRoleFallback;

  const { filters, setFilter, setFilters } = useTableFilters({
    coa_search: '',
    coa_type: 'ALL',
    coa_created_by_id: '',
  });

  const [searchInput, setSearchInput] = useState(filters.coa_search || '');
  const isSearchInitial = useRef(true);

  const [accounts, setAccounts] = useState<AccountCode[]>([]);
  const [parentOptions, setParentOptions] = useState<ChartOfAccountOptionDTO[]>(
    []
  );
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountCode | null>(
    null
  );

  // Debounce search input (600ms) -> URL filter sync
  useEffect(() => {
    if (isSearchInitial.current) {
      isSearchInitial.current = false;
      return;
    }
    const trimmed = searchInput.trim();
    if (trimmed === (filters.coa_search || '')) {
      return;
    }
    const timer = setTimeout(() => {
      setFilter('coa_search', trimmed);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchInput, filters.coa_search, setFilter]);

  useEffect(() => {
    setSearchInput(filters.coa_search || '');
  }, [filters.coa_search]);

  const fetchOptions = useCallback(async () => {
    try {
      const [coaOptRes, userOptRes] = await Promise.all([
        coaService.getOptions(),
        userService.getUserOptions(),
      ]);
      if (Array.isArray(coaOptRes.data)) {
        setParentOptions(coaOptRes.data);
      }
      if (Array.isArray(userOptRes.data)) {
        setUserOptions(userOptRes.data);
      }
    } catch (err) {
      console.error('Failed to load COA options:', err);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const createdByIdNum = filters.coa_created_by_id
        ? Number(filters.coa_created_by_id)
        : undefined;
      const res = await coaService.getAccounts({
        page: 1,
        per_page: 500,
        search: filters.coa_search?.trim() || undefined,
        type:
          filters.coa_type && filters.coa_type !== 'ALL'
            ? filters.coa_type
            : undefined,
        created_by_id:
          createdByIdNum && !Number.isNaN(createdByIdNum)
            ? createdByIdNum
            : undefined,
      });

      const mapped = Array.isArray(res.data)
        ? res.data.map(mapCoaResponseToAccountCode)
        : [];
      setAccounts(mapped);

      const hasActiveFilter = Boolean(
        filters.coa_search?.trim() ||
          (filters.coa_type && filters.coa_type !== 'ALL') ||
          filters.coa_created_by_id
      );
      if (!hasActiveFilter) {
        onAccountsSynced?.(mapped);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Gagal memuat Bagan Akun (COA).';
      toastRef.current.error('Gagal Memuat COA', msg);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.coa_search,
    filters.coa_type,
    filters.coa_created_by_id,
    onAccountsSynced,
  ]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleSaved = useCallback(async () => {
    const hasFilter = Boolean(
      filters.coa_search?.trim() ||
        (filters.coa_type && filters.coa_type !== 'ALL') ||
        filters.coa_created_by_id
    );
    await Promise.all([
      fetchAccounts(),
      fetchOptions(),
      hasFilter && onAccountsSynced
        ? coaService
            .getAccounts({ page: 1, per_page: 500 })
            .then((res) => {
              if (Array.isArray(res.data)) {
                onAccountsSynced(res.data.map(mapCoaResponseToAccountCode));
              }
            })
            .catch(() => {})
        : Promise.resolve(),
    ]);
  }, [
    fetchAccounts,
    fetchOptions,
    filters.coa_search,
    filters.coa_type,
    filters.coa_created_by_id,
    onAccountsSynced,
  ]);

  const handleOpenCreate = () => {
    if (!canCoaCreate) {
      toast.warning(
        'Akses Dibatasi',
        'Peran Anda tidak memiliki izin menambah akun COA.'
      );
      return;
    }
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: AccountCode) => {
    if (!canCoaUpdate) {
      toast.warning(
        'Akses Dibatasi',
        'Peran Anda tidak memiliki izin mengubah akun COA.'
      );
      return;
    }
    setEditingAccount(acc);
    setIsModalOpen(true);
  };

  const handleDelete = async (acc: AccountCode) => {
    if (!canCoaDelete) {
      toast.warning(
        'Akses Dibatasi',
        'Peran Anda tidak diizinkan menghapus Bagan Akun.'
      );
      return;
    }
    if (acc.isSystem) {
      toast.info(
        'Akun Sistem Bawaan',
        `Akun "${acc.code} - ${acc.name}" merupakan Akun Sistem Bawaan yang wajib ada di setiap perusahaan dan tidak boleh dihapus.`
      );
      return;
    }

    const isOk = await confirm({
      title: 'Konfirmasi Hapus Akun COA',
      message: `Apakah Anda yakin ingin menghapus akun "${acc.code} - ${acc.name}"?`,
      confirmText: 'Hapus Akun',
      variant: 'danger',
    });
    if (!isOk) return;

    try {
      await coaService.deleteAccount(acc.id);
      toast.success(
        'Akun Dihapus',
        `Akun "${acc.code} - ${acc.name}" berhasil dihapus.`
      );
      await handleSaved();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Akun gagal dihapus. Pastikan akun tidak memiliki sub-akun aktif atau transaksi jurnal.';
      toast.error('Tidak Dapat Dihapus', msg);
    }
  };


  const hasActiveFilter = Boolean(
    filters.coa_search?.trim() ||
      (filters.coa_type && filters.coa_type !== 'ALL') ||
      filters.coa_created_by_id
  );

  return (
    <>
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Bagan Akun Standar (Chart of Accounts Tree)
            </h3>
            <p className="text-xs text-slate-500">
              Struktur hierarki akun akuntansi terkonfigurasi untuk manufaktur
              Indonesia.
            </p>
          </div>
          {canCoaCreate && (
            <Button size="sm" onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Akun
            </Button>
          )}
        </div>

        {/* Filter & Search Bar (Server-side via useTableFilters + debounce 600ms) */}
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari kode, nama, atau keterangan akun..."
              icon={Search}
              className={isLoading ? 'pr-8' : undefined}
            />
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
          <div className="w-full sm:w-44">
            <Select
              value={filters.coa_type || 'ALL'}
              onChange={(e) => setFilter('coa_type', e.target.value)}
              options={COA_TYPE_FILTER_OPTIONS}
            />
          </div>
          {hasActiveFilter && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchInput('');
                setFilters({
                  coa_search: '',
                  coa_type: 'ALL',
                  coa_created_by_id: '',
                });
              }}
              className="gap-1.5 text-slate-500"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
        </div>

        {isLoading && accounts.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-xs text-slate-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            Memuat struktur bagan akun...
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<FolderTree className="w-8 h-8 text-slate-400" />}
            title="Tidak ada akun ditemukan"
            description="Coba ubah kata kunci pencarian atau filter kategori/pembuat akun."
          />
        ) : (
          <div className="space-y-1">
            {accounts.map((acc) => {
              const isH1 = acc.level === 1;
              const isH2 = acc.level === 2 && acc.isHeader;
              const isDeep = acc.level >= 4;
              const author = resolveAuthorName(acc);
              return (
                <div
                  key={acc.id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors group ${
                    isH1
                      ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white mt-3'
                      : isH2
                        ? 'bg-slate-50/70 dark:bg-slate-800/40 font-semibold text-slate-800 dark:text-slate-200 pl-6'
                        : isDeep
                          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-300 pl-14 border-b border-slate-100 dark:border-slate-800/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-300 pl-10 border-b border-slate-100 dark:border-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 text-xs min-w-0">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {acc.code}
                    </span>
                    <span className="truncate">{acc.name}</span>
                    {acc.description && (
                      <span className="text-[11px] text-slate-400 hidden md:inline truncate">
                        — {acc.description}
                      </span>
                    )}
                   
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {acc.isSystem && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        title="Akun sistem bawaan (permanen)"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        Sistem
                      </span>
                    )}
                    <Badge
                      variant={
                        acc.type === 'ASSET'
                          ? 'default'
                          : acc.type === 'LIABILITY'
                            ? 'danger'
                            : acc.type === 'EQUITY'
                              ? 'warning'
                              : acc.type === 'REVENUE'
                                ? 'success'
                                : 'default'
                      }
                      className="text-[10px]"
                    >
                      {acc.type}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-400 w-12 text-right">
                      {acc.normalBalance}
                    </span>

                    {(canCoaUpdate || canCoaDelete) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        {canCoaUpdate && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(acc)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Edit Akun"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canCoaDelete && (
                          acc.isSystem ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(acc)}
                              className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Akun Sistem (Permanen / Tidak dapat dihapus)"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDelete(acc)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <COAModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingAccount={editingAccount}
        parentOptions={parentOptions}
        onSaved={handleSaved}
      />
    </>
  );
}
