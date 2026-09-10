'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/lib/utils';
import type { Product, ProductVariantSKU, VariantType, BOMItem, ProductModifierGroup, ProductModifierOption, ProductionOperation } from '@/lib/types';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Tag, X, AlertTriangle, BedDouble, Layers, Box, Grip, FileSpreadsheet, Copy, Clock,
} from 'lucide-react';
import { canManageInventory } from '@/lib/roles';

// ── Icon map ──────────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = { BedDouble, Layers, Box };
const iconOptions = ['BedDouble', 'Layers', 'Box'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function combinationLabel(combination: Record<string, string>): string {
  return Object.values(combination).join(' / ') || 'Default';
}

// ── VariantTypeBuilder & VariantSKUEditor are now inside ProductForm component ──

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
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tipe Seleksi</label>
                  <select
                    value={g.selectType}
                    onChange={e => updateGroup(g.id, { selectType: e.target.value as 'SINGLE' | 'MULTI' })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="MULTI">Multi-select (Checklist)</option>
                    <option value="SINGLE">Single-select (Pilih Satu)</option>
                  </select>
                </div>
                {!isSingleGroupEdit && (
                  <button
                    type="button"
                    onClick={() => removeGroup(g.id)}
                    className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20 mt-5 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Daftar Pilihan / Opsi Add-on</p>
                <button
                  type="button"
                  onClick={() => addOption(g.id)}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Opsi
                </button>
              </div>

              {g.options.length === 0 ? (
                <p className="text-xs italic text-slate-400 text-center py-4">Belum ada opsi ditambahkan.</p>
              ) : (
                <div className="divide-y divide-slate-150 dark:divide-slate-800">
                  {g.options.map(opt => {
                    const isBOMOpen = expandedOptionId === opt.id;
                    const bomCost = calcBOMCost(opt.bom);
                    const key = `${g.id}-${opt.id}`;

                    return (
                      <div key={opt.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={opt.name}
                              onChange={e => updateOption(g.id, opt.id, { name: e.target.value })}
                              placeholder="Nama opsi (Misal: Tambah 2 Laci)"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                          <div className="w-40 flex items-center gap-2">
                            <CurrencyInput
                              value={opt.additionalPrice || ''}
                              onChange={val => updateOption(g.id, opt.id, { additionalPrice: Number(val) })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              placeholder="+ Harga"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedOptionId(isBOMOpen ? null : opt.id)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${isBOMOpen
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300'
                              }`}
                          >
                            BOM ({opt.bom.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => removeOption(g.id, opt.id)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {isBOMOpen && (
                          <div className="pl-4 border-l-2 border-slate-300 dark:border-slate-700 space-y-3 mt-2 ml-1">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">BOM Bahan Baku ({opt.name || 'Opsi Baru'})</p>

                            {opt.bom.length > 0 && (
                              <table className="w-full text-xs max-w-xl">
                                <thead>
                                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] text-left">
                                    <th className="pb-1 font-semibold">Material</th>
                                    <th className="pb-1 text-right font-semibold">Kuantitas</th>
                                    <th className="pb-1 text-right font-semibold">Biaya</th>
                                    <th className="pb-1 w-8"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {opt.bom.map(b => {
                                    const mat = materials.find(m => m.id === b.materialId);
                                    if (!mat) return null;
                                    return (
                                      <tr key={b.materialId} className="border-b border-slate-50 dark:border-slate-800/40">
                                        <td className="py-1 text-slate-700 dark:text-slate-300">{mat.name}</td>
                                        <td className="py-1 text-right font-mono font-semibold">{b.qty} {mat.unit}</td>
                                        <td className="py-1 text-right font-mono">{formatCurrency(mat.unitCost * b.qty)}</td>
                                        <td className="py-1 text-center">
                                          <button type="button" onClick={() => removeBOMItem(g.id, opt.id, b.materialId)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-slate-200 dark:border-slate-700 font-semibold">
                                    <td className="pt-2 text-slate-500">Estimasi HPP Material:</td>
                                    <td></td>
                                    <td className="pt-2 text-right text-indigo-600 dark:text-indigo-400 font-bold">{formatCurrency(bomCost)}</td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}

                            <div className="flex gap-2 max-w-xl items-center">
                              <select
                                value={newBOMMatId[key] || ''}
                                onChange={e => setNewBOMMatId(prev => ({ ...prev, [key]: e.target.value }))}
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="">-- Pilih Material --</option>
                                {materials.filter(m => !opt.bom.some(b => b.materialId === m.id)).map(m => (
                                  <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                step="any"
                                value={newBOMQty[key] !== undefined ? newBOMQty[key] : ''}
                                onChange={e => setNewBOMQty(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="Qty"
                                className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                              <Button type="button" size="sm" variant="outline" onClick={() => addBOMItem(g.id, opt.id)}>
                                Tambah Bahan
                              </Button>
                            </div>
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
      {!isSingleGroupEdit && (
        <Button type="button" variant="outline" size="sm" onClick={addGroup}>
          <Plus className="h-4 w-4" /> Tambah Grup Modifier Baru
        </Button>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
function ProductsContent() {
  const { toast, confirm } = useToast();
  const {
    products,
    materials,
    masterModifierGroups,
    setMasterModifierGroups,
    addModifierGroup,
    updateModifierGroup,
    deleteModifierGroup,
    currentUser,
    addProduct,
    updateProduct,
    deleteProduct,
    productCategories,
    addProductCategory,
    deleteProductCategory,
    operations,
    attributes,
    addAttribute,
    updateAttribute,
    deleteAttribute,
    addAttributeValue,
    removeAttributeValue,
    bomTemplates,
    bomTemplateItems,
    addBomTemplate,
    updateBomTemplate,
    deleteBomTemplate,
  } = useApp();

  const router = useRouter();
  const [activeTab, setActiveTab] = useUrlTab(['products', 'modifiers', 'bom_templates', 'attributes'] as const, 'products');
  const canSeeCosts = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Master Modifier CRUD states
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [editModifierGroupId, setEditModifierGroupId] = useState<string | null>(null);
  const [formModName, setFormModName] = useState('');
  const [formModSelectType, setFormModSelectType] = useState<'SINGLE' | 'MULTI'>('MULTI');
  const [formModOptions, setFormModOptions] = useState<ProductModifierOption[]>([]);
  const [expandedModifierGroupId, setExpandedModifierGroupId] = useState<string | null>(null);
  const [modifierModalError, setModifierModalError] = useState('');

  // Master Attribute CRUD states
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [editAttributeId, setEditAttributeId] = useState<string | null>(null);
  const [formAttrName, setFormAttrName] = useState('');
  const [formAttrValues, setFormAttrValues] = useState('');
  const [attributeModalError, setAttributeModalError] = useState('');
  const [inlineNewValues, setInlineNewValues] = useState<Record<string, string>>({});

  // Master Preset BOM CRUD states
  const [showBomTemplateModal, setShowBomTemplateModal] = useState(false);
  const [editBomTemplateId, setEditBomTemplateId] = useState<string | null>(null);
  const [formBomName, setFormBomName] = useState('');
  const [formBomDesc, setFormBomDesc] = useState('');
  const [formBomItems, setFormBomItems] = useState<{ materialId: string; defaultQty: number }[]>([]);
  const [expandedBomTemplateId, setExpandedBomTemplateId] = useState<string | null>(null);
  const [bomTemplateModalError, setBomTemplateModalError] = useState('');
  const [sourcePresetId, setSourcePresetId] = useState('');
  const [showCopyPresetSection, setShowCopyPresetSection] = useState(false);

  // BOM Template material input state inside modal
  const [newBomMatId, setNewBomMatId] = useState('');
  const [newBomQty, setNewBomQty] = useState('');

  const handleDelete = async (p: Product) => {
    const isOk = await confirm({
      title: 'Hapus Produk',
      message: `Apakah Anda yakin ingin menghapus produk "${p.name}"? Data yang dihapus tidak dapat dikembalikan.`,
      confirmText: 'Hapus Produk',
      variant: 'danger',
    });
    if (isOk) {
      if (!deleteProduct(p.id)) {
        toast.error('Gagal Menghapus', 'Produk ini sudah digunakan dalam Sales Order.');
      } else {
        toast.success('Produk Dihapus', `Produk "${p.name}" berhasil dihapus.`);
      }
    }
  };

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
    const payload = {
      name: formModName.trim(),
      selectType: formModSelectType,
      options: formModOptions
    };
    if (editModifierGroupId) {
      updateModifierGroup(editModifierGroupId, payload);
      toast.success('Modifier Diperbarui', `Grup modifier "${payload.name}" berhasil diperbarui.`);
    } else {
      addModifierGroup(payload);
      toast.success('Modifier Ditambahkan', `Grup modifier "${payload.name}" berhasil ditambahkan.`);
    }
    setShowModifierModal(false);
  };

  const handleDeleteModifier = async (group: ProductModifierGroup) => {
    const isOk = await confirm({
      title: 'Hapus Master Modifier',
      message: `Apakah Anda yakin ingin menghapus master modifier "${group.name}"?`,
      confirmText: 'Hapus Modifier',
      variant: 'danger',
    });
    if (isOk) {
      if (!deleteModifierGroup(group.id)) {
        toast.error('Gagal Menghapus', 'Modifier ini masih dihubungkan ke salah satu produk.');
      } else {
        toast.success('Modifier Dihapus', `Master modifier "${group.name}" berhasil dihapus.`);
      }
    }
  };

  // Master Preset BOM Handlers
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
    } else {
      addBomTemplate(
        { name: formBomName.trim(), description: formBomDesc.trim() },
        formBomItems
      );
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

  const filtered = products.filter(p => {
    const matchesFilter = !productFilter || p.category === productFilter;
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredAttributes = attributes.filter(a => {
    const matchesSearch = !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.values.some(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const filteredModifiers = masterModifierGroups.filter(g => {
    const matchesFilter = !productFilter || g.selectType === productFilter;
    const matchesSearch = !searchTerm || g.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredBomTemplates = bomTemplates.filter(t => {
    let matchesFilter = true;
    if (productFilter === 'HAS_ITEMS') {
      matchesFilter = bomTemplateItems.some(i => i.templateId === t.id);
    } else if (productFilter === 'EMPTY') {
      matchesFilter = !bomTemplateItems.some(i => i.templateId === t.id);
    }
    const matchesSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const priceRange = (p: Product) => {
    const prices = p.variants.filter(v => v.isActive && v.price > 0).map(v => v.price);
    if (prices.length === 0) return '-';
    const min = Math.min(...prices), max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`;
  };
  const canManage = canManageInventory(currentUser.role);

  return (
    <div className='space-y-3'>
      <PageHeader title="Katalog Produk & BOM">
        {canManage && activeTab === 'products' && (
          <Link href="/products/create">
            <Button><Plus className="h-4 w-4" /> Tambah Produk</Button>
          </Link>
        )}
        {canManage && activeTab === 'attributes' && (
          <Button onClick={openAddAttribute}><Plus className="h-4 w-4" /> Tambah Atribut</Button>
        )}
        {canManage && activeTab === 'modifiers' && (
          <Button onClick={openAddModifier}><Plus className="h-4 w-4" /> Tambah Modifier</Button>
        )}
        {canManage && activeTab === 'bom_templates' && (
          <Button onClick={openAddBomTemplate}><Plus className="h-4 w-4" /> Tambah Preset BOM</Button>
        )}
      </PageHeader>

      {/* Reusable Segmented Control */}
      {(() => {
        let filterOptions: { value: string; label: string }[] = [];
        let filterPlaceholder = "Filter Atribut";

        if (activeTab === 'products') {
          filterPlaceholder = "Semua Kategori Produk";
          filterOptions = productCategories.map(c => ({ value: c, label: c }));
        } else if (activeTab === 'modifiers') {
          filterPlaceholder = "Semua Tipe Selection";
          filterOptions = [
            { value: 'SINGLE', label: 'Pilihan Tunggal (Radio)' },
            { value: 'MULTI', label: 'Pilihan Berganda (Checkbox)' },
          ];
        } else if (activeTab === 'bom_templates') {
          filterPlaceholder = "Status Komponen BOM";
          filterOptions = [
            { value: 'HAS_ITEMS', label: 'Memiliki Material' },
            { value: 'EMPTY', label: 'Tanpa Material' },
          ];
        }

        return (
          <SegmentedControl
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab as 'products' | 'modifiers' | 'bom_templates' | 'attributes');
              setSearchTerm('');
              setProductFilter('');
            }}
            options={[
              { key: 'products', label: 'Produk', icon: Layers },
              { key: 'modifiers', label: 'Add-on', icon: Grip },
              { key: 'bom_templates', label: 'Preset BOM', icon: FileSpreadsheet },
              { key: 'attributes', label: 'Atribut Varian', icon: Tag },
            ]}
            filterValue={productFilter}
            onFilterChange={setProductFilter}
            filterPlaceholder={filterPlaceholder}
            filterOptions={filterOptions}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={
              activeTab === 'products'
                ? "Cari produk..."
                : activeTab === 'attributes'
                  ? "Cari atribut master..."
                  : activeTab === 'modifiers'
                    ? "Cari modifier add-on..."
                    : "Cari preset BOM..."
            }
          />
        );
      })()}

      {activeTab === 'products' ? (
        <>
          {/* Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-center">Varian Aktif</th>
                  <th className="px-4 py-3 text-right">Rentang Harga</th>
                  {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={canManage ? 5 : 4} className="py-12 text-center text-slate-400 dark:text-slate-500">{searchTerm ? 'Tidak ada produk yang cocok.' : 'Belum ada produk terdaftar.'}</td></tr>
                ) : filtered.map(p => {
                  const IconComp = iconMap[p.imageIcon] || BedDouble;
                  const isExpanded = expandedProductId === p.id;
                  const activeVariants = p.variants.filter(v => v.isActive);
                  return (
                    <React.Fragment key={p.id}>
                      <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer" onClick={() => setExpandedProductId(isExpanded ? null : p.id)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                              <IconComp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{p.description}</p>
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 ml-1" /> : <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />}
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge variant="info">{p.category}</Badge></td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">{activeVariants.length}<span className="text-xs font-normal text-slate-400">SKU</span></span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800 dark:text-slate-200">{priceRange(p)}</td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                              <Link href={`/products/${p.id}/edit`} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors">
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={canManage ? 5 : 4} className="px-4 py-0 bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="py-3 space-y-2">
                              {(() => {
                                const vts = p.variantTypes || [];
                                return vts.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {vts.map(vt => (
                                      <span key={vt.name} className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                        <Tag className="h-2.5 w-2.5" /> {vt.name}: {vt.values.join(', ')}
                                      </span>
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                      <th className="px-3 py-2 text-left font-medium">SKU</th>
                                      <th className="px-3 py-2 text-left font-medium">Kombinasi Varian</th>
                                      {canSeeCosts && <th className="px-3 py-2 text-right font-medium">HPP Material</th>}
                                      <th className="px-3 py-2 text-right font-medium">Harga Jual</th>
                                      <th className="px-3 py-2 text-center font-medium">Est. Jam Kerja</th>
                                      {canSeeCosts && <th className="px-3 py-2 text-right font-medium">Margin</th>}
                                      <th className="px-3 py-2 text-center font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {p.variants.map(v => {
                                      const bomCost = v.bom.reduce((sum, b) => { const mat = materials.find(m => m.id === b.materialId); return sum + (mat ? mat.unitCost * b.qty : 0); }, 0);
                                      const margin = v.price > 0 ? ((v.price - bomCost) / v.price * 100).toFixed(1) : '-';
                                      const hours = v.estimatedHours || p.defaultEstimatedHours || 0;
                                      return (
                                        <tr key={v.id} className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${!v.isActive ? 'opacity-50' : ''}`}>
                                          <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{v.sku}</td>
                                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{combinationLabel(v.combination)}</td>
                                          {canSeeCosts && <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(bomCost)}</td>}
                                          <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(v.price)}</td>
                                          <td className="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                                            <span className="inline-flex items-center gap-1">
                                              <Clock className="h-3 w-3 text-indigo-500" />
                                              {hours} Jam
                                            </span>
                                          </td>
                                          {canSeeCosts && <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{margin}{margin !== '-' ? '%' : ''}</td>}
                                          <td className="px-3 py-2 text-center"><Badge variant={v.isActive ? 'success' : 'default'}>{v.isActive ? 'Aktif' : 'Non-Aktif'}</Badge></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              {(() => {
                                const prodModifiers = p.modifierGroupIds
                                  ? masterModifierGroups.filter(g => p.modifierGroupIds?.includes(g.id))
                                  : [];
                                if (prodModifiers.length === 0) return null;
                                return (
                                  <div className="mt-3 space-y-2">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Modifier (Pilihan Add-on):</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {prodModifiers.map(group => (
                                        <div key={group.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50/50 dark:bg-slate-800/10">
                                          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1.5">{group.name} ({group.selectType === 'MULTI' ? 'Multi-select' : 'Single-select'})</p>
                                          <div className="space-y-1.5">
                                            {group.options.map(opt => {
                                              const bomCost = opt.bom.reduce((sum, b) => {
                                                const mat = materials.find(m => m.id === b.materialId);
                                                return sum + (mat ? mat.unitCost * b.qty : 0);
                                              }, 0);
                                              return (
                                                <div key={opt.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                                                  <div className="flex justify-between font-medium">
                                                    <span>{opt.name}</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(opt.additionalPrice)}</span>
                                                  </div>
                                                  {opt.bom.length > 0 && (
                                                    <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 pl-2 border-l border-slate-200 dark:border-slate-700">
                                                      <span>BOM: {opt.bom.map(b => {
                                                        const mat = materials.find(m => m.id === b.materialId);
                                                        return `${mat?.name || b.materialId} (${b.qty} ${mat?.unit})`;
                                                      }).join(', ')}</span>
                                                      <span className="block text-[9px] font-semibold text-indigo-500 mt-0.5">Est. HPP Material: {formatCurrency(bomCost)}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'attributes' ? (
        <div className="space-y-4">
          {filteredAttributes.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center text-slate-400">
              {searchTerm ? 'Tidak ada master atribut yang cocok.' : 'Belum ada master atribut terdaftar.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAttributes.map(attr => (
                <div key={attr.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{attr.name}</h3>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditAttribute(attr)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttribute(attr.id, attr.name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[48px]">
                      {attr.values.map(val => (
                        <span
                          key={val}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                        >
                          {val}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => removeAttributeValue(attr.id, val)}
                              className="text-slate-400 hover:text-red-500 font-bold ml-0.5"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {canManage && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="+ Opsi / Nilai baru"
                        value={inlineNewValues[attr.id] || ''}
                        onChange={e => setInlineNewValues(prev => ({ ...prev, [attr.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (inlineNewValues[attr.id]?.trim()) {
                              addAttributeValue(attr.id, inlineNewValues[attr.id]);
                              setInlineNewValues(prev => ({ ...prev, [attr.id]: '' }));
                            }
                          }
                        }}
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (inlineNewValues[attr.id]?.trim()) {
                            addAttributeValue(attr.id, inlineNewValues[attr.id]);
                            setInlineNewValues(prev => ({ ...prev, [attr.id]: '' }));
                          }
                        }}
                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold text-xs shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'modifiers' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Nama Modifier</th>
                <th className="px-4 py-3">Tipe Seleksi</th>
                <th className="px-4 py-3 text-center">Jumlah Opsi</th>
                {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filteredModifiers.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    {searchTerm ? 'Tidak ada modifier yang cocok.' : 'Belum ada grup modifier terdaftar.'}
                  </td>
                </tr>
              ) : (
                filteredModifiers.map(group => {
                  const isExpanded = expandedModifierGroupId === group.id;
                  return (
                    <React.Fragment key={group.id}>
                      <tr
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer"
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
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModifier(group)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteModifier(group)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={canManage ? 4 : 3} className="px-4 py-3 bg-slate-50/30 dark:bg-slate-900/10">
                            <div className="space-y-3">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Daftar Pilihan / Opsi & HPP Material:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {group.options.map(opt => {
                                  const bomCost = opt.bom.reduce((sum, b) => {
                                    const mat = materials.find(m => m.id === b.materialId);
                                    return sum + (mat ? mat.unitCost * b.qty : 0);
                                  }, 0);
                                  return (
                                    <div key={opt.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2">
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
                                                {canSeeCosts && <span>{formatCurrency((mat?.unitCost || 0) * b.qty)}</span>}
                                              </div>
                                            );
                                          })}
                                          {canSeeCosts && (
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
      ) : activeTab === 'bom_templates' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Nama Preset BOM</th>
                <th className="px-4 py-3">Deskripsi</th>
                <th className="px-4 py-3 text-center">Komponen Material</th>
                <th className="px-4 py-3 text-right">Est. Total HPP</th>
                {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filteredBomTemplates.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    {searchTerm ? 'Tidak ada preset BOM yang cocok.' : 'Belum ada preset BOM terdaftar.'}
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
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer"
                        onClick={() => setExpandedBomTemplateId(isExpanded ? null : tpl.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">{tpl.name}</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                          {tpl.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{items.length} Material</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {canSeeCosts ? formatCurrency(totalCost) : '-'}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditBomTemplate(tpl)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBomTemplate(tpl)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={canManage ? 5 : 4} className="px-4 py-3 bg-slate-50/30 dark:bg-slate-900/10">
                            <div className="space-y-2 max-w-2xl">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rincian Komponen Material Preset:</p>
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-left font-semibold text-slate-500">
                                      <th className="px-3 py-2">Material</th>
                                      <th className="px-3 py-2 text-right">Kuantitas</th>
                                      <th className="px-3 py-2 text-center">Satuan</th>
                                      {canSeeCosts && <th className="px-3 py-2 text-right">Est. Biaya</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {items.length === 0 ? (
                                      <tr><td colSpan={4} className="px-3 py-3 text-center text-slate-400">Tidak ada komponen material.</td></tr>
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
                                            {canSeeCosts && (
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
      ) : null}

      {/* CRUD Master Attribute Modal */}
      <Modal isOpen={showAttributeModal} onClose={() => setShowAttributeModal(false)} title={editAttributeId ? 'Edit Master Atribut' : 'Tambah Master Atribut Varian'} size="md">
        <div className="space-y-4">
          {attributeModalError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {attributeModalError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nama Atribut <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formAttrName}
              onChange={e => setFormAttrName(e.target.value)}
              placeholder="Contoh: Ukuran, Warna, Finishing, Material"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowAttributeModal(false)}>Batal</Button>
            <Button onClick={handleSaveAttribute}>
              {editAttributeId ? 'Simpan Perubahan' : 'Tambah Atribut'}
            </Button>
          </div>
        </div>
      </Modal>



      {/* CRUD Modifier Modal */}
      <Modal isOpen={showModifierModal} onClose={() => setShowModifierModal(false)} title={editModifierGroupId ? 'Edit Modifier Master' : 'Tambah Modifier Master'} size="xl">
        <div className="space-y-5">
          {modifierModalError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {modifierModalError}
            </div>
          )}

          <ModifierGroupEditor
            groups={[
              {
                id: editModifierGroupId || 'new-mod-group',
                name: formModName,
                selectType: formModSelectType,
                options: formModOptions,
              }
            ]}
            materials={materials}
            isSingleGroupEdit={true}
            onChange={(updatedGroups) => {
              const g = updatedGroups[0];
              if (g) {
                setFormModName(g.name);
                setFormModSelectType(g.selectType);
                setFormModOptions(g.options);
              }
            }}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowModifierModal(false)}>Batal</Button>
            <Button onClick={handleSaveModifier}>
              {editModifierGroupId ? 'Simpan Perubahan' : 'Tambah Modifier'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* CRUD Master Preset BOM Modal */}
      <Modal isOpen={showBomTemplateModal} onClose={() => setShowBomTemplateModal(false)} title={editBomTemplateId ? 'Edit Master Preset BOM' : 'Tambah Master Preset BOM'} size="lg">
        <div className="space-y-4">
          {bomTemplateModalError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {bomTemplateModalError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nama Preset BOM <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formBomName}
              onChange={e => setFormBomName(e.target.value)}
              placeholder="Contoh: Preset Standard Queensize Springbed"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Deskripsi / Catatan</label>
            <input
              type="text"
              value={formBomDesc}
              onChange={e => setFormBomDesc(e.target.value)}
              placeholder="Deskripsi singkat preset BOM ini..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Section: Rincian Komponen Material & Trigger Salin Preset */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Rincian Komponen Material Bawaan Preset <span className="text-red-500">*</span>
              </label>

              {bomTemplates.filter(t => t.id !== editBomTemplateId).length > 0 && !showCopyPresetSection && (
                <button
                  type="button"
                  onClick={() => setShowCopyPresetSection(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Salin Komponen dari Preset Existing
                </button>
              )}
            </div>

            {/* A. Panel Salin dari Preset Existing (Hanya tampil saat user menekan trigger) */}
            {showCopyPresetSection ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-indigo-900 dark:text-indigo-200">
                    <Copy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Salin Komponen dari Master Preset Existing
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCopyPresetSection(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    title="Tutup Opsi Salin"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Pilih Master Preset BoM yang sudah ada untuk memuat seluruh rincian komponen materialnya secara otomatis:
                </p>

                <div className="flex flex-col sm:flex-row gap-2 items-center pt-1">
                  <select
                    value={sourcePresetId}
                    onChange={e => setSourcePresetId(e.target.value)}
                    className="w-full sm:flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Pilih Master Preset BoM Existing --</option>
                    {bomTemplates
                      .filter(t => t.id !== editBomTemplateId)
                      .map(t => {
                        const count = bomTemplateItems.filter(i => i.templateId === t.id).length;
                        return (
                          <option key={t.id} value={t.id}>
                            {t.name} ({count} material)
                          </option>
                        );
                      })}
                  </select>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={!sourcePresetId}
                      onClick={handleCopyFromExistingPreset}
                      className="w-full sm:w-auto shadow-sm"
                    >
                      Terapkan Preset
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCopyPresetSection(false)}
                      className="w-full sm:w-auto"
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* B. Penginputan Material Normal (Tabel & Bar Tambah Material) */
              <>
                {/* Input bar to add material */}
                <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <select
                    value={newBomMatId}
                    onChange={e => setNewBomMatId(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                  >
                    <option value="">-- Pilih Material --</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    value={newBomQty}
                    onChange={e => setNewBomQty(e.target.value)}
                    placeholder="Kuantitas"
                    className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono font-bold text-right"
                  />
                  <span className="text-xs text-slate-500 font-medium min-w-12 text-center">
                    {materials.find(m => m.id === newBomMatId)?.unit || '-'}
                  </span>
                  <Button type="button" size="sm" onClick={addBomItemToForm}>
                    <Plus className="h-3.5 w-3.5" /> Tambah
                  </Button>
                </div>

                {/* Added materials table */}
                {formBomItems.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-left font-semibold text-slate-500">
                          <th className="px-3 py-2">Material</th>
                          <th className="px-3 py-2 text-right">Kuantitas</th>
                          <th className="px-3 py-2 text-center">Satuan</th>
                          {canSeeCosts && <th className="px-3 py-2 text-right">Est. Biaya</th>}
                          <th className="px-3 py-2 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {formBomItems.map(item => {
                          const mat = materials.find(m => m.id === item.materialId);
                          return (
                            <tr key={item.materialId}>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{mat?.name || item.materialId}</td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900 dark:text-white">
                                <input
                                  type="number"
                                  step="any"
                                  value={item.defaultQty}
                                  onChange={e => {
                                    const q = parseFloat(e.target.value) || 0;
                                    setFormBomItems(formBomItems.map(i => i.materialId === item.materialId ? { ...i, defaultQty: q } : i));
                                  }}
                                  className="w-20 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-right font-mono focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                  {mat?.unit || '-'}
                                </span>
                              </td>
                              {canSeeCosts && (
                                <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                  {formatCurrency((mat?.unitCost || 0) * item.defaultQty)}
                                </td>
                              )}
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeBomItemFromForm(item.materialId)}
                                  className="text-slate-400 hover:text-red-600 transition-colors p-1"
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
                ) : (
                  <div className="text-center py-6 px-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="text-xs text-slate-400">
                      Belum ada komponen material yang ditambahkan.
                    </p>
                    {bomTemplates.filter(t => t.id !== editBomTemplateId).length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCopyPresetSection(true)}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900 dark:hover:bg-indigo-950/40"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Salin Komponen dari Preset Existing
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowBomTemplateModal(false)}>Batal</Button>
            <Button onClick={handleSaveBomTemplate}>
              {editBomTemplateId ? 'Simpan Perubahan' : 'Tambah Preset BOM'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat Product Catalog...</div>}>
      <ProductsContent />
    </Suspense>
  );
}

