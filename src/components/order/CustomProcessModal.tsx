'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { SalesOrder, SalesOrderItem, CustomBomItem, CustomOperationItem, UnitCustomProcess } from '@/lib/types';
import { formatVariantLabel, cn } from '@/lib/utils';
import {
  Trash2,
  Plus,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CustomProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder;
}

export function CustomProcessModal({ isOpen, onClose, order }: CustomProcessModalProps) {
  const { products, materials, routings, operations, finishedGoods, updateOrderCustomProcess } = useApp();
  const { toast } = useToast();

  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [activeUnitIndex, setActiveUnitIndex] = useState(1);
  const [itemsState, setItemsState] = useState<SalesOrderItem[]>([]);
  const [selectedNewMaterialId, setSelectedNewMaterialId] = useState('');
  const [newMaterialQty, setNewMaterialQty] = useState<number | ''>('');
  const [selectedOpToAdd, setSelectedOpToAdd] = useState('');

  // Accordion toggle states
  const [isMaterialOpen, setIsMaterialOpen] = useState(true);
  const [isRoutingOpen, setIsRoutingOpen] = useState(true);

  // Helper to build default master BOM for a single unit of a SalesOrderItem
  const getDefaultBomForItem = (item: SalesOrderItem): CustomBomItem[] => {
    const product = products.find(p => p.id === item.productId);
    const variant = item.variantId
      ? product?.variants.find(v => v.id === item.variantId)
      : product?.variants[0];

    const bomMap = new Map<string, number>();

    // 1. Variant Master BOM
    if (variant?.bom) {
      variant.bom.forEach(b => {
        bomMap.set(b.materialId, (bomMap.get(b.materialId) || 0) + b.qty);
      });
    }

    // 2. Modifiers Master BOM
    if (item.selectedModifiers && item.selectedModifiers.length > 0) {
      item.selectedModifiers.forEach(group => {
        group.selectedOptions.forEach(opt => {
          opt.bom.forEach(b => {
            bomMap.set(b.materialId, (bomMap.get(b.materialId) || 0) + b.qty);
          });
        });
      });
    }

    return Array.from(bomMap.entries()).map(([materialId, qty]) => ({
      materialId,
      qty,
    }));
  };

  // Helper to build default operation items for a single unit of a SalesOrderItem
  const getDefaultOperationsForItem = (item: SalesOrderItem): CustomOperationItem[] => {
    const product = products.find(p => p.id === item.productId);
    const variant = item.variantId
      ? product?.variants.find(v => v.id === item.variantId)
      : product?.variants[0];

    if (!variant?.routingId) return [];
    const routing = routings.find(r => r.id === variant.routingId);
    if (!routing) return [];

    return routing.steps
      .sort((a, b) => a.sequence - b.sequence)
      .map(s => {
        const op = operations.find(o => o.id === s.operationId);
        return {
          operationId: s.operationId,
          costingMethod: op?.costingMethod || 'fixed',
          fixedLaborCost: op?.fixedLaborCost || 0,
          laborCostPerHour: op?.laborCostPerHour || 0,
          durationMinutes: op?.durationMinutes || 0,
        };
      });
  };

  // Helper to check if custom BOM matches default master BOM
  const checkIfMaterialIsCustomized = (item: SalesOrderItem, customBom: CustomBomItem[] | undefined): boolean => {
    const defaultBom = getDefaultBomForItem(item);
    const currentBom = customBom || [];
    if (currentBom.length !== defaultBom.length) return true;

    for (const defItem of defaultBom) {
      const match = currentBom.find(c => c.materialId === defItem.materialId);
      if (!match) return true;
      const curQty = typeof match.qty === 'string' ? parseFloat(match.qty as any) : match.qty;
      if (isNaN(curQty) || Math.abs(curQty - defItem.qty) > 0.0001) {
        return true;
      }
    }
    return false;
  };

  // Helper to check if custom operations match default master operations
  const checkIfRoutingIsCustomized = (item: SalesOrderItem, customOps: CustomOperationItem[] | undefined): boolean => {
    const defaultOps = getDefaultOperationsForItem(item);
    const currentOps = customOps || [];
    if (currentOps.length !== defaultOps.length) return true;

    for (let i = 0; i < currentOps.length; i++) {
      const cur = currentOps[i];
      const def = defaultOps[i];
      if (
        cur.operationId !== def.operationId ||
        cur.costingMethod !== def.costingMethod ||
        Math.abs((cur.fixedLaborCost || 0) - (def.fixedLaborCost || 0)) > 0.0001 ||
        Math.abs((cur.laborCostPerHour || 0) - (def.laborCostPerHour || 0)) > 0.0001
      ) {
        return true;
      }
    }
    return false;
  };

  // Helper to check if a unit is customized in either materials or routing
  const checkIfUnitIsCustomized = (
    item: SalesOrderItem,
    unit: { customBom?: CustomBomItem[]; customOperations?: CustomOperationItem[] }
  ): boolean => {
    return checkIfMaterialIsCustomized(item, unit.customBom) || checkIfRoutingIsCustomized(item, unit.customOperations);
  };

  // Helper to build the initial UnitCustomProcess[] for an item
  const getInitialUnitsForItem = (item: SalesOrderItem): UnitCustomProcess[] => {
    const defaultBom = getDefaultBomForItem(item);
    const defaultOps = getDefaultOperationsForItem(item);
    const units: UnitCustomProcess[] = [];

    for (let u = 1; u <= item.qty; u++) {
      const existing = item.unitCustomProcesses?.find(x => x.unitIndex === u);
      if (existing) {
        const ops: CustomOperationItem[] = existing.customOperations
          ? structuredClone(existing.customOperations)
          : (existing.customOperationIds || []).map(opId => {
              const op = operations.find(o => o.id === opId);
              return {
                operationId: opId,
                costingMethod: op?.costingMethod || 'fixed',
                fixedLaborCost: op?.fixedLaborCost || 0,
                laborCostPerHour: op?.laborCostPerHour || 0,
                durationMinutes: op?.durationMinutes || 0,
              };
            });

        const customBom = existing.customBom ? structuredClone(existing.customBom) : structuredClone(defaultBom);
        const customOperations = ops.length > 0 ? ops : structuredClone(defaultOps);
        const isCustom = checkIfUnitIsCustomized(item, { customBom, customOperations });

        units.push({
          unitIndex: u,
          isBomCustomized: isCustom,
          customBom,
          customOperationIds: customOperations.map(o => o.operationId),
          customOperations,
        });
      } else if (item.isBomCustomized) {
        const ops: CustomOperationItem[] = item.customOperations
          ? structuredClone(item.customOperations)
          : (item.customOperationIds || []).map(opId => {
              const op = operations.find(o => o.id === opId);
              return {
                operationId: opId,
                costingMethod: op?.costingMethod || 'fixed',
                fixedLaborCost: op?.fixedLaborCost || 0,
                laborCostPerHour: op?.laborCostPerHour || 0,
                durationMinutes: op?.durationMinutes || 0,
              };
            });

        const customBom = item.customBom ? structuredClone(item.customBom) : structuredClone(defaultBom);
        const customOperations = ops.length > 0 ? ops : structuredClone(defaultOps);
        const isCustom = checkIfUnitIsCustomized(item, { customBom, customOperations });

        units.push({
          unitIndex: u,
          isBomCustomized: isCustom,
          customBom,
          customOperationIds: customOperations.map(o => o.operationId),
          customOperations,
        });
      } else {
        units.push({
          unitIndex: u,
          isBomCustomized: false,
          customBom: structuredClone(defaultBom),
          customOperationIds: defaultOps.map(o => o.operationId),
          customOperations: structuredClone(defaultOps),
        });
      }
    }

    return units;
  };

  // Initialize or re-sync items when modal opens
  useEffect(() => {
    if (isOpen && order) {
      setActiveItemIndex(0);
      setActiveUnitIndex(1);
      setSelectedNewMaterialId('');
      setNewMaterialQty('');
      setSelectedOpToAdd('');

      const clonedItems = structuredClone(order.items).map(item => {
        const units = getInitialUnitsForItem(item);
        const hasCustom = units.some(u => u.isBomCustomized);

        return {
          ...item,
          isBomCustomized: hasCustom,
          unitCustomProcesses: units,
          customBom: units[0]?.customBom,
          customOperationIds: units[0]?.customOperationIds,
          customOperations: units[0]?.customOperations,
        };
      });

      setItemsState(clonedItems);
    }
  }, [isOpen, order]);

  const activeItem = itemsState[activeItemIndex];

  // Active unit currently being customized
  const activeUnit = useMemo(() => {
    if (!activeItem || !activeItem.unitCustomProcesses) return null;
    return (
      activeItem.unitCustomProcesses.find(u => u.unitIndex === activeUnitIndex) ||
      activeItem.unitCustomProcesses[0]
    );
  }, [activeItem, activeUnitIndex]);

  // Set of material IDs already present in the active unit (to prevent duplicate options)
  const existingMaterialIds = useMemo(() => {
    return new Set((activeUnit?.customBom || []).map(b => b.materialId));
  }, [activeUnit?.customBom]);

  // Set of operation IDs already present in the active unit (to prevent duplicate options)
  const existingOperationIds = useMemo(() => {
    return new Set((activeUnit?.customOperations || []).map(o => o.operationId));
  }, [activeUnit?.customOperations]);

  // Check if current active unit's material is customized compared to default master
  const isMaterialCustomized = useMemo(() => {
    if (!activeItem || !activeUnit) return false;
    return checkIfMaterialIsCustomized(activeItem, activeUnit.customBom);
  }, [activeItem, activeUnit]);

  // Check if current active unit's routing is customized compared to default master
  const isRoutingCustomized = useMemo(() => {
    if (!activeItem || !activeUnit) return false;
    return checkIfRoutingIsCustomized(activeItem, activeUnit.customOperations);
  }, [activeItem, activeUnit]);

  // Form validity check: disable save button if any qty or rate is unfilled / invalid
  const isFormValid = useMemo(() => {
    for (const itm of itemsState) {
      if (itm.unitCustomProcesses) {
        for (const u of itm.unitCustomProcesses) {
          // Check materials: must not be empty array and all items must have positive qty
          if (!u.customBom || u.customBom.length === 0) return false;
          for (const b of u.customBom) {
            const numQty = typeof b.qty === 'string' ? parseFloat(b.qty) : b.qty;
            if ((b.qty as any) === '' || isNaN(numQty) || numQty <= 0) return false;
          }
          // Check operations: all rates must be valid numbers (cannot be empty string or NaN)
          if (u.customOperations) {
            for (const op of u.customOperations) {
              const rate = op.costingMethod === 'hourly' ? op.laborCostPerHour : op.fixedLaborCost;
              if (rate === undefined || rate === null || (rate as any) === '' || isNaN(rate)) return false;
            }
          }
        }
      }
    }
    return true;
  }, [itemsState]);

  // Handlers for modifying active unit materials (allows empty string while editing)
  const handleUpdateMaterialQty = (matIndex: number, rawVal: string) => {
    if (!activeItem || !activeUnit) return;
    const updated = structuredClone(itemsState);
    const targetItem = updated[activeItemIndex];
    const targetUnit = targetItem.unitCustomProcesses?.find(u => u.unitIndex === activeUnitIndex);

    if (targetUnit && targetUnit.customBom && targetUnit.customBom[matIndex]) {
      if (rawVal === '') {
        (targetUnit.customBom[matIndex] as any).qty = '';
      } else {
        const parsed = parseFloat(rawVal);
        (targetUnit.customBom[matIndex] as any).qty = isNaN(parsed) ? '' : parsed;
      }
      targetUnit.isBomCustomized = checkIfUnitIsCustomized(targetItem, targetUnit);
      targetItem.isBomCustomized = targetItem.unitCustomProcesses!.some(u => u.isBomCustomized);
    }
    setItemsState(updated);
  };

  const handleRemoveMaterial = (matIndex: number) => {
    if (!activeItem || !activeUnit) return;
    const updated = structuredClone(itemsState);
    const targetItem = updated[activeItemIndex];
    const targetUnit = targetItem.unitCustomProcesses?.find(u => u.unitIndex === activeUnitIndex);

    if (targetUnit && targetUnit.customBom) {
      targetUnit.customBom.splice(matIndex, 1);
      targetUnit.isBomCustomized = checkIfUnitIsCustomized(targetItem, targetUnit);
      targetItem.isBomCustomized = targetItem.unitCustomProcesses!.some(u => u.isBomCustomized);
    }
    setItemsState(updated);
  };

  const handleAddMaterial = () => {
    if (!activeItem || !activeUnit || !selectedNewMaterialId || newMaterialQty === '' || newMaterialQty <= 0) return;

    const updated = structuredClone(itemsState);
    const targetItem = updated[activeItemIndex];
    const targetUnit = targetItem.unitCustomProcesses?.find(u => u.unitIndex === activeUnitIndex);
    if (!targetUnit) return;

    const isFinishedGood = finishedGoods.some(fg => fg.id === selectedNewMaterialId);
    const targetMat = materials.find(m => m.id === selectedNewMaterialId);
    const itemType = isFinishedGood ? 'FINISHED_GOOD' : (targetMat?.isSubAssembly ? 'SUB_ASSEMBLY' : 'RAW_MATERIAL');

    targetUnit.customBom = targetUnit.customBom || [];
    const existingIdx = targetUnit.customBom.findIndex(b => b.materialId === selectedNewMaterialId);
    if (existingIdx >= 0) {
      const curQty = typeof targetUnit.customBom[existingIdx].qty === 'string'
        ? (parseFloat(targetUnit.customBom[existingIdx].qty as any) || 0)
        : targetUnit.customBom[existingIdx].qty;
      targetUnit.customBom[existingIdx].qty = curQty + Number(newMaterialQty);
    } else {
      targetUnit.customBom.push({
        materialId: selectedNewMaterialId,
        qty: Number(newMaterialQty),
        itemType,
      });
    }

    targetUnit.isBomCustomized = checkIfUnitIsCustomized(targetItem, targetUnit);
    targetItem.isBomCustomized = targetItem.unitCustomProcesses!.some(u => u.isBomCustomized);
    setItemsState(updated);
    setSelectedNewMaterialId('');
    setNewMaterialQty('');
  };

  const handleResetMaterials = () => {
    if (!activeItem || !activeUnit) return;
    const updated = structuredClone(itemsState);
    const targetItem = updated[activeItemIndex];
    const targetUnit = targetItem.unitCustomProcesses?.find(u => u.unitIndex === activeUnitIndex);
    if (!targetUnit) return;

    targetUnit.customBom = getDefaultBomForItem(targetItem);
    targetUnit.isBomCustomized = checkIfUnitIsCustomized(targetItem, targetUnit);
    targetItem.isBomCustomized = targetItem.unitCustomProcesses!.some(u => u.isBomCustomized);
    setItemsState(updated);
    toast.success('Material Direset', 'Kebutuhan material dikembalikan ke standar master.');
  };

  // Handlers for modifying active unit operations
  const handleAddOperationFromMaster = () => {
    if (!activeItem || !activeUnit || !selectedOpToAdd) return;
    const op = operations.find(o => o.id === selectedOpToAdd);
    if (!op) return;

    const updated = structuredClone(itemsState);
    const targetItem = updated[activeItemIndex];
    const targetUnit = targetItem.unitCustomProcesses?.find(u => u.unitIndex === activeUnitIndex);
    if (!targetUnit) return;

    const newCustomOp: CustomOperationItem = {
      operationId: op.id,
      costingMethod: op.costingMethod || 'fixed',
      fixedLaborCost: op.fixedLaborCost || 0,
      laborCostPerHour: op.laborCostPerHour || 0,
      durationMinutes: op.durationMinutes || 0,
    };

    targetUnit.customOperations = [...(targetUnit.customOperations || []), newCustomOp];
    targetUnit.customOperationIds = targetUnit.customOperations.map(o => o.operationId);
    targetUnit.isBomCustomized = checkIfUnitIsCustomized(targetItem, targetUnit);
    targetItem.isBomCustomized = targetItem.unitCustomProcesses!.some(u => u.isBomCustomized);
    setItemsState(updated);
    setSelectedOpToAdd('');
  };

  const handleRemoveOperation = (opIndex: number) => {
    if (!activeItem || !activeUnit) return;
    const updated = structuredClone(itemsState);
    const targetItem = updated[activeItemIndex];
    const targetUnit = targetItem.unitCustomProcesses?.find(u => u.unitIndex === activeUnitIndex);

    if (targetUnit && targetUnit.customOperations) {
      targetUnit.customOperations.splice(opIndex, 1);
      targetUnit.customOperationIds = targetUnit.customOperations.map(o => o.operationId);
      targetUnit.isBomCustomized = checkIfUnitIsCustomized(targetItem, targetUnit);
      targetItem.isBomCustomized = targetItem.unitCustomProcesses!.some(u => u.isBomCustomized);
    }
    setItemsState(updated);
  };

  const handleUpdateOperationCosting = (
    opIndex: number,
    field: 'costingMethod' | 'rate',
    value: string | number
  ) => {
    if (!activeItem || !activeUnit) return;
    const updated = structuredClone(itemsState);
    const targetItem = updated[activeItemIndex];
    const targetUnit = targetItem.unitCustomProcesses?.find(u => u.unitIndex === activeUnitIndex);
    if (!targetUnit || !targetUnit.customOperations || !targetUnit.customOperations[opIndex]) return;

    const targetOp = targetUnit.customOperations[opIndex];
    if (field === 'costingMethod') {
      targetOp.costingMethod = value as 'fixed' | 'hourly';
    } else if (field === 'rate') {
      const numVal = Math.max(0, Number(value) || 0);
      if (targetOp.costingMethod === 'hourly') {
        targetOp.laborCostPerHour = numVal;
      } else {
        targetOp.fixedLaborCost = numVal;
      }
    }

    targetUnit.isBomCustomized = checkIfUnitIsCustomized(targetItem, targetUnit);
    targetItem.isBomCustomized = targetItem.unitCustomProcesses!.some(u => u.isBomCustomized);
    setItemsState(updated);
  };

  const handleResetOperations = () => {
    if (!activeItem || !activeUnit) return;
    const updated = structuredClone(itemsState);
    const targetItem = updated[activeItemIndex];
    const targetUnit = targetItem.unitCustomProcesses?.find(u => u.unitIndex === activeUnitIndex);
    if (!targetUnit) return;

    const defaultOps = getDefaultOperationsForItem(targetItem);
    targetUnit.customOperations = defaultOps;
    targetUnit.customOperationIds = defaultOps.map(o => o.operationId);
    targetUnit.isBomCustomized = checkIfUnitIsCustomized(targetItem, targetUnit);
    targetItem.isBomCustomized = targetItem.unitCustomProcesses!.some(u => u.isBomCustomized);
    setItemsState(updated);
    toast.success('Alur Produksi Direset', 'Alur operasi dikembalikan ke standar master.');
  };

  const handleCopyActiveUnitToAll = () => {
    if (!activeItem || !activeUnit) return;
    const updated = structuredClone(itemsState);
    const targetItem = updated[activeItemIndex];
    const sourceUnit = targetItem.unitCustomProcesses?.find(u => u.unitIndex === activeUnitIndex);
    if (!sourceUnit) return;

    targetItem.unitCustomProcesses = (targetItem.unitCustomProcesses || []).map(u => {
      const clonedUnit = {
        ...u,
        customBom: structuredClone(sourceUnit.customBom || []),
        customOperations: structuredClone(sourceUnit.customOperations || []),
        customOperationIds: structuredClone(sourceUnit.customOperationIds || []),
      };
      return {
        ...clonedUnit,
        isBomCustomized: checkIfUnitIsCustomized(targetItem, clonedUnit),
      };
    });
    targetItem.isBomCustomized = targetItem.unitCustomProcesses.some(u => u.isBomCustomized);
    setItemsState(updated);
    toast.success('Disalin ke Semua Unit', `Pengaturan Unit ${activeUnitIndex} diterapkan ke seluruh ${targetItem.qty} unit.`);
  };

  const handleSave = () => {
    if (!isFormValid) return;

    // Sanitize state: ensure all numbers are cleanly parsed & accurately recheck isBomCustomized
    const sanitizedItems = itemsState.map(itm => {
      const units = itm.unitCustomProcesses?.map(u => {
        const cleanBom = u.customBom?.map(b => ({
          ...b,
          qty: typeof b.qty === 'string' ? (parseFloat(b.qty) || 1) : b.qty,
        }));
        const unitToCheck = { ...u, customBom: cleanBom };
        const isCustom = checkIfUnitIsCustomized(itm, unitToCheck);
        return {
          ...unitToCheck,
          isBomCustomized: isCustom,
        };
      });
      const hasCustomUnits = units?.some(u => u.isBomCustomized) || false;
      return {
        ...itm,
        isBomCustomized: hasCustomUnits,
        unitCustomProcesses: units,
        customBom: hasCustomUnits ? units?.[0]?.customBom : undefined,
        customOperationIds: hasCustomUnits ? units?.[0]?.customOperationIds : undefined,
        customOperations: hasCustomUnits ? units?.[0]?.customOperations : undefined,
      };
    });

    const res = updateOrderCustomProcess(order.id, sanitizedItems);
    if (res.success) {
      const anyStillCustom = sanitizedItems.some(i => i.isBomCustomized);
      if (anyStillCustom) {
        toast.success('Kustom Proses Disimpan', `Kustomisasi proses untuk ${order.orderNumber} berhasil diperbarui.`);
      } else {
        toast.success('Proses Standar Diterapkan', `Kustomisasi ${order.orderNumber} telah direset penuh ke standar master.`);
      }
      onClose();
    }
  };

  if (!isOpen || !activeItem || !activeUnit) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Kustom Proses — ${order.orderNumber}`}
      description="Penyesuaian kebutuhan material dan alur produksi SPK"
      size="lg"
      sheetHeight="full"
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!isFormValid}>
            Simpan Perubahan
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-[13.5px] md:text-xs">
        {/* 1. SEGMEN ITEM PRODUK DI ATAS (CARD & FONT LEBIH LEGA) */}
        <div className="space-y-2.5">
          {itemsState.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {itemsState.map((itm, idx) => {
                const isActive = idx === activeItemIndex;
                const itmCustomUnits = itm.unitCustomProcesses?.filter(u => u.isBomCustomized).length || 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveItemIndex(idx);
                      setActiveUnitIndex(1);
                      setSelectedNewMaterialId('');
                      setNewMaterialQty('');
                      setSelectedOpToAdd('');
                    }}
                    className={cn(
                      "flex flex-col items-start px-4 py-2.5 rounded-xl text-left transition-colors border cursor-pointer shrink-0 min-w-[170px]",
                      isActive
                        ? "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 font-semibold shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-sm font-semibold truncate">{itm.productName}</span>
                      {itmCustomUnits > 0 && (
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs truncate font-normal mt-0.5",
                      isActive ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"
                    )}>
                      {itm.variantLabel ? formatVariantLabel(itm.variantLabel) : 'Standar'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* UNIT CONTROLS (JIKA UNIT > 1) */}
          {activeItem.qty > 1 && (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-xs md:text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0 mr-1">
                  Unit:
                </span>
                {activeItem.unitCustomProcesses?.map(u => {
                  const isCurrent = u.unitIndex === activeUnitIndex;
                  return (
                    <button
                      key={u.unitIndex}
                      type="button"
                      onClick={() => {
                        setActiveUnitIndex(u.unitIndex);
                        setSelectedNewMaterialId('');
                        setNewMaterialQty('');
                        setSelectedOpToAdd('');
                      }}
                      className={cn(
                        "px-3 py-1.5 md:px-2.5 md:py-1 rounded-lg md:rounded text-[13px] md:text-xs transition-colors cursor-pointer border shrink-0",
                        isCurrent
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 font-medium"
                          : "bg-transparent text-slate-600 border-transparent hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      )}
                    >
                      Unit {u.unitIndex}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyActiveUnitToAll}
                className="shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
                Salin ke Semua
              </Button>
            </div>
          )}
        </div>

        {/* 2. ACCORDION 1: KEBUTUHAN MATERIAL */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          {/* ACCORDION HEADER (CHEVRON DI SEBELAH KANAN UJUNG KONTAINER) */}
          <div
            onClick={() => setIsMaterialOpen(prev => !prev)}
            className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Kebutuhan Material</span>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {(activeUnit.customBom || []).length} item
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {isMaterialCustomized && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleResetMaterials();
                  }}
                  className="text-xs h-7 px-2.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 gap-1.5"
                  title="Reset material ke master"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
              {isMaterialOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
              )}
            </div>
          </div>

          {isMaterialOpen && (
            <div className="p-3 space-y-2">
              {/* LIST CARD MATERIAL */}
              <div className="space-y-1.5">
                {(activeUnit.customBom || []).map((bomItem, bIdx) => {
                  const mat = materials.find(m => m.id === bomItem.materialId);
                  const fg = !mat ? finishedGoods.find(f => f.id === bomItem.materialId) : null;
                  const unitLabel = mat?.unit || fg?.unit || 'unit';

                  return (
                    <div
                      key={bomItem.materialId || bIdx}
                      className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[13.5px] md:text-xs text-slate-900 dark:text-white truncate">
                          {mat?.name || (fg ? fg.productName : bomItem.materialId)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* TIPE MATERIAL (WIDTH MENYESUAIKAN LABEL & RATA KANAN) */}
                        {fg ? (
                          <Badge variant="purple" className="shrink-0">
                            Barang Jadi
                          </Badge>
                        ) : mat?.isSubAssembly ? (
                          <Badge variant="purple" className="shrink-0">
                            Setengah Jadi
                          </Badge>
                        ) : (
                          <Badge variant="default" className="shrink-0">
                            Bahan Baku
                          </Badge>
                        )}

                        {/* KOLOM INPUT QTY */}
                        <Input
                          type="number"
                          min={0.001}
                          step="any"
                          placeholder="0"
                          value={bomItem.qty === ('' as any) ? '' : bomItem.qty}
                          onChange={e => handleUpdateMaterialQty(bIdx, e.target.value)}
                          inputSize="sm"
                          containerClassName="w-16 shrink-0"
                          className="text-center font-mono font-medium"
                        />

                        {/* KOLOM SATUAN */}
                        <div className="w-14 shrink-0 text-left">
                          <span className="text-xs text-slate-500 dark:text-slate-400 select-none truncate block">
                            {unitLabel}
                          </span>
                        </div>

                        {/* KOLOM TOMBOL HAPUS */}
                        <div className="w-7 shrink-0 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(bIdx)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(!activeUnit.customBom || activeUnit.customBom.length === 0) && (
                  <div className="py-5 text-center text-slate-400 text-xs">
                    Belum ada kebutuhan material pada unit ini.
                  </div>
                )}
              </div>

              {/* INPUT BAR TAMBAH MATERIAL (QTY INPUT SEJAJAR PERSIS DENGAN LIST ITEM) */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className="flex-1 min-w-0">
                  <Select
                    value={selectedNewMaterialId}
                    onChange={e => setSelectedNewMaterialId(e.target.value)}
                    inputSize="sm"
                    searchable
                    searchPlaceholder="Cari material..."
                  >
                    <option value="">-- Tambah material --</option>
                    {materials
                      .filter(m => !existingMaterialIds.has(m.id))
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.isSubAssembly ? '[Bahan Setengah Jadi] ' : '[Bahan Baku] '}
                          {m.name}
                        </option>
                      ))}
                    {finishedGoods
                      .filter(fg => (fg.stock || 0) > 0 && !existingMaterialIds.has(fg.id))
                      .map(fg => (
                        <option key={fg.id} value={fg.id}>
                          [Barang Jadi] {fg.productName} {fg.variantLabel ? `(${fg.variantLabel})` : ''}
                        </option>
                      ))}
                  </Select>
                </div>
                <Input
                  type="number"
                  min={0.001}
                  step="any"
                  placeholder="0"
                  value={newMaterialQty}
                  onChange={e => setNewMaterialQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  inputSize="sm"
                  containerClassName="w-16 shrink-0"
                  className="text-center font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddMaterial}
                  disabled={!selectedNewMaterialId || newMaterialQty === '' || newMaterialQty <= 0}
                  className="shrink-0 justify-center"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 3. ACCORDION 2: ALUR PRODUKSI */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          {/* ACCORDION HEADER (CHEVRON DI SEBELAH KANAN UJUNG KONTAINER) */}
          <div
            onClick={() => setIsRoutingOpen(prev => !prev)}
            className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Alur Produksi</span>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {(activeUnit.customOperations || []).length} tahap
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {isRoutingCustomized && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleResetOperations();
                  }}
                  className="text-xs h-7 px-2.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 gap-1.5"
                  title="Reset alur produksi ke master"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
              {isRoutingOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
              )}
            </div>
          </div>

          {isRoutingOpen && (
            <div className="p-3 space-y-2">
              {/* LIST CARD ALUR OPERASI (COMPACT & RAMPING) */}
              <div className="space-y-1.5">
                {(activeUnit.customOperations || []).map((cOp, idx) => {
                  const op = operations.find(o => o.id === cOp.operationId);
                  const isHourly = cOp.costingMethod === 'hourly';
                  const currentRate = isHourly ? (cOp.laborCostPerHour ?? 0) : (cOp.fixedLaborCost ?? 0);

                  return (
                    <div
                      key={`${cOp.operationId}-${idx}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-xs md:text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-[13.5px] md:text-xs text-slate-900 dark:text-white truncate">
                            {op?.name || 'Operasi'}
                          </div>
                          {op?.durationMinutes ? (
                            <div className="text-xs md:text-[10px] text-slate-400 font-mono">
                              {op.durationMinutes} menit
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-[136px] shrink-0">
                          <Select
                            value={cOp.costingMethod || 'fixed'}
                            onChange={e => handleUpdateOperationCosting(idx, 'costingMethod', e.target.value)}
                            inputSize="sm"
                          >
                            <option value="fixed">Borongan</option>
                            <option value="hourly">Durasi per jam</option>
                          </Select>
                        </div>

                        <CurrencyInput
                          value={currentRate}
                          onChange={val => handleUpdateOperationCosting(idx, 'rate', val === '' ? 0 : val)}
                          inputSize="sm"
                          containerClassName="w-28 md:w-24 shrink-0"
                          className="font-mono text-right"
                        />

                        <div className="w-7 shrink-0 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveOperation(idx)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(!activeUnit.customOperations || activeUnit.customOperations.length === 0) && (
                  <div className="py-5 text-center text-slate-400 text-xs">
                    Belum ada alur operasi pada unit ini.
                  </div>
                )}
              </div>

              {/* INPUT BAR TAMBAH ALUR OPERASI */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 min-w-0">
                  <Select
                    value={selectedOpToAdd}
                    onChange={e => setSelectedOpToAdd(e.target.value)}
                    inputSize="sm"
                  >
                    <option value="">-- Tambah alur produksi --</option>
                    {operations
                      .filter(op => !existingOperationIds.has(op.id))
                      .map(op => (
                        <option key={op.id} value={op.id}>
                          {op.name}
                        </option>
                      ))}
                  </Select>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddOperationFromMaster}
                  disabled={!selectedOpToAdd}
                  className="shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
