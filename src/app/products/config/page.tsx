'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/lib/utils';
import { canManageInventory, canSeeCosts } from '@/lib/roles';
import type { BOMItem, ProductModifierGroup, ProductModifierOption } from '@/lib/types';
import {
  ArrowLeft,
  FileSpreadsheet,
  Tag,
  Grip,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  X,
  Copy,
} from 'lucide-react';

interface ConfigSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconWrapperClass: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function ConfigSection({
  title,
  description,
  icon: Icon,
  iconWrapperClass,
  children,
  defaultExpanded = false,
}: ConfigSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all">
      <div
        className="flex items-center gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconWrapperClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-slate-400">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}

function ModifierGroupEditor({
  groups,
  materials,
  onChange,
  isSingleGroupEdit = false,
}: {
  groups: ProductModifierGroup[];
  materials: { id: string; name: string; unit: string; unitCost: number }[];
  onChange: (groups: ProductModifierGroup[]) => void;
  isSingleGroupEdit?: boolean;
}) {
  const [newBOMMatId, setNewBOMMatId] = useState<Record<string, string>>({});
  const [newBOMQty, setNewBOMQty] = useState<Record<string, string>>({});
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);

  const addGroup = () => {
    const newGroup: ProductModifierGroup = {
      id: `pmg-${Math.random().toString(36).slice(2, 8)}`,
      name: '',
      selectType: 'MULTI',
      options: [],
    };
    onChange([...groups, newGroup]);
  };

  const updateGroup = (groupId: string, partial: Partial<ProductModifierGroup>) => {
    onChange(groups.map(g => g.id === groupId ? { ...g, ...partial } : g));
  };

  const removeGroup = (groupId: string) => {
    onChange(groups.filter(g => g.id !== groupId));
  };

  const addOption = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const newOption: ProductModifierOption = {
      id: `pmo-${Math.random().toString(36).slice(2, 8)}`,
      name: '',
      additionalPrice: 0,
      bom: [],
    };
    updateGroup(groupId, { options: [...group.options, newOption] });
  };

  const updateOption = (groupId: string, optionId: string, partial: Partial<ProductModifierOption>) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    updateGroup(groupId, {
      options: group.options.map(o => o.id === optionId ? { ...o, ...partial } : o),
    });
  };

  const removeOption = (groupId: string, optionId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    updateGroup(groupId, {
      options: group.options.filter(o => o.id !== optionId),
    });
  };

  const addBOMItem = (groupId: string, optionId: string) => {
    const key = `${groupId}-${optionId}`;
    const matId = newBOMMatId[key] || '';
    const qty = parseFloat(newBOMQty[key] || '0');
    if (!matId || qty <= 0) return;

    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const option = group.options.find(o => o.id === optionId);
    if (!option) return;
    if (option.bom.some(b => b.materialId === matId)) return;

    updateOption(groupId, optionId, {
      bom: [...option.bom, { materialId: matId, qty }],
    });
    setNewBOMMatId(prev => ({ ...prev, [key]: '' }));
    setNewBOMQty(prev => ({ ...prev, [key]: '' }));
  };

  const removeBOMItem = (groupId: string, optionId: string, matId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const option = group.options.find(o => o.id === optionId);
    if (!option) return;
    updateOption(groupId, optionId, {
      bom: option.bom.filter(b => b.materialId !== matId),
    });
  };

  const calcBOMCost = (bom: BOMItem[]) =>
    bom.reduce((sum, b) => {
      const mat = materials.find(m => m.id === b.materialId);
      return sum + (mat ? mat.unitCost * b.qty : 0);
    }, 0);

  return (
    <div className="space-y-4">
      {groups.map(g => {
        const containerClass = isSingleGroupEdit
          ? "space-y-6"
          : "rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-6 bg-slate-50/30 dark:bg-slate-900/10";
        return (
          <div key={g.id} className={containerClass}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nama Grup Modifier</label>
                <input
                  type="text"
                  value={g.name}
                  onChange={e => updateGroup(g.id, { name: e.target.value })}
                  placeholder="Misal: Add-on Ranjang"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Aturan Pilihan User</label>
                  <select
                    value={g.selectType}
                    onChange={e => updateGroup(g.id, { selectType: e.target.value as 'SINGLE' | 'MULTI' })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="MULTI">Pilihan Berganda (Checkbox / Multi-select)</option>
                    <option value="SINGLE">Pilihan Tunggal (Radio / Single-select)</option>
                  </select>
                </div>
                {!isSingleGroupEdit && (
                  <Button variant="outline" onClick={() => removeGroup(g.id)} className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Daftar Pilihan Opsi & BOM Tambahan</p>
                <Button variant="outline" size="sm" onClick={() => addOption(g.id)}>
                  <Plus className="h-3.5 w-3.5" /> Tambah Opsi
                </Button>
              </div>

              {g.options.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada opsi ditambahkan ke grup ini.</p>
              ) : (
                <div className="space-y-3">
                  {g.options.map(opt => {
                    const key = `${g.id}-${opt.id}`;
                    const bomCost = calcBOMCost(opt.bom);
                    const isBOMExpanded = expandedOptionId === opt.id;

                    return (
                      <div key={opt.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                          <div className="md:col-span-1">
                            <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Nama Opsi / Fitur</label>
                            <input
                              type="text"
                              value={opt.name}
                              onChange={e => updateOption(g.id, opt.id, { name: e.target.value })}
                              placeholder="Misal: Sorong Bawah"
                              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Harga Penambah (Rp)</label>
                            <CurrencyInput
                              value={opt.additionalPrice}
                              onChange={val => updateOption(g.id, opt.id, { additionalPrice: typeof val === 'number' ? val : 0 })}
                              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                          <div className="flex items-center justify-between md:justify-end gap-2 pt-3 md:pt-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedOptionId(isBOMExpanded ? null : opt.id)}
                              className="text-xs"
                            >
                              BOM ({opt.bom.length}) {isBOMExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                            </Button>
                            <button
                              onClick={() => removeOption(g.id, opt.id)}
                              className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {isBOMExpanded && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-md">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Bahan Baku Penyusun Opsi Ini (BOM Add-on):</p>
                              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Est. HPP BOM: {formatCurrency(bomCost)}</span>
                            </div>

                            <div className="flex gap-2">
                              <select
                                value={newBOMMatId[key] || ''}
                                onChange={e => setNewBOMMatId(prev => ({ ...prev, [key]: e.target.value }))}
                                className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="">-- Pilih Bahan Baku --</option>
                                {materials.map(m => (
                                  <option key={m.id} value={m.id}>{m.name} ({m.unit}) — {formatCurrency(m.unitCost)}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={newBOMQty[key] || ''}
                                onChange={e => setNewBOMQty(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="Qty"
                                className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-right focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                              <Button size="sm" onClick={() => addBOMItem(g.id, opt.id)}>+ Tambah</Button>
                            </div>

                            {opt.bom.length > 0 ? (
                              <div className="space-y-1">
                                {opt.bom.map(b => {
                                  const mat = materials.find(m => m.id === b.materialId);
                                  return (
                                    <div key={b.materialId} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                                      <span className="font-medium text-slate-800 dark:text-slate-200">{mat?.name || b.materialId}</span>
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono">{b.qty} {mat?.unit}</span>
                                        <span className="font-mono text-slate-500">{formatCurrency((mat?.unitCost || 0) * b.qty)}</span>
                                        <button onClick={() => removeBOMItem(g.id, opt.id, b.materialId)} className="text-red-500 hover:text-red-700">
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">Belum ada bahan baku dikaitkan dengan opsi ini.</p>
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
        );
      })}
    </div>
  );
}

function ProductsConfigContent() {
  const { toast, confirm } = useToast();
  const {
    currentUser,
    bomTemplates = [],
    bomTemplateItems = [],
    attributes = [],
    masterModifierGroups = [],
    materials = [],
    addBomTemplate,
    updateBomTemplate,
    deleteBomTemplate,
    addAttribute,
    updateAttribute,
    deleteAttribute,
    addModifierGroup,
    updateModifierGroup,
    deleteModifierGroup,
  } = useApp();

  const canManage = canManageInventory(currentUser.role);
  const seeCosts = canSeeCosts(currentUser.role);

  // Search terms per section
  const [bomSearch, setBomSearch] = useState('');
  const [attrSearch, setAttrSearch] = useState('');
  const [modSearch, setModSearch] = useState('');

  // Preset BOM Modal State
  const [showBomTemplateModal, setShowBomTemplateModal] = useState(false);
  const [editBomTemplateId, setEditBomTemplateId] = useState<string | null>(null);
  const [formBomName, setFormBomName] = useState('');
  const [formBomDesc, setFormBomDesc] = useState('');
  const [formBomItems, setFormBomItems] = useState<{ materialId: string; defaultQty: number }[]>([]);
  const [bomTemplateModalError, setBomTemplateModalError] = useState('');
  const [sourcePresetId, setSourcePresetId] = useState('');
  const [showCopyPresetSection, setShowCopyPresetSection] = useState(false);
  const [newBomMatId, setNewBomMatId] = useState('');
  const [newBomQty, setNewBomQty] = useState('');
  const [expandedBomTemplateId, setExpandedBomTemplateId] = useState<string | null>(null);

  // Master Attribute Modal State
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [editAttributeId, setEditAttributeId] = useState<string | null>(null);
  const [formAttrName, setFormAttrName] = useState('');
  const [formAttrValues, setFormAttrValues] = useState('');
  const [attributeModalError, setAttributeModalError] = useState('');

  // Modifier Group Modal State
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [editModifierGroupId, setEditModifierGroupId] = useState<string | null>(null);
  const [formModName, setFormModName] = useState('');
  const [formModSelectType, setFormModSelectType] = useState<'SINGLE' | 'MULTI'>('MULTI');
  const [formModOptions, setFormModOptions] = useState<ProductModifierOption[]>([]);
  const [modifierModalError, setModifierModalError] = useState('');
  const [expandedModifierGroupId, setExpandedModifierGroupId] = useState<string | null>(null);

  // Filtered lists
  const filteredBomTemplates = bomTemplates.filter(t =>
    !bomSearch || t.name.toLowerCase().includes(bomSearch.toLowerCase()) || (t.description || '').toLowerCase().includes(bomSearch.toLowerCase())
  );

  const filteredAttributes = attributes.filter(a =>
    !attrSearch || a.name.toLowerCase().includes(attrSearch.toLowerCase()) || a.values.some(v => v.toLowerCase().includes(attrSearch.toLowerCase()))
  );

  const filteredModifiers = masterModifierGroups.filter(g =>
    !modSearch || g.name.toLowerCase().includes(modSearch.toLowerCase())
  );

  // --- Handlers for Preset BOM ---
  const openAddBomTemplate = () => {
    setEditBomTemplateId(null);
    setFormBomName('');
    setFormBomDesc('');
    setFormBomItems([]);
    setNewBomMatId('');
    setNewBomQty('');
    setSourcePresetId('');
    setShowCopyPresetSection(false);
    setBomTemplateModalError('');
    setShowBomTemplateModal(true);
  };

  const openEditBomTemplate = (tpl: { id: string; name: string; description?: string }) => {
    setEditBomTemplateId(tpl.id);
    setFormBomName(tpl.name);
    setFormBomDesc(tpl.description || '');
    const items = bomTemplateItems
      .filter(item => item.templateId === tpl.id)
      .map(item => ({ materialId: item.materialId, defaultQty: item.defaultQty }));
    setFormBomItems(items);
    setNewBomMatId('');
    setNewBomQty('');
    setSourcePresetId('');
    setShowCopyPresetSection(false);
    setBomTemplateModalError('');
    setShowBomTemplateModal(true);
  };

  const handleCopyFromExistingPreset = () => {
    if (!sourcePresetId) return;
    const sourceItems = bomTemplateItems
      .filter(item => item.templateId === sourcePresetId)
      .map(item => ({ materialId: item.materialId, defaultQty: item.defaultQty }));

    if (sourceItems.length === 0) {
      setBomTemplateModalError('Preset yang dipilih tidak memiliki komponen material.');
      return;
    }

    setFormBomItems(sourceItems);
    setBomTemplateModalError('');
    setShowCopyPresetSection(false);
  };

  const handleSaveBomTemplate = () => {
    if (!formBomName.trim()) {
      setBomTemplateModalError('Nama preset BOM wajib diisi.');
      return;
    }
    if (formBomItems.length === 0) {
      setBomTemplateModalError('Preset BOM harus memiliki minimal 1 komponen material.');
      return;
    }

    setBomTemplateModalError('');
    if (editBomTemplateId) {
      updateBomTemplate(
        editBomTemplateId,
        { name: formBomName.trim(), description: formBomDesc.trim() },
        formBomItems
      );
      toast.success('Preset BOM Diperbarui', `Preset BOM "${formBomName.trim()}" berhasil disimpan.`);
    } else {
      addBomTemplate(
        { name: formBomName.trim(), description: formBomDesc.trim() },
        formBomItems
      );
      toast.success('Preset BOM Ditambahkan', `Preset BOM "${formBomName.trim()}" berhasil ditambahkan.`);
    }
    setShowBomTemplateModal(false);
  };

  const handleDeleteBomTemplate = async (tpl: { id: string; name: string }) => {
    const isOk = await confirm({
      title: 'Hapus Preset BOM',
      message: `Apakah Anda yakin ingin menghapus preset BOM "${tpl.name}"?`,
      confirmText: 'Hapus Preset',
      variant: 'danger',
    });
    if (isOk) {
      deleteBomTemplate(tpl.id);
      toast.success('Preset BOM Dihapus', `Preset BOM "${tpl.name}" berhasil dihapus.`);
    }
  };

  const addBomItemToForm = () => {
    if (!newBomMatId) return;
    const qty = parseFloat(newBomQty);
    if (isNaN(qty) || qty <= 0) return;

    if (formBomItems.some(i => i.materialId === newBomMatId)) {
      setFormBomItems(formBomItems.map(i => i.materialId === newBomMatId ? { ...i, defaultQty: qty } : i));
    } else {
      setFormBomItems([...formBomItems, { materialId: newBomMatId, defaultQty: qty }]);
    }
    setNewBomMatId('');
    setNewBomQty('');
  };

  const removeBomItemFromForm = (matId: string) => {
    setFormBomItems(formBomItems.filter(i => i.materialId !== matId));
  };

  // --- Handlers for Master Attribute ---
  const openAddAttribute = () => {
    setEditAttributeId(null);
    setFormAttrName('');
    setFormAttrValues('');
    setAttributeModalError('');
    setShowAttributeModal(true);
  };

  const openEditAttribute = (attr: { id: string; name: string; values: string[] }) => {
    setEditAttributeId(attr.id);
    setFormAttrName(attr.name);
    setFormAttrValues(attr.values.join(', '));
    setAttributeModalError('');
    setShowAttributeModal(true);
  };

  const handleSaveAttribute = () => {
    if (!formAttrName.trim()) {
      setAttributeModalError('Nama atribut wajib diisi.');
      return;
    }
    const valArray = formAttrValues
      .split(',')
      .map(v => v.trim())
      .filter(v => v);

    if (editAttributeId) {
      updateAttribute(editAttributeId, {
        name: formAttrName.trim(),
        values: valArray,
      });
      toast.success('Atribut Diperbarui', `Atribut "${formAttrName.trim()}" berhasil diperbarui.`);
    } else {
      addAttribute({
        name: formAttrName.trim(),
        values: valArray,
      });
      toast.success('Atribut Ditambahkan', `Atribut "${formAttrName.trim()}" berhasil ditambahkan.`);
    }
    setShowAttributeModal(false);
  };

  const handleDeleteAttribute = async (attrId: string, attrName: string) => {
    const isOk = await confirm({
      title: 'Hapus Master Atribut',
      message: `Apakah Anda yakin ingin menghapus atribut "${attrName}"?`,
      confirmText: 'Hapus Atribut',
      variant: 'danger',
    });
    if (isOk) {
      if (!deleteAttribute(attrId)) {
        toast.error('Gagal Menghapus', 'Atribut ini masih digunakan oleh salah satu produk.');
      } else {
        toast.success('Atribut Dihapus', `Master atribut "${attrName}" berhasil dihapus.`);
      }
    }
  };

  // --- Handlers for Modifier Group ---
  const openAddModifier = () => {
    setEditModifierGroupId(null);
    setFormModName('');
    setFormModSelectType('MULTI');
    setFormModOptions([]);
    setModifierModalError('');
    setShowModifierModal(true);
  };

  const openEditModifier = (group: ProductModifierGroup) => {
    setEditModifierGroupId(group.id);
    setFormModName(group.name);
    setFormModSelectType(group.selectType);
    setFormModOptions(structuredClone(group.options));
    setModifierModalError('');
    setShowModifierModal(true);
  };

  const handleSaveModifier = () => {
    if (!formModName.trim()) {
      setModifierModalError('Nama grup modifier wajib diisi.');
      return;
    }
    if (formModOptions.length === 0) {
      setModifierModalError('Grup modifier harus memiliki minimal 1 opsi add-on.');
      return;
    }
    for (const opt of formModOptions) {
      if (!opt.name.trim()) {
        setModifierModalError('Semua opsi add-on wajib diisi nama.');
        return;
      }
      if (opt.additionalPrice === undefined || opt.additionalPrice === null || opt.additionalPrice <= 0) {
        setModifierModalError(`Opsi "${opt.name || 'Baru'}" wajib memiliki harga penambah > 0.`);
        return;
      }
      if (opt.bom.length === 0) {
        setModifierModalError(`Opsi "${opt.name || 'Baru'}" wajib memiliki minimal 1 bahan baku tambahan (BOM).`);
        return;
      }
    }

    setModifierModalError('');
    if (editModifierGroupId) {
      updateModifierGroup(editModifierGroupId, {
        name: formModName.trim(),
        selectType: formModSelectType,
        options: formModOptions,
      });
      toast.success('Modifier Diperbarui', `Grup modifier "${formModName.trim()}" berhasil diperbarui.`);
    } else {
      addModifierGroup({
        name: formModName.trim(),
        selectType: formModSelectType,
        options: formModOptions,
      });
      toast.success('Modifier Ditambahkan', `Grup modifier "${formModName.trim()}" berhasil ditambahkan.`);
    }
    setShowModifierModal(false);
  };

  const handleDeleteModifier = async (group: ProductModifierGroup) => {
    const isOk = await confirm({
      title: 'Hapus Grup Modifier Master',
      message: `Apakah Anda yakin ingin menghapus grup modifier "${group.name}"?`,
      confirmText: 'Hapus Modifier',
      variant: 'danger',
    });
    if (isOk) {
      if (!deleteModifierGroup(group.id)) {
        toast.error('Gagal Menghapus', 'Grup modifier ini masih digunakan oleh salah satu produk.');
      } else {
        toast.success('Modifier Dihapus', `Grup modifier "${group.name}" berhasil dihapus.`);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Konfigurasi Katalog Produk"
        backHref="/products"
      >
        <Link href="/products">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
          </Button>
        </Link>
      </PageHeader>

      <div className="space-y-4">
        {/* SECTION 1: MASTER PRESET BOM */}
        <ConfigSection
          title="Master Preset BOM"
          description="Kelola resep material standar yang dapat di-clone ke varian produk saat pembuatan katalog."
          icon={FileSpreadsheet}
          iconWrapperClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
          defaultExpanded={true}
        >
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari preset BOM..."
                  value={bomSearch}
                  onChange={e => setBomSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
              {canManage && (
                <Button onClick={openAddBomTemplate} size="sm">
                  <Plus className="h-4 w-4" /> Tambah Preset BOM
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3">Nama Preset BOM</th>
                    <th className="px-4 py-3">Deskripsi</th>
                    <th className="px-4 py-3 text-center">Komponen Material</th>
                    <th className="px-4 py-3 text-right">Est. Total HPP</th>
                    {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBomTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 5 : 4} className="py-10 text-center text-slate-400 dark:text-slate-500">
                        {bomSearch ? 'Tidak ada preset BOM yang cocok dengan pencarian.' : 'Belum ada preset BOM terdaftar.'}
                      </td>
                    </tr>
                  ) : (
                    filteredBomTemplates.map(tpl => {
                      const items = bomTemplateItems.filter(item => item.templateId === tpl.id);
                      const totalCost = items.reduce((sum, item) => {
                        const mat = materials.find(m => m.id === item.materialId);
                        return sum + (mat ? mat.unitCost * item.defaultQty : 0);
                      }, 0);
                      const isExpanded = expandedBomTemplateId === tpl.id;

                      return (
                        <React.Fragment key={tpl.id}>
                          <tr
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                            onClick={() => setExpandedBomTemplateId(isExpanded ? null : tpl.id)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 dark:text-white">{tpl.name}</span>
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                              {tpl.description || '-'}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">{items.length} Material</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {seeCosts ? formatCurrency(totalCost) : '-'}
                            </td>
                            {canManage && (
                              <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditBomTemplate(tpl)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                    title="Edit Preset"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBomTemplate(tpl)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                    title="Hapus Preset"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={canManage ? 5 : 4} className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="space-y-2 max-w-3xl">
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Rincian Komponen Material Preset:</p>
                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left font-semibold text-slate-500">
                                          <th className="px-3 py-2">Material</th>
                                          <th className="px-3 py-2 text-right">Kuantitas</th>
                                          <th className="px-3 py-2 text-center">Satuan</th>
                                          {seeCosts && <th className="px-3 py-2 text-right">Est. Biaya</th>}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {items.length === 0 ? (
                                          <tr><td colSpan={4} className="px-3 py-3 text-center text-slate-400 italic">Tidak ada komponen material.</td></tr>
                                        ) : (
                                          items.map(item => {
                                            const mat = materials.find(m => m.id === item.materialId);
                                            return (
                                              <tr key={item.materialId}>
                                                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{mat?.name || item.materialId}</td>
                                                <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900 dark:text-white">{item.defaultQty}</td>
                                                <td className="px-3 py-2 text-center">
                                                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                                    {mat?.unit || '-'}
                                                  </span>
                                                </td>
                                                {seeCosts && (
                                                  <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                                    {formatCurrency((mat?.unitCost || 0) * item.defaultQty)}
                                                  </td>
                                                )}
                                              </tr>
                                            );
                                          })
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ConfigSection>

        {/* SECTION 2: MASTER ATRIBUT VARIAN */}
        <ConfigSection
          title="Master Atribut Varian"
          description="Kelola atribut master seperti Ukuran, Warna, Finishing, dan Material yang digunakan pada produk."
          icon={Tag}
          iconWrapperClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          defaultExpanded={true}
        >
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari atribut master..."
                  value={attrSearch}
                  onChange={e => setAttrSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
              {canManage && (
                <Button onClick={openAddAttribute} size="sm">
                  <Plus className="h-4 w-4" /> Tambah Atribut
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAttributes.length === 0 ? (
                <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  {attrSearch ? 'Tidak ada atribut yang cocok dengan pencarian.' : 'Belum ada master atribut terdaftar.'}
                </div>
              ) : (
                filteredAttributes.map(attr => (
                  <div key={attr.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{attr.name}</h4>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditAttribute(attr)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Edit Atribut"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAttribute(attr.id, attr.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Hapus Atribut"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {attr.values.map((val, idx) => (
                        <span key={idx} className="inline-block px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ConfigSection>

        {/* SECTION 3: MODIFIER ADD-ON MASTER */}
        <ConfigSection
          title="Grup Modifier Add-On"
          description="Kelola add-on opsional untuk produk (seperti Ekstra Bantal, Engsel Premium, dll) beserta harga dan BOM tambahan."
          icon={Grip}
          iconWrapperClass="bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
          defaultExpanded={false}
        >
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari grup modifier..."
                  value={modSearch}
                  onChange={e => setModSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
              {canManage && (
                <Button onClick={openAddModifier} size="sm">
                  <Plus className="h-4 w-4" /> Tambah Modifier
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3">Nama Modifier</th>
                    <th className="px-4 py-3">Tipe Seleksi</th>
                    <th className="px-4 py-3 text-center">Jumlah Opsi</th>
                    {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredModifiers.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 4 : 3} className="py-10 text-center text-slate-400 dark:text-slate-500">
                        {modSearch ? 'Tidak ada modifier yang cocok dengan pencarian.' : 'Belum ada grup modifier terdaftar.'}
                      </td>
                    </tr>
                  ) : (
                    filteredModifiers.map(group => {
                      const isExpanded = expandedModifierGroupId === group.id;
                      return (
                        <React.Fragment key={group.id}>
                          <tr
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                            onClick={() => setExpandedModifierGroupId(isExpanded ? null : group.id)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 dark:text-white">{group.name}</span>
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={group.selectType === 'MULTI' ? 'info' : 'default'}>
                                {group.selectType === 'MULTI' ? 'Multi-select (Checklist)' : 'Single-select (Pilih Satu)'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">{group.options.length} Opsi</td>
                            {canManage && (
                              <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditModifier(group)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                    title="Edit Modifier"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteModifier(group)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                    title="Hapus Modifier"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={canManage ? 4 : 3} className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="space-y-3">
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Daftar Pilihan Opsi & HPP Material:</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {group.options.map(opt => {
                                      const bomCost = opt.bom.reduce((sum, b) => {
                                        const mat = materials.find(m => m.id === b.materialId);
                                        return sum + (mat ? mat.unitCost * b.qty : 0);
                                      }, 0);
                                      return (
                                        <div key={opt.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
                                          <div className="flex justify-between font-semibold">
                                            <span className="text-slate-900 dark:text-white">{opt.name}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(opt.additionalPrice)}</span>
                                          </div>
                                          {opt.bom.length > 0 ? (
                                            <div className="text-xs space-y-1 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Bahan Baku (BOM):</p>
                                              {opt.bom.map(b => {
                                                const mat = materials.find(m => m.id === b.materialId);
                                                return (
                                                  <div key={b.materialId} className="flex justify-between text-slate-600 dark:text-slate-400">
                                                    <span>{mat?.name || b.materialId} ({b.qty} {mat?.unit})</span>
                                                    {seeCosts && <span>{formatCurrency((mat?.unitCost || 0) * b.qty)}</span>}
                                                  </div>
                                                );
                                              })}
                                              {seeCosts && (
                                                <div className="flex justify-between font-semibold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                                  <span>Est. HPP Material:</span>
                                                  <span>{formatCurrency(bomCost)}</span>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-slate-400 italic">Tidak membutuhkan bahan baku tambahan.</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ConfigSection>
      </div>

      {/* MODAL 1: CRUD PRESET BOM TEMPLATE */}
      <Modal
        isOpen={showBomTemplateModal}
        onClose={() => setShowBomTemplateModal(false)}
        title={editBomTemplateId ? 'Edit Master Preset BOM' : 'Tambah Master Preset BOM'}
        size="lg"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowBomTemplateModal(false)}>Batal</Button>
            <Button onClick={handleSaveBomTemplate}>
              {editBomTemplateId ? 'Simpan Perubahan' : 'Tambah Preset BOM'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {bomTemplateModalError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {bomTemplateModalError}
            </div>
          )}

          {!editBomTemplateId && bomTemplates.length > 0 && (
            <div className="rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5 text-indigo-600" /> Salin Komponen dari Preset Lain?
                </span>
                <button
                  type="button"
                  onClick={() => setShowCopyPresetSection(!showCopyPresetSection)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showCopyPresetSection ? 'Sembunyikan' : 'Buka Opsi Salin'}
                </button>
              </div>

              {showCopyPresetSection && (
                <div className="flex gap-2 pt-1">
                  <select
                    value={sourcePresetId}
                    onChange={e => setSourcePresetId(e.target.value)}
                    className="flex-1 rounded-md border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="">-- Pilih Preset Sumber --</option>
                    {bomTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={handleCopyFromExistingPreset}>Salin Material</Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nama Preset BOM <span className="text-red-500">*</span></label>
            <Input
              type="text"
              value={formBomName}
              onChange={e => setFormBomName(e.target.value)}
              placeholder="Contoh: Resep Kasur Busa Premium 160x200"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Deskripsi Singkat</label>
            <textarea
              rows={2}
              value={formBomDesc}
              onChange={e => setFormBomDesc(e.target.value)}
              placeholder="Deskripsi singkat preset BOM ini..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Komponen Material Preset <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select
                value={newBomMatId}
                onChange={e => setNewBomMatId(e.target.value)}
                className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Bahan Baku --</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.unit}) — {formatCurrency(m.unitCost)}</option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                min="0"
                value={newBomQty}
                onChange={e => setNewBomQty(e.target.value)}
                placeholder="Qty"
                className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-right focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <Button size="sm" onClick={addBomItemToForm}>+ Tambah</Button>
            </div>

            {formBomItems.length > 0 ? (
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
                    {formBomItems.map(item => {
                      const mat = materials.find(m => m.id === item.materialId);
                      return (
                        <tr key={item.materialId}>
                          <td className="px-3 py-1.5 font-medium">{mat?.name || item.materialId}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold">{item.defaultQty} {mat?.unit}</td>
                          <td className="px-3 py-1.5 text-right">
                            <button onClick={() => removeBomItemFromForm(item.materialId)} className="text-red-500 hover:text-red-700">
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada material dikaitkan dengan preset BOM ini.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL 2: CRUD MASTER ATRIBUT VARIAN */}
      <Modal
        isOpen={showAttributeModal}
        onClose={() => setShowAttributeModal(false)}
        title={editAttributeId ? 'Edit Master Atribut' : 'Tambah Master Atribut Varian'}
        size="md"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowAttributeModal(false)}>Batal</Button>
            <Button onClick={handleSaveAttribute}>
              {editAttributeId ? 'Simpan Perubahan' : 'Tambah Atribut'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {attributeModalError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {attributeModalError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nama Atribut <span className="text-red-500">*</span></label>
            <Input
              type="text"
              value={formAttrName}
              onChange={e => setFormAttrName(e.target.value)}
              placeholder="Contoh: Ukuran, Warna, Finishing, Material"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Opsi / Nilai Varian (pisahkan dengan koma)</label>
            <textarea
              rows={3}
              value={formAttrValues}
              onChange={e => setFormAttrValues(e.target.value)}
              placeholder="Contoh: 120x200 cm, 160x200 cm, 180x200 cm"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
            />
            <p className="text-[10px] text-slate-400">Pisahkan setiap opsi dengan tanda koma ( , ).</p>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: CRUD MODIFIER GROUP */}
      <Modal
        isOpen={showModifierModal}
        onClose={() => setShowModifierModal(false)}
        title={editModifierGroupId ? 'Edit Modifier Master' : 'Tambah Modifier Master'}
        size="xl"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowModifierModal(false)}>Batal</Button>
            <Button onClick={handleSaveModifier}>
              {editModifierGroupId ? 'Simpan Perubahan' : 'Tambah Modifier'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {modifierModalError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {modifierModalError}
            </div>
          )}

          <ModifierGroupEditor
            groups={[{ id: editModifierGroupId || 'new-mod-group', name: formModName, selectType: formModSelectType, options: formModOptions }]}
            materials={materials}
            onChange={updatedGroups => {
              if (updatedGroups.length > 0) {
                setFormModName(updatedGroups[0].name);
                setFormModSelectType(updatedGroups[0].selectType);
                setFormModOptions(updatedGroups[0].options);
              }
            }}
            isSingleGroupEdit={true}
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ProductsConfigPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Configuration...</div>}>
      <ProductsConfigContent />
    </Suspense>
  );
}
