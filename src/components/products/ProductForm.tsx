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
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Checkbox } from '@/components/ui/Checkbox';
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
  Check,
  Filter,
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
  Upload,
  Image as ImageIcon,
  Armchair,
  Sofa,
  Package,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Frame,
  Palette,
  Scissors,
  Shield,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

const availableIcons: { name: string; label: string; icon: React.ElementType }[] = [
  { name: 'Box', label: 'Box / Kotak', icon: Box },
  { name: 'Layers', label: 'Layers / Lapisan', icon: Layers },
  { name: 'BedDouble', label: 'Tempat Tidur', icon: BedDouble },
  { name: 'Armchair', label: 'Kursi Santai', icon: Armchair },
  { name: 'Sofa', label: 'Sofa / Couch', icon: Sofa },
  { name: 'Package', label: 'Paket / Dus', icon: Package },
  { name: 'Lamp', label: 'Lampu / Penerangan', icon: Lamp },
  { name: 'Tv', label: 'Elektronik / TV', icon: Tv },
  { name: 'Coffee', label: 'Meja Kopi / Kafe', icon: Coffee },
  { name: 'Hammer', label: 'Pertukangan Kayu', icon: Hammer },
  { name: 'Wrench', label: 'Perkakas / Rakit', icon: Wrench },
  { name: 'Frame', label: 'Bingkai / Cermin', icon: Frame },
  { name: 'Palette', label: 'Finishing / Cat', icon: Palette },
  { name: 'Scissors', label: 'Kain & Jahit', icon: Scissors },
  { name: 'Shield', label: 'Proteksi / Garansi', icon: Shield },
  { name: 'Tag', label: 'Spesial / Custom', icon: Tag },
  { name: 'ShoppingBag', label: 'Aksesoris', icon: ShoppingBag },
  { name: 'Archive', label: 'Lemari / Kabinet', icon: Archive },
  { name: 'FolderTree', label: 'Struktur Produk', icon: FolderTree },
  { name: 'Sparkles', label: 'Produk Unggulan', icon: Sparkles },
];

