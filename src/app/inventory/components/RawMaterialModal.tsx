'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/context/ToastContext';
import { useApp } from '@/context/AppContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory } from '@/lib/roles';
import { formatCurrency, calculateSubAssemblyCost, calculateRollupBOMCost } from '@/lib/utils';
import type { RawMaterial, BOMItem } from '@/lib/types';
import {
  materialService,
  CreateMaterialPayload,
  UpdateMaterialPayload,
  MaterialOption,
} from '@/services/material.service';
import { MaterialCategoryOption } from '@/services/material-category.service';
import { ProductionRoutingOption } from '@/services/production-routing.service';
import { AlertTriangle, Layers, Plus, X } from 'lucide-react';

interface RawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  editMaterial: RawMaterial | null;
  onSuccess: () => void;
  categoryOptions: MaterialCategoryOption[];
  routingOptions: ProductionRoutingOption[];
  materialOptions: MaterialOption[];
  allMaterials: RawMaterial[];
  allRoutings?: any[];
  allOperations?: any[];
}

export function RawMaterialModal({
  isOpen,
  onClose,
  editMaterial,
  onSuccess,
  categoryOptions,
  routingOptions,
  materialOptions,
  allMaterials,
  allRoutings = [],
  allOperations = [],
}: RawMaterialModalProps) {
  const { toast } = useToast();
  const { currentUser } = useApp();
  const { can } = usePermission();

  const canCreate = can(PERMISSIONS.INVENTORY.CREATE) || canManageInventory(currentUser.role);
  const canUpdate = can(PERMISSIONS.INVENTORY.UPDATE) || canManageInventory(currentUser.role);

  const [matCode, setMatCode] = useState('');
  const [matName, setMatName] = useState('');
  const [matCategoryId, setMatCategoryId] = useState('');
  const [matCategory, setMatCategory] = useState('');
  const [matUnit, setMatUnit] = useState('pcs');
  const [matUnitCost, setMatUnitCost] = useState(0);
  const [matInitialStock, setMatInitialStock] = useState<string>('0');
  const [matMinStock, setMatMinStock] = useState(5);
  const [matIsSubAssembly, setMatIsSubAssembly] = useState(false);
  const [matChildBom, setMatChildBom] = useState<BOMItem[]>([]);
  const [matRoutingId, setMatRoutingId] = useState('');
  const [childMatId, setChildMatId] = useState('');
  const [childMatQty, setChildMatQty] = useState('');
  const [crudError, setCrudError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const computeSubAssemblyCost = (
    childBom: BOMItem[],
    selectedRoutingId?: string
  ): number => {
    const materialCost = calculateRollupBOMCost(
      childBom,
      allMaterials,
      allRoutings,
      allOperations
    );

    let laborCost = 0;
    if (selectedRoutingId) {
      const opt = routingOptions.find(r => String(r.id) === String(selectedRoutingId));
      if (opt && typeof opt.total_labor_cost === 'number') {
        laborCost = opt.total_labor_cost;
      } else {
        const legacyTotal = calculateSubAssemblyCost(
          childBom,
          allMaterials,
          selectedRoutingId,
          allRoutings,
          allOperations
        );
        return legacyTotal;
      }
    }

    return materialCost + laborCost;
  };

  useEffect(() => {
    if (!isOpen) return;

    if (editMaterial) {
      setMatCode(editMaterial.code || '');
      setMatName(editMaterial.name || '');
      const matchedCat = categoryOptions.find(
        c => c.name.toLowerCase() === (editMaterial.category || '').toLowerCase()
      );
      setMatCategoryId(matchedCat ? String(matchedCat.id) : '');
      setMatCategory(editMaterial.category || '');
      setMatUnit(editMaterial.unit || 'pcs');
      setMatUnitCost(editMaterial.unitCost || 0);
      setMatInitialStock(String(editMaterial.stock ?? 0));
      setMatMinStock(editMaterial.minStock ?? 5);
      setMatIsSubAssembly(Boolean(editMaterial.isSubAssembly));
      const initialChild = editMaterial.childBom ? [...editMaterial.childBom] : [];
      setMatChildBom(initialChild);
      const initialRtId =
        editMaterial.routingId ||
        (routingOptions[0] ? String(routingOptions[0].id) : '');
      setMatRoutingId(initialRtId);
      setChildMatId('');
      setChildMatQty('');
      if (editMaterial.isSubAssembly) {
        setMatUnitCost(computeSubAssemblyCost(initialChild, initialRtId));
      }
    } else {
      setMatCode('');
      setMatName('');
      const defaultCatId = categoryOptions[0] ? String(categoryOptions[0].id) : '';
      setMatCategoryId(defaultCatId);
      setMatCategory(categoryOptions[0]?.name || '');
      setMatUnit('pcs');
      setMatUnitCost(0);
      setMatInitialStock('');
      setMatMinStock(5);
      setMatIsSubAssembly(false);
      setMatChildBom([]);
      setMatRoutingId(
        routingOptions[0] ? String(routingOptions[0].id) : ''
      );
      setChildMatId('');
      setChildMatQty('');
    }
    setCrudError('');
  }, [isOpen, editMaterial, categoryOptions, routingOptions, allMaterials, allRoutings, allOperations]);

  const handleAddChildBomItem = () => {
    if (!childMatId) return;
    const parsedQty = parseFloat(childMatQty.replace(',', '.'));
    if (isNaN(parsedQty) || parsedQty <= 0) return;

    const existingIndex = matChildBom.findIndex(item => item.materialId === childMatId);
    let updated: BOMItem[];
    if (existingIndex !== -1) {
      updated = [...matChildBom];
      updated[existingIndex].qty += parsedQty;
    } else {
      updated = [...matChildBom, { materialId: childMatId, qty: parsedQty }];
    }
    setMatChildBom(updated);
    setChildMatId('');
    setChildMatQty('');
    setMatUnitCost(computeSubAssemblyCost(updated, matRoutingId));
  };

  const handleRemoveChildBomItem = (materialId: string) => {
    const updated = matChildBom.filter(item => item.materialId !== materialId);
    setMatChildBom(updated);
    setMatUnitCost(computeSubAssemblyCost(updated, matRoutingId));
  };

  const handleSave = async () => {
    if (editMaterial && !canUpdate) {
      setCrudError('Akses Ditolak: Anda tidak memiliki hak akses untuk mengubah bahan baku.');
      return;
    }
    if (!editMaterial && !canCreate) {
      setCrudError('Akses Ditolak: Anda tidak memiliki hak akses untuk mendaftarkan bahan baku.');
      return;
    }

    if (!matName.trim() || !matUnit.trim()) {
      setCrudError('Nama dan satuan bahan wajib diisi.');
      return;
    }
    if (
      !editMaterial &&
      (matInitialStock === '' || matInitialStock === undefined || String(matInitialStock).trim() === '')
    ) {
      setCrudError('Stok awal wajib diisi.');
      return;
    }
    if (!matCategoryId && !matCategory.trim()) {
      setCrudError('Kategori bahan wajib diisi.');
      return;
    }

    const finalUnitCost = matIsSubAssembly
      ? computeSubAssemblyCost(matChildBom, matRoutingId)
      : Number(matUnitCost) || 0;

    const targetCatId = matCategoryId ? Number(matCategoryId) : undefined;
    const targetCatName =
      categoryOptions.find(c => String(c.id) === matCategoryId)?.name ||
      matCategory.trim();

    setIsSaving(true);
    setCrudError('');

    try {
      if (editMaterial) {
        const payload: UpdateMaterialPayload = {
          name: matName.trim(),
          category_id: targetCatId,
          category: targetCatName,
          unit: matUnit.trim().toLowerCase(),
          unit_cost: finalUnitCost,
          min_stock: Number(matMinStock) || 0,
          is_sub_assembly: matIsSubAssembly,
          routing_id: matIsSubAssembly && matRoutingId ? Number(matRoutingId) : null,
          child_bom: matIsSubAssembly
            ? matChildBom.map(b => ({
                child_material_id: Number(b.materialId),
                qty: b.qty,
              }))
            : [],
        };
        const res = await materialService.updateMaterial(Number(editMaterial.id), payload);
        if (res.success || res.data) {
          toast.success('Bahan Baku Diperbarui', `Bahan baku "${matName}" berhasil diperbarui.`);
          onSuccess();
          onClose();
        }
      } else {
        const payload: CreateMaterialPayload = {
          code: null, // Auto-generate oleh backend
          name: matName.trim(),
          category_id: targetCatId,
          category: targetCatName,
          unit: matUnit.trim().toLowerCase(),
          unit_cost: finalUnitCost,
          stock: Number(matInitialStock) || 0,
          min_stock: Number(matMinStock) || 0,
          is_sub_assembly: matIsSubAssembly,
          routing_id: matIsSubAssembly && matRoutingId ? Number(matRoutingId) : null,
          child_bom: matIsSubAssembly
            ? matChildBom.map(b => ({
                child_material_id: Number(b.materialId),
                qty: b.qty,
              }))
            : [],
        };
        const res = await materialService.createMaterial(payload);
        if (res.success || res.data) {
          toast.success(
            'Bahan Baku Didaftarkan',
            `Bahan baku "${matName}" berhasil didaftarkan dengan kode ${res.data?.code || 'auto'}.`
          );
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      setCrudError(
        err.response?.data?.message || err.message || 'Gagal menyimpan data bahan baku.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editMaterial ? 'Edit Material / Inventaris' : 'Register Material Baru'}
      size="lg"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-4">
        {crudError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{crudError}</span>
          </div>
        )}

        {/* Form Kode & Kategori: Kode HANYA tampil saat Edit (Saat Create: Dihilangkan) */}
        {editMaterial ? (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kode Bahan Baku"
              type="text"
              value={matCode}
              disabled={true}
            />
            <Select
              label="Kategori"
              required
              value={matCategoryId}
              onChange={e => {
                const selectedId = e.target.value;
                setMatCategoryId(selectedId);
                const found = categoryOptions.find(c => String(c.id) === selectedId);
                if (found) setMatCategory(found.name);
              }}
              options={categoryOptions.map(cat => ({
                value: String(cat.id),
                label: cat.name,
              }))}
            />
          </div>
        ) : (
          <Select
            label="Kategori"
            required
            value={matCategoryId}
            onChange={e => {
              const selectedId = e.target.value;
              setMatCategoryId(selectedId);
              const found = categoryOptions.find(c => String(c.id) === selectedId);
              if (found) setMatCategory(found.name);
            }}
            options={categoryOptions.map(cat => ({
              value: String(cat.id),
              label: cat.name,
            }))}
          />
        )}

        <Input
          label="Nama Bahan Baku"
          required
          type="text"
          value={matName}
          onChange={e => setMatName(e.target.value)}
          placeholder="Contoh: Multiplek 18mm"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Satuan"
            required
            type="text"
            value={matUnit}
            onChange={e => setMatUnit(e.target.value)}
            placeholder="pcs / unit / meter"
          />
          <div>
            <CurrencyInput
              label="HPP Satuan (Rp)"
              required
              value={
                matIsSubAssembly
                  ? computeSubAssemblyCost(matChildBom, matRoutingId)
                  : matUnitCost
              }
              onChange={val =>
                !matIsSubAssembly && setMatUnitCost(typeof val === 'number' ? val : 0)
              }
              disabled={matIsSubAssembly}
            />
            {matIsSubAssembly && (
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                *Terhitung otomatis dari Bahan + Upah Routing
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Stok Awal"
            required={!editMaterial}
            type="number"
            step="any"
            value={matInitialStock}
            onChange={e => setMatInitialStock(e.target.value)}
            disabled={Boolean(editMaterial)}
            placeholder="0"
          />
          <Input
            label="Batas Stok Minimum"
            required
            type="number"
            value={matMinStock || ''}
            onChange={e => setMatMinStock(Number(e.target.value))}
            placeholder="0"
          />
        </div>

        {/* Bahan Setengah Jadi Checkbox & Child BOM Builder */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={matIsSubAssembly}
              onChange={e => {
                const checked = e.target.checked;
                setMatIsSubAssembly(checked);
                if (checked) {
                  const targetRtId =
                    matRoutingId || (routingOptions[0] ? String(routingOptions[0].id) : '');
                  if (!matRoutingId && targetRtId) {
                    setMatRoutingId(targetRtId);
                  }
                  setMatUnitCost(computeSubAssemblyCost(matChildBom, targetRtId));
                }
              }}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Item ini adalah Bahan Setengah Jadi (Memiliki Child BOM)
            </span>
          </label>

          {matIsSubAssembly && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-600" />
                  Child BOM Builder & Routing Bahan Setengah Jadi
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Total HPP Bahan Setengah Jadi:{' '}
                  {formatCurrency(computeSubAssemblyCost(matChildBom, matRoutingId))}
                </span>
              </div>

              {/* Routing Selector */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Alur Routing Produksi Bahan Setengah Jadi <span className="text-red-500">*</span>
                </label>
                <Select
                  value={matRoutingId}
                  onChange={e => {
                    const newRtId = e.target.value;
                    setMatRoutingId(newRtId);
                    setMatUnitCost(computeSubAssemblyCost(matChildBom, newRtId));
                  }}
                  options={[
                    { value: '', label: '-- Tanpa Routing (Hanya Biaya Bahan) --' },
                    ...routingOptions.map(r => ({
                      value: String(r.id),
                      label: `${r.name} (${r.step_count ?? 0} Tahap Operasi)`,
                    })),
                  ]}
                  inputSize="sm"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Biaya upah dari alur routing ini akan otomatis ditambahkan ke HPP Bahan Setengah Jadi dan teralokasi saat SPK dibuat.
                </p>
              </div>

              {/* Add Row */}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Pilih Material Penyusun
                  </label>
                  <Select
                    value={childMatId}
                    onChange={e => setChildMatId(e.target.value)}
                    options={[
                      { value: '', label: '-- Pilih Bahan Baku Anak --' },
                      ...materialOptions
                        .filter(m => (editMaterial ? String(m.id) !== editMaterial.id : true))
                        .map(m => ({
                          value: String(m.id),
                          label: `${m.name} (${m.unit})`,
                        })),
                    ]}
                    inputSize="sm"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Jumlah Qty
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={childMatQty}
                    onChange={e => setChildMatQty(e.target.value)}
                    placeholder="0"
                    inputSize="sm"
                  />
                </div>
                <div className="col-span-2">
                  <Button type="button" size="sm" onClick={handleAddChildBomItem} className="w-full">
                    <Plus className="h-3.5 w-3.5" /> Tambah
                  </Button>
                </div>
              </div>

              {/* Child BOM Table */}
              {matChildBom.length === 0 ? (
                <EmptyState
                  title="Belum Ada Bahan Penyusun"
                  description="Belum ada bahan baku yang ditambahkan ke Child BOM ini."
                  variant="plain"
                />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3 py-1.5">Material</th>
                        <th className="px-3 py-1.5 text-center">Qty Required</th>
                        <th className="px-3 py-1.5 text-right">Biaya Subtotal</th>
                        <th className="px-2 py-1.5 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {matChildBom.map((item, idx) => {
                        const compMat = allMaterials.find(
                          m => String(m.id) === String(item.materialId)
                        );
                        const compCost = compMat
                          ? compMat.isSubAssembly && compMat.childBom
                            ? calculateSubAssemblyCost(
                                compMat.childBom,
                                allMaterials,
                                compMat.routingId,
                                allRoutings,
                                allOperations
                              )
                            : compMat.unitCost
                          : 0;
                        const subtotal = compCost * item.qty;
                        return (
                          <tr key={idx}>
                            <td className="px-3 py-1.5">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {compMat?.name || 'Unknown'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {compMat?.code}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-center font-bold text-slate-900 dark:text-white">
                              {item.qty} {compMat?.unit}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-600 dark:text-slate-400">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveChildBomItem(item.materialId)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Hapus Material Anak"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
