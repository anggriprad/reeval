'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, generateId, getEffectiveVariantBOM, calculateRollupBOMCost } from '@/lib/utils';
import type {
  Product,
  ProductVariantSKU,
  BOMItem,
  VariantType,
} from '@/lib/types';
import { generateSKU } from '@/lib/product-resolver';
import {
  Plus,
  X,
  AlertTriangle,
  BedDouble,
  Layers,
  Box,
  ArrowLeft,
  Save,
  Trash2,
  Settings2,
  Edit2,
  Download,
  Info,
  DollarSign,
  Layers3,
  CheckCircle2,
  Zap,
  SlidersHorizontal,
  Lock,
  Unlock,
  Clock,
  Wrench,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = { BedDouble, Layers, Box };
const iconOptions = ['BedDouble', 'Layers', 'Box'];

interface ProductFormProps {
  initialProduct?: Product;
}

export function ProductForm({ initialProduct }: ProductFormProps) {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const {
    materials,
    attributes,
    bomTemplates,
    bomTemplateItems,
    routings,
    operations = [],
    masterModifierGroups,
    addProduct,
    updateProduct,
    productCategories,
    addProductCategory,
    deleteProductCategory,
  } = useApp();

  const isEditMode = !!initialProduct;

  // ── Mode Switch: Single Product vs Product with Variants ───────────────────
  const [hasVariants, setHasVariants] = useState<boolean>(() => {
    return Boolean(initialProduct?.variantTypes && initialProduct.variantTypes.length > 0);
  });



  // ── 1. Basic Product Info ──────────────────────────────────────────────────
  const [name, setName] = useState(initialProduct?.name || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [category, setCategory] = useState(initialProduct?.category || '');
  const [imageIcon, setImageIcon] = useState(initialProduct?.imageIcon || 'Box');

  // ── 2. Single Product States (when hasVariants === false) ───────────────────
  const [singleSku, setSingleSku] = useState<string>(() => {
    if (initialProduct?.variants && initialProduct.variants.length === 1 && !initialProduct.variantTypes?.length) {
      return initialProduct.variants[0].sku;
    }
    return '';
  });
  const [singlePrice, setSinglePrice] = useState<number>(() => {
    if (initialProduct?.variants && initialProduct.variants.length === 1 && !initialProduct.variantTypes?.length) {
      return initialProduct.variants[0].price;
    }
    return initialProduct?.basePrice ?? 0;
  });
  const [singleRoutingId, setSingleRoutingId] = useState<string>(() => {
    if (initialProduct?.variants && initialProduct.variants.length === 1 && !initialProduct.variantTypes?.length) {
      return initialProduct.variants[0].routingId || initialProduct.defaultRoutingId || '';
    }
    return initialProduct?.defaultRoutingId || '';
  });
  const [singleEstimatedHours, setSingleEstimatedHours] = useState<number>(() => {
    if (initialProduct?.variants && initialProduct.variants.length === 1 && !initialProduct.variantTypes?.length) {
      return initialProduct.variants[0].estimatedHours || initialProduct.defaultEstimatedHours || 0;
    }
    return initialProduct?.defaultEstimatedHours ?? 0;
  });
  const [singleBom, setSingleBom] = useState<BOMItem[]>(() => {
    if (initialProduct?.variants && initialProduct.variants.length === 1 && !initialProduct.variantTypes?.length) {
      return structuredClone(initialProduct.variants[0].bom || []);
    }
    return [];
  });

  // Auto-fill single SKU when name changes if user hasn't manually entered one
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(Boolean(initialProduct?.variants?.[0]?.sku));
  useEffect(() => {
    if (!skuManuallyEdited && name.trim()) {
      setSingleSku(generateSKU(name, {}));
    }
  }, [name, skuManuallyEdited]);

  // Single Product BOM State
  const [isSingleCustomBOM, setIsSingleCustomBOM] = useState<boolean>(() => {
    if (initialProduct?.variants?.[0]) {
      return Boolean(initialProduct.variants[0].isCustomBOM);
    }
    return false;
  });
  const [singlePresetId, setSinglePresetId] = useState<string>(() => {
    if (initialProduct?.variants?.[0]?.presetId) {
      return initialProduct.variants[0].presetId;
    }
    return bomTemplates[0]?.id || '';
  });
  const [singleNewMatId, setSingleNewMatId] = useState<string>('');
  const [singleNewMatQty, setSingleNewMatQty] = useState<number>(1);
  const [singleCloneMsg, setSingleCloneMsg] = useState<string | null>(null);

  // Compute effective single BOM based on mode
  const effectiveSingleBom = useMemo(() => {
    return getEffectiveVariantBOM(
      { presetId: singlePresetId, isCustomBOM: isSingleCustomBOM, bom: singleBom },
      bomTemplateItems
    );
  }, [singlePresetId, isSingleCustomBOM, singleBom, bomTemplateItems]);

  const toggleSingleCustomBOM = () => {
    if (!isSingleCustomBOM) {
      if (singleBom.length === 0 && effectiveSingleBom.length > 0) {
        setSingleBom(structuredClone(effectiveSingleBom));
      }
      setIsSingleCustomBOM(true);
    } else {
      setIsSingleCustomBOM(false);
    }
  };

  // Filter available materials for Single Product BOM (exclude materials already in singleBom)
  const availableMaterialsForSingle = useMemo(() => {
    return materials.filter(m => !effectiveSingleBom.some(b => b.materialId === m.id));
  }, [materials, effectiveSingleBom]);

  // ── 3. Multi-Variant States (when hasVariants === true) ─────────────────────
  const [defaultVariantPrice, setDefaultVariantPrice] = useState<number>(initialProduct?.basePrice ?? 0);
  const [defaultVariantRoutingId, setDefaultVariantRoutingId] = useState<string>(initialProduct?.defaultRoutingId || '');
  const [defaultVariantEstimatedHours, setDefaultVariantEstimatedHours] = useState<number>(initialProduct?.defaultEstimatedHours ?? 0);

  const [variantTypes, setVariantTypes] = useState<VariantType[]>(() => {
    if (initialProduct?.variantTypes && initialProduct.variantTypes.length > 0) {
      return structuredClone(initialProduct.variantTypes);
    }
    return [];
  });

  // Tracking new attribute value input per variant type
  const [newAttributeValues, setNewAttributeValues] = useState<Record<number, string>>({});

  const [variants, setVariants] = useState<ProductVariantSKU[]>(() => {
    if (initialProduct?.variants && initialProduct.variants.length > 0) {
      return structuredClone(initialProduct.variants);
    }
    return [];
  });

  // Multi-variant combinations generator
  useEffect(() => {
    if (!hasVariants) return;

    const activeTypes = variantTypes.filter(vt => vt.name.trim() && vt.values.length > 0);
    if (activeTypes.length === 0) {
      setVariants([]);
      return;
    }

    // Generate cartesian product
    const combinations = activeTypes.reduce<Record<string, string>[]>((acc, vt) => {
      const nextAcc: Record<string, string>[] = [];
      acc.forEach(combo => {
        vt.values.forEach(val => {
          nextAcc.push({ ...combo, [vt.name.trim()]: val.trim() });
        });
      });
      return nextAcc;
    }, [{}]);

    setVariants(prevVariants => {
      return combinations.map(combo => {
        const existing = prevVariants.find(v => {
          const vKeys = Object.keys(v.combination);
          const cKeys = Object.keys(combo);
          if (vKeys.length !== cKeys.length) return false;
          return cKeys.every(k => v.combination[k] === combo[k]);
        });

        if (existing) {
          return { ...existing, combination: combo };
        }

        return {
          id: `var-${generateId()}`,
          sku: name ? generateSKU(name, combo) : '',
          combination: combo,
          price: defaultVariantPrice || 0,
          estimatedHours: defaultVariantEstimatedHours || 0,
          routingId: defaultVariantRoutingId || '',
          bom: [],
          isActive: true,
        };
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVariants, variantTypes]);

  // ── 4. Modifiers & UI States ───────────────────────────────────────────────
  const [modifierGroupIds, setModifierGroupIds] = useState<string[]>(
    initialProduct?.modifierGroupIds ? [...initialProduct.modifierGroupIds] : []
  );

  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Sub-Assembly expandable rows state
  const [expandedSubAssemblies, setExpandedSubAssemblies] = useState<Record<string, boolean>>({});

  const toggleSubAssemblyExpand = (key: string) => {
    setExpandedSubAssemblies(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Variant Modal BOM
  const [editingBOMVariantId, setEditingBOMVariantId] = useState<string | null>(null);
  const [modalPresetTemplateId, setModalPresetTemplateId] = useState<string>('');
  const [modalNewMaterialId, setModalNewMaterialId] = useState<string>('');
  const [modalNewMaterialQty, setModalNewMaterialQty] = useState<number>(1);
  const [modalCloneFeedback, setModalCloneFeedback] = useState<string | null>(null);

  const activeEditingVariant = useMemo(() => {
    return variants.find(v => v.id === editingBOMVariantId) || null;
  }, [variants, editingBOMVariantId]);

  // Filter available materials for active variant in modal (exclude materials already in variant.bom)
  const availableMaterialsForVariant = useMemo(() => {
    if (!activeEditingVariant) return [];
    return materials.filter(m => !activeEditingVariant.bom.some(b => b.materialId === m.id));
  }, [materials, activeEditingVariant]);

  // ── Batch Edit / Bulk Update State ──────────────────────────────────────
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [attrFilterSelections, setAttrFilterSelections] = useState<Record<string, string>>({});
  const [bulkField, setBulkField] = useState<'price' | 'price_adjust' | 'estimatedHours' | 'routingId' | 'isActive' | 'presetId' | 'isCustomBOM'>('price');
  const [bulkValPrice, setBulkValPrice] = useState<number>(0);
  const [bulkValEstimatedHours, setBulkValEstimatedHours] = useState<number>(0);
  const [bulkValAdjustType, setBulkValAdjustType] = useState<'percent_up' | 'percent_down' | 'nominal_up' | 'nominal_down'>('percent_up');
  const [bulkValAdjustVal, setBulkValAdjustVal] = useState<number>(0);
  const [bulkValRoutingId, setBulkValRoutingId] = useState<string>('');
  const [bulkValIsActive, setBulkValIsActive] = useState<boolean>(true);
  const [bulkValPresetId, setBulkValPresetId] = useState<string>('');
  const [bulkValIsCustomBOM, setBulkValIsCustomBOM] = useState<boolean>(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  // Attribute Combination Selection Helper
  const applyAttributeFilterToSelection = (newSelections: Record<string, string>) => {
    setAttrFilterSelections(newSelections);

    const activeFilterEntries = Object.entries(newSelections).filter(([_, val]) => val && val !== 'ALL');

    if (activeFilterEntries.length === 0) {
      setSelectedVariantIds(variants.map(v => v.id));
      return;
    }

    const matchingIds = variants
      .filter(v => {
        return activeFilterEntries.every(([attrName, attrVal]) => v.combination[attrName] === attrVal);
      })
      .map(v => v.id);

    setSelectedVariantIds(matchingIds);
  };

  // Selection Checkbox Helpers
  const isAllSelected = useMemo(() => {
    return variants.length > 0 && selectedVariantIds.length === variants.length;
  }, [variants, selectedVariantIds]);

  const toggleSelectAll = () => {
    setAttrFilterSelections({});
    if (isAllSelected) {
      setSelectedVariantIds([]);
    } else {
      setSelectedVariantIds(variants.map(v => v.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedVariantIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApplyBatchEdit = () => {
    if (selectedVariantIds.length === 0) {
      toast.warning('Pilih Varian', 'Pilih minimal 1 varian dengan mencentang kotak varian.');
      return;
    }

    let count = 0;
    setVariants(prev => prev.map(v => {
      if (!selectedVariantIds.includes(v.id)) return v;
      count++;

      if (bulkField === 'price') {
        return { ...v, price: bulkValPrice };
      } else if (bulkField === 'estimatedHours') {
        return { ...v, estimatedHours: bulkValEstimatedHours };
      } else if (bulkField === 'price_adjust') {
        let currentPrice = v.price || 0;
        if (bulkValAdjustType === 'percent_up') {
          currentPrice = Math.round(currentPrice * (1 + (bulkValAdjustVal || 0) / 100));
        } else if (bulkValAdjustType === 'percent_down') {
          currentPrice = Math.round(currentPrice * (1 - (bulkValAdjustVal || 0) / 100));
        } else if (bulkValAdjustType === 'nominal_up') {
          currentPrice = currentPrice + (bulkValAdjustVal || 0);
        } else if (bulkValAdjustType === 'nominal_down') {
          currentPrice = Math.max(0, currentPrice - (bulkValAdjustVal || 0));
        }
        return { ...v, price: currentPrice };
      } else if (bulkField === 'routingId') {
        return { ...v, routingId: bulkValRoutingId };
      } else if (bulkField === 'isActive') {
        return { ...v, isActive: bulkValIsActive };
      } else if (bulkField === 'presetId') {
        return { ...v, presetId: bulkValPresetId };
      } else if (bulkField === 'isCustomBOM') {
        let newBom = v.bom;
        if (bulkValIsCustomBOM && (!v.bom || v.bom.length === 0)) {
          const eff = getEffectiveVariantBOM({ presetId: v.presetId, isCustomBOM: false }, bomTemplateItems);
          newBom = structuredClone(eff);
        }
        return { ...v, isCustomBOM: bulkValIsCustomBOM, bom: newBom };
      }
      return v;
    }));

    setBatchFeedback(`Berhasil memperbarui ${count} varian terpilih.`);
    setTimeout(() => setBatchFeedback(null), 3500);
  };

  // ── Variant Types Handlers (Chip/Tag Based) ────────────────────────────────
  const addVariantType = () => {
    setVariantTypes(prev => [...prev, { name: '', values: [] }]);
  };

  const updateVariantTypeName = (idx: number, newName: string) => {
    setVariantTypes(prev => prev.map((vt, i) => (i === idx ? { ...vt, name: newName } : vt)));
  };

  const addVariantTypeValue = (typeIdx: number) => {
    const val = (newAttributeValues[typeIdx] || '').trim();
    if (!val) return;

    setVariantTypes(prev => prev.map((vt, i) => {
      if (i !== typeIdx) return vt;
      if (vt.values.includes(val)) return vt;
      return { ...vt, values: [...vt.values, val] };
    }));
    setNewAttributeValues(prev => ({ ...prev, [typeIdx]: '' }));
  };

  const removeVariantTypeValue = (typeIdx: number, valIdx: number) => {
    setVariantTypes(prev => prev.map((vt, i) => {
      if (i !== typeIdx) return vt;
      return { ...vt, values: vt.values.filter((_, vi) => vi !== valIdx) };
    }));
  };

  const removeVariantType = (idx: number) => {
    setVariantTypes(prev => prev.filter((_, i) => i !== idx));
    setNewAttributeValues(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const importFromGlobalAttribute = (attrId: string) => {
    const found = attributes.find(a => a.id === attrId);
    if (!found) return;
    setVariantTypes(prev => {
      const exists = prev.some(vt => vt.name.toLowerCase() === found.name.toLowerCase());
      if (exists) return prev;
      return [...prev, { name: found.name, values: [...found.values] }];
    });
  };

  const updateVariantField = <K extends keyof ProductVariantSKU>(
    variantId: string,
    field: K,
    val: ProductVariantSKU[K]
  ) => {
    setVariants(prev => prev.map(v => (v.id === variantId ? { ...v, [field]: val } : v)));
  };

  // ── BOM Handlers (Single Product) ──────────────────────────────────────────
  const handleImportPresetToSingleProduct = () => {
    if (!singlePresetId) return;
    const templateItems = bomTemplateItems.filter(item => item.templateId === singlePresetId);
    if (templateItems.length === 0) {
      setSingleCloneMsg('Preset ini belum memiliki daftar material.');
      return;
    }

    // Strict DEEP COPY
    const cloned = templateItems.map(item => ({
      materialId: item.materialId,
      qty: Number(item.defaultQty) || 1,
    }));
    setSingleBom(cloned);

    const tplName = bomTemplates.find(t => t.id === singlePresetId)?.name || 'Preset';
    setSingleCloneMsg(`Berhasil mengimpor ${cloned.length} material dari "${tplName}".`);
    setTimeout(() => setSingleCloneMsg(null), 4000);
  };

  const handleUpdateSingleBomQty = (materialId: string, newQty: number) => {
    const qty = Math.max(0.01, Number(newQty) || 0.01);
    setSingleBom(prev => prev.map(b => (b.materialId === materialId ? { ...b, qty } : b)));
  };

  const handleRemoveSingleBomItem = (materialId: string) => {
    setSingleBom(prev => prev.filter(b => b.materialId !== materialId));
  };

  const handleAddManualMaterialToSingle = () => {
    if (!singleNewMatId) return;
    const qty = Math.max(0.01, Number(singleNewMatQty) || 1);
    setSingleBom(prev => {
      const exists = prev.some(b => b.materialId === singleNewMatId);
      if (exists) {
        return prev.map(b => b.materialId === singleNewMatId ? { ...b, qty: b.qty + qty } : b);
      }
      return [...prev, { materialId: singleNewMatId, qty }];
    });
    setSingleNewMatId('');
    setSingleNewMatQty(1);
  };

  // ── BOM Handlers (Modal for Multi-Variant) ──────────────────────────────────
  const handleImportPresetToActiveVariant = () => {
    if (!activeEditingVariant || !modalPresetTemplateId) return;
    const templateItems = bomTemplateItems.filter(item => item.templateId === modalPresetTemplateId);
    if (templateItems.length === 0) {
      setModalCloneFeedback('Preset ini belum memiliki material.');
      return;
    }

    const deepCopiedBOM: BOMItem[] = templateItems.map(item => ({
      materialId: item.materialId,
      qty: Number(item.defaultQty) || 1,
    }));

    setVariants(prev => prev.map(v => {
      if (v.id !== activeEditingVariant.id) return v;
      return { ...v, bom: deepCopiedBOM };
    }));

    const tplName = bomTemplates.find(t => t.id === modalPresetTemplateId)?.name || 'Preset';
    setModalCloneFeedback(`Berhasil mengimpor ${deepCopiedBOM.length} material dari "${tplName}".`);
    setTimeout(() => setModalCloneFeedback(null), 4000);
  };

  const handleUpdateActiveVariantBOMQty = (materialId: string, newQty: number) => {
    if (!activeEditingVariant) return;
    const qtyNum = Math.max(0.01, Number(newQty) || 0.01);
    setVariants(prev => prev.map(v => {
      if (v.id !== activeEditingVariant.id) return v;
      return { ...v, bom: v.bom.map(b => (b.materialId === materialId ? { ...b, qty: qtyNum } : b)) };
    }));
  };

  const handleRemoveActiveVariantBOMItem = (materialId: string) => {
    if (!activeEditingVariant) return;
    setVariants(prev => prev.map(v => {
      if (v.id !== activeEditingVariant.id) return v;
      return { ...v, bom: v.bom.filter(b => b.materialId !== materialId) };
    }));
  };

  const handleAddManualMaterialToActiveVariant = () => {
    if (!activeEditingVariant || !modalNewMaterialId) return;
    const qty = Math.max(0.01, Number(modalNewMaterialQty) || 1);
    setVariants(prev => prev.map(v => {
      if (v.id !== activeEditingVariant.id) return v;
      const exists = v.bom.some(b => b.materialId === modalNewMaterialId);
      let updatedBom: BOMItem[];
      if (exists) {
        updatedBom = v.bom.map(b => b.materialId === modalNewMaterialId ? { ...b, qty: b.qty + qty } : b);
      } else {
        updatedBom = [...v.bom, { materialId: modalNewMaterialId, qty }];
      }
      return { ...v, bom: updatedBom };
    }));
    setModalNewMaterialId('');
    setModalNewMaterialQty(1);
  };

  // ── Helper: Calculate BOM Cost (with recursive Sub-Assembly rollup including labor) ──────
  const calculateBOMCost = (bom: BOMItem[]): number => {
    return calculateRollupBOMCost(bom, materials, routings, operations);
  };

  // ── Save Handler ───────────────────────────────────────────────────────────
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Nama Produk wajib diisi.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!category.trim()) {
      setErrorMessage('Kategori Produk wajib dipilih.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!hasVariants) {
      if (singlePrice <= 0) {
        setErrorMessage('Harga Jual Produk wajib lebih besar dari Rp 0.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } else {
      if (variants.length === 0) {
        setErrorMessage('Tentukan minimal 1 atribut varian dengan nilai untuk membuat daftar varian.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (variants.some(v => v.price <= 0)) {
        setErrorMessage('Semua varian harus memiliki harga jual lebih besar dari Rp 0.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setIsSaving(true);

    try {
      let finalVariants: ProductVariantSKU[];
      let finalBasePrice: number;
      let finalDefaultRoutingId: string | undefined;
      let finalDefaultEstimatedHours: number | undefined;
      let finalVariantTypes: VariantType[];

      if (!hasVariants) {
        finalBasePrice = singlePrice;
        finalDefaultRoutingId = singleRoutingId || undefined;
        finalDefaultEstimatedHours = singleEstimatedHours || undefined;
        finalVariantTypes = [];
        finalVariants = [{
          id: initialProduct?.variants?.[0]?.id || `var-${generateId()}`,
          sku: singleSku.trim() || generateSKU(name, {}),
          combination: {},
          price: singlePrice,
          estimatedHours: singleEstimatedHours || 0,
          routingId: singleRoutingId || undefined,
          presetId: singlePresetId || undefined,
          isCustomBOM: isSingleCustomBOM,
          bom: singleBom,
          isActive: true,
        }];
      } else {
        finalBasePrice = Math.min(...variants.map(v => v.price));
        finalDefaultRoutingId = defaultVariantRoutingId || undefined;
        finalDefaultEstimatedHours = defaultVariantEstimatedHours || undefined;
        finalVariantTypes = variantTypes.filter(vt => vt.name.trim() && vt.values.length > 0);
        finalVariants = variants.map(v => ({
          ...v,
          sku: v.sku.trim() || generateSKU(name, v.combination),
        }));
      }

      const productPayload: Omit<Product, 'id'> = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        imageIcon,
        basePrice: finalBasePrice,
        defaultRoutingId: finalDefaultRoutingId,
        defaultEstimatedHours: finalDefaultEstimatedHours,
        variantTypes: finalVariantTypes,
        variants: finalVariants,
        modifierGroupIds,
      };

      if (isEditMode && initialProduct) {
        updateProduct(initialProduct.id, productPayload);
        toast.success('Produk Diperbarui', `Produk "${productPayload.name}" berhasil diperbarui.`);
      } else {
        addProduct(productPayload);
        toast.success('Produk Ditambahkan', `Produk "${productPayload.name}" berhasil ditambahkan.`);
      }

      router.push('/products');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan produk.');
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-5xl mx-auto space-y-6 pb-28">
      {/* ── Page Header ── */}
      <PageHeader
        backHref="/products"
        title={isEditMode ? `Edit Produk: ${initialProduct.name}` : 'Tambah Produk Baru'}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/products')}
          disabled={isSaving}
        >
          Batal
        </Button>
        <Button type="submit" variant="primary" disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Simpan Produk'}
        </Button>
      </PageHeader>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">{errorMessage}</div>
          <button type="button" onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── CARD 1: Informasi Dasar Produk & Toggle Varian ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Info className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            1. Informasi Dasar Produk
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Produk <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Dipan Minimalis Modern Fabric"
              inputSize="sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kategori <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                + Kelola Kategori
              </button>
            </div>
            <Select
              value={category}
              onChange={e => setCategory(e.target.value)}
              inputSize="sm"
              placeholder="-- Pilih Kategori Produk --"
            >
              {productCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              {!productCategories.includes(category) && category && (
                <option value={category}>{category}</option>
              )}
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi Produk <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Spesifikasi umum, material unggulan, atau catatan produksi..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ikon Tampilan
            </label>
            <div className="flex items-center gap-2">
              {iconOptions.map(ico => {
                const Comp = iconMap[ico] || Box;
                const active = imageIcon === ico;
                return (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => setImageIcon(ico)}
                    className={`flex-1 flex items-center justify-center p-2 rounded-lg border transition-all ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-bold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Comp className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Toggle Sederhana: Produk Varian ── */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Produk Varian</span>
              {hasVariants && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 text-[10px] font-bold">
                  Aktif
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Aktifkan jika produk ini memiliki pilihan variasi (seperti ukuran, warna, atau bahan).
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={hasVariants}
            onClick={() => setHasVariants(prev => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
              hasVariants ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                hasVariants ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          KONDISI A: PRODUK TUNGGAL (Clean, direct, without complex tables)
         ════════════════════════════════════════════════════════════════════════ */}
      {!hasVariants && (
        <>
          {/* CARD: Harga & Identifikasi SKU */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                2. Harga Jual & Identifikasi SKU
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Harga Jual */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Harga Jual Produk (Rp) <span className="text-red-500">*</span>
                </label>
                <CurrencyInput
                  value={singlePrice || ''}
                  onChange={val => setSinglePrice(typeof val === 'number' ? val : 0)}
                  placeholder="0"
                  inputSize="sm"
                />
              </div>
            </div>

            {/* Pengaturan Produksi Produk Tunggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Alur Routing Produksi <span className="text-[10px] font-normal text-slate-400">(Opsional)</span>
                </label>
                <Select
                  value={singleRoutingId}
                  onChange={e => setSingleRoutingId(e.target.value)}
                  inputSize="sm"
                >
                  <option value="">Tanpa Routing (Non-SPK Otomatis)</option>
                  {routings.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Estimasi Jam Kerja Produksi <span className="text-[10px] font-normal text-slate-400">(Jam)</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={singleEstimatedHours || ''}
                  onChange={e => setSingleEstimatedHours(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  inputSize="sm"
                />
              </div>
            </div>
          </div>

          {/* CARD: Blueprint BOM Produk Tunggal */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    3. Blueprint Bill of Materials (BOM)
                  </h2>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Estimasi HPP Material: <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold ml-1">{formatCurrency(calculateBOMCost(effectiveSingleBom))}</strong>
                </div>
              </div>

              {/* Control Panel: Master Preset & Custom BOM Toggle */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                  <div className="space-y-0.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Pilih Master Preset BOM:
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Resep material standar bawaan dari Katalog Preset
                    </p>
                  </div>
                  <select
                    value={singlePresetId}
                    onChange={e => setSinglePresetId(e.target.value)}
                    className="sm:w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Pilih Master Preset BOM --</option>
                    {bomTemplates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>

                {/* Mode Custom BOM Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mode BOM Produk:</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isSingleCustomBOM
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                    }`}>
                      {isSingleCustomBOM ? (
                        <><Unlock className="h-3 w-3" /> Custom BoM (Khusus Produk Ini)</>
                      ) : (
                        <><Lock className="h-3 w-3" /> Sesuai Preset (Terhubung Live Master)</>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSingleCustomBOM}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isSingleCustomBOM ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    title={isSingleCustomBOM ? 'Beralih ke Mode Sesuai Preset' : 'Beralih ke Mode Custom BoM'}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isSingleCustomBOM ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Information Banner */}
                {!isSingleCustomBOM ? (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-indigo-900 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-300 text-[11px]">
                    <Info className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Mode Sesuai Preset Aktif (Read-Only)</strong> — BOM produk ini terhubung live ke Master Preset. Perubahan pada Master Preset BOM di Katalog akan <strong>otomatis memperbarui</strong> produk ini. Untuk mengubah material khusus produk ini, aktifkan toggle <strong>Mode Custom BoM</strong>.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 text-[11px]">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Mode Custom BoM Aktif</strong> — Anda bebas menambah, menghapus, dan mengubah kuantitas bahan baku. Perubahan pada Master Preset BOM di Katalog <strong>tidak akan mempengaruhi</strong> produk ini.
                    </div>
                  </div>
                )}
              </div>

              {/* Tabel Material Tunggal */}
              {effectiveSingleBom.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 text-slate-400">
                  <Layers className="h-7 w-7 mx-auto mb-1.5 opacity-50 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Belum ada bahan baku pada produk ini.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pilih preset di atas atau aktifkan Mode Custom BoM untuk membuat resep manual.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3 py-2">Bahan Baku</th>
                        <th className="px-3 py-2 text-right">Biaya Satuan</th>
                        <th className="px-3 py-2 text-center w-28">Kuantitas</th>
                        <th className="px-3 py-2 text-center w-20">Satuan</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                        {isSingleCustomBOM && <th className="px-2 py-2 text-center w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {effectiveSingleBom.map((item, idx) => {
                        const mat = materials.find(m => m.id === item.materialId);
                        const unitCost = mat?.unitCost || 0;
                        const subtotal = unitCost * item.qty;
                        const isExpanded = Boolean(expandedSubAssemblies[`single-${item.materialId}`]);

                        return (
                          <React.Fragment key={idx}>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-white">{mat?.name || item.materialId}</span>
                                  {mat?.isSubAssembly && (
                                    <>
                                      <Badge variant="purple">Sub-Assembly</Badge>
                                      <button
                                        type="button"
                                        onClick={() => toggleSubAssemblyExpand(`single-${item.materialId}`)}
                                        className="p-0.5 rounded text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-950/60 transition-colors"
                                        title={isExpanded ? 'Sembunyikan Child BOM' : 'Lihat Child BOM'}
                                      >
                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                      </button>
                                    </>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">{mat?.code} • {mat?.category}</div>
                              </td>
                              <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300 font-medium">
                                {formatCurrency(unitCost)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {isSingleCustomBOM ? (
                                  <input
                                    type="number"
                                    min={0.01}
                                    step={0.01}
                                    value={item.qty}
                                    onChange={e => handleUpdateSingleBomQty(item.materialId, parseFloat(e.target.value) || 0)}
                                    className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-right dark:border-slate-700 dark:bg-slate-800 dark:text-white mx-auto"
                                  />
                                ) : (
                                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{item.qty}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {mat?.unit || 'unit'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                                {formatCurrency(subtotal)}
                              </td>
                              {isSingleCustomBOM && (
                                <td className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSingleBomItem(item.materialId)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                                    title="Hapus Material"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>

                            {mat?.isSubAssembly && isExpanded && (
                              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                <td colSpan={isSingleCustomBOM ? 6 : 5} className="px-4 py-3 border-t border-b border-slate-100 dark:border-slate-800">
                                  <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-semibold">
                                      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold">
                                        <Layers className="h-3.5 w-3.5" /> Material Penyusun Sub-Assembly ({mat.name}):
                                      </span>
                                      <span className="text-[10px] italic text-slate-400">
                                        (Bahan penyusun terkunci dari Master BOM Sub-Assembly di Inventory)
                                      </span>
                                    </div>
                                    <div className="rounded-lg border border-purple-100 dark:border-purple-900/40 overflow-hidden bg-white dark:bg-slate-900">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 text-[10px] font-bold">
                                          <tr>
                                            <th className="px-3 py-1.5">Material Child</th>
                                            <th className="px-3 py-1.5 text-center">Qty / Sub-Assembly</th>
                                            <th className="px-3 py-1.5 text-center">Total Qty Kebutuhan</th>
                                            <th className="px-3 py-1.5 text-right">Biaya Satuan</th>
                                            <th className="px-3 py-1.5 text-right">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                          {(mat.childBom || []).map((child, cIdx) => {
                                            const cMat = materials.find(m => m.id === child.materialId);
                                            const cUnitCost = cMat?.unitCost || 0;
                                            const totalQty = child.qty * item.qty;
                                            const cSubtotal = cUnitCost * totalQty;

                                            return (
                                              <tr key={cIdx}>
                                                <td className="px-3 py-1.5 font-medium">
                                                  {cMat?.name || child.materialId}
                                                  <span className="text-[10px] text-slate-400 ml-1 font-normal">({cMat?.code})</span>
                                                </td>
                                                <td className="px-3 py-1.5 text-center font-mono">{child.qty} {cMat?.unit}</td>
                                                <td className="px-3 py-1.5 text-center font-mono font-bold">{totalQty} {cMat?.unit}</td>
                                                <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(cUnitCost)}</td>
                                                <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(cSubtotal)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50/80 dark:bg-slate-800/60 font-bold border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          Total Estimasi HPP Material Produk
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(calculateBOMCost(effectiveSingleBom))}
                        </td>
                        {isSingleCustomBOM && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Tambah Material Manual (Hanya pada Mode Custom BoM) */}
              {isSingleCustomBOM && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <select
                    value={singleNewMatId}
                    onChange={e => setSingleNewMatId(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm"
                  >
                    <option value="">
                      {availableMaterialsForSingle.length > 0
                        ? '+ Tambah Material / Sub-Assembly ke BOM...'
                        : '-- Semua material telah ditambahkan ke BOM --'}
                    </option>
                    {availableMaterialsForSingle.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.category}] {m.name} {m.isSubAssembly ? '(Sub-Assembly) ' : ''}— {formatCurrency(m.unitCost)} / {m.unit}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={singleNewMatQty}
                      onChange={e => setSingleNewMatQty(parseFloat(e.target.value) || 1)}
                      placeholder="Qty"
                      disabled={!singleNewMatId}
                      className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-right dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm disabled:opacity-50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddManualMaterialToSingle}
                      disabled={!singleNewMatId}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Tambah
                    </Button>
                  </div>
                </div>
              )}
            </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          KONDISI B: PRODUK BERVARIAN (Spesifikasi Atribut + Tabel Kombinasi)
         ════════════════════════════════════════════════════════════════════════ */}
      {hasVariants && (
        <>
          {/* CARD: Tipe Atribut Varian (Input -> Add Chip) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    2. Atribut Spesifikasi Varian
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tentukan nama atribut dan tambahkan nilai satu per satu menggunakan input di bawah.
                  </p>
                </div>
              </div>
            </div>

            {variantTypes.length === 0 ? (
              <div className="text-center py-7 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 text-slate-500 space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum ada atribut varian yang dibuat.</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Klik tombol <strong>+ Tambah Atribut Baru</strong> atau gunakan <strong>Impor dari Master Atribut Global</strong> di bawah.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {variantTypes.map((vt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs space-y-3"
                  >
                    {/* ROW 1: Nama Atribut, Input Nilai Baru + Button Tambah Nilai, and Hapus Atribut (Parallel) */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                      {/* Col 1: Nama Atribut */}
                      <div className="w-full md:w-56 shrink-0">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Nama Atribut #{idx + 1}
                        </label>
                        <Input
                          type="text"
                          value={vt.name}
                          onChange={e => updateVariantTypeName(idx, e.target.value)}
                          placeholder="Contoh: Ukuran / Warna"
                          inputSize="sm"
                          className="w-full"
                        />
                      </div>

                      {/* Col 2: Input Nilai Baru & Button Tambah Nilai (Sejajar) */}
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Input Nilai Baru
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={newAttributeValues[idx] || ''}
                            onChange={e => setNewAttributeValues(prev => ({ ...prev, [idx]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addVariantTypeValue(idx);
                              }
                            }}
                            placeholder={vt.values.length === 0 ? "Ketik nilai (misal: 120x200 cm) lalu Enter..." : "Ketik nilai baru lalu Enter..."}
                            inputSize="sm"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => addVariantTypeValue(idx)}
                            disabled={!newAttributeValues[idx]?.trim()}
                            className="h-8 px-3 text-xs font-semibold shrink-0 rounded-md"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Nilai
                          </Button>
                        </div>
                      </div>

                      {/* Col 3: Hapus Atribut Button */}
                      <div className="shrink-0 self-end">
                        <button
                          type="button"
                          onClick={() => removeVariantType(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors dark:hover:bg-red-950/40 h-8 w-8 flex items-center justify-center border border-transparent"
                          title="Hapus Seluruh Atribut Ini"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* ROW 2: Hasil nilai yang sudah diinput (Placed Underneath) */}
                    <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Hasil Nilai Di-input ({vt.values.length} Opsi)
                        </span>
                      </div>

                      {vt.values.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-h-[38px]">
                          {vt.values.map((val, vIdx) => (
                            <span
                              key={vIdx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 shadow-xs"
                            >
                              <span>{val}</span>
                              <button
                                type="button"
                                onClick={() => removeVariantTypeValue(idx, vIdx)}
                                className="text-indigo-400 hover:text-red-500 rounded transition-colors"
                                title={`Hapus ${val}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2 rounded-md border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/40 text-center">
                          <span className="text-xs text-slate-400 italic">Belum ada nilai yang diinput. Ketik nilai di atas lalu klik &quot;Tambah Nilai&quot; atau tekan Enter.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={addVariantType}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Tambah Atribut Baru
              </Button>

              {attributes && attributes.length > 0 && (
                <div className="flex-1">
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        importFromGlobalAttribute(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="w-full rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors shadow-xs"
                  >
                    <option value="" disabled>+ Impor dari Master Atribut Global...</option>
                    {attributes.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.values.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* CARD: List Daftar Varian & SKU (Tampilan List 2-Baris Standard Industri) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    3. Daftar Varian Fisik & SKU ({variants.length} Kombinasi)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Setiap varian fisik memiliki harga jual, estimasi jam kerja produksi, kode SKU, dan blueprint BOM masing-masing.
                </p>
              </div>

              {/* Default Settings Bar for Multi-Variant */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs shrink-0">
                <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" /> Default Jam Kerja:
                </span>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={defaultVariantEstimatedHours || ''}
                  onChange={e => {
                    const hours = parseFloat(e.target.value) || 0;
                    setDefaultVariantEstimatedHours(hours);
                    setVariants(prev => prev.map(v => ({ ...v, estimatedHours: v.estimatedHours || hours })));
                  }}
                  placeholder="0"
                  inputSize="sm"
                  containerClassName="w-16"
                  className="font-bold text-center"
                />
                <span className="text-slate-400 font-medium">Jam</span>
              </div>
            </div>

            {/* Professional Enterprise Batch Actions Bar */}
            {variants.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50 space-y-3 text-xs">
                {/* Baris 1: Filter Seleksi Berdasarkan Atribut / Kombinasi */}
                {variantTypes.filter(vt => vt.name.trim() && vt.values.length > 0).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Filter Seleksi Varian:</span>
                    {variantTypes
                      .filter(vt => vt.name.trim() && vt.values.length > 0)
                      .map(vt => {
                        const currentVal = attrFilterSelections[vt.name.trim()] || 'ALL';
                        return (
                          <div key={vt.name} className="flex items-center gap-1">
                            <span className="text-[11px] font-medium text-slate-500">{vt.name.trim()}:</span>
                            <Select
                              value={currentVal}
                              onChange={e => {
                                const updated = { ...attrFilterSelections, [vt.name.trim()]: e.target.value };
                                applyAttributeFilterToSelection(updated);
                              }}
                              inputSize="sm"
                              containerClassName="w-auto"
                            >
                              <option value="ALL">Semua ({vt.values.length} Nilai)</option>
                              {vt.values.map(val => (
                                <option key={val} value={val}>
                                  {val}
                                </option>
                              ))}
                            </Select>
                          </div>
                        );
                      })}

                    {Object.values(attrFilterSelections).some(v => v && v !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => applyAttributeFilterToSelection({})}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400 ml-1"
                      >
                        Reset Filter Atribut
                      </button>
                    )}
                  </div>
                )}

                {/* Baris 2: Controls Checkbox & Batch Edit */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                      <span>Pilih Semua ({selectedVariantIds.length}/{variants.length} Terpilih)</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Edit Massal:</span>
                    
                    {/* Dropdown Field Selector */}
                    <Select
                      value={bulkField}
                      onChange={e => setBulkField(e.target.value as any)}
                      inputSize="sm"
                      containerClassName="w-auto"
                    >
                      <option value="price">Harga Jual (Nominal Rp)</option>
                      <option value="price_adjust">Harga Jual (Penyesuaian % / Rp)</option>
                      <option value="estimatedHours">Estimasi Jam Kerja Produksi (Jam)</option>
                      <option value="presetId">Master Preset BOM</option>
                      <option value="isCustomBOM">Mode Custom BoM (ON/OFF)</option>
                      <option value="routingId">Alur Routing Produksi</option>
                      <option value="isActive">Status Aktif Varian</option>
                    </Select>

                    {/* Input Dynamic Component according to selected Field */}
                    {bulkField === 'price' && (
                      <CurrencyInput
                        value={bulkValPrice || ''}
                        onChange={val => setBulkValPrice(typeof val === 'number' ? val : 0)}
                        placeholder="0"
                        inputSize="sm"
                        containerClassName="w-36"
                      />
                    )}

                    {bulkField === 'estimatedHours' && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={bulkValEstimatedHours || ''}
                          onChange={e => setBulkValEstimatedHours(parseFloat(e.target.value) || 0)}
                          placeholder="Jam"
                          inputSize="sm"
                          containerClassName="w-20"
                          className="font-mono font-bold"
                        />
                        <span className="text-xs font-semibold text-slate-500">Jam</span>
                      </div>
                    )}

                    {bulkField === 'price_adjust' && (
                      <div className="flex items-center gap-1">
                        <Select
                          value={bulkValAdjustType}
                          onChange={e => setBulkValAdjustType(e.target.value as any)}
                          inputSize="sm"
                          containerClassName="w-auto"
                        >
                          <option value="percent_up">+ Persen (%)</option>
                          <option value="percent_down">- Persen (%)</option>
                          <option value="nominal_up">+ Nominal (Rp)</option>
                          <option value="nominal_down">- Nominal (Rp)</option>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          value={bulkValAdjustVal}
                          onChange={e => setBulkValAdjustVal(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          inputSize="sm"
                          containerClassName="w-20"
                          className="font-mono font-bold"
                        />
                      </div>
                    )}

                    {bulkField === 'presetId' && (
                      <Select
                        value={bulkValPresetId}
                        onChange={e => setBulkValPresetId(e.target.value)}
                        inputSize="sm"
                        containerClassName="max-w-[200px]"
                      >
                        <option value="">-- Pilih Master Preset BOM --</option>
                        {bomTemplates.map(tpl => (
                          <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                        ))}
                      </Select>
                    )}

                    {bulkField === 'isCustomBOM' && (
                      <Select
                        value={bulkValIsCustomBOM ? 'true' : 'false'}
                        onChange={e => setBulkValIsCustomBOM(e.target.value === 'true')}
                        inputSize="sm"
                        containerClassName="w-auto"
                      >
                        <option value="false">Sesuai Preset (Master Live)</option>
                        <option value="true">Custom BoM (Kustom Varian)</option>
                      </Select>
                    )}

                    {bulkField === 'routingId' && (
                      <Select
                        value={bulkValRoutingId}
                        onChange={e => setBulkValRoutingId(e.target.value)}
                        inputSize="sm"
                        containerClassName="max-w-[200px]"
                      >
                        <option value="">-- Pilih Alur Routing --</option>
                        {routings.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </Select>
                    )}

                    {bulkField === 'isActive' && (
                      <Select
                        value={bulkValIsActive ? 'true' : 'false'}
                        onChange={e => setBulkValIsActive(e.target.value === 'true')}
                        inputSize="sm"
                        containerClassName="w-auto"
                      >
                        <option value="true">Aktif</option>
                        <option value="false">Non-Aktif</option>
                      </Select>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleApplyBatchEdit}
                      disabled={selectedVariantIds.length === 0}
                      className="text-xs px-3 font-semibold"
                    >
                      Terapkan ke {selectedVariantIds.length} Varian
                    </Button>
                  </div>
                </div>

                {batchFeedback && (
                  <div className="w-full text-emerald-600 dark:text-emerald-400 font-semibold text-xs pt-1">
                    ✓ {batchFeedback}
                  </div>
                )}
              </div>
            )}

            {/* List 2-Baris Varian */}
            {variants.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 text-slate-400">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Belum ada kombinasi varian terbentuk.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tambahkan nama atribut dan tambahkan nilai-nilai di Bagian 2 di atas.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {variants.map(variant => {
                  const comboEntries = Object.entries(variant.combination);
                  const label = comboEntries.length > 0
                    ? comboEntries.map(([k, v]) => `${k}: ${v}`).join(' • ')
                    : 'Standar';

                  const effectiveBom = getEffectiveVariantBOM(variant, bomTemplateItems);
                  const bomCost = calculateBOMCost(effectiveBom);
                  const hasBom = effectiveBom.length > 0;
                  const isSelected = selectedVariantIds.includes(variant.id);
                  const isCustom = Boolean(variant.isCustomBOM);

                  return (
                    <div
                      key={variant.id}
                      className={`rounded-2xl border transition-all duration-200 p-4 space-y-3.5 shadow-sm ${
                        isSelected
                          ? 'border-indigo-500/80 bg-indigo-50/30 dark:border-indigo-500/70 dark:bg-indigo-950/20 ring-1 ring-indigo-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* ROW 1: Header (Checkbox, Kombinasi Badge, Kode SKU, & Status Toggle) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(variant.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer shrink-0"
                          />

                          {/* Badge Kombinasi Spesifikasi */}
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60 text-xs font-bold shrink-0">
                            <Tag className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{label}</span>
                          </div>

                          {/* Field SKU */}
                          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">SKU:</span>
                            <Input
                              type="text"
                              value={variant.sku}
                              onChange={e => updateVariantField(variant.id, 'sku', e.target.value)}
                              placeholder="Kode SKU"
                              inputSize="sm"
                              className="font-mono font-bold uppercase"
                            />
                          </div>
                        </div>

                        {/* Right Status Switch & Action */}
                        <div className="flex items-center gap-3 shrink-0">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Status Varian:</span>
                            <button
                              type="button"
                              onClick={() => updateVariantField(variant.id, 'isActive', !variant.isActive)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                variant.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            >
                              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                variant.isActive ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </button>
                            <span className={`text-xs font-bold ${variant.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {variant.isActive ? 'Aktif' : 'Non-Aktif'}
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* ROW 2: Input Grid 4-Column (Harga, Estimasi Jam Kerja, Alur Routing, BOM Blueprint) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end pt-0.5">
                        {/* Col 1: Harga Jual */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Harga Jual (Rp)
                          </label>
                          <CurrencyInput
                            value={variant.price || ''}
                            onChange={val => updateVariantField(variant.id, 'price', typeof val === 'number' ? val : 0)}
                            placeholder="0"
                            inputSize="sm"
                          />
                        </div>

                        {/* Col 2: Estimasi Jam Kerja Produksi */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-indigo-500" /> Est. Jam Kerja (Jam)
                          </label>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={variant.estimatedHours ?? ''}
                            onChange={e => updateVariantField(variant.id, 'estimatedHours', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            inputSize="sm"
                            className="font-bold"
                          />
                        </div>

                        {/* Col 3: Alur Routing Produksi */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Wrench className="h-3.5 w-3.5 text-slate-500" /> Alur Routing
                          </label>
                          <Select
                            value={variant.routingId || ''}
                            onChange={e => updateVariantField(variant.id, 'routingId', e.target.value)}
                            inputSize="sm"
                          >
                            <option value="">Tanpa Routing</option>
                            {routings.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </Select>
                        </div>

                        {/* Col 4: Blueprint BOM & HPP */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span className="flex items-center gap-1"><Layers3 className="h-3.5 w-3.5 text-purple-500" /> BOM Material</span>
                            {hasBom && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                HPP: {formatCurrency(bomCost)}
                              </span>
                            )}
                          </label>
                          <Button
                            type="button"
                            variant={hasBom ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setEditingBOMVariantId(variant.id);
                              setModalPresetTemplateId(variant.presetId || bomTemplates[0]?.id || '');
                              setModalCloneFeedback(null);
                            }}
                            className={`w-full text-xs h-8 font-semibold justify-between px-3 ${
                              isCustom
                                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-indigo-50/70 text-indigo-900 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {isCustom ? (
                                <Unlock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              )}
                              {hasBom ? `${effectiveBom.length} Material` : 'Atur BOM'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isCustom
                                ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200'
                                : 'bg-indigo-200/80 text-indigo-900 dark:bg-indigo-900/80 dark:text-indigo-200'
                            }`}>
                              {isCustom ? 'Custom' : 'Preset'}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CARD 4 / 5: Modifier & Add-on Opsional ── */}
      {masterModifierGroups && masterModifierGroups.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Settings2 className="h-4 w-4 text-purple-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {hasVariants ? '4. Modifier & Add-on Tambahan (Opsional)' : '4. Modifier & Add-on Tambahan (Opsional)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Opsi tambahan yang dapat dipilih konsumen saat transaksi (misal: penambahan laci atau kain premium).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {masterModifierGroups.map(group => {
              const isChecked = modifierGroupIds.includes(group.id);
              return (
                <label
                  key={group.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-purple-300 bg-purple-50/40 dark:border-purple-800 dark:bg-purple-950/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={e => {
                      if (e.target.checked) setModifierGroupIds(prev => [...prev, group.id]);
                      else setModifierGroupIds(prev => prev.filter(id => id !== group.id));
                    }}
                    className="mt-0.5 rounded border-slate-300 text-purple-600 h-4 w-4 focus:ring-purple-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{group.name}</div>
                    <div className="text-[11px] text-slate-500">{group.options.length} opsi tersedia</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STICKY BOTTOM SAVE BAR ── */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-white">{name || 'Produk Baru'}</span>
          <span className="mx-2">•</span>
          <span>{hasVariants ? `${variants.length} Varian Terdaftar` : 'Produk Standar (1 SKU)'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/products')}
            disabled={isSaving}
          >
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Simpan Produk'}
          </Button>
        </div>
      </div>

      {/* ── MODAL: Kelola Kategori Produk ── */}
      {showCategoryModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCategoryModal(false)}
          title="Kelola Kategori Produk"
          actions={<Button type="button" onClick={() => setShowCategoryModal(false)}>Selesai</Button>}
        >
          <div className="space-y-4 text-xs">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Nama kategori baru..."
                inputSize="sm"
                containerClassName="flex-1"
              />
              <Button
                type="button"
                onClick={() => {
                  if (newCatName.trim()) {
                    addProductCategory(newCatName.trim());
                    setNewCatName('');
                  }
                }}
              >
                + Tambah
              </Button>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {productCategories.map(cat => (
                <div key={cat} className="flex items-center justify-between px-3 py-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{cat}</span>
                  <button
                    type="button"
                    onClick={() => deleteProductCategory(cat)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Kelola BOM Varian Fisik ── */}
      {activeEditingVariant && (() => {
        const isModalCustomBOM = Boolean(activeEditingVariant.isCustomBOM);
        const effectiveModalBom = getEffectiveVariantBOM(activeEditingVariant, bomTemplateItems);
        const modalBomCost = calculateBOMCost(effectiveModalBom);

        const handleModalToggleCustomBOM = () => {
          setVariants(prev => prev.map(v => {
            if (v.id !== activeEditingVariant.id) return v;
            if (!v.isCustomBOM) {
              const currentEff = getEffectiveVariantBOM(v, bomTemplateItems);
              return {
                ...v,
                isCustomBOM: true,
                bom: v.bom.length > 0 ? structuredClone(v.bom) : structuredClone(currentEff),
              };
            } else {
              return {
                ...v,
                isCustomBOM: false,
              };
            }
          }));
        };

        const handleModalChangePreset = (newPresetId: string) => {
          setVariants(prev => prev.map(v => {
            if (v.id !== activeEditingVariant.id) return v;
            return { ...v, presetId: newPresetId };
          }));
        };

        return (
          <Modal
            isOpen={true}
            onClose={() => setEditingBOMVariantId(null)}
            title="Kelola Blueprint BOM Varian"
            size="xl"
            actions={
              <Button
                type="button"
                variant="primary"
                onClick={() => setEditingBOMVariantId(null)}
                className="px-5 shadow-sm"
              >
                Selesai & Simpan Blueprint
              </Button>
            }
          >
            <div className="space-y-4 text-xs">
              {/* Top Variant Banner & Summary KPIs */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 text-white dark:bg-slate-800 border border-slate-800 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                    <Layers3 className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Varian Target</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {Object.entries(activeEditingVariant.combination).length > 0 ? (
                        Object.entries(activeEditingVariant.combination).map(([k, v]) => (
                          <span key={k} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                            <span className="text-slate-400 mr-1">{k}:</span> {v}
                          </span>
                        ))
                      ) : (
                        <span className="font-semibold text-xs text-white">Default Single Variant</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary Stats Badges */}
                <div className="flex items-center gap-3 text-right">
                  <div className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Komponen</div>
                    <div className="text-xs font-bold text-indigo-300 font-mono">
                      {effectiveModalBom.length} Material
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60">
                    <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider font-semibold">Estimasi HPP BOM</div>
                    <div className="text-sm font-black text-emerald-400 font-mono">
                      {formatCurrency(modalBomCost)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Panel: Master Preset & Custom BOM Toggle */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Pilih Master Preset BOM Varian:
                      </label>
                      <Select
                        value={activeEditingVariant.presetId || ''}
                        onChange={e => handleModalChangePreset(e.target.value)}
                        inputSize="sm"
                      >
                        <option value="">-- Pilih Master Preset BOM --</option>
                        {bomTemplates.map(tpl => (
                          <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Mode Toggle Switch */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {isModalCustomBOM ? 'Custom BoM' : 'Sesuai Preset'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 flex items-center justify-end gap-1">
                        {isModalCustomBOM ? (
                          <><Unlock className="h-3 w-3 text-amber-600" /> Kustom Varian</>
                        ) : (
                          <><Lock className="h-3 w-3 text-emerald-600" /> Live Master</>
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleModalToggleCustomBOM}
                      title={isModalCustomBOM ? 'Beralih ke Mode Sesuai Preset' : 'Beralih ke Mode Custom BoM'}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isModalCustomBOM ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isModalCustomBOM ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Status Mode Alert */}
                {!isModalCustomBOM ? (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300 text-xs">
                    <Lock className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <strong className="font-semibold">Mode Sesuai Preset Aktif (Read-Only)</strong> — BOM varian ini terhubung live ke Master Preset. Perubahan pada Master Preset BOM di Katalog Preset akan <strong>otomatis memperbarui</strong> varian ini. Untuk membuat kustomisasi bahan pada varian ini, aktifkan toggle <strong>Mode Custom BoM</strong>.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 text-xs">
                    <Unlock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <strong className="font-semibold">Mode Custom BoM Aktif</strong> — Anda bebas menambah, menghapus, dan mengubah kuantitas bahan baku pada varian ini. Perubahan pada Master Preset BOM di Katalog <strong>tidak akan mempengaruhi</strong> varian ini.
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2: Material Grid on this Variant */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Rincian Komponen Material Varian
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      {effectiveModalBom.length} Item
                    </span>
                  </div>

                  {isModalCustomBOM && activeEditingVariant.bom.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const isOk = await confirm({
                          title: 'Kosongkan Material BOM',
                          message: 'Apakah Anda yakin ingin mengosongkan semua material BOM kustom pada varian ini?',
                          confirmText: 'Kosongkan BOM',
                          variant: 'danger',
                        });
                        if (isOk) {
                          setVariants(prev => prev.map(v => v.id === activeEditingVariant.id ? { ...v, bom: [] } : v));
                          toast.success('BOM Dikosongkan', 'Material BOM kustom pada varian ini telah dikosongkan.');
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Kosongkan BOM
                    </button>
                  )}
                </div>

                {effectiveModalBom.length === 0 ? (
                  <div className="text-center py-7 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Layers className="h-5 w-5 opacity-60" />
                    </div>
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-200">Belum ada material untuk varian ini.</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      {isModalCustomBOM
                        ? 'Pilih bahan baku di bawah untuk menambahkan material kustom.'
                        : 'Pilih Master Preset BOM di atas untuk memuat material standar.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-3.5 py-2.5">Bahan Baku & Kategori</th>
                          <th className="px-3 py-2.5 text-right">Biaya Satuan</th>
                          <th className="px-3 py-2.5 text-center w-28">Kuantitas Kebutuhan</th>
                          <th className="px-3 py-2.5 text-center w-20">Satuan</th>
                          <th className="px-3.5 py-2.5 text-right">Subtotal HPP</th>
                          {isModalCustomBOM && <th className="px-2 py-2.5 text-center w-10">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {effectiveModalBom.map((item, idx) => {
                          const mat = materials.find(m => m.id === item.materialId);
                          const unitCost = mat?.unitCost || 0;
                          const subtotal = unitCost * item.qty;
                          const isExpanded = Boolean(expandedSubAssemblies[`var-${activeEditingVariant.id}-${item.materialId}`]);

                          return (
                            <React.Fragment key={idx}>
                              <tr className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="px-3.5 py-2.5">
                                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                    <span>{mat?.name || 'Material tidak ditemukan'}</span>
                                    {mat?.isSubAssembly && (
                                      <>
                                        <Badge variant="purple">Sub-Assembly</Badge>
                                        <button
                                          type="button"
                                          onClick={() => toggleSubAssemblyExpand(`var-${activeEditingVariant.id}-${item.materialId}`)}
                                          className="p-0.5 rounded text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-950/60 transition-colors"
                                          title={isExpanded ? 'Sembunyikan Child BOM' : 'Lihat Child BOM'}
                                        >
                                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-mono text-slate-400">{mat?.code || '-'}</span>
                                    <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-900/40">
                                      {mat?.category || 'Umum'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">
                                  {formatCurrency(unitCost)}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {isModalCustomBOM ? (
                                    <Input
                                      type="number"
                                      min={0.01}
                                      step={0.01}
                                      value={item.qty}
                                      onChange={e => handleUpdateActiveVariantBOMQty(item.materialId, parseFloat(e.target.value) || 0)}
                                      inputSize="sm"
                                      containerClassName="w-20 mx-auto"
                                      className="font-mono font-bold text-right"
                                    />
                                  ) : (
                                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                                      {item.qty}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {mat?.unit || 'unit'}
                                  </span>
                                </td>
                                <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(subtotal)}
                                </td>
                                {isModalCustomBOM && (
                                  <td className="px-2 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveActiveVariantBOMItem(item.materialId)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                      title="Hapus Material"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </td>
                                )}
                              </tr>

                              {mat?.isSubAssembly && isExpanded && (
                                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                  <td colSpan={isModalCustomBOM ? 6 : 5} className="px-4 py-3 border-t border-b border-slate-100 dark:border-slate-800">
                                    <div className="space-y-2 text-xs">
                                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-semibold">
                                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold">
                                          <Layers className="h-3.5 w-3.5" /> Material Penyusun Sub-Assembly ({mat.name}):
                                        </span>
                                        <span className="text-[10px] italic text-slate-400">
                                          (Bahan penyusun terkunci dari Master BOM Sub-Assembly di Inventory)
                                        </span>
                                      </div>
                                      <div className="rounded-lg border border-purple-100 dark:border-purple-900/40 overflow-hidden bg-white dark:bg-slate-900">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 text-[10px] font-bold">
                                            <tr>
                                              <th className="px-3 py-1.5">Material Child</th>
                                              <th className="px-3 py-1.5 text-center">Qty / Sub-Assembly</th>
                                              <th className="px-3 py-1.5 text-center">Total Qty Kebutuhan</th>
                                              <th className="px-3 py-1.5 text-right">Biaya Satuan</th>
                                              <th className="px-3 py-1.5 text-right">Subtotal</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                            {(mat.childBom || []).map((child, cIdx) => {
                                              const cMat = materials.find(m => m.id === child.materialId);
                                              const cUnitCost = cMat?.unitCost || 0;
                                              const totalQty = child.qty * item.qty;
                                              const cSubtotal = cUnitCost * totalQty;

                                              return (
                                                <tr key={cIdx}>
                                                  <td className="px-3 py-1.5 font-medium">
                                                    {cMat?.name || child.materialId}
                                                    <span className="text-[10px] text-slate-400 ml-1 font-normal">({cMat?.code})</span>
                                                  </td>
                                                  <td className="px-3 py-1.5 text-center font-mono">{child.qty} {cMat?.unit}</td>
                                                  <td className="px-3 py-1.5 text-center font-mono font-bold">{totalQty} {cMat?.unit}</td>
                                                  <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(cUnitCost)}</td>
                                                  <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(cSubtotal)}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                        <tr>
                          <td colSpan={4} className="px-3.5 py-2.5 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wide">
                            Total Estimasi HPP Material Varian
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-emerald-600 dark:text-emerald-400 text-sm font-mono font-black">
                            {formatCurrency(modalBomCost)}
                          </td>
                          {isModalCustomBOM && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Box 3: Quick Add Material Manual (Only when Custom BoM is active) */}
              {isModalCustomBOM && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <Plus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Tambah Material / Sub-Assembly Manual ke Varian Custom
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Select
                      value={modalNewMaterialId}
                      onChange={e => setModalNewMaterialId(e.target.value)}
                      inputSize="sm"
                      containerClassName="w-full sm:flex-1"
                    >
                      <option value="">
                        {availableMaterialsForVariant.length > 0
                          ? '-- Pilih Bahan Baku / Sub-Assembly --'
                          : '-- Semua material telah ditambahkan --'}
                      </option>
                      {availableMaterialsForVariant.map(m => (
                        <option key={m.id} value={m.id}>
                          [{m.category}] {m.name} {m.isSubAssembly ? '(Sub-Assembly) ' : ''}— {formatCurrency(m.unitCost)} / {m.unit}
                        </option>
                      ))}
                    </Select>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={modalNewMaterialQty}
                        onChange={e => setModalNewMaterialQty(parseFloat(e.target.value) || 1)}
                        placeholder="Qty"
                        disabled={!modalNewMaterialId}
                        inputSize="sm"
                        containerClassName="w-20"
                        className="font-mono font-bold text-right"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddManualMaterialToActiveVariant}
                        disabled={!modalNewMaterialId}
                        className="shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                {isModalCustomBOM
                  ? '*Kustomisasi tersimpan pada varian ini'
                  : '*Varian ini menggunakan rincian live dari Master Preset'}
              </p>
            </div>
          </Modal>
        );
      })()}
    </form>
  );
}