const iconMap: Record<string, React.ElementType> = availableIcons.reduce((acc, curr) => {
  acc[curr.name] = curr.icon;
  return acc;
}, {} as Record<string, React.ElementType>);

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
  } = useApp();

  const isEditMode = !!initialProduct;

  // ── Mode Switch: Single Product vs Product with Variants ───────────────────
  const [hasVariants, setHasVariants] = useState<boolean>(() => {
    return Boolean(initialProduct?.variantTypes && initialProduct.variantTypes.length > 0);
  });

  // ── 1. Basic Product Info & Visuals ────────────────────────────────────────
  const [name, setName] = useState(initialProduct?.name || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [category, setCategory] = useState(initialProduct?.category || '');
  const [visualType, setVisualType] = useState<'image' | 'icon'>(() => {
    return initialProduct?.image ? 'image' : 'icon';
  });
  const [image, setImage] = useState<string>(initialProduct?.image || '');
  const [imageIcon, setImageIcon] = useState<string>(initialProduct?.imageIcon || 'Box');

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Format Tidak Didukung', 'Harap pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Terlalu Besar', 'Ukuran gambar maksimal adalah 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new (window as any).Image();
      img.onload = () => {
        // Auto center crop to 1:1 square
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 600, 600);
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setImage(croppedDataUrl);
          toast.success('Gambar Berhasil Dipilih', 'Gambar otomatis dipotong proporsional 1:1.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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

  const [singleInitialStock, setSingleInitialStock] = useState<number>(0);

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
    return '';
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
      return initialProduct.variantTypes.map(vt => ({
        name: vt.name,
        values: Array.from(new Set(
          (vt.values || [])
            .flatMap(v => (typeof v === 'string' ? v.split(',') : [v]))
            .map(v => v.trim())
            .filter(Boolean)
        )),
        valueImages: vt.valueImages ? { ...vt.valueImages } : undefined,
      }));
    }
    return [];
  });

  // Swatch Modal State for Attribute Values
  const [swatchModalTarget, setSwatchModalTarget] = useState<{
    typeIdx: number;
    val: string;
    previewImage: string;
  } | null>(null);

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
          initialStock: 0,
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

  // BOM Validation: Produk dan seluruh varian wajib memiliki minimal 1 material
  const hasBOMError = useMemo(() => {
    if (!hasVariants) {
      return effectiveSingleBom.length === 0;
    }
    if (variants.length === 0) return true;
    return variants.some(v => {
      const eff = v.isCustomBOM ? (v.bom || []) : getEffectiveVariantBOM(v, bomTemplateItems);
      return eff.length === 0;
    });
  }, [hasVariants, effectiveSingleBom, variants, bomTemplateItems]);

  // Bahan Setengah Jadi expandable rows state
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

  // Filtered variants based on attrFilterSelections
  const filteredVariants = useMemo(() => {
    const activeFilterEntries = Object.entries(attrFilterSelections).filter(([_, val]) => val && val !== 'ALL');
    if (activeFilterEntries.length === 0) return variants;
    return variants.filter(v =>
      activeFilterEntries.every(([attrName, attrVal]) => v.combination[attrName] === attrVal)
    );
  }, [variants, attrFilterSelections]);

  // Selection Checkbox Helpers (Filtered vs All)
  const isAllFilteredSelected = useMemo(() => {
    if (filteredVariants.length === 0) return false;
    return filteredVariants.every(v => selectedVariantIds.includes(v.id));
  }, [filteredVariants, selectedVariantIds]);

  const isFilteredIndeterminate = useMemo(() => {
    if (filteredVariants.length === 0) return false;
    const hasSome = filteredVariants.some(v => selectedVariantIds.includes(v.id));
    return hasSome && !isAllFilteredSelected;
  }, [filteredVariants, selectedVariantIds, isAllFilteredSelected]);

  const toggleSelectFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredVariants.map(v => v.id));
      setSelectedVariantIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedVariantIds, ...filteredVariants.map(v => v.id)]);
      setSelectedVariantIds(Array.from(newIds));
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
    const rawVal = (newAttributeValues[typeIdx] || '').trim();
    if (!rawVal) return;

    // Split by comma in case user typed or pasted comma-separated values
    const itemsToAdd = rawVal
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (itemsToAdd.length === 0) return;

    setVariantTypes(prev => prev.map((vt, i) => {
      if (i !== typeIdx) return vt;
      const currentValues = [...vt.values];
      for (const item of itemsToAdd) {
        if (!currentValues.includes(item)) {
          currentValues.push(item);
        }
      }
      return { ...vt, values: currentValues };
    }));
    setNewAttributeValues(prev => ({ ...prev, [typeIdx]: '' }));
  };

  const removeVariantTypeValue = (typeIdx: number, valIdx: number) => {
    setVariantTypes(prev => prev.map((vt, i) => {
      if (i !== typeIdx) return vt;
      const valToRemove = vt.values[valIdx];
      const nextImages = { ...(vt.valueImages || {}) };
      if (valToRemove && nextImages[valToRemove]) {
        delete nextImages[valToRemove];
      }
      return {
        ...vt,
        values: vt.values.filter((_, vi) => vi !== valIdx),
        valueImages: Object.keys(nextImages).length > 0 ? nextImages : undefined,
      };
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

    const cleanValues = Array.from(new Set(
      (found.values || [])
        .flatMap(v => (typeof v === 'string' ? v.split(',') : [v]))
        .map(v => v.trim())
        .filter(Boolean)
    ));

    setVariantTypes(prev => {
      const exists = prev.some(vt => vt.name.toLowerCase() === found.name.toLowerCase());
      if (exists) return prev;
      return [...prev, {
        name: found.name,
        values: cleanValues,
        valueImages: found.valueImages ? { ...found.valueImages } : undefined,
      }];
    });
  };

  // ── Swatch Image Handlers (Attribute Values) ────────────────────────────────
  const openSwatchModal = (typeIdx: number, val: string) => {
    const currentImg = variantTypes[typeIdx]?.valueImages?.[val] || '';
    setSwatchModalTarget({
      typeIdx,
      val,
      previewImage: currentImg,
    });
  };

  const handleSwatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Format Tidak Didukung', 'Harap pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
          const cropped = canvas.toDataURL('image/jpeg', 0.85);
          setSwatchModalTarget(prev => (prev ? { ...prev, previewImage: cropped } : null));
        }
      };
      img.src = reader.result as string;
    };
  };

  const handleSaveSwatch = () => {
    if (!swatchModalTarget) return;
    const { typeIdx, val, previewImage } = swatchModalTarget;

    setVariantTypes(prev => prev.map((vt, i) => {
      if (i !== typeIdx) return vt;
      const nextImages = { ...(vt.valueImages || {}) };
      if (previewImage) {
        nextImages[val] = previewImage;
      } else {
        delete nextImages[val];
      }
      return { ...vt, valueImages: Object.keys(nextImages).length > 0 ? nextImages : undefined };
    }));

    toast.success('Gambar Disimpan', `Gambar swatch untuk "${val}" berhasil disimpan.`);
    setSwatchModalTarget(null);
  };

  const handleRemoveSwatch = () => {
    if (!swatchModalTarget) return;
    const { typeIdx, val } = swatchModalTarget;

    setVariantTypes(prev => prev.map((vt, i) => {
      if (i !== typeIdx) return vt;
      const nextImages = { ...(vt.valueImages || {}) };
      delete nextImages[val];
      return { ...vt, valueImages: Object.keys(nextImages).length > 0 ? nextImages : undefined };
    }));

    toast.success('Gambar Dihapus', `Gambar swatch untuk "${val}" telah dihapus.`);
    setSwatchModalTarget(null);
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
    setIsSingleCustomBOM(true);
    setSingleBom(prev => {
      const baseBom = prev.length > 0 ? prev : (effectiveSingleBom.length > 0 ? structuredClone(effectiveSingleBom) : []);
      return baseBom.map(b => (b.materialId === materialId ? { ...b, qty } : b));
    });
  };

  const handleRemoveSingleBomItem = (materialId: string) => {
    setIsSingleCustomBOM(true);
    setSingleBom(prev => {
      const baseBom = prev.length > 0 ? prev : (effectiveSingleBom.length > 0 ? structuredClone(effectiveSingleBom) : []);
      return baseBom.filter(b => b.materialId !== materialId);
    });
  };

  const handleAddManualMaterialToSingle = () => {
    if (!singleNewMatId) return;
    const qty = Math.max(0.01, Number(singleNewMatQty) || 1);
    setIsSingleCustomBOM(true);
    setSingleBom(prev => {
      const baseBom = prev.length > 0 ? prev : (effectiveSingleBom.length > 0 ? structuredClone(effectiveSingleBom) : []);
      const exists = baseBom.some(b => b.materialId === singleNewMatId);
      if (exists) {
        return baseBom.map(b => b.materialId === singleNewMatId ? { ...b, qty: b.qty + qty } : b);
      }
      return [...baseBom, { materialId: singleNewMatId, qty }];
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
      const currentEff = getEffectiveVariantBOM(v, bomTemplateItems);
      const baseBom = (v.bom && v.bom.length > 0) ? v.bom : structuredClone(currentEff);
      return {
        ...v,
        isCustomBOM: true,
        bom: baseBom.map(b => (b.materialId === materialId ? { ...b, qty: qtyNum } : b)),
      };
    }));
  };

  const handleRemoveActiveVariantBOMItem = (materialId: string) => {
    if (!activeEditingVariant) return;
    setVariants(prev => prev.map(v => {
      if (v.id !== activeEditingVariant.id) return v;
      const currentEff = getEffectiveVariantBOM(v, bomTemplateItems);
      const baseBom = (v.bom && v.bom.length > 0) ? v.bom : structuredClone(currentEff);
      return {
        ...v,
        isCustomBOM: true,
        bom: baseBom.filter(b => b.materialId !== materialId),
      };
    }));
  };

  const handleAddManualMaterialToActiveVariant = () => {
    if (!activeEditingVariant || !modalNewMaterialId) return;
    const qty = Math.max(0.01, Number(modalNewMaterialQty) || 1);
    setVariants(prev => prev.map(v => {
      if (v.id !== activeEditingVariant.id) return v;
      const currentEff = getEffectiveVariantBOM(v, bomTemplateItems);
      const baseBom = (v.bom && v.bom.length > 0) ? v.bom : structuredClone(currentEff);
      const exists = baseBom.some(b => b.materialId === modalNewMaterialId);
      let updatedBom: BOMItem[];
      if (exists) {
        updatedBom = baseBom.map(b => b.materialId === modalNewMaterialId ? { ...b, qty: b.qty + qty } : b);
      } else {
        updatedBom = [...baseBom, { materialId: modalNewMaterialId, qty }];
      }
      return { ...v, isCustomBOM: true, bom: updatedBom };
    }));
    setModalNewMaterialId('');
    setModalNewMaterialQty(1);
  };

  // ── Helper: Calculate BOM Cost (with recursive Bahan Setengah Jadi rollup including labor) ──────
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
      if (effectiveSingleBom.length === 0) {
        setErrorMessage('Produk wajib memiliki minimal 1 material dalam Bill of Materials (BOM).');
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
      const emptyBOMVariants = variants.filter(v => {
        const eff = v.isCustomBOM ? (v.bom || []) : getEffectiveVariantBOM(v, bomTemplateItems);
        return eff.length === 0;
      });
      if (emptyBOMVariants.length > 0) {
        if (emptyBOMVariants.length === 1) {
          const comboStr = Object.values(emptyBOMVariants[0].combination).join(' / ') || emptyBOMVariants[0].sku;
          setErrorMessage(`Varian "${comboStr}" belum memiliki material BOM. Setiap varian wajib memiliki minimal 1 material.`);
        } else {
          setErrorMessage(`Terdapat ${emptyBOMVariants.length} varian yang belum memiliki material BOM. Setiap varian wajib memiliki minimal 1 material.`);
        }
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
        const resolvedSingleBom = isSingleCustomBOM
          ? singleBom
          : structuredClone(effectiveSingleBom);

        finalVariants = [{
          id: initialProduct?.variants?.[0]?.id || `var-${generateId()}`,
          sku: singleSku.trim() || generateSKU(name, {}),
          combination: {},
          price: singlePrice,
          estimatedHours: singleEstimatedHours || 0,
          routingId: singleRoutingId || undefined,
          presetId: singlePresetId || undefined,
          isCustomBOM: isSingleCustomBOM,
          bom: resolvedSingleBom,
          initialStock: singleInitialStock || 0,
          isActive: true,
        }];
      } else {
        finalBasePrice = Math.min(...variants.map(v => v.price));
        finalDefaultRoutingId = defaultVariantRoutingId || undefined;
        finalDefaultEstimatedHours = defaultVariantEstimatedHours || undefined;
        finalVariantTypes = variantTypes.filter(vt => vt.name.trim() && vt.values.length > 0);
        finalVariants = variants.map(v => {
          const effectiveBom = getEffectiveVariantBOM(v, bomTemplateItems);
          const resolvedBom = v.isCustomBOM
            ? (v.bom || [])
            : structuredClone(effectiveBom);
          return {
            ...v,
            sku: v.sku.trim() || generateSKU(name, v.combination),
            bom: resolvedBom,
          };
        });
      }

      const productPayload: Omit<Product, 'id'> = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        imageIcon,
        image: visualType === 'image' && image ? image : undefined,
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
    <form onSubmit={handleSave} className="max-w-7xl mx-auto space-y-6 pb-28">
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

      {/* ── BARIS 1: INFORMASI PRODUK & VISUAL PRODUK (2 KOLOM EQUAL HEIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Kolom Kiri: Informasi Utama Produk (8 Kolom) */}
        <div className="lg:col-span-8 flex flex-col">
          <Card className="flex-1 flex flex-col space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Informasi Utama Produk
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Identitas dasar dan klasifikasi produk yang ditampilkan dalam katalog.
              </p>
            </div>

            <div className="flex-1 flex flex-col space-y-4">
              {/* Nama Produk & Kategori (Symmetric with built-in labels) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="sm:col-span-2">
                  <Input
                    label="Nama Produk"
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Dipan Minimalis Modern Fabric"
                    inputSize="sm"
                  />
                </div>

                <div>
                  <Select
                    label="Kategori"
                    required
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    inputSize="sm"
                    className="w-full"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {(productCategories || []).map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Deskripsi Produk (Flex to fill card height) */}
              <div className="flex-1 flex flex-col space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Deskripsi Produk <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Spesifikasi umum, material unggulan, dimensi standar, atau catatan perakitan..."
                  className="w-full flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[160px]"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Kolom Kanan: Visual Produk (4 Kolom) */}
        <div className="lg:col-span-4 flex flex-col">
          <Card className="flex-1 flex flex-col space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Visual Produk
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih foto produk asli atau ikon representatif.
              </p>
            </div>

            {/* Segmented Switcher: Gambar vs Ikon */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setVisualType('image')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  visualType === 'image'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Gambar (1:1)
              </button>
              <button
                type="button"
                onClick={() => setVisualType('icon')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  visualType === 'icon'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Ikon
              </button>
            </div>

            {/* Content Body: Flex to fill and center vertically */}
            <div className="flex-1 flex flex-col justify-center">
              {/* Mode Gambar (1:1 Square Crop) */}
              {visualType === 'image' ? (
                <div className="space-y-2 py-1">
                  {image ? (
                    <div className="space-y-2">
                      <div className="aspect-square w-[170px] h-[170px] mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 relative group shadow-sm">
                        <img
                          src={image}
                          alt="Preview Produk"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="p-2 rounded-lg bg-white/95 text-slate-800 hover:bg-white cursor-pointer shadow-md text-xs font-semibold flex items-center gap-1.5 transition-all">
                            <Upload className="h-3.5 w-3.5" />
                            <span>Ganti</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setImage('')}
                            className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-md text-xs font-semibold transition-all"
                            title="Hapus Gambar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 px-3">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Rasio 1:1 Aktif</span>
                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="text-red-500 hover:underline"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="aspect-square w-[170px] h-[170px] mx-auto rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all flex flex-col items-center justify-center p-3 cursor-pointer text-center group">
                      <div className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        Pilih Foto Produk
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Rasio 1:1 (Maks. 5MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                /* Mode Ikon: Langsung grid pilihan tanpa preview kotak redundant */
                <div className="grid grid-cols-5 gap-1.5 max-h-[195px] overflow-y-auto pr-0.5 py-1">
                  {availableIcons.map(ico => {
                    const Comp = ico.icon;
                    const active = imageIcon === ico.name;
                    return (
                      <button
                        key={ico.name}
                        type="button"
                        onClick={() => setImageIcon(ico.name)}
                        className={`h-9 rounded-lg border flex items-center justify-center transition-all ${
                          active
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-bold ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                        title={ico.label}
                      >
                        <Comp className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── SECTION BERIKUTNYA KE BAWAH: 1 KOLOM NORMAL PENUH ── */}

      {/* CARD: Varian Produk (with Integrated Toggle) */}
      <Card className="space-y-4">
            <div className={`flex items-center justify-between gap-4 ${hasVariants ? 'border-b border-slate-100 dark:border-slate-800 pb-3' : ''}`}>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Varian Produk</span>
                  {hasVariants && <Badge variant="info">Aktif</Badge>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aktifkan jika produk memiliki opsi variasi (seperti ukuran, warna, atau bahan).
                </p>
              </div>

              <Toggle
                checked={hasVariants}
                onChange={setHasVariants}
              />
            </div>

            {hasVariants && (
              <>
                {variantTypes.length === 0 ? (
                  <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 space-y-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum ada atribut varian yang dibuat.</p>
                    <p className="text-[11px] text-slate-400">
                      Tambahkan atribut baru atau gunakan dropdown impor dari Master Atribut di bawah.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {variantTypes.map((vt, idx) => (
                      <div key={idx} className="py-3.5 first:pt-0 last:pb-1 space-y-2.5">
                        {/* Header baris: Nama Atribut, Input Nilai Baru, Button Tambah, Button Hapus */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                          <div className="w-full sm:w-48 shrink-0">
                            <Input
                              type="text"
                              value={vt.name}
                              onChange={e => updateVariantTypeName(idx, e.target.value)}
                              placeholder="Nama Atribut (Ukuran/Warna)"
                              inputSize="sm"
                              className="font-medium"
                            />
                          </div>

                          <div className="flex items-center gap-2 flex-1">
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
                              className="h-8 px-3 text-xs font-semibold shrink-0"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
                            </Button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeVariantType(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-red-950/40 shrink-0 self-end sm:self-center"
                            title="Hapus Atribut"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Chips Nilai (Inline, no nested white box) */}
                        {vt.values.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {vt.values.map((val, vIdx) => {
                              const swatchImg = vt.valueImages?.[val];
                              return (
                                <span
                                  key={vIdx}
                                  className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-medium dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 group"
                                >
                                  {/* Swatch Thumbnail / Add Button */}
                                  <button
                                    type="button"
                                    onClick={() => openSwatchModal(idx, val)}
                                    className={`w-5 h-5 rounded overflow-hidden shrink-0 flex items-center justify-center transition-all ${
                                      swatchImg
                                        ? 'ring-1 ring-slate-300 dark:ring-slate-600 hover:opacity-80 shadow-2xs'
                                        : 'bg-slate-200/80 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 dark:bg-slate-700/80 dark:hover:bg-indigo-950 dark:hover:text-indigo-400'
                                    }`}
                                    title={swatchImg ? `Ubah gambar swatch "${val}"` : `Tambah gambar swatch "${val}"`}
                                  >
                                    {swatchImg ? (
                                      <img src={swatchImg} alt={val} className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="h-2.5 w-2.5" />
                                    )}
                                  </button>

                                  <span>{val}</span>

                                  <button
                                    type="button"
                                    onClick={() => removeVariantTypeValue(idx, vIdx)}
                                    className="text-slate-400 hover:text-red-500 rounded transition-colors ml-0.5"
                                    title={`Hapus ${val}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic pt-0.5">
                            Belum ada opsi. Ketik nilai di atas lalu klik Tambah atau tekan Enter.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    size="sm"
                    onClick={addVariantType}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Atribut Baru
                  </Button>

                  {attributes && attributes.length > 0 && (
                    <div className="flex-1">
                      <Select
                        onChange={e => {
                          if (e.target.value) {
                            importFromGlobalAttribute(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        value=""
                        inputSize="sm"
                      >
                        <option value="" disabled>+ Impor dari Master Atribut...</option>
                        {attributes.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>

          {/* ════════════════════════════════════════════════════════════════════
              KONDISI A: PRODUK TUNGGAL (Clean, direct, without complex tables)
             ════════════════════════════════════════════════════════════════════ */}
          {!hasVariants && (
            <>
              {/* CARD: Harga & Produksi Produk Tunggal */}
              <Card className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Harga & Produksi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Penetapan harga komersial, identifikasi SKU, dan alur produksi produk tunggal ini.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Harga Jual */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Harga Jual (Rp) <span className="text-red-500">*</span>
                    </label>
                    <CurrencyInput
                      value={singlePrice || ''}
                      onChange={val => setSinglePrice(typeof val === 'number' ? val : 0)}
                      placeholder="0"
                      inputSize="sm"
                    />
                  </div>

                  {/* SKU Single Product */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Kode SKU <span className="text-[10px] font-normal text-slate-400">(Opsional)</span>
                    </label>
                    <Input
                      type="text"
                      value={singleSku}
                      onChange={e => {
                        setSkuManuallyEdited(true);
                        setSingleSku(e.target.value);
                      }}
                      placeholder={generateSKU(name || 'PROD', {})}
                      inputSize="sm"
                      className="font-mono uppercase font-bold"
                    />
                  </div>

                  {/* Stok Awal Single Product (Hanya saat Tambah Produk Baru) */}
                  {!isEditMode && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Stok Awal <span className="text-[10px] font-normal text-slate-400">(Inisiasi)</span>
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={singleInitialStock || ''}
                        onChange={e => setSingleInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="0"
                        inputSize="sm"
                      />
                    </div>
                  )}

                  {/* Alur Produksi */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Alur Produksi <span className="text-[10px] font-normal text-slate-400">(Opsional)</span>
                    </label>
                    <Select
                      value={singleRoutingId}
                      onChange={e => setSingleRoutingId(e.target.value)}
                      inputSize="sm"
                    >
                      <option value="">Tanpa Alur Produksi (Non-SPK)</option>
                      {routings.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Estimasi Jam Kerja */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Est. Jam Kerja <span className="text-[10px] font-normal text-slate-400">(Jam)</span>
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
              </Card>

              {/* CARD: Bill of Materials (BOM) */}
              <Card className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Bill of Materials (BOM)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Resep kebutuhan bahan baku untuk perakitan produk.
                    </p>
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                    Estimasi HPP: <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold ml-1">{formatCurrency(calculateBOMCost(effectiveSingleBom))}</strong>
                  </div>
                </div>

                {/* Control Bar: Master Preset & Mode BOM */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <Select
                      value={singlePresetId}
                      onChange={e => {
                        const newPresetId = e.target.value;
                        setSinglePresetId(newPresetId);
                        if (newPresetId) {
                          const tplItems = bomTemplateItems.filter(item => item.templateId === newPresetId);
                          const cloned = tplItems.map(item => ({ materialId: item.materialId, qty: Number(item.defaultQty) || 1 }));
                          setSingleBom(cloned);
                        } else if (!isSingleCustomBOM) {
                          setSingleBom([]);
                        }
                      }}
                      inputSize="sm"
                      containerClassName="w-full"
                    >
                      <option value="">-- Tanpa Preset (Manual / Kosong) --</option>
                      {bomTemplates.map(tpl => (
                        <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Mode Custom:
                    </span>
                    <Toggle
                      checked={isSingleCustomBOM}
                      onChange={toggleSingleCustomBOM}
                      color="indigo"
                      size="sm"
                    />
                  </div>
                </div>

              {/* Tabel Material Tunggal (Tanpa thead dan tfoot) */}
              {effectiveSingleBom.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-400">
                  <Layers className="h-7 w-7 mx-auto mb-1.5 opacity-50 text-slate-400 dark:text-slate-500" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-200">Belum ada bahan baku pada produk ini.</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Pilih preset atau tambahkan material untuk menyusun resep BOM.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {effectiveSingleBom.map((item, idx) => {
                        const mat = materials.find(m => m.id === item.materialId);
                        const unitCost = mat?.unitCost || 0;
                        const subtotal = unitCost * item.qty;
                        const isExpanded = Boolean(expandedSubAssemblies[`single-${item.materialId}`]);

                        return (
                          <React.Fragment key={idx}>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-white">{mat?.name || item.materialId}</span>
                                  {mat?.isSubAssembly && (
                                    <>
                                      <Badge variant="purple">Bahan Setengah Jadi</Badge>
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
                              <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300 font-medium">
                                {formatCurrency(unitCost)}
                              </td>
                              <td className="px-3 py-2.5 text-center w-28">
                                {isSingleCustomBOM ? (
                                  <Input
                                    type="number"
                                    min={0.01}
                                    step={0.01}
                                    value={item.qty}
                                    onChange={e => handleUpdateSingleBomQty(item.materialId, parseFloat(e.target.value) || 0)}
                                    inputSize="sm"
                                    containerClassName="w-20 mx-auto"
                                    className="font-bold text-right"
                                  />
                                ) : (
                                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{item.qty}</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center w-20">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {mat?.unit || 'unit'}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 dark:text-white">
                                {formatCurrency(subtotal)}
                              </td>
                              {isSingleCustomBOM && (
                                <td className="px-2 py-2.5 text-center w-10">
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
                                        <Layers className="h-3.5 w-3.5" /> Material Penyusun Bahan Setengah Jadi ({mat.name}):
                                      </span>
                                      <span className="text-[10px] italic text-slate-400">
                                        (Bahan penyusun terkunci dari Master BOM Bahan Setengah Jadi di Inventory)
                                      </span>
                                    </div>
                                    <div className="rounded-lg border border-purple-100 dark:border-purple-900/40 overflow-hidden bg-white dark:bg-slate-900">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 text-[10px] font-bold">
                                          <tr>
                                            <th className="px-3 py-1.5">Material Child</th>
                                            <th className="px-3 py-1.5 text-center">Qty / Bahan Setengah Jadi</th>
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
                  </table>
                </div>
              )}

              {/* Tambah Material Manual */}
              {(isSingleCustomBOM || !singlePresetId) && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Select
                    value={singleNewMatId}
                    onChange={e => setSingleNewMatId(e.target.value)}
                    inputSize="sm"
                    containerClassName="flex-1"
                  >
                    <option value="">
                      {availableMaterialsForSingle.length > 0
                        ? '+ Tambah Material / Bahan Setengah Jadi ke BOM...'
                        : '-- Semua material telah ditambahkan ke BOM --'}
                    </option>
                    {availableMaterialsForSingle.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.category}] {m.name} {m.isSubAssembly ? '(Bahan Setengah Jadi) ' : ''}— {formatCurrency(m.unitCost)} / {m.unit}
                      </option>
                    ))}
                  </Select>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={singleNewMatQty}
                      onChange={e => setSingleNewMatQty(parseFloat(e.target.value) || 1)}
                      placeholder="Qty"
                      disabled={!singleNewMatId}
                      inputSize="sm"
                      containerClassName="w-20"
                      className="font-bold text-right"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddManualMaterialToSingle}
                      disabled={!singleNewMatId}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Tambah
                    </Button>
                  </div>
                </div>
              )}
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          KONDISI B: PENGATURAN PRODUKSI & DAFTAR VARIAN FISIK
         ════════════════════════════════════════════════════════════════════════ */}
      {hasVariants && (
        <>
          {/* CARD: List Daftar Varian & SKU (Industrial Data Table) */}
          <Card className="space-y-4">
            {/* Header Card: Title, SKU Counter & Quick Filter Dropdowns */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Daftar Varian & SKU
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {variants.length} SKU
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Konfigurasi SKU, harga komersial, estimasi jam kerja, alur produksi, dan BOM spesifik tiap varian.
                </p>
              </div>

              {/* Right: Attribute Filter Dropdowns */}
              {variants.length > 0 && variantTypes.filter(vt => vt.name.trim() && vt.values.length > 0).length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Filter className="h-3.5 w-3.5" />
                    <span className="font-medium">Filter:</span>
                  </div>
                  {variantTypes
                    .filter(vt => vt.name.trim() && vt.values.length > 0)
                    .map(vt => {
                      const currentVal = attrFilterSelections[vt.name.trim()] || 'ALL';
                      const cleanValues = Array.from(new Set(
                        vt.values
                          .flatMap(v => (typeof v === 'string' ? v.split(',') : [v]))
                          .map(v => v.trim())
                          .filter(Boolean)
                      ));

                      return (
                        <Select
                          key={vt.name}
                          value={currentVal}
                          onChange={e => {
                            const updated = { ...attrFilterSelections, [vt.name.trim()]: e.target.value };
                            setAttrFilterSelections(updated);
                          }}
                          inputSize="sm"
                          containerClassName="w-auto min-w-[125px]"
                        >
                          <option value="ALL">{vt.name}: Semua</option>
                          {cleanValues.map(val => (
                            <option key={val} value={val}>
                              {vt.name}: {val}
                            </option>
                          ))}
                        </Select>
                      );
                    })}

                  {Object.values(attrFilterSelections).some(v => v && v !== 'ALL') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttrFilterSelections({})}
                      className="text-xs h-8 text-slate-500 hover:text-slate-900 dark:hover:text-white px-2"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Industrial Batch Action Command Bar (Contextual) */}
            {variants.length > 0 && (
              selectedVariantIds.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800/80 transition-all">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{selectedVariantIds.length} varian dipilih</span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedVariantIds([])}
                      className="h-7 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2"
                    >
                      Batal Pilihan
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Edit Massal:
                    </span>

                    {/* Field Selector */}
                    <Select
                      value={bulkField}
                      onChange={e => setBulkField(e.target.value as any)}
                      inputSize="sm"
                      containerClassName="w-auto min-w-[150px]"
                    >
                      <option value="price">Harga Jual (Rp)</option>
                      <option value="price_adjust">Penyesuaian Harga (% / Rp)</option>
                      <option value="estimatedHours">Estimasi Jam Kerja</option>
                      <option value="presetId">Preset BOM</option>
                      <option value="isCustomBOM">Mode BOM</option>
                      <option value="routingId">Alur Produksi</option>
                      <option value="isActive">Status Aktif</option>
                    </Select>

                    {/* Dynamic Field Input */}
                    {bulkField === 'price' && (
                      <CurrencyInput
                        value={bulkValPrice || ''}
                        onChange={val => setBulkValPrice(typeof val === 'number' ? val : 0)}
                        placeholder="0"
                        inputSize="sm"
                        containerClassName="w-32"
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
                          placeholder="0"
                          inputSize="sm"
                          containerClassName="w-20"
                          className="font-mono font-bold"
                        />
                        <span className="text-xs font-medium text-slate-500">Jam</span>
                      </div>
                    )}

                    {bulkField === 'price_adjust' && (
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={bulkValAdjustType}
                          onChange={e => setBulkValAdjustType(e.target.value as any)}
                          inputSize="sm"
                          containerClassName="w-auto"
                        >
                          <option value="percent_up">+ (%)</option>
                          <option value="percent_down">- (%)</option>
                          <option value="nominal_up">+ (Rp)</option>
                          <option value="nominal_down">- (Rp)</option>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          value={bulkValAdjustVal}
                          onChange={e => setBulkValAdjustVal(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          inputSize="sm"
                          containerClassName="w-24"
                          className="font-mono font-bold"
                        />
                      </div>
                    )}

                    {bulkField === 'presetId' && (
                      <Select
                        value={bulkValPresetId}
                        onChange={e => setBulkValPresetId(e.target.value)}
                        inputSize="sm"
                        containerClassName="w-auto min-w-[170px]"
                      >
                        <option value="">-- Tanpa Preset --</option>
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
                        <option value="false">Sesuai Preset</option>
                        <option value="true">Custom BoM</option>
                      </Select>
                    )}

                    {bulkField === 'routingId' && (
                      <Select
                        value={bulkValRoutingId}
                        onChange={e => setBulkValRoutingId(e.target.value)}
                        inputSize="sm"
                        containerClassName="w-auto min-w-[170px]"
                      >
                        <option value="">-- Tanpa Alur Produksi --</option>
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
                      className="text-xs font-semibold px-3 h-8"
                    >
                      Terapkan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-[11px]">
                    Centang checkbox pada baris varian untuk menerapkan <strong>Edit Massal</strong> pada harga, jam kerja, alur produksi, atau BOM sekaligus.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedVariantIds(variants.map(v => v.id))}
                    className="text-xs h-7 px-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                  >
                    Pilih Semua ({variants.length})
                  </Button>
                </div>
              )
            )}

            {/* Industrial Data Table for Variant SKUs */}
            {variants.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Belum ada kombinasi varian terbentuk.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tambahkan nama atribut dan nilai-nilainya pada panel Varian Produk di atas.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">
                          <Checkbox
                            checked={isAllFilteredSelected}
                            indeterminate={isFilteredIndeterminate}
                            onChange={toggleSelectFiltered}
                            size="sm"
                          />
                        </th>
                        <th className="py-2.5 px-3 min-w-[130px]">Varian</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Kode SKU</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Harga Jual</th>
                        {!isEditMode && <th className="py-2.5 px-3 min-w-[95px]">Stok Awal</th>}
                        <th className="py-2.5 px-3 min-w-[105px]">Est. Jam</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Alur Produksi</th>
                        <th className="py-2.5 px-3 min-w-[170px]">BOM & HPP</th>
                        <th className="py-2.5 px-3 w-20 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {filteredVariants.length === 0 ? (
                        <tr>
                          <td colSpan={!isEditMode ? 9 : 8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                            <p className="text-xs font-medium">Tidak ada varian yang sesuai dengan filter atribut.</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setAttrFilterSelections({})}
                              className="mt-2 text-xs text-indigo-600 dark:text-indigo-400"
                            >
                              Reset Filter
                            </Button>
                          </td>
                        </tr>
                      ) : (
                        filteredVariants.map(variant => {
                          const comboEntries = Object.entries(variant.combination);
                          const effectiveBom = getEffectiveVariantBOM(variant, bomTemplateItems);
                          const bomCost = calculateBOMCost(effectiveBom);
                          const hasBom = effectiveBom.length > 0;
                          const isSelected = selectedVariantIds.includes(variant.id);
                          const isCustom = Boolean(variant.isCustomBOM);

                          return (
                            <tr
                              key={variant.id}
                              className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                                isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                              }`}
                            >
                              {/* Col 1: Row Checkbox */}
                              <td className="py-2 px-3 text-center align-middle">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => toggleSelectRow(variant.id)}
                                  size="sm"
                                />
                              </td>

                              {/* Col 2: Varian Combination Chips */}
                              <td className="py-2 px-3 align-middle">
                                <div className="flex flex-wrap items-center gap-1">
                                  {comboEntries.map(([k, v]) => {
                                    const matchedVt = variantTypes.find(vt => vt.name.trim() === k.trim());
                                    const valImg = matchedVt?.valueImages?.[v];
                                    return (
                                      <span
                                        key={k}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"
                                      >
                                        {valImg && (
                                          <img
                                            src={valImg}
                                            alt={v}
                                            className="w-3.5 h-3.5 rounded object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                                          />
                                        )}
                                        <span className="text-slate-400 font-normal mr-0.5">{k}:</span>
                                        {v}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* Col 3: SKU Input */}
                              <td className="py-2 px-2.5 align-middle">
                                <Input
                                  type="text"
                                  value={variant.sku}
                                  onChange={e => updateVariantField(variant.id, 'sku', e.target.value)}
                                  placeholder="SKU"
                                  inputSize="sm"
                                  className="font-mono text-xs font-semibold uppercase"
                                />
                              </td>

                              {/* Col 4: Price Input */}
                              <td className="py-2 px-2.5 align-middle">
                                <CurrencyInput
                                  value={variant.price || ''}
                                  onChange={val => updateVariantField(variant.id, 'price', typeof val === 'number' ? val : 0)}
                                  placeholder="0"
                                  inputSize="sm"
                                />
                              </td>

                              {/* Col: Initial Stock (Only for new products) */}
                              {!isEditMode && (
                                <td className="py-2 px-2.5 align-middle">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={variant.initialStock ?? ''}
                                    onChange={e => updateVariantField(variant.id, 'initialStock', Math.max(0, parseInt(e.target.value) || 0))}
                                    placeholder="0"
                                    inputSize="sm"
                                    className="font-mono text-xs text-right font-medium"
                                  />
                                </td>
                              )}

                              {/* Col 5: Estimated Hours */}
                              <td className="py-2 px-2.5 align-middle">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={variant.estimatedHours ?? ''}
                                    onChange={e => updateVariantField(variant.id, 'estimatedHours', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    inputSize="sm"
                                    className="font-mono text-xs text-right font-medium"
                                  />
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">jam</span>
                                </div>
                              </td>

                              {/* Col 6: Routing Select */}
                              <td className="py-2 px-2.5 align-middle">
                                <Select
                                  value={variant.routingId || ''}
                                  onChange={e => updateVariantField(variant.id, 'routingId', e.target.value)}
                                  inputSize="sm"
                                >
                                  <option value="">Tanpa Alur Produksi</option>
                                  {routings.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </Select>
                              </td>

                              {/* Col 7: BOM Trigger Button */}
                              <td className="py-2 px-2.5 align-middle">
                                <Button
                                  type="button"
                                  variant={hasBom ? 'secondary' : 'outline'}
                                  size="sm"
                                  onClick={() => {
                                    setEditingBOMVariantId(variant.id);
                                    setModalPresetTemplateId(variant.presetId || '');
                                    setModalCloneFeedback(null);
                                  }}
                                  className="w-full text-xs h-8 font-medium justify-between px-2.5"
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    {isCustom ? (
                                      <Unlock className="h-3 w-3 text-amber-500 shrink-0" />
                                    ) : (
                                      <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                                    )}
                                    <span className="truncate">{hasBom ? `${effectiveBom.length} Mat` : 'BOM'}</span>
                                  </span>
                                  {hasBom && (
                                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 ml-1 shrink-0">
                                      {formatCurrency(bomCost)}
                                    </span>
                                  )}
                                </Button>
                              </td>

                              {/* Col 8: Status Toggle */}
                              <td className="py-2 px-2 text-center align-middle">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Toggle
                                    size="sm"
                                    color="emerald"
                                    checked={variant.isActive}
                                    onChange={() => updateVariantField(variant.id, 'isActive', !variant.isActive)}
                                  />
                                  <span className={`text-[10px] font-semibold w-6 text-left ${
                                    variant.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                                  }`}>
                                    {variant.isActive ? 'Aktif' : 'Off'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer: Summary & Legend */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>
                      Menampilkan <strong>{filteredVariants.length}</strong> dari <strong>{variants.length}</strong> varian
                    </span>
                    {selectedVariantIds.length > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        • {selectedVariantIds.length} varian dipilih
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-slate-400" /> Preset BOM
                    </span>
                    <span className="flex items-center gap-1">
                      <Unlock className="h-3 w-3 text-amber-500" /> Custom BOM
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
      {/* CARD: Modifier & Add-on Opsional (Full Width) */}
      {masterModifierGroups && masterModifierGroups.length > 0 && (
        <Card className="space-y-3">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Modifier & Add-on
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih grup modifier atau add-on opsional yang dapat dipilih konsumen saat memesan produk ini.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {masterModifierGroups.map(group => {
              const isChecked = modifierGroupIds.includes(group.id);
              return (
                <label
                  key={group.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-purple-300 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={checked => {
                      if (checked) setModifierGroupIds(prev => [...prev, group.id]);
                      else setModifierGroupIds(prev => prev.filter(id => id !== group.id));
                    }}
                    size="sm"
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{group.name}</div>
                    <div className="text-[10px] text-slate-500">{group.options.length} opsi</div>
                  </div>
                </label>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── BOTTOM ACTION BAR (Normal Flow) ── */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
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
          <Button
            type="submit"
            variant="primary"
            disabled={isSaving || hasBOMError}
          >
            {isSaving ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Simpan Produk'}
          </Button>
        </div>
      </div>



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
            let clonedBom = v.bom;
            if (newPresetId) {
              const tplItems = bomTemplateItems.filter(item => item.templateId === newPresetId);
              clonedBom = tplItems.map(item => ({ materialId: item.materialId, qty: Number(item.defaultQty) || 1 }));
            }
            return {
              ...v,
              presetId: newPresetId,
              isCustomBOM: false,
              bom: clonedBom,
            };
          }));
        };

        return (
          <Modal
            isOpen={true}
            onClose={() => setEditingBOMVariantId(null)}
            title="Kelola BOM Varian"
            size="xl"
            actions={
              <Button
                type="button"
                variant="primary"
                onClick={() => setEditingBOMVariantId(null)}
              >
                Selesai
              </Button>
            }
          >
            <div className="space-y-4 text-xs">
              {/* Top Variant Banner & Summary KPIs */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 text-white dark:bg-slate-800 border border-slate-800 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                    <Box className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Varian Target</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {Object.entries(activeEditingVariant.combination).length > 0 ? (
                        Object.entries(activeEditingVariant.combination).map(([k, v]) => {
                          const matchedVt = variantTypes.find(vt => vt.name.trim() === k.trim());
                          const valImg = matchedVt?.valueImages?.[v];
                          return (
                            <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                              {valImg && (
                                <img
                                  src={valImg}
                                  alt={v}
                                  className="w-3.5 h-3.5 rounded object-cover border border-slate-600 shrink-0"
                                />
                              )}
                              <span className="text-slate-400 mr-0.5">{k}:</span> {v}
                            </span>
                          );
                        })
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

              {/* Control Panel: Master Preset BOM & Mode BOM dalam 1 Baris */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex-1 max-w-xs">
                  <Select
                    value={activeEditingVariant.presetId || ''}
                    onChange={e => handleModalChangePreset(e.target.value)}
                    inputSize="sm"
                    containerClassName="w-full"
                  >
                    <option value="">-- Pilih Preset BOM (Kosong) --</option>
                    {bomTemplates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Mode Custom:
                  </span>
                  <Toggle
                    checked={isModalCustomBOM}
                    onChange={handleModalToggleCustomBOM}
                    color="indigo"
                  />
                </div>
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
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-400">
                    <Layers className="h-7 w-7 mx-auto mb-1.5 opacity-50 text-slate-400 dark:text-slate-500" />
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-200">Belum ada material untuk varian ini.</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm mx-auto">
                      Pilih preset BOM di atas atau tambahkan material kustom di bawah.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
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
                                        <Badge variant="purple">Bahan Setengah Jadi</Badge>
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
                                          <Layers className="h-3.5 w-3.5" /> Material Penyusun Bahan Setengah Jadi ({mat.name}):
                                        </span>
                                        <span className="text-[10px] italic text-slate-400">
                                          (Bahan penyusun terkunci dari Master BOM Bahan Setengah Jadi di Inventory)
                                        </span>
                                      </div>
                                      <div className="rounded-lg border border-purple-100 dark:border-purple-900/40 overflow-hidden bg-white dark:bg-slate-900">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 text-[10px] font-bold">
                                            <tr>
                                              <th className="px-3 py-1.5">Material Child</th>
                                              <th className="px-3 py-1.5 text-center">Qty / Bahan Setengah Jadi</th>
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
                    </table>
                  </div>
                )}
              </div>

              {/* Box 3: Quick Add Material Manual */}
              {(isModalCustomBOM || !activeEditingVariant.presetId) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <Plus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Tambah Material / Bahan Setengah Jadi Manual ke Varian Custom
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
                          ? '-- Pilih Bahan Baku / Bahan Setengah Jadi --'
                          : '-- Semua material telah ditambahkan --'}
                      </option>
                      {availableMaterialsForVariant.map(m => (
                        <option key={m.id} value={m.id}>
                          [{m.category}] {m.name} {m.isSubAssembly ? '(Bahan Setengah Jadi) ' : ''}— {formatCurrency(m.unitCost)} / {m.unit}
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

      {/* ── Modal Upload Gambar / Swatch Nilai Atribut ── */}
      {swatchModalTarget && (
        <Modal
          isOpen={Boolean(swatchModalTarget)}
          onClose={() => setSwatchModalTarget(null)}
          title={`Gambar Nilai: ${swatchModalTarget.val}`}
          actions={
            <div className="flex items-center justify-between w-full">
              <div>
                {swatchModalTarget.previewImage ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleRemoveSwatch}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                  </Button>
                ) : (
                  <span />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSwatchModalTarget(null)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSwatch}
                >
                  Simpan
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              {swatchModalTarget.previewImage ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="aspect-square w-36 h-36 rounded-xl overflow-hidden border-2 border-indigo-500/30 dark:border-indigo-400/30 bg-white dark:bg-slate-900 shadow-sm relative group">
                    <img
                      src={swatchModalTarget.previewImage}
                      alt={swatchModalTarget.val}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-colors">
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    <span>Ganti Foto Swatch</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSwatchFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full py-8 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer bg-white dark:bg-slate-900/60 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 transition-colors mb-2">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Pilih File Gambar Swatch
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    JPG, PNG, atau WebP (Rasio 1:1)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSwatchFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Gambar swatch akan ditampilkan pada sampel varian dan baris SKU untuk mempermudah identifikasi material/warna.
            </p>
          </div>
        </Modal>
      )}
    </form>
  );
}
