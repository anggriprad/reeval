'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import {
  productionOperationService,
  ProductionOperationItem,
  CreateProductionOperationPayload,
  UpdateProductionOperationPayload,
} from '@/services/production-operation.service';
import type { ProductionOperation } from '@/lib/types';
import { ConfigSection } from '@/components/ui/ConfigSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import {
  Wrench,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
} from 'lucide-react';

export function ProductionOperationSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    currentUser,
    setOperationsList,
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || !!currentUser?.is_superadmin;
  const canCreate = can(PERMISSIONS.PRODUCTION.OPERATION_CREATE) || isSuperAdmin;
  const canUpdate = can(PERMISSIONS.PRODUCTION.OPERATION_UPDATE) || isSuperAdmin;
  const canDelete = can(PERMISSIONS.PRODUCTION.OPERATION_DELETE) || isSuperAdmin;
  const canManage = canCreate || canUpdate || canDelete;

  // Accordion expansion state: default closed (false), lazy fetch when user expands
  const [isExpanded, setIsExpanded] = useState(false);

  // Operations state
  const [operations, setOperations] = useState<ProductionOperationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Table filters hook for operation search & pagination
  const { filters, setFilter } = useTableFilters({
    op_search: '',
    op_page: 1,
    op_per_page: 50,
  });

  const [searchInput, setSearchInput] = useState(filters.op_search || '');
  const isSearchInitial = useRef(true);

  // Debounce search input (500ms)
  useEffect(() => {
    if (isSearchInitial.current) {
      isSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilter('op_search', searchInput.trim());
      setFilter('op_page', 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, setFilter]);

  useEffect(() => {
    setSearchInput(filters.op_search || '');
  }, [filters.op_search]);

  // Inline Add State (row at the bottom of the table)
  const [isAdding, setIsAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDuration, setAddDuration] = useState<number | ''>('');
  const [addCostingMethod, setAddCostingMethod] = useState<'fixed' | 'hourly'>('fixed');
  const [addFixedLaborCost, setAddFixedLaborCost] = useState<number | ''>('');
  const [addLaborCost, setAddLaborCost] = useState<number | ''>('');

  // Inline Edit State (row in-place inside the table)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState<number | ''>('');
  const [editCostingMethod, setEditCostingMethod] = useState<'fixed' | 'hourly'>('fixed');
  const [editFixedLaborCost, setEditFixedLaborCost] = useState<number | ''>('');
  const [editLaborCost, setEditLaborCost] = useState<number | ''>('');

  const [isSaving, setIsSaving] = useState(false);

  // Sync to AppContext so routings and work orders have live operation records
  const syncToAppContext = useCallback((items: ProductionOperationItem[]) => {
    const mapped: ProductionOperation[] = items.map((op) => ({
      id: String(op.id),
      name: op.name,
      costingMethod: op.wage_type === 'HOURLY' ? 'hourly' : 'fixed',
      durationMinutes: op.standard_duration_minutes,
      laborCostPerHour: op.cost_per_hour,
      fixedLaborCost: op.fixed_cost,
      description: op.description,
    }));
    setOperationsList(mapped);
  }, [setOperationsList]);

  // Fetch Operations from Backend API
  const fetchOperations = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await productionOperationService.getOperations({
        page: filters.op_page,
        per_page: filters.op_per_page,
        search: filters.op_search?.trim() || undefined,
      });

      hasFetchedRef.current = true;
      if (response && Array.isArray(response.data)) {
        setOperations(response.data);
        syncToAppContext(response.data);
      }
    } catch (err: any) {
      console.warn('Gagal memuat master operasi dari API:', err);
      hasFetchedRef.current = true;
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [filters.op_page, filters.op_per_page, filters.op_search, syncToAppContext]);

  // Lazy Fetch: on mount or when expanded or filters change
  useEffect(() => {
    if (isExpanded) {
      fetchOperations();
    }
  }, [isExpanded, fetchOperations]);

  // Add Handlers
  const openAdd = () => {
    setEditingId(null);
    setAddName('');
    setAddDuration('');
    setAddCostingMethod('fixed');
    setAddFixedLaborCost('');
    setAddLaborCost('');
    setIsAdding(true);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setAddName('');
    setAddDuration('');
    setAddFixedLaborCost('');
    setAddLaborCost('');
  };

  const handleSaveAdd = async () => {
    const trimmed = addName.trim();
    if (!trimmed) {
      toast.error('Nama Wajib Diisi', 'Nama operasi tidak boleh kosong.');
      return;
    }

    const fixedVal = Number(addFixedLaborCost) || 0;
    const hourlyVal = Number(addLaborCost) || 0;

    if (addCostingMethod === 'fixed' && fixedVal <= 0) {
      toast.error('Tarif Tidak Valid', 'Nominal upah borongan harus lebih besar dari 0.');
      return;
    }
    if (addCostingMethod === 'hourly' && hourlyVal <= 0) {
      toast.error('Tarif Tidak Valid', 'Tarif upah per jam harus lebih besar dari 0.');
      return;
    }

    const payload: CreateProductionOperationPayload = {
      name: trimmed,
      wage_type: addCostingMethod === 'fixed' ? 'FIXED' : 'HOURLY',
      fixed_cost: addCostingMethod === 'fixed' ? fixedVal : 0,
      cost_per_hour: addCostingMethod === 'hourly' ? hourlyVal : 0,
      standard_duration_minutes: Number(addDuration) || 0,
    };

    try {
      setIsSaving(true);
      const res = await productionOperationService.createOperation(payload);
      const newItem = res?.data;

      const next = newItem ? [...operations, newItem] : operations;
      setOperations(next);
      syncToAppContext(next);

      toast.success('Operasi Ditambahkan', `Operasi "${trimmed}" berhasil ditambahkan.`);
      cancelAdd();
    } catch (err: any) {
      toast.error('Gagal Menambahkan Operasi', err?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit Handlers
  const startEdit = (op: ProductionOperationItem) => {
    setIsAdding(false);
    setEditingId(op.id);
    setEditName(op.name);
    setEditDuration(op.standard_duration_minutes || '');
    setEditCostingMethod(op.wage_type === 'HOURLY' ? 'hourly' : 'fixed');
    setEditFixedLaborCost(op.fixed_cost || 0);
    setEditLaborCost(op.cost_per_hour || 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error('Nama Wajib Diisi', 'Nama operasi tidak boleh kosong.');
      return;
    }

    const fixedVal = Number(editFixedLaborCost) || 0;
    const hourlyVal = Number(editLaborCost) || 0;

    if (editCostingMethod === 'fixed' && fixedVal <= 0) {
      toast.error('Tarif Tidak Valid', 'Nominal upah borongan harus lebih besar dari 0.');
      return;
    }
    if (editCostingMethod === 'hourly' && hourlyVal <= 0) {
      toast.error('Tarif Tidak Valid', 'Tarif upah per jam harus lebih besar dari 0.');
      return;
    }

    const existingOp = operations.find((o) => o.id === editingId);
    const payload: UpdateProductionOperationPayload = {
      name: trimmed,
      description: existingOp?.description,
      wage_type: editCostingMethod === 'fixed' ? 'FIXED' : 'HOURLY',
      fixed_cost: editCostingMethod === 'fixed' ? fixedVal : 0,
      cost_per_hour: editCostingMethod === 'hourly' ? hourlyVal : 0,
      standard_duration_minutes: Number(editDuration) || 0,
    };

    try {
      setIsSaving(true);
      const res = await productionOperationService.updateOperation(editingId, payload);
      const updatedItem = res?.data;

      const next = operations.map((o) => (o.id === editingId ? (updatedItem || { ...o, ...payload }) : o));
      setOperations(next);
      syncToAppContext(next);

      toast.success('Operasi Diperbarui', `Operasi "${trimmed}" berhasil diperbarui.`);
      setEditingId(null);
    } catch (err: any) {
      toast.error('Gagal Memperbarui Operasi', err?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOp = async (id: number, name: string) => {
    const isOk = await confirm({
      title: 'Hapus Operasi Produksi',
      message: `Apakah Anda yakin ingin menghapus operasi "${name}"?`,
      confirmText: 'Hapus Operasi',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await productionOperationService.deleteOperation(id);
        const next = operations.filter((o) => o.id !== id);
        setOperations(next);
        syncToAppContext(next);
        toast.success('Operasi Dihapus', `Operasi "${name}" berhasil dihapus.`);
        if (editingId === id) {
          cancelEdit();
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Operasi ini tidak dapat dihapus karena sedang digunakan dalam Alur Produksi.';
        toast.error('Gagal Menghapus Operasi', msg);
      }
    }
  };

  const countDisplay = operations.length;

  return (
    <ConfigSection
      title="Master Operasi Produksi"
      description={`Kelola daftar master tahap pekerjaan/operasi produksi dan sistem upah. (${countDisplay} Operasi)`}
      icon={Wrench}
      isControlled={true}
      isExpandedControlled={isExpanded}
      defaultExpanded={false}
      onToggle={(expanded) => {
        setIsExpanded(expanded);
        if (expanded && !hasFetchedRef.current) {
          fetchOperations();
        }
      }}
    >
      <div className="space-y-4">
        {/* Top Bar: Search Input (Left) + Create Button (Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Input
            icon={Search}
            placeholder="Cari master operasi..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            inputSize="sm"
            containerClassName="max-w-xs w-full"
          />
          {canCreate && (
            <Button
              size="sm"
              onClick={openAdd}
              disabled={isAdding}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Operasi
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="py-3 pl-4 pr-1.5 text-left font-semibold">Nama Operasi</th>
                <th className="py-3 px-1.5 w-44 text-left font-semibold">Sistem Upah</th>
                <th className="py-3 px-1.5 w-44 text-left font-semibold">Nilai Upah</th>
                <th className="py-3 px-1.5 w-44 text-left font-semibold">Estimasi Durasi</th>
                <th className="py-3 pl-1.5 pr-4 text-right w-24 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Memuat data operasi produksi...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : operations.length === 0 && !isAdding ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState
                      title={filters.op_search ? 'Operasi Tidak Ditemukan' : 'Belum Ada Operasi'}
                      description={
                        filters.op_search
                          ? `Tidak ada master operasi yang cocok dengan "${filters.op_search}".`
                          : 'Belum ada master operasi produksi terdaftar. Klik "Tambah Operasi" untuk membuat.'
                      }
                      variant="plain"
                    />
                  </td>
                </tr>
              ) : (
                operations.map((op) => {
                  const isEditing = editingId === op.id;

                  if (isEditing) {
                    return (
                      <tr key={op.id} className="bg-indigo-50/50 dark:bg-indigo-950/30 border-y border-indigo-200 dark:border-indigo-800/60">
                        <td className="py-2.5 pl-4 pr-1.5">
                          <Input
                            autoFocus
                            placeholder="Nama Operasi"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              else if (e.key === 'Escape') cancelEdit();
                            }}
                            inputSize="md"
                            disabled={isSaving}
                          />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <Select
                            value={editCostingMethod}
                            onChange={(e) => setEditCostingMethod(e.target.value as 'fixed' | 'hourly')}
                            options={[
                              { value: 'fixed', label: 'Borongan' },
                              { value: 'hourly', label: 'Durasi per jam' },
                            ]}
                            inputSize="md"
                            disabled={isSaving}
                          />
                        </td>
                        <td className="py-2.5 px-1.5">
                          {editCostingMethod === 'fixed' ? (
                            <CurrencyInput
                              value={Number(editFixedLaborCost) || 0}
                              onChange={(val) => setEditFixedLaborCost(val)}
                              inputSize="md"
                              disabled={isSaving}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                else if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                          ) : (
                            <CurrencyInput
                              value={Number(editLaborCost) || 0}
                              onChange={(val) => setEditLaborCost(val)}
                              inputSize="md"
                              disabled={isSaving}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                else if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-1.5">
                          <Input
                            type="number"
                            placeholder="0"
                            suffix="Menit"
                            value={editDuration}
                            onChange={(e) =>
                              setEditDuration(e.target.value === '' ? '' : Number(e.target.value))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              else if (e.key === 'Escape') cancelEdit();
                            }}
                            inputSize="md"
                            disabled={isSaving}
                          />
                        </td>
                        <td className="py-2.5 pl-1.5 pr-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="success"
                              onClick={handleSaveEdit}
                              isLoading={isSaving}
                              title="Simpan"
                            >
                              <Check className="h-4.5 w-4.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              title="Batal"
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <X className="h-4.5 w-4.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={op.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 pl-4 pr-1.5 text-slate-900 dark:text-white">
                        {op.name}
                        {op.description && (
                          <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                            {op.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-1.5">
                        {op.wage_type === 'FIXED' ? (
                          <Badge variant="default">Borongan</Badge>
                        ) : (
                          <Badge variant="default">Durasi per jam</Badge>
                        )}
                      </td>
                      <td className="py-3 px-1.5 text-sm text-slate-600 dark:text-slate-400">
                        {op.wage_type === 'FIXED'
                          ? formatCurrency(op.fixed_cost || 0)
                          : `${formatCurrency(op.cost_per_hour || 0)} / Jam`}
                      </td>
                      <td className="py-3 px-1.5 text-sm text-slate-600 dark:text-slate-400">
                        {op.standard_duration_minutes
                          ? `${op.standard_duration_minutes} Menit`
                          : '-'}
                      </td>
                      <td className="py-3 pl-1.5 pr-4 text-right whitespace-nowrap">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEdit(op)}
                                disabled={isAdding}
                                title="Edit Operasi"
                                className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteOp(op.id, op.name)}
                                disabled={isAdding || op.can_delete === false}
                                title="Hapus Operasi"
                                className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Inline Add Row di Bawah Tabel */}
              {isAdding && (
                <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
                  <td className="py-2.5 pl-4 pr-1.5">
                    <Input
                      autoFocus
                      placeholder="Nama Operasi Baru"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveAdd();
                        else if (e.key === 'Escape') cancelAdd();
                      }}
                      inputSize="md"
                      disabled={isSaving}
                    />
                  </td>
                  <td className="py-2.5 px-1.5">
                    <Select
                      value={addCostingMethod}
                      onChange={(e) => setAddCostingMethod(e.target.value as 'fixed' | 'hourly')}
                      options={[
                        { value: 'fixed', label: 'Borongan' },
                        { value: 'hourly', label: 'Durasi per jam' },
                      ]}
                      inputSize="md"
                      disabled={isSaving}
                    />
                  </td>
                  <td className="py-2.5 px-1.5">
                    {addCostingMethod === 'fixed' ? (
                      <CurrencyInput
                        value={Number(addFixedLaborCost) || 0}
                        onChange={(val) => setAddFixedLaborCost(val)}
                        inputSize="md"
                        disabled={isSaving}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveAdd();
                          else if (e.key === 'Escape') cancelAdd();
                        }}
                      />
                    ) : (
                      <CurrencyInput
                        value={Number(addLaborCost) || 0}
                        onChange={(val) => setAddLaborCost(val)}
                        inputSize="md"
                        disabled={isSaving}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveAdd();
                          else if (e.key === 'Escape') cancelAdd();
                        }}
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-1.5">
                    <Input
                      type="number"
                      placeholder="0"
                      suffix="Menit"
                      value={addDuration}
                      onChange={(e) =>
                        setAddDuration(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveAdd();
                        else if (e.key === 'Escape') cancelAdd();
                      }}
                      inputSize="md"
                      disabled={isSaving}
                    />
                  </td>
                  <td className="py-2.5 pl-1.5 pr-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="success"
                        onClick={handleSaveAdd}
                        isLoading={isSaving}
                        title="Simpan"
                      >
                        <Check className="h-4.5 w-4.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelAdd}
                        disabled={isSaving}
                        title="Batal"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-4.5 w-4.5" />
                      </Button>
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
