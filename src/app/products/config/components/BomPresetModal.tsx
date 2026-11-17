'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import {
  bomPresetService,
  BOMPresetResponse,
  BOMPresetOption,
  BOMPresetItemRequest,
} from '@/services/bom-preset.service';
import {
  materialService,
  MaterialOption,
} from '@/services/material.service';
import {
  Copy,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';

export interface BomPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  presetToEdit?: BOMPresetResponse | null;
}

interface LocalPresetItem {
  material_id: number;
  material_name: string;
  quantity: number;
  unit: string;
}

export function BomPresetModal({
  isOpen,
  onClose,
  onSuccess,
  presetToEdit,
}: BomPresetModalProps) {
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<LocalPresetItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Material options from API
  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  // Copy preset section
  const [showCopySection, setShowCopySection] = useState(false);
  const [presetOptions, setPresetOptions] = useState<BOMPresetOption[]>([]);
  const [sourcePresetId, setSourcePresetId] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);

  // New item row inputs
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<string>('');

  // Load material options and preset options when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchOptions = async () => {
      setIsLoadingMaterials(true);
      try {
        const [matRes, presetOptRes] = await Promise.all([
          materialService.getMaterialOptions(),
          bomPresetService.getBOMOptions(),
        ]);
        if (isMounted) {
          if (matRes?.data && Array.isArray(matRes.data)) {
            setMaterialOptions(matRes.data);
          }
          if (presetOptRes?.data && Array.isArray(presetOptRes.data)) {
            setPresetOptions(presetOptRes.data);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat opsi referensi material/preset:', err);
      } finally {
        if (isMounted) setIsLoadingMaterials(false);
      }
    };

    fetchOptions();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Reset or initialize form data based on presetToEdit
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setItems([]);
      setErrorMessage('');
      setShowCopySection(false);
      setSourcePresetId('');
      setSelectedMaterialId('');
      setItemQuantity('');
      return;
    }

    if (presetToEdit) {
      setName(presetToEdit.name || '');
      setDescription(presetToEdit.description || '');
      setErrorMessage('');
      setShowCopySection(false);

      const fetchFullPreset = async () => {
        setIsLoadingDetails(true);
        try {
          const res = await bomPresetService.getPresetById(presetToEdit.id);
          const sourceItems = res?.data?.items || presetToEdit.items || [];
          setItems(
            sourceItems.map((it) => ({
              material_id: it.material_id,
              material_name: it.material_name,
              quantity: it.quantity,
              unit: it.unit,
            }))
          );
        } catch (err) {
          console.warn('Gagal mengambil rincian preset:', err);
          const sourceItems = presetToEdit.items || [];
          setItems(
            sourceItems.map((it) => ({
              material_id: it.material_id,
              material_name: it.material_name,
              quantity: it.quantity,
              unit: it.unit,
            }))
          );
        } finally {
          setIsLoadingDetails(false);
        }
      };

      fetchFullPreset();
    } else {
      setName('');
      setDescription('');
      setItems([]);
      setErrorMessage('');
    }
  }, [isOpen, presetToEdit]);

  // Handle copy items from existing preset
  const handleCopyFromSource = async () => {
    if (!sourcePresetId) return;
    setIsCopying(true);
    setErrorMessage('');
    try {
      const res = await bomPresetService.getPresetById(Number(sourcePresetId));
      if (!res?.data?.items || res.data.items.length === 0) {
        setErrorMessage('Preset sumber tidak memiliki rincian komponen material.');
        return;
      }
      const copied: LocalPresetItem[] = res.data.items.map((it) => ({
        material_id: it.material_id,
        material_name: it.material_name,
        quantity: it.quantity,
        unit: it.unit,
      }));
      setItems(copied);
      setShowCopySection(false);
      toast.success(
        'Komponen Disalin',
        `${copied.length} material berhasil disalin dari preset "${res.data.name}".`
      );
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Gagal menyalin komponen material dari preset sumber.'
      );
    } finally {
      setIsCopying(false);
    }
  };

  // Add material row into items list
  const handleAddItem = () => {
    if (!selectedMaterialId) {
      setErrorMessage('Pilih bahan baku terlebih dahulu.');
      return;
    }
    const qty = parseFloat(itemQuantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Kuantitas material harus berupa angka lebih besar dari 0.');
      return;
    }

    const matId = Number(selectedMaterialId);
    const selectedMat = materialOptions.find((m) => m.id === matId);
    if (!selectedMat) {
      setErrorMessage('Bahan baku tidak valid.');
      return;
    }

    setErrorMessage('');

    const existingIndex = items.findIndex((i) => i.material_id === matId);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: qty,
        unit: selectedMat.unit || updated[existingIndex].unit,
      };
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          material_id: matId,
          material_name: selectedMat.name,
          quantity: qty,
          unit: selectedMat.unit || '',
        },
      ]);
    }

    setSelectedMaterialId('');
    setItemQuantity('');
  };

  const handleRemoveItem = (materialId: number) => {
    setItems((prev) => prev.filter((i) => i.material_id !== materialId));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage('Nama preset BOM wajib diisi.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Preset BOM harus memiliki minimal 1 komponen material.');
      return;
    }

    const itemPayloads: BOMPresetItemRequest[] = items.map((it) => ({
      material_id: it.material_id,
      quantity: it.quantity,
      unit: it.unit || undefined,
    }));

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (presetToEdit) {
        await bomPresetService.updatePreset(presetToEdit.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          items: itemPayloads,
        });
        toast.success(
          'Preset BOM Diperbarui',
          `Preset BOM "${name.trim()}" berhasil disimpan.`
        );
      } else {
        await bomPresetService.createPreset({
          name: name.trim(),
          description: description.trim() || undefined,
          items: itemPayloads,
        });
        toast.success(
          'Preset BOM Ditambahkan',
          `Preset BOM "${name.trim()}" berhasil ditambahkan.`
        );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gagal menyimpan master preset BOM.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={presetToEdit ? 'Edit Master Preset BOM' : 'Tambah Master Preset BOM'}
      size="lg"
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
            ) : presetToEdit ? (
              'Simpan Perubahan'
            ) : (
              'Tambah Preset BOM'
            )}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {errorMessage}
          </div>
        )}

        {/* Copy Preset Section (Only for Create Mode) */}
        {!presetToEdit && presetOptions.length > 0 && (
          <div className="rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Salin Komponen dari Preset Lain?
              </span>
              <button
                type="button"
                onClick={() => setShowCopySection(!showCopySection)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {showCopySection ? 'Sembunyikan' : 'Buka Opsi Salin'}
              </button>
            </div>

            {showCopySection && (
              <div className="flex gap-2 pt-1">
                <select
                  value={sourcePresetId}
                  onChange={(e) => setSourcePresetId(e.target.value)}
                  className="flex-1 rounded-md border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">-- Pilih Preset Sumber --</option>
                  {presetOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={handleCopyFromSource}
                  disabled={!sourcePresetId || isCopying}
                >
                  {isCopying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Salin Material'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Nama Preset BOM */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Nama Preset BOM <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Resep Kasur Busa Premium 160×200"
            className="text-xs"
            disabled={isSubmitting || isLoadingDetails}
            required
          />
        </div>

        {/* Deskripsi Singkat */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Deskripsi Singkat
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi singkat preset BOM ini..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
            disabled={isSubmitting || isLoadingDetails}
          />
        </div>

        {/* Komponen Material Preset */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Komponen Material Preset <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
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
              value={itemQuantity}
              onChange={(e) => setItemQuantity(e.target.value)}
              placeholder="Qty"
              className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-right focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              disabled={isSubmitting}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddItem}
              disabled={!selectedMaterialId || isSubmitting}
            >
              + Tambah
            </Button>
          </div>

          {items.length > 0 ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Material</th>
                    <th className="px-3 py-1.5 text-right">Kuantitas</th>
                    <th className="px-3 py-1.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => (
                    <tr key={item.material_id}>
                      <td className="px-3 py-1.5 font-medium">{item.material_name}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.material_id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Belum ada material dikaitkan dengan preset BOM ini.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
