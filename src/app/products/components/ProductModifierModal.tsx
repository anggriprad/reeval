'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import {
  productModifierService,
  ProductModifierGroupResponse,
  ProductModifierOptionRequest,
} from '@/services/product-modifier.service';
import {
  materialService,
  MaterialOption,
} from '@/services/material.service';
import {
  productionOperationService,
  ProductionOperationOption,
} from '@/services/production-operation.service';
import {
  Plus,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Wrench,
} from 'lucide-react';

export interface ProductModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupToEdit?: ProductModifierGroupResponse | null;
}

interface LocalBOMItem {
  material_id: number;
  material_name?: string;
  unit?: string;
  unit_cost?: number;
  quantity: number;
}

interface LocalOption {
  id: string;
  name: string;
  additional_price: number;
  bom: LocalBOMItem[];
  operation_ids: number[];
}

export function ProductModifierModal({
  isOpen,
  onClose,
  onSuccess,
  groupToEdit,
}: ProductModifierModalProps) {
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [selectType, setSelectType] = useState<'SINGLE' | 'MULTI'>('MULTI');
  const [options, setOptions] = useState<LocalOption[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Material options from API for BOM items
  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  // Operation options from API for production operations
  const [operationOptions, setOperationOptions] = useState<ProductionOperationOption[]>([]);
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);

  // Expanded tab per option: 'bom' | 'operations' | null
  const [expandedOptionTab, setExpandedOptionTab] = useState<Record<string, 'bom' | 'operations' | null>>({});

  // Inputs for adding BOM to an option: keyed by option id
  const [newBOMMatId, setNewBOMMatId] = useState<Record<string, string>>({});
  const [newBOMQty, setNewBOMQty] = useState<Record<string, string>>({});

  // Fetch materials and operations for dropdowns
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchMaterials = async () => {
      setIsLoadingMaterials(true);
      try {
        const res = await materialService.getMaterialOptions();
        if (isMounted && res?.data && Array.isArray(res.data)) {
          setMaterialOptions(res.data);
        }
      } catch (err) {
        console.warn('Gagal memuat opsi bahan baku:', err);
      } finally {
        if (isMounted) setIsLoadingMaterials(false);
      }
    };

    const fetchOperations = async () => {
      setIsLoadingOperations(true);
      try {
        const res = await productionOperationService.getOperationOptions();
        if (isMounted && res?.data && Array.isArray(res.data)) {
          setOperationOptions(res.data);
        }
      } catch (err) {
        console.warn('Gagal memuat opsi operasi produksi:', err);
      } finally {
        if (isMounted) setIsLoadingOperations(false);
      }
    };

    fetchMaterials();
    fetchOperations();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Reset or initialize form data based on groupToEdit
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setSelectType('MULTI');
      setOptions([]);
      setErrorMessage('');
      setExpandedOptionTab({});
      setNewBOMMatId({});
      setNewBOMQty({});
      return;
    }

    if (groupToEdit) {
      setName(groupToEdit.name || '');
      setSelectType(groupToEdit.select_type === 'SINGLE' ? 'SINGLE' : 'MULTI');
      setErrorMessage('');

      const fetchFullGroup = async () => {
        setIsLoadingDetails(true);
        try {
          const res = await productModifierService.getGroupById(groupToEdit.id);
          const rawOptions = res?.data?.options || groupToEdit.options || [];
          setOptions(
            rawOptions.map((opt, idx) => ({
              id: opt.id ? String(opt.id) : `opt-${idx}-${Date.now()}`,
              name: opt.name,
              additional_price: opt.additional_price || 0,
              bom: (opt.bom || []).map((b) => ({
                material_id: b.material_id,
                material_name: b.material_name,
                unit: b.material_unit || '',
                unit_cost: b.unit_cost || 0,
                quantity: b.quantity,
              })),
              operation_ids:
                opt.operation_ids ||
                (opt.operations ? opt.operations.map((o) => o.operation_id) : []),
            }))
          );
        } catch (err) {
          console.warn('Gagal memuat detail modifier:', err);
          const rawOptions = groupToEdit.options || [];
          setOptions(
            rawOptions.map((opt, idx) => ({
              id: opt.id ? String(opt.id) : `opt-${idx}-${Date.now()}`,
              name: opt.name,
              additional_price: opt.additional_price || 0,
              bom: (opt.bom || []).map((b) => ({
                material_id: b.material_id,
                material_name: b.material_name,
                unit: b.material_unit || '',
                unit_cost: b.unit_cost || 0,
                quantity: b.quantity,
              })),
              operation_ids:
                opt.operation_ids ||
                (opt.operations ? opt.operations.map((o) => o.operation_id) : []),
            }))
          );
        } finally {
          setIsLoadingDetails(false);
        }
      };

      fetchFullGroup();
    } else {
      setName('');
      setSelectType('MULTI');
      setOptions([
        {
          id: `opt-0-${Date.now()}`,
          name: '',
          additional_price: 0,
          bom: [],
          operation_ids: [],
        },
      ]);
      setErrorMessage('');
      setExpandedOptionTab({});
      setNewBOMMatId({});
      setNewBOMQty({});
    }
  }, [isOpen, groupToEdit]);

  // Add a new empty option
  const handleAddOption = () => {
    const newId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setOptions((prev) => [
      ...prev,
      {
        id: newId,
        name: '',
        additional_price: 0,
        bom: [],
        operation_ids: [],
      },
    ]);
  };

  // Update option properties
  const handleUpdateOption = (optionId: string, partial: Partial<LocalOption>) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === optionId ? { ...opt, ...partial } : opt))
    );
  };

  // Remove option
  const handleRemoveOption = (optionId: string) => {
    setOptions((prev) => prev.filter((opt) => opt.id !== optionId));
    setExpandedOptionTab((prev) => {
      const copy = { ...prev };
      delete copy[optionId];
      return copy;
    });
  };

  // Toggle production operation selection for an option
  const handleToggleOperation = (optionId: string, operationId: number) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== optionId) return opt;
        const currentOps = opt.operation_ids || [];
        const exists = currentOps.includes(operationId);
        const nextOps = exists
          ? currentOps.filter((id) => id !== operationId)
          : [...currentOps, operationId];
        return { ...opt, operation_ids: nextOps };
      })
    );
  };

  // Add BOM item into option
  const handleAddBOMItem = (optionId: string) => {
    const matIdStr = newBOMMatId[optionId];
    const qtyNum = parseFloat(newBOMQty[optionId] || '0');

    if (!matIdStr) {
      setErrorMessage('Pilih bahan baku terlebih dahulu.');
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMessage('Kuantitas bahan baku harus berupa angka lebih besar dari 0.');
      return;
    }

    const matId = Number(matIdStr);
    const selectedMat = materialOptions.find((m) => m.id === matId);
    if (!selectedMat) {
      setErrorMessage('Bahan baku tidak ditemukan.');
      return;
    }

    setErrorMessage('');

    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== optionId) return opt;

        const existingIdx = opt.bom.findIndex((b) => b.material_id === matId);
        if (existingIdx >= 0) {
          const updatedBom = [...opt.bom];
          updatedBom[existingIdx] = {
            ...updatedBom[existingIdx],
            quantity: qtyNum,
            unit: selectedMat.unit || updatedBom[existingIdx].unit,
            unit_cost: selectedMat.unit_cost || updatedBom[existingIdx].unit_cost,
          };
          return { ...opt, bom: updatedBom };
        }

        return {
          ...opt,
          bom: [
            ...opt.bom,
            {
              material_id: matId,
              material_name: selectedMat.name,
              unit: selectedMat.unit || '',
              unit_cost: selectedMat.unit_cost || 0,
              quantity: qtyNum,
            },
          ],
        };
      })
    );

    setNewBOMMatId((prev) => ({ ...prev, [optionId]: '' }));
    setNewBOMQty((prev) => ({ ...prev, [optionId]: '' }));
  };

  // Remove BOM item from option
  const handleRemoveBOMItem = (optionId: string, materialId: number) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== optionId) return opt;
        return {
          ...opt,
          bom: opt.bom.filter((b) => b.material_id !== materialId),
        };
      })
    );
  };

  // Calculate BOM cost for an option
  const calculateBOMCost = (bom: LocalBOMItem[]) => {
    return bom.reduce((sum, b) => {
      const mat = materialOptions.find((m) => m.id === b.material_id);
      const unitCost = mat?.unit_cost ?? b.unit_cost ?? 0;
      return sum + unitCost * b.quantity;
    }, 0);
  };

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setErrorMessage('Nama grup modifier wajib diisi.');
      return;
    }

    if (options.length === 0) {
      setErrorMessage('Grup modifier harus memiliki minimal 1 pilihan opsi.');
      return;
    }

    for (let i = 0; i < options.length; i++) {
      if (!options[i].name.trim()) {
        setErrorMessage(`Nama opsi #${i + 1} tidak boleh kosong.`);
        return;
      }
    }

    const payloadOptions: ProductModifierOptionRequest[] = options.map((opt) => ({
      name: opt.name.trim(),
      additional_price: Number(opt.additional_price) || 0,
      bom:
        opt.bom && opt.bom.length > 0
          ? opt.bom.map((b) => ({
              material_id: Number(b.material_id),
              quantity: Number(b.quantity),
            }))
          : [],
      operation_ids: opt.operation_ids || [],
    }));

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (groupToEdit) {
        await productModifierService.updateGroup(groupToEdit.id, {
          name: name.trim(),
          select_type: selectType,
          options: payloadOptions,
        });
        toast.success(
          'Modifier Diperbarui',
          `Grup modifier "${name.trim()}" berhasil disimpan.`
        );
      } else {
        await productModifierService.createGroup({
          name: name.trim(),
          select_type: selectType,
          options: payloadOptions,
        });
        toast.success(
          'Modifier Ditambahkan',
          `Grup modifier "${name.trim()}" berhasil ditambahkan.`
        );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      let msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gagal menyimpan grup modifier master.';
      if (err?.response?.data?.errors && typeof err.response.data.errors === 'object') {
        const errorDetails = Object.values(err.response.data.errors).flat().join(', ');
        if (errorDetails) {
          msg = `${msg}: ${errorDetails}`;
        }
      }
      setErrorMessage(msg);
      toast.error('Gagal Menyimpan Modifier', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={groupToEdit ? 'Edit Modifier Master' : 'Tambah Modifier Master'}
      size="xl"
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingDetails}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
              </>
            ) : groupToEdit ? (
              'Simpan Perubahan'
            ) : (
              'Tambah Modifier'
            )}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {errorMessage}
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Nama Grup Modifier
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Add-on Ranjang"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                disabled={isSubmitting || isLoadingDetails}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Aturan Pilihan User
                </label>
                <select
                  value={selectType}
                  onChange={(e) =>
                    setSelectType(e.target.value as 'SINGLE' | 'MULTI')
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  disabled={isSubmitting || isLoadingDetails}
                >
                  <option value="MULTI">Pilihan Berganda (Checkbox / Multi-select)</option>
                  <option value="SINGLE">Pilihan Tunggal (Radio / Single-select)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Daftar Pilihan Opsi & BOM Tambahan
              </p>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleAddOption}
                disabled={isSubmitting || isLoadingDetails}
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Opsi
              </Button>
            </div>

            {isLoadingDetails ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" /> Memuat rincian opsi...
              </div>
            ) : options.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Belum ada opsi ditambahkan ke grup ini.
              </p>
            ) : (
              <div className="space-y-3">
                {options.map((opt) => {
                  const bomCost = calculateBOMCost(opt.bom);
                  const isBOMExpanded = expandedOptionTab[opt.id] === 'bom';
                  const isOpExpanded = expandedOptionTab[opt.id] === 'operations';

                  return (
                    <div
                      key={opt.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 space-y-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">
                            Nama Opsi / Fitur
                          </label>
                          <input
                            type="text"
                            value={opt.name}
                            onChange={(e) =>
                              handleUpdateOption(opt.id, { name: e.target.value })
                            }
                            placeholder="Misal: Sorong Bawah"
                            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">
                            Harga Penambah (Rp)
                          </label>
                          <CurrencyInput
                            value={opt.additional_price}
                            onChange={(val) =>
                              handleUpdateOption(opt.id, {
                                additional_price: typeof val === 'number' ? val : 0,
                              })
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-1.5 pt-3 md:pt-0">
                          <Button
                            variant={isBOMExpanded ? 'secondary' : 'outline'}
                            size="sm"
                            type="button"
                            onClick={() =>
                              setExpandedOptionTab((prev) => ({
                                ...prev,
                                [opt.id]: prev[opt.id] === 'bom' ? null : 'bom',
                              }))
                            }
                            className="text-xs"
                          >
                            BOM ({opt.bom.length}){' '}
                            {isBOMExpanded ? (
                              <ChevronUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-1" />
                            )}
                          </Button>
                          <Button
                            variant={isOpExpanded ? 'secondary' : 'outline'}
                            size="sm"
                            type="button"
                            onClick={() =>
                              setExpandedOptionTab((prev) => ({
                                ...prev,
                                [opt.id]: prev[opt.id] === 'operations' ? null : 'operations',
                              }))
                            }
                            className="text-xs"
                          >
                            <Wrench className="h-3 w-3 mr-1" /> Operasi ({opt.operation_ids.length}){' '}
                            {isOpExpanded ? (
                              <ChevronUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-1" />
                            )}
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Quick preview of selected operations when collapsed */}
                      {opt.operation_ids.length > 0 && !isOpExpanded && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            Operasi:
                          </span>
                          {opt.operation_ids.map((opId) => {
                            const op = operationOptions.find((o) => o.id === opId);
                            return (
                              <span
                                key={opId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                              >
                                {op?.name || `Operasi #${opId}`}
                                {op?.standard_duration_minutes ? (
                                  <span className="text-slate-400">({op.standard_duration_minutes}m)</span>
                                ) : null}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Section: Operasi Produksi Multi-Select */}
                      {isOpExpanded && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-indigo-50/20 dark:bg-slate-800/40 p-3 rounded-md">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Wrench className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              Pilih Operasi Produksi (Bisa lebih dari 1):
                            </p>
                            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                              {opt.operation_ids.length} Operasi Terpilih
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <select
                              value=""
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val) handleToggleOperation(opt.id, val);
                              }}
                              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              disabled={isSubmitting || isLoadingOperations}
                            >
                              <option value="">-- Tambah Operasi Produksi --</option>
                              {operationOptions
                                .filter((op) => !opt.operation_ids.includes(op.id))
                                .map((op) => (
                                  <option key={op.id} value={op.id}>
                                    {op.name} ({op.wage_type === 'HOURLY' ? 'Per Jam' : 'Borongan'}) — Durasi: {op.standard_duration_minutes || 0} mnt
                                  </option>
                                ))}
                            </select>
                          </div>

                          {opt.operation_ids.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {opt.operation_ids.map((opId) => {
                                const op = operationOptions.find((o) => o.id === opId);
                                return (
                                  <span
                                    key={opId}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-xs"
                                  >
                                    <span>{op?.name || `Operasi #${opId}`}</span>
                                    {op?.standard_duration_minutes ? (
                                      <span className="text-[10px] text-slate-400">
                                        ({op.standard_duration_minutes}m)
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleOperation(opt.id, opId)}
                                      className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                                      disabled={isSubmitting}
                                      title="Hapus Operasi"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">
                              Belum ada operasi produksi yang dipilih untuk opsi ini.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Section: BOM Items */}
                      {isBOMExpanded && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-md">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Bahan Baku Penyusun Opsi Ini (BOM Add-on):
                            </p>
                            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                              Est. HPP BOM: {formatCurrency(bomCost)}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <select
                              value={newBOMMatId[opt.id] || ''}
                              onChange={(e) =>
                                setNewBOMMatId((prev) => ({
                                  ...prev,
                                  [opt.id]: e.target.value,
                                }))
                              }
                              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              disabled={isSubmitting || isLoadingMaterials}
                            >
                              <option value="">-- Pilih Bahan Baku --</option>
                              {materialOptions.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.unit || 'Unit'}) — {formatCurrency(m.unit_cost || 0)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={newBOMQty[opt.id] || ''}
                              onChange={(e) =>
                                setNewBOMQty((prev) => ({
                                  ...prev,
                                  [opt.id]: e.target.value,
                                }))
                              }
                              placeholder="Qty"
                              className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-right focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              disabled={isSubmitting}
                            />
                            <Button
                              size="sm"
                              type="button"
                              onClick={() => handleAddBOMItem(opt.id)}
                              disabled={isSubmitting}
                            >
                              + Tambah
                            </Button>
                          </div>

                          {opt.bom.length > 0 ? (
                            <div className="space-y-1">
                              {opt.bom.map((b) => (
                                <div
                                  key={b.material_id}
                                  className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700"
                                >
                                  <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {b.material_name || `Material #${b.material_id}`}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono">
                                      {b.quantity} {b.unit}
                                    </span>
                                    <span className="font-mono text-slate-500">
                                      {formatCurrency(
                                        (b.unit_cost || 0) * b.quantity
                                      )}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveBOMItem(opt.id, b.material_id)
                                      }
                                      className="text-red-500 hover:text-red-700"
                                      disabled={isSubmitting}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">
                              Belum ada bahan baku dikaitkan dengan opsi ini.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
