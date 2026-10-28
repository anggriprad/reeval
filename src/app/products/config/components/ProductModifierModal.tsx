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
  Plus,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
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

  // Expanded BOM option states
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);

  // Inputs for adding BOM to an option: keyed by option id
  const [newBOMMatId, setNewBOMMatId] = useState<Record<string, string>>({});
  const [newBOMQty, setNewBOMQty] = useState<Record<string, string>>({});

  // Fetch materials for dropdown
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

    fetchMaterials();

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
      setExpandedOptionId(null);
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
      setOptions([]);
      setErrorMessage('');
      setExpandedOptionId(null);
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
    if (expandedOptionId === optionId) {
      setExpandedOptionId(null);
    }
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      additional_price: opt.additional_price || 0,
      bom: opt.bom.map((b) => ({
        material_id: b.material_id,
        quantity: b.quantity,
      })),
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
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gagal menyimpan grup modifier master.';
      setErrorMessage(msg);
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
                  const isBOMExpanded = expandedOptionId === opt.id;

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
                        <div className="flex items-center justify-between md:justify-end gap-2 pt-3 md:pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() =>
                              setExpandedOptionId(isBOMExpanded ? null : opt.id)
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
