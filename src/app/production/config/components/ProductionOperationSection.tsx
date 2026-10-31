'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { ConfigSection } from './ConfigSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
} from 'lucide-react';

export function ProductionOperationSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    currentUser,
    setOperationsList,
    operations: appOperations,
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || !!currentUser?.is_superadmin;
  const canRead = can(PERMISSIONS.PRODUCTION.OPERATION_READ) || can(PERMISSIONS.PRODUCTION.READ) || isSuperAdmin;
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

  // Operation Modal State
  const [showOpModal, setShowOpModal] = useState(false);
  const [editOpId, setEditOpId] = useState<number | null>(null);
  const [opName, setOpName] = useState('');
  const [opDuration, setOpDuration] = useState<number | ''>('');
  const [opCostingMethod, setOpCostingMethod] = useState<'fixed' | 'hourly'>('fixed');
  const [opFixedLaborCost, setOpFixedLaborCost] = useState<number | ''>('');
  const [opLaborCost, setOpLaborCost] = useState<number | ''>('');
  const [opDesc, setOpDesc] = useState('');
  const [opError, setOpError] = useState('');
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

  // Modal Handlers
  const openAddOp = () => {
    setEditOpId(null);
    setOpName('');
    setOpDuration('');
    setOpCostingMethod('fixed');
    setOpFixedLaborCost('');
    setOpLaborCost('');
    setOpDesc('');
    setOpError('');
    setShowOpModal(true);
  };

  const openEditOp = (op: ProductionOperationItem) => {
    setEditOpId(op.id);
    setOpName(op.name);
    setOpDuration(op.standard_duration_minutes || '');
    setOpCostingMethod(op.wage_type === 'HOURLY' ? 'hourly' : 'fixed');
    setOpFixedLaborCost(op.fixed_cost || 0);
    setOpLaborCost(op.cost_per_hour || 0);
    setOpDesc(op.description || '');
    setOpError('');
    setShowOpModal(true);
  };

  const handleSaveOp = async () => {
    if (!opName.trim()) {
      setOpError('Nama operasi wajib diisi.');
      return;
    }

    const fixedVal = Number(opFixedLaborCost) || 0;
    const hourlyVal = Number(opLaborCost) || 0;

    if (opCostingMethod === 'fixed' && fixedVal <= 0) {
      setOpError('Nominal upah borongan harus lebih besar dari 0.');
      return;
    }
    if (opCostingMethod === 'hourly' && hourlyVal <= 0) {
      setOpError('Tarif upah per jam harus lebih besar dari 0.');
      return;
    }

    const payload: CreateProductionOperationPayload = {
      name: opName.trim(),
      description: opDesc.trim() || undefined,
      wage_type: opCostingMethod === 'fixed' ? 'FIXED' : 'HOURLY',
      fixed_cost: opCostingMethod === 'fixed' ? fixedVal : 0,
      cost_per_hour: opCostingMethod === 'hourly' ? hourlyVal : 0,
      standard_duration_minutes: Number(opDuration) || 0,
    };

    try {
      setIsSaving(true);
      setOpError('');

      if (editOpId) {
        const updatePayload: UpdateProductionOperationPayload = { ...payload };
        const res = await productionOperationService.updateOperation(editOpId, updatePayload);
        const updatedItem = res?.data;

        setOperations((prev) => {
          const next = prev.map((o) => (o.id === editOpId ? (updatedItem || { ...o, ...payload }) : o));
          syncToAppContext(next);
          return next;
        });

        toast.success('Operasi Diperbarui', `Operasi "${payload.name}" berhasil diperbarui.`);
      } else {
        const res = await productionOperationService.createOperation(payload);
        const newItem = res?.data;

        setOperations((prev) => {
          const next = newItem ? [newItem, ...prev] : prev;
          syncToAppContext(next);
          return next;
        });

        toast.success('Operasi Ditambahkan', `Operasi "${payload.name}" berhasil ditambahkan.`);
      }

      setShowOpModal(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan operasi produksi.';
      setOpError(msg);
      toast.error('Gagal Menyimpan Operasi', msg);
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
        setOperations((prev) => {
          const next = prev.filter((o) => o.id !== id);
          syncToAppContext(next);
          return next;
        });
        toast.success('Operasi Dihapus', `Operasi "${name}" berhasil dihapus.`);
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
    <>
      <ConfigSection
        title="Master Operasi Produksi"
        description={`Kelola daftar master tahap pekerjaan/operasi produksi dan sistem upah. (${countDisplay} Operasi)`}
        icon={Wrench}
        iconWrapperClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
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
        <div className="pt-4 space-y-4">
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
              <Button size="sm" onClick={openAddOp}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Operasi
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Nama Operasi</th>
                  <th className="px-4 py-3">Sistem Upah</th>
                  <th className="px-4 py-3">Nilai Tarif (Biaya)</th>
                  <th className="px-4 py-3">Estimasi Durasi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {operations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs text-slate-400">
                      {isLoading
                        ? 'Memuat data operasi produksi...'
                        : 'Belum ada master operasi yang sesuai. Klik "Tambah Operasi" untuk membuat.'}
                    </td>
                  </tr>
                ) : (
                  operations.map((op) => (
                    <tr
                      key={op.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {op.name}
                        {op.description && (
                          <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                            {op.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {op.wage_type === 'FIXED' ? (
                          <Badge variant="success">Borongan</Badge>
                        ) : (
                          <Badge variant="info">Durasi per jam</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {op.wage_type === 'FIXED'
                          ? formatCurrency(op.fixed_cost || 0)
                          : `${formatCurrency(op.cost_per_hour || 0)} / Jam`}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {op.standard_duration_minutes
                          ? `${op.standard_duration_minutes} Menit`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditOp(op)}
                                title="Edit Operasi"
                              >
                                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteOp(op.id, op.name)}
                                title="Hapus Operasi"
                                disabled={op.can_delete === false}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ConfigSection>

      {/* Modal 1: Add/Edit Master Operasi Produksi */}
      <Modal
        isOpen={showOpModal}
        onClose={() => !isSaving && setShowOpModal(false)}
        title={editOpId ? 'Edit Master Operasi Produksi' : 'Tambah Master Operasi Produksi Baru'}
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowOpModal(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveOp}
              isLoading={isSaving}
              disabled={isSaving}
            >
              Simpan Operasi
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {opError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {opError}
            </div>
          )}

          <Input
            label="Nama Operasi"
            required
            value={opName}
            onChange={(e) => setOpName(e.target.value)}
            disabled={isSaving}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Sistem Upah Operasi"
              value={opCostingMethod}
              onChange={(e) => setOpCostingMethod(e.target.value as 'fixed' | 'hourly')}
              disabled={isSaving}
              options={[
                { value: 'fixed', label: 'Borongan' },
                { value: 'hourly', label: 'Durasi per jam' },
              ]}
            />

            <Input
              label="Estimasi Durasi (Menit)"
              type="number"
              value={opDuration}
              onChange={(e) =>
                setOpDuration(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="font-mono"
              disabled={isSaving}
            />
          </div>

          {opCostingMethod === 'fixed' ? (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nominal Upah Borongan <span className="text-red-500 font-bold">*</span>
              </label>
              <CurrencyInput
                value={Number(opFixedLaborCost) || 0}
                onChange={(val) => setOpFixedLaborCost(val)}
                disabled={isSaving}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Tarif Upah Pekerja (Per Jam) <span className="text-red-500 font-bold">*</span>
              </label>
              <CurrencyInput
                value={Number(opLaborCost) || 0}
                onChange={(val) => setOpLaborCost(val)}
                disabled={isSaving}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Keterangan / Instruksi Kerja
            </label>
            <textarea
              rows={2}
              value={opDesc}
              onChange={(e) => setOpDesc(e.target.value)}
              disabled={isSaving}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors shadow-xs"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
