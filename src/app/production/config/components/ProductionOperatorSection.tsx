'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import {
  productionOperatorService,
  ProductionOperatorItem,
} from '@/services/production-operator.service';
import { userService, UserOption } from '@/services/user.service';
import type { ProductionOperator } from '@/lib/types';
import { ConfigSection } from './ConfigSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Users,
  Plus,
  Trash2,
  Search,
  UserCheck,
  X,
} from 'lucide-react';

export function ProductionOperatorSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    currentUser,
    setOperatorsList,
    operators: appOperators,
    workOrders,
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || !!currentUser?.is_superadmin;
  const canRead = can(PERMISSIONS.PRODUCTION.OPERATOR_READ) || can(PERMISSIONS.PRODUCTION.READ) || isSuperAdmin;
  const canCreate = can(PERMISSIONS.PRODUCTION.OPERATOR_CREATE) || isSuperAdmin;
  const canDelete = can(PERMISSIONS.PRODUCTION.OPERATOR_DELETE) || isSuperAdmin;
  const canManage = canCreate || canDelete;

  // Accordion expansion state: default closed (false), lazy fetch when user expands
  const [isExpanded, setIsExpanded] = useState(false);

  // Operators state
  const [operators, setOperators] = useState<ProductionOperatorItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Table filters hook for operator search & pagination
  const { filters, setFilter } = useTableFilters({
    opr_search: '',
    opr_page: 1,
    opr_per_page: 50,
  });

  const [searchInput, setSearchInput] = useState(filters.opr_search || '');
  const isSearchInitial = useRef(true);

  // Debounce search input (500ms)
  useEffect(() => {
    if (isSearchInitial.current) {
      isSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilter('opr_search', searchInput.trim());
      setFilter('opr_page', 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, setFilter]);

  useEffect(() => {
    setSearchInput(filters.opr_search || '');
  }, [filters.opr_search]);

  // User assignment state (users with is_ready = true)
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isLoadingUserOptions, setIsLoadingUserOptions] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showAddOperator, setShowAddOperator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync to AppContext so Job Cards and assignment modals have live operator records
  const syncToAppContext = useCallback((items: ProductionOperatorItem[]) => {
    const mapped: ProductionOperator[] = items.map((op) => ({
      id: String(op.id),
      name: op.user_name,
      roleSpecialization: undefined,
      status: op.is_ready ? 'ACTIVE' : 'INACTIVE',
    }));
    setOperatorsList(mapped);
  }, [setOperatorsList]);

  // Fetch Operators from Backend API
  const fetchOperators = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await productionOperatorService.getOperators({
        page: filters.opr_page,
        per_page: filters.opr_per_page,
        search: filters.opr_search?.trim() || undefined,
      });

      hasFetchedRef.current = true;
      if (response && Array.isArray(response.data)) {
        setOperators(response.data);
        syncToAppContext(response.data);
      }
    } catch (err: any) {
      console.warn('Gagal memuat operator produksi dari API:', err);
      hasFetchedRef.current = true;
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [filters.opr_page, filters.opr_per_page, filters.opr_search, syncToAppContext]);

  // Fetch ready user options from userService.getUserOptions({ is_ready: true })
  const loadReadyUserOptions = useCallback(async () => {
    try {
      setIsLoadingUserOptions(true);
      const res = await userService.getUserOptions({ is_ready: true });
      if (res?.data && Array.isArray(res.data)) {
        setUserOptions(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat opsi user siap kerja:', err);
    } finally {
      setIsLoadingUserOptions(false);
    }
  }, []);

  // Lazy Fetch when accordion expanded or filters change
  useEffect(() => {
    if (isExpanded) {
      fetchOperators();
    }
  }, [isExpanded, fetchOperators]);

  // Filter available users: is_ready = true and not yet assigned as operator
  const availableUsers = useMemo(() => {
    const assignedUserIds = new Set(operators.map((o) => o.user_id));
    return userOptions.filter((u) => !assignedUserIds.has(u.id));
  }, [userOptions, operators]);

  // Handlers
  const handleOpenAdd = () => {
    setShowAddOperator(true);
    setSelectedUserId('');
    loadReadyUserOptions();
  };

  const handleAssignOperator = async () => {
    const userIdNum = parseInt(selectedUserId, 10);
    if (!userIdNum) {
      toast.error('Pengguna Belum Dipilih', 'Silakan pilih pengguna siap kerja dari daftar.');
      return;
    }

    const selectedUser = availableUsers.find((u) => u.id === userIdNum);

    try {
      setIsSaving(true);
      const res = await productionOperatorService.assignOperator({ user_id: userIdNum });

      const newOp: ProductionOperatorItem = res?.data || {
        id: Date.now(),
        user_id: userIdNum,
        user_name: selectedUser?.full_name || 'Operator',
        user_email: selectedUser?.email || '',
        user_phone: selectedUser?.phone || '-',
        completed_jobs_count: 0,
        performance_kpi: '0 Pekerjaan Selesai',
        is_ready: true,
        can_delete: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setOperators((prev) => {
        const next = [newOp, ...prev];
        syncToAppContext(next);
        return next;
      });

      toast.success(
        'Operator Ditugaskan',
        `Pengguna "${newOp.user_name}" berhasil ditugaskan sebagai operator produksi.`
      );
      setShowAddOperator(false);
      setSelectedUserId('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menugaskan operator.';
      toast.error('Gagal Menugaskan Operator', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOperator = async (id: number, name: string) => {
    const isOk = await confirm({
      title: 'Hapus Data Operator',
      message: `Apakah Anda yakin ingin melepas penugasan operator "${name}"?`,
      confirmText: 'Lepas Operator',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await productionOperatorService.deleteOperator(id);
        setOperators((prev) => {
          const next = prev.filter((o) => o.id !== id);
          syncToAppContext(next);
          return next;
        });
        toast.success('Operator Dihapus', `Penugasan operator "${name}" berhasil dilepas.`);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Gagal menghapus operator.';
        toast.error('Gagal Menghapus Operator', msg);
      }
    }
  };

  const countDisplay = operators.length;

  return (
    <ConfigSection
      title="Daftar Operator Produksi"
      description={`Kelola tenaga kerja operator produksi dan status keaktifan. (${countDisplay} Operator)`}
      icon={Users}
      iconWrapperClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
      isControlled={true}
      isExpandedControlled={isExpanded}
      defaultExpanded={false}
      onToggle={(expanded) => {
        setIsExpanded(expanded);
        if (expanded && !hasFetchedRef.current) {
          fetchOperators();
        }
      }}
    >
      <div className="pt-4 space-y-4">
        {/* Top Bar: Search Input (Left) + Assign Button (Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Input
            icon={Search}
            placeholder="Cari nama operator..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            inputSize="sm"
            containerClassName="max-w-xs w-full"
          />
          {canCreate && (
            <Button
              size="sm"
              onClick={handleOpenAdd}
              disabled={showAddOperator}
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah Operator
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nama Operator</th>
                <th className="px-4 py-3">Status Kesiapan</th>
                <th className="px-4 py-3">Performa KPI</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {operators.length === 0 && !showAddOperator ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-xs text-slate-400">
                    {isLoading
                      ? 'Memuat data operator produksi...'
                      : 'Belum ada operator terdaftar. Klik "Tambah Operator" untuk menugaskan.'}
                  </td>
                </tr>
              ) : (
                operators.map((op) => {
                  const completedJobs = (workOrders || [])
                    .flatMap((wo) => wo.jobCards || [])
                    .filter(
                      (jc) =>
                        jc.status === 'COMPLETED' &&
                        (jc.operatorId === String(op.id) || jc.picName === op.user_name)
                    );
                  const totalJobs = op.completed_jobs_count || completedJobs.length;

                  return (
                    <tr
                      key={op.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                            {op.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span>{op.user_name}</span>
                            {(op.user_phone || op.user_email) && (
                              <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                                {op.user_phone || op.user_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {op.is_ready ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <UserCheck className="h-3 w-3" /> Siap Kerja
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Tidak Siap
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                        {op.performance_kpi || `${totalJobs} Pekerjaan Selesai`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canDelete && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteOperator(op.id, op.user_name)}
                              title="Hapus Operator"
                              disabled={op.can_delete === false}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Inline User Assignment Row */}
              {showAddOperator && (
                <tr className="bg-slate-50 dark:bg-slate-800/40">
                  <td colSpan={4} className="px-4 py-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="flex-1 min-w-[260px]">
                        <Select
                          inputSize="sm"
                          placeholder={
                            isLoadingUserOptions
                              ? 'Memuat pengguna siap kerja...'
                              : availableUsers.length === 0
                              ? 'Tidak ada pengguna siap kerja yang tersedia'
                              : 'Pilih pengguna siap kerja untuk ditugaskan...'
                          }
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          options={availableUsers.map((u) => ({
                            value: String(u.id),
                            label: `${u.full_name} (${u.phone || u.email || 'Tanpa Kontak'})`,
                          }))}
                          disabled={isSaving || isLoadingUserOptions || availableUsers.length === 0}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={handleAssignOperator}
                          isLoading={isSaving}
                          disabled={!selectedUserId || isSaving}
                        >
                          Tugaskan Operator
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddOperator(false)}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ConfigSection>
  );
}
