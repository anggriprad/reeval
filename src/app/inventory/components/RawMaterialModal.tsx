'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Checkbox } from '@/components/ui/Checkbox';
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
import {
  productionRoutingService,
  ProductionRoutingOption,
  ProductionRoutingStepItem,
} from '@/services/production-routing.service';
import { AlertTriangle, Layers, Plus, Trash2, X } from 'lucide-react';

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
  const [matUnitCost, setMatUnitCost] = useState<number | ''>('');
  const [matInitialStock, setMatInitialStock] = useState<string>('0');
  const [matMinStock, setMatMinStock] = useState<number | ''>(10);
  const [matIsSubAssembly, setMatIsSubAssembly] = useState(false);
  const [matChildBom, setMatChildBom] = useState<Array<{ materialId: string; qty: number | string }>>([]);
  const [matRoutingId, setMatRoutingId] = useState('');
  const [selectedRoutingSteps, setSelectedRoutingSteps] = useState<ProductionRoutingStepItem[]>([]);
  const [childMatId, setChildMatId] = useState('');
  const [childMatQty, setChildMatQty] = useState('');
  const [crudError, setCrudError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const parseQty = (qty: number | string | undefined): number => {
    if (typeof qty === 'number') return isNaN(qty) ? 0 : qty;
    if (!qty) return 0;
    const parsed = parseFloat(String(qty).replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const computeSubAssemblyCost = (
    childBom: Array<{ materialId: string; qty: number | string }>,
    selectedRoutingId?: string
  ): number => {
    const normalizedBom: BOMItem[] = childBom.map(b => ({
      ...b,
      qty: parseQty(b.qty),
    }));
    const materialCost = calculateRollupBOMCost(
      normalizedBom,
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
          normalizedBom,
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
      setMatMinStock(editMaterial.minStock ?? 10);
      setMatIsSubAssembly(Boolean(editMaterial.isSubAssembly));
      const initialChild = editMaterial.childBom ? [...editMaterial.childBom] : [];
      setMatChildBom(initialChild);
      const initialRtId = editMaterial.routingId ? String(editMaterial.routingId) : '';
      setMatRoutingId(initialRtId);
      setChildMatId('');
      setChildMatQty('');
      if (editMaterial.isSubAssembly) {
        setMatUnitCost(computeSubAssemblyCost(initialChild, initialRtId));
      }
    } else {
      setMatCode('');
      setMatName('');
      setMatCategoryId('');
      setMatCategory('');
      setMatUnit('pcs');
      setMatUnitCost('');
      setMatInitialStock('0');
      setMatMinStock(10);
      setMatIsSubAssembly(false);
      setMatChildBom([]);
      setMatRoutingId('');
      setChildMatId('');
      setChildMatQty('');
    }
    setCrudError('');
  }, [isOpen, editMaterial, categoryOptions, routingOptions, allMaterials, allRoutings, allOperations]);

  const availableChildOptions = useMemo(() => {
    return materialOptions.filter(
      m =>
        (editMaterial ? String(m.id) !== String(editMaterial.id) : true) &&
        !matChildBom.some(item => String(item.materialId) === String(m.id))
    );
  }, [materialOptions, editMaterial, matChildBom]);

  useEffect(() => {
    if (!isOpen || !matRoutingId || isNaN(Number(matRoutingId))) {
      setSelectedRoutingSteps([]);
      return;
    }
    let active = true;
    productionRoutingService
      .getRoutingById(Number(matRoutingId))
      .then(res => {
        if (active && res.success && res.data?.steps) {
          setSelectedRoutingSteps(res.data.steps);
        }
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [isOpen, matRoutingId]);

  const selectedRoutingOperations = useMemo<{ sequence: number; name: string; laborCost: number }[]>(() => {
    if (!matRoutingId) return [];
    if (selectedRoutingSteps.length > 0) {
      return selectedRoutingSteps.map((s, idx) => ({
        sequence: s.step_order ?? idx + 1,
        name: s.operation_name,
        laborCost: s.labor_cost ?? 0,
      }));
    }
    const opt = routingOptions.find(r => String(r.id) === String(matRoutingId));
    if (opt?.steps && opt.steps.length > 0) {
      return opt.steps.map((s, idx) => {
        let cost = 0;
        if (typeof (s as any).labor_cost === 'number') {
          cost = (s as any).labor_cost;
        } else if (s.costing_method === 'hourly') {
          const duration = s.duration_minutes || 0;
          const rate = s.labor_cost_per_hour || 0;
          cost = (duration / 60) * rate;
        } else {
          cost = s.fixed_labor_cost || 0;
        }
        return {
          sequence: s.sequence ?? idx + 1,
          name: s.operation_name,
          laborCost: cost,
        };
      });
    }
    const rt = allRoutings.find((r: any) => String(r.id) === String(matRoutingId));
    if (rt?.steps && rt.steps.length > 0) {
      return rt.steps.map((s: any, idx: number) => {
        const op = allOperations.find((o: any) => String(o.id) === String(s.operationId || s.operation_id));
        let cost = 0;
        if (typeof s.labor_cost === 'number') {
          cost = s.labor_cost;
        } else if (op) {
          if (op.costingMethod === 'hourly') {
            const duration = op.durationMinutes || 0;
            const rate = op.laborCostPerHour || 0;
            cost = (duration / 60) * rate;
          } else {
            cost = op.fixedLaborCost || 0;
          }
        }
        return {
          sequence: s.sequence ?? idx + 1,
          name: op?.name || s.operationName || s.operation_name || `Operasi #${idx + 1}`,
          laborCost: cost,
        };
      });
    }
    return [];
  }, [matRoutingId, selectedRoutingSteps, routingOptions, allRoutings, allOperations]);

  const handleAddChildBomItem = () => {
    if (!childMatId) return;
    const parsedQty = parseQty(childMatQty);
    if (parsedQty <= 0) return;

    const existingIndex = matChildBom.findIndex(
      item => String(item.materialId) === String(childMatId)
    );
    let updated: Array<{ materialId: string; qty: number | string }>;
    if (existingIndex !== -1) {
      updated = [...matChildBom];
      const currentQty = parseQty(updated[existingIndex].qty);
      updated[existingIndex].qty = currentQty + parsedQty;
    } else {
      updated = [...matChildBom, { materialId: childMatId, qty: childMatQty }];
    }
    setMatChildBom(updated);
    setChildMatId('');
    setChildMatQty('1');
    setMatUnitCost(computeSubAssemblyCost(updated, matRoutingId));
  };

  const handleUpdateChildBomQty = (materialId: string, rawVal: string) => {
    const sanitized = rawVal.replace(/[^0-9.,]/g, '');
    const updated = matChildBom.map(item =>
      String(item.materialId) === String(materialId)
        ? { ...item, qty: sanitized }
        : item
    );
    setMatChildBom(updated);
    setMatUnitCost(computeSubAssemblyCost(updated, matRoutingId));
  };

  const handleRemoveChildBomItem = (materialId: string) => {
    const updated = matChildBom.filter(
      item => String(item.materialId) !== String(materialId)
    );
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

    if (matIsSubAssembly && matChildBom.some(b => parseQty(b.qty) <= 0)) {
      setCrudError('Kuantitas setiap material pada BOM harus lebih besar dari 0.');
      return;
    }

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
              qty: parseQty(b.qty),
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
              qty: parseQty(b.qty),
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
      title={editMaterial ? 'Edit Material' : 'Tambah Material'}
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
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nama Bahan Baku"
            required
            type="text"
            value={matName}
            onChange={e => setMatName(e.target.value)}
          />
          <Select
            label="Kategori"
            required
            value={matCategoryId}
            onChange={e => {
              const selectedId = e.target.value;
              setMatCategoryId(selectedId);
              const found = categoryOptions.find(c => String(c.id) === selectedId);
              setMatCategory(found ? found.name : '');
            }}
            options={[
              { value: '', label: '' },
              ...categoryOptions.map(cat => ({
                value: String(cat.id),
                label: cat.name,
              })),
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Satuan"
            required
            type="text"
            value={matUnit}
            onChange={e => setMatUnit(e.target.value)}
            placeholder="pcs/unit/meter/kg"
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
                !matIsSubAssembly && setMatUnitCost(typeof val === 'number' ? val : '')
              }
              disabled={matIsSubAssembly}
              placeholder=""
            />
            {matIsSubAssembly && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                Dihitung otomatis dari BOM dan Alur Produksi
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
            value={matMinStock}
            onChange={e => setMatMinStock(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
          />
        </div>

        {/* Bahan Setengah Jadi Checkbox & Child BOM Builder */}
        <div className="space-y-3 pt-3">
          <Checkbox
            checked={matIsSubAssembly}
            onChange={checked => {
              setMatIsSubAssembly(checked);
              if (checked) {
                setMatUnitCost(computeSubAssemblyCost(matChildBom, matRoutingId));
              }
            }}
            label="Bahan Setengah Jadi"
            labelClassName='!text-sm font-normal'
          />

          {matIsSubAssembly && (
            <>
              {/* Container BOM */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  BOM
                </h3>

                {/* List BOM */}
                {matChildBom.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
                    Belum ada material dalam BOM.
                  </p>
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    <table className="w-full text-left text-xs">
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
                          const subtotal = compCost * parseQty(item.qty);

                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200 truncate" title={compMat?.name}>
                                {compMat?.name || 'Unknown'}
                              </td>
                              <td className="py-2 px-1 w-20 text-right">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.qty}
                                  onChange={e => handleUpdateChildBomQty(item.materialId, e.target.value)}
                                  inputSize="sm"
                                  containerClassName="w-16 ml-auto"
                                  className="font-medium text-right text-xs"
                                />
                              </td>
                              <td className="py-2 px-1 w-12 text-left text-xs text-slate-500 dark:text-slate-400 truncate">
                                {compMat?.unit || 'unit'}
                              </td>
                              <td className="py-2 px-1.5 w-28 text-right font-mono text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap text-xs">
                                {formatCurrency(subtotal)}
                              </td>
                              <td className="py-2 pl-1 pr-2.5 text-center w-9">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChildBomItem(item.materialId)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                  title="Hapus Material"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tambah Material Manual */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Select
                    value={childMatId}
                    onChange={e => {
                      const val = e.target.value;
                      setChildMatId(val);
                      if (val && (!childMatQty || childMatQty === '0')) {
                        setChildMatQty('1');
                      }
                    }}
                    options={[
                      { value: '', label: 'Pilih BOM' },
                      ...availableChildOptions.map(m => ({
                        value: String(m.id),
                        label: `${m.name} / ${m.unit}`,
                      })),
                    ]}
                    inputSize="sm"
                    containerClassName="flex-1"
                  />

                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={childMatQty}
                      onChange={e => setChildMatQty(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="Qty"
                      disabled={!childMatId}
                      inputSize="sm"
                      containerClassName="w-20"
                      className="font-medium text-right"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddChildBomItem();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddChildBomItem}
                      disabled={!childMatId}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Tambah
                    </Button>
                  </div>
                </div>
              </div>

              {/* Container Alur Produksi */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Alur Produksi
                </h3>
                <Select
                  value={matRoutingId}
                  onChange={e => {
                    const newRtId = e.target.value;
                    setMatRoutingId(newRtId);
                    setMatUnitCost(computeSubAssemblyCost(matChildBom, newRtId));
                  }}
                  options={[
                    { value: '', label: 'Pilih Alur Produksi' },
                    ...routingOptions.map(r => ({
                      value: String(r.id),
                      label: r.name,
                    })),
                  ]}
                  inputSize="sm"
                />

                {selectedRoutingOperations.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Daftar Operasi
                    </label>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedRoutingOperations.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                              {step.sequence ?? idx + 1}
                            </span>
                            <span>{step.name}</span>
                          </div>
                          <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">
                            {formatCurrency(step.laborCost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
