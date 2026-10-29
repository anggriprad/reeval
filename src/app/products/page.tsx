'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
import { formatCurrency, getEffectiveVariantBOM, calculateRollupBOMCost } from '@/lib/utils';
import type { Product, ProductVariantSKU, VariantType, BOMItem, ProductModifierGroup, ProductModifierOption, ProductionOperation } from '@/lib/types';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Tag, X, AlertTriangle, BedDouble, Layers, Box, Grip, FileSpreadsheet, Copy, Clock, Settings,
  Armchair, Sofa, Package, Lamp, Tv, Coffee, Hammer, Wrench, Frame, Palette, Scissors, Shield,
  ShoppingBag, Archive, FolderTree, Sparkles,
} from 'lucide-react';
import { canManageInventory } from '@/lib/roles';
import { ProductSection } from './components/ProductSection';
import { ProductModifierTab } from './components/ProductModifierTab';
import { productCategoryService, ProductCategoryOption } from '@/services/product-category.service';

// ── Icon map ──────────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
  BedDouble, Layers, Box, Armchair, Sofa, Package, Lamp, Tv, Coffee, Hammer,
  Wrench, Frame, Palette, Scissors, Shield, Tag, ShoppingBag, Archive, FolderTree, Sparkles,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function combinationLabel(combination: Record<string, string>): string {
  return Object.values(combination).join(' / ') || 'Default';
}

// ── VariantTypeBuilder & VariantSKUEditor are now inside ProductForm component ──

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
    routings,
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<ProductCategoryOption[]>([]);

  useEffect(() => {
    productCategoryService.getCategoryOptions().then(res => {
      if (res.success && res.data) {
        setCategoryOptions(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Master Modifier CRUD states
  const [showAddModifierModal, setShowAddModifierModal] = useState(false);

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
      message: `Apakah Anda yakin ingin menghapus produk "${p.name}"? Produk hanya dapat dihapus jika tidak memiliki sisa stok dan belum memiliki riwayat transaksi mutasi.`,
      confirmText: 'Hapus Produk',
      variant: 'danger',
    });
    if (isOk) {
      const result = deleteProduct(p.id);
      if (!result.success) {
        toast.error('Gagal Menghapus', result.reason || 'Produk tidak dapat dihapus.');
      } else {
        toast.success('Produk Dihapus', `Produk "${p.name}" berhasil dihapus dari sistem.`);
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
    if (p.isActive === false) return false;
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
        {canManage && activeTab === 'modifiers' && (
          <Button onClick={() => setShowAddModifierModal(true)}><Plus className="h-4 w-4" /> Tambah Modifier</Button>
        )}
        {canManage && (
          <Link href="/products/config">
            <Button variant="outline">
              <Settings className="h-4 w-4" /> Konfigurasi
            </Button>
          </Link>
        )}
      </PageHeader>

      {/* Reusable Segmented Control */}
      {(() => {
        let filterOptions: { value: string; label: string }[] = [];
        let filterPlaceholder = "Filter";

        if (activeTab === 'products') {
          filterPlaceholder = "Semua Kategori Produk";
          filterOptions = categoryOptions.map(c => ({ value: String(c.id), label: c.name }));
        } else if (activeTab === 'modifiers') {
          filterPlaceholder = "Semua Tipe Selection";
          filterOptions = [
            { value: 'SINGLE', label: 'Pilihan Tunggal (Radio)' },
            { value: 'MULTI', label: 'Pilihan Berganda (Checkbox)' },
          ];
        }

        return (
          <SegmentedControl
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab as 'products' | 'modifiers');
              setSearchTerm('');
              setProductFilter('');
            }}
            options={[
              { key: 'products', label: 'Produk', icon: Layers },
              { key: 'modifiers', label: 'Add-on', icon: Grip },
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
                : "Cari modifier add-on..."
            }
          />
        );
      })()}

      {activeTab === 'products' ? (
        <ProductSection categoryFilter={productFilter} searchTerm={debouncedSearch} />
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
        <ProductModifierTab
          selectTypeFilter={productFilter}
          searchTerm={debouncedSearch}
          isAddModalOpen={showAddModifierModal}
          onCloseAddModal={() => setShowAddModifierModal(false)}
        />
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
                  const totalCost = calculateRollupBOMCost(
                    items.map(item => ({ materialId: item.materialId, qty: item.defaultQty })),
                    materials,
                    routings,
                    operations
                  );
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
        </div>
      </Modal>



      {/* CRUD Master Preset BOM Modal */}
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

