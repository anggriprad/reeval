'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import {
  productionRoutingService,
  ProductionRoutingItem,
  ProductionRoutingStepItem,
  CreateProductionRoutingPayload,
  UpdateProductionRoutingPayload,
} from '@/services/production-routing.service';
import {
  productionOperationService,
  ProductionOperationOption,
} from '@/services/production-operation.service';
import type { ProductionRouting, RoutingStep } from '@/lib/types';
import { ConfigSection } from './ConfigSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
} from 'lucide-react';

interface LocalRoutingStep {
  sequence: number;
  operationId: string;
  notes?: string;
}

export function ProductionRoutingSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    currentUser,
    setRoutingsList,
    routings: appRoutings,
    operations: appOperations,
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || !!currentUser?.is_superadmin;
  const canRead = can(PERMISSIONS.PRODUCTION.ROUTING_READ) || can(PERMISSIONS.PRODUCTION.READ) || isSuperAdmin;
  const canCreate = can(PERMISSIONS.PRODUCTION.ROUTING_CREATE) || isSuperAdmin;
  const canUpdate = can(PERMISSIONS.PRODUCTION.ROUTING_UPDATE) || isSuperAdmin;
  const canDelete = can(PERMISSIONS.PRODUCTION.ROUTING_DELETE) || isSuperAdmin;
  const canManage = canCreate || canUpdate || canDelete;

  // Accordion expansion state: default closed (false), lazy fetch when user expands
  const [isExpanded, setIsExpanded] = useState(false);

  // Routings state
  const [routings, setRoutings] = useState<ProductionRoutingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rtSearch, setRtSearch] = useState('');
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Operation Options for step dropdown (/production/operations/options)
  const [operationOptions, setOperationOptions] = useState<ProductionOperationOption[]>([]);
  const hasFetchedOptionsRef = useRef(false);

  // Routing Modal State
  const [showRtModal, setShowRtModal] = useState(false);
  const [editRtId, setEditRtId] = useState<number | null>(null);
  const [rtName, setRtName] = useState('');
  const [rtDesc, setRtDesc] = useState('');
  const [rtSteps, setRtSteps] = useState<LocalRoutingStep[]>([]);
  const [rtError, setRtError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync to AppContext so work orders and products/variants have live routing records
  const syncToAppContext = useCallback((items: ProductionRoutingItem[]) => {
    const mapped: ProductionRouting[] = items.map((r) => ({
      id: String(r.id),
      name: r.name,
      steps: (r.steps || []).map((s) => ({
        sequence: s.step_order,
        operationId: String(s.operation_id),
      })),
    }));
    setRoutingsList(mapped);
  }, [setRoutingsList]);

  // Fetch Routings from Backend API
  const fetchRoutings = useCallback(async (searchQuery = '') => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await productionRoutingService.getRoutings({
        per_page: 100,
        search: searchQuery.trim() || undefined,
      });

      hasFetchedRef.current = true;
      if (response && Array.isArray(response.data)) {
        setRoutings(response.data);
        syncToAppContext(response.data);
      }
    } catch (err: any) {
      console.warn('Gagal memuat template alur produksi dari API:', err);
      hasFetchedRef.current = true;
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [syncToAppContext]);

  // Fetch Operation Options for step dropdown from /production/operations/options
  const fetchOperationOptions = useCallback(async () => {
    if (hasFetchedOptionsRef.current) return;
    try {
      const res = await productionOperationService.getOperationOptions();
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setOperationOptions(res.data);
        hasFetchedOptionsRef.current = true;
        return;
      }
    } catch (err) {
      console.warn('Gagal memuat opsi operasi dari /production/operations/options:', err);
    }

    // Fallback: build options from appOperations
    if (appOperations.length > 0) {
      setOperationOptions(
        appOperations.map((op) => ({
          id: Number(op.id) || 0,
          name: op.name,
          wage_type: op.costingMethod === 'fixed' ? 'FIXED' : 'HOURLY',
          standard_duration_minutes: op.durationMinutes || 0,
          calculated_labor_cost: op.fixedLaborCost || 0,
        }))
      );
    }
  }, [appOperations]);

  // Lazy Fetch when accordion expanded
  useEffect(() => {
    if (isExpanded) {
      if (!hasFetchedRef.current) {
        fetchRoutings();
      }
      if (!hasFetchedOptionsRef.current) {
        fetchOperationOptions();
      }
    }
  }, [isExpanded, fetchRoutings, fetchOperationOptions]);

  // Handle Search Input with debounce
  useEffect(() => {
    if (!hasFetchedRef.current) return;
    const timeout = setTimeout(() => {
      fetchRoutings(rtSearch);
    }, 350);
    return () => clearTimeout(timeout);
  }, [rtSearch, fetchRoutings]);

  // Step Options list (derived from operationOptions or fallback)
  const stepOptions = useMemo(() => {
    if (operationOptions.length > 0) {
      return operationOptions.map((op) => ({
        value: String(op.id),
        label: `${op.name} (${op.wage_type === 'FIXED' ? 'Borongan' : 'Durasi per jam'}, ${op.standard_duration_minutes || 0}m)`,
      }));
    }
    return appOperations.map((op) => ({
      value: String(op.id),
      label: `${op.name} (${op.costingMethod === 'fixed' ? 'Borongan' : 'Durasi per jam'}, ${op.durationMinutes || 0}m)`,
    }));
  }, [operationOptions, appOperations]);

  // Modal Handlers
  const openAddRt = async () => {
    setEditRtId(null);
    setRtName('');
    setRtDesc('');
    setRtSteps([]);
    setRtError('');
    setShowRtModal(true);
    await fetchOperationOptions();
  };

  const openEditRt = async (rt: ProductionRoutingItem) => {
    setEditRtId(rt.id);
    setRtName(rt.name);
    setRtDesc(rt.description || '');
    setRtError('');

    // If steps are already loaded on the item
    if (Array.isArray(rt.steps) && rt.steps.length > 0) {
      setRtSteps(
        rt.steps.map((s, idx) => ({
          sequence: s.step_order || idx + 1,
          operationId: String(s.operation_id),
          notes: s.notes || '',
        }))
      );
    } else {
      // Fetch details from backend API
      try {
        const res = await productionRoutingService.getRoutingById(rt.id);
        if (res?.data && Array.isArray(res.data.steps)) {
          setRtSteps(
            res.data.steps.map((s, idx) => ({
              sequence: s.step_order || idx + 1,
              operationId: String(s.operation_id),
              notes: s.notes || '',
            }))
          );
        }
      } catch (err) {
        console.warn('Gagal memuat detail steps alur:', err);
      }
    }

    setShowRtModal(true);
    await fetchOperationOptions();
  };

  const handleAddStepToRt = () => {
    const firstOpId = stepOptions.length > 0 ? stepOptions[0].value : '';
    setRtSteps((prev) => [
      ...prev,
      { sequence: prev.length + 1, operationId: firstOpId },
    ]);
  };

  const handleRemoveStepFromRt = (index: number) => {
    setRtSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequence: i + 1 }))
    );
  };

  const handleStepOpChange = (index: number, opId: string) => {
    setRtSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, operationId: opId } : s))
    );
  };

  const handleSaveRt = async () => {
    if (!rtName.trim()) {
      setRtError('Nama alur produksi wajib diisi.');
      return;
    }
    if (rtSteps.length === 0) {
      setRtError('Alur produksi wajib memiliki minimal 1 tahap operasi.');
      return;
    }

    const hasInvalidOp = rtSteps.some((s) => !s.operationId || Number(s.operationId) <= 0);
    if (hasInvalidOp) {
      setRtError('Pastikan seluruh tahap operasi telah memilih master operasi yang valid.');
      return;
    }

    const payload: CreateProductionRoutingPayload = {
      name: rtName.trim(),
      description: rtDesc.trim() || undefined,
      steps: rtSteps.map((s, idx) => ({
        operation_id: Number(s.operationId),
        step_order: idx + 1,
        notes: s.notes?.trim() || '',
      })),
    };

    try {
      setIsSaving(true);
      setRtError('');

      if (editRtId) {
        const updatePayload: UpdateProductionRoutingPayload = { ...payload };
        const res = await productionRoutingService.updateRouting(editRtId, updatePayload);
        const updatedItem = res?.data;

        setRoutings((prev) => {
          const next = prev.map((r) => (r.id === editRtId ? (updatedItem || { ...r, ...payload }) : r));
          syncToAppContext(next);
          return next;
        });

        toast.success('Alur Diperbarui', `Alur produksi "${payload.name}" berhasil diperbarui.`);
      } else {
        const res = await productionRoutingService.createRouting(payload);
        const newItem = res?.data;

        setRoutings((prev) => {
          const next = newItem ? [newItem, ...prev] : prev;
          syncToAppContext(next);
          return next;
        });

        toast.success('Alur Ditambahkan', `Alur produksi "${payload.name}" berhasil ditambahkan.`);
      }

      setShowRtModal(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan template alur produksi.';
      setRtError(msg);
      toast.error('Gagal Menyimpan Alur', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRt = async (id: number, name: string) => {
    const isOk = await confirm({
      title: 'Hapus Alur Produksi',
      message: `Apakah Anda yakin ingin menghapus alur produksi "${name}"?`,
      confirmText: 'Hapus Alur',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await productionRoutingService.deleteRouting(id);
        setRoutings((prev) => {
          const next = prev.filter((r) => r.id !== id);
          syncToAppContext(next);
          return next;
        });
        toast.success('Alur Dihapus', `Alur produksi "${name}" berhasil dihapus.`);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Alur produksi ini tidak dapat dihapus karena sedang digunakan oleh varian produk aktif.';
        toast.error('Gagal Menghapus Alur', msg);
      }
    }
  };

  // Local filter for responsive instantaneous filtering
  const filteredRoutings = useMemo(() => {
    if (!rtSearch.trim()) return routings;
    const lower = rtSearch.toLowerCase();
    return routings.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        (r.description && r.description.toLowerCase().includes(lower))
    );
  }, [routings, rtSearch]);

  const countDisplay = routings.length > 0 ? routings.length : appRoutings.length;

  return (
    <>
      <ConfigSection
        title="Template Alur Produksi (Routing)"
        description={`Kelola susunan urutan tahap operasi untuk pembuatan varian produk. (${countDisplay} Template Alur)`}
        icon={Layers}
        iconWrapperClass="bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        isControlled={true}
        isExpandedControlled={isExpanded}
        defaultExpanded={false}
        onToggle={(expanded) => {
          setIsExpanded(expanded);
          if (expanded) {
            if (!hasFetchedRef.current) fetchRoutings();
            if (!hasFetchedOptionsRef.current) fetchOperationOptions();
          }
        }}
      >
        <div className="pt-4 space-y-4">
          {/* Top Bar: Search Input (Left) + Create Button (Right) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Input
              icon={Search}
              placeholder="Cari alur produksi..."
              value={rtSearch}
              onChange={(e) => setRtSearch(e.target.value)}
              inputSize="sm"
              containerClassName="max-w-xs w-full"
            />
            {canCreate && (
              <Button size="sm" onClick={openAddRt}>
                <Plus className="h-4 w-4 mr-1" /> Buat Alur Produksi
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoutings.length === 0 ? (
              <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                {isLoading
                  ? 'Memuat data template alur produksi...'
                  : 'Belum ada template alur produksi. Klik "Buat Alur Produksi" untuk membuat.'}
              </div>
            ) : (
              filteredRoutings.map((rt) => {
                const stepList = rt.steps || [];
                const totalEstMinutes = rt.total_duration_minutes || stepList.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
                const totalPlannedCost = rt.total_labor_cost || stepList.reduce((acc, s) => acc + (s.labor_cost || 0), 0);

                return (
                  <div
                    key={rt.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-800/50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {rt.name}
                        </h4>
                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0">
                            {canUpdate && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditRt(rt)}
                                title="Edit Alur"
                              >
                                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRt(rt.id, rt.name)}
                                title="Hapus Alur"
                                disabled={rt.can_delete === false}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <span>{rt.step_count || stepList.length} Tahap Operasi</span>
                        <span>•</span>
                        <span>Est: {totalEstMinutes} Menit</span>
                      </div>

                      {/* Step list */}
                      <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        {stepList.map((step) => (
                          <div
                            key={step.step_order}
                            className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                                {step.step_order}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {step.operation_name || 'Operasi Produksi'}
                              </span>
                            </div>
                            <span className="font-mono text-slate-500 shrink-0 text-[11px]">
                              {formatCurrency(step.labor_cost || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Estimasi Upah:</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 text-xs">
                        {formatCurrency(totalPlannedCost)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ConfigSection>

      {/* Modal 2: Add/Edit Alur Produksi (Routing) */}
      <Modal
        isOpen={showRtModal}
        onClose={() => !isSaving && setShowRtModal(false)}
        title={editRtId ? 'Edit Alur Produksi' : 'Buat Template Alur Produksi Baru'}
        size="lg"
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowRtModal(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveRt}
              isLoading={isSaving}
              disabled={isSaving}
            >
              Simpan Alur Produksi
            </Button>
          </>
        }
      >
        <div className="space-y-5 pb-28">
          {rtError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {rtError}
            </div>
          )}

          <Input
            label="Nama Template Alur Produksi"
            required
            value={rtName}
            onChange={(e) => setRtName(e.target.value)}
            disabled={isSaving}
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rangkaian Tahap Operasi <span className="text-red-500 font-bold">*</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Urutan proses pekerjaan yang harus dilalui dalam alur ini.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddStepToRt}
                disabled={stepOptions.length === 0 || isSaving}
                className="text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Tahap
              </Button>
            </div>

            <div className="space-y-2.5 min-h-[300px] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 divide-y divide-slate-200/60 dark:divide-slate-800/80">
              {rtSteps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                    <Layers className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Belum ada tahap operasi ditambahkan
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Klik tombol &quot;+ Tambah Tahap&quot; di atas untuk memilih master operasi.
                  </p>
                </div>
              ) : (
                rtSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 pt-2.5 first:pt-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                      {step.sequence}
                    </span>
                    <Select
                      value={step.operationId}
                      onChange={(e) => handleStepOpChange(index, e.target.value)}
                      inputSize="sm"
                      containerClassName="flex-1 min-w-0"
                      disabled={isSaving}
                      options={stepOptions}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveStepFromRt(index)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                      title="Hapus Tahap"
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
