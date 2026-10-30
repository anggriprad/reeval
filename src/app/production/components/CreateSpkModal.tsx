'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/context/ToastContext';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { workOrderService } from '@/services/work-order.service';
import { productService, type ProductOption } from '@/services/product.service';
import { materialService, type MaterialOption } from '@/services/material.service';
import type { Product, RawMaterial } from '@/lib/types';

interface CreateSpkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products?: Product[];
  materials?: RawMaterial[];
}

export function CreateSpkModal({
  isOpen,
  onClose,
  onSuccess,
  products = [],
  materials = [],
}: CreateSpkModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spkCategory, setSpkCategory] = useState<'NORMAL' | 'WIP'>('NORMAL');
  const [spkProductId, setSpkProductId] = useState('');
  const [spkVariantId, setSpkVariantId] = useState('');
  const [spkSaMaterialId, setSpkSaMaterialId] = useState('');
  const [spkTargetQty, setSpkTargetQty] = useState('1');
  const [spkNotes, setSpkNotes] = useState('');
  const [spkError, setSpkError] = useState('');

  const [apiProducts, setApiProducts] = useState<ProductOption[]>([]);
  const [apiMaterials, setApiMaterials] = useState<MaterialOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingOptions(true);
      Promise.all([
        productService.getProductOptions(),
        materialService.getMaterialOptions(),
      ])
        .then(([prodRes, matRes]) => {
          if (prodRes.success && Array.isArray(prodRes.data)) {
            setApiProducts(prodRes.data);
          }
          if (matRes.success && Array.isArray(matRes.data)) {
            setApiMaterials(matRes.data);
          }
        })
        .catch((err) => {
          console.warn('Gagal memuat opsi produk/material untuk SPK:', err);
        })
        .finally(() => {
          setIsLoadingOptions(false);
        });
    }
  }, [isOpen]);

  const effectiveProducts = useMemo(() => {
    if (apiProducts.length > 0) {
      return apiProducts;
    }
    return products.map((p, idx) => ({
      id: !isNaN(Number(p.id)) && String(p.id).trim() !== '' ? Number(p.id) : (p.id || idx + 1),
      name: p.name,
      variants: (p.variants || []).map((v, vIdx) => ({
        id: !isNaN(Number(v.id)) && String(v.id).trim() !== '' ? Number(v.id) : (v.id || vIdx + 1),
        sku: v.sku,
        label: Object.values(v.combination || {}).join(', ') || v.sku,
        combination: v.combination,
        price: v.price || 0,
        stock: 0,
        bom_items: (v.bom || []).map((b) => ({
          id: 0,
          material_id: !isNaN(Number(b.materialId)) ? Number(b.materialId) : 0,
          material_name: '',
          material_code: '',
          unit: 'unit',
          unit_cost: 0,
          qty: b.qty,
          subtotal_cost: 0,
        })),
      })),
    }));
  }, [apiProducts, products]);

  const effectiveMaterials = useMemo(() => {
    if (apiMaterials.length > 0) {
      return apiMaterials;
    }
    return materials.map((m, idx) => ({
      id: !isNaN(Number(m.id)) && String(m.id).trim() !== '' ? Number(m.id) : (m.id || idx + 1),
      name: m.name,
      code: m.code || '',
      unit: m.unit || 'unit',
      unit_cost: m.unitCost || 0,
      is_sub_assembly: Boolean(m.isSubAssembly),
      stock: m.stock || 0,
    }));
  }, [apiMaterials, materials]);

  const resetForm = () => {
    setSpkCategory('NORMAL');
    setSpkProductId('');
    setSpkVariantId('');
    setSpkSaMaterialId('');
    setSpkTargetQty('1');
    setSpkNotes('');
    setSpkError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateWorkOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSpkError('');

    const qty = parseFloat(spkTargetQty.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      setSpkError('Kuantitas rencana produksi harus lebih besar dari 0.');
      return;
    }

    if (spkCategory === 'NORMAL') {
      if (!spkProductId) {
        setSpkError('Silakan pilih produk terlebih dahulu.');
        return;
      }
      const prod = effectiveProducts.find((p) => String(p.id) === spkProductId);
      if (prod?.variants && prod.variants.length > 1 && !spkVariantId) {
        setSpkError('Silakan pilih varian produk.');
        return;
      }
    } else {
      if (!spkSaMaterialId) {
        setSpkError('Silakan pilih bahan setengah jadi.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category: spkCategory,
        product_id: spkCategory === 'NORMAL' && spkProductId && !isNaN(Number(spkProductId)) ? Number(spkProductId) : undefined,
        variant_id: spkCategory === 'NORMAL' && spkVariantId && !isNaN(Number(spkVariantId)) ? Number(spkVariantId) : undefined,
        sub_assembly_id: spkCategory === 'WIP' && spkSaMaterialId && !isNaN(Number(spkSaMaterialId)) ? Number(spkSaMaterialId) : undefined,
        target_qty: qty,
        custom_notes: spkNotes || undefined,
      };

      const res = await workOrderService.createManualWorkOrder(payload);
      if (res.success) {
        const prod = effectiveProducts.find((p) => String(p.id) === spkProductId);
        const targetMat = effectiveMaterials.find((m) => String(m.id) === spkSaMaterialId);
        const label = spkCategory === 'NORMAL'
          ? `SPK Barang Jadi untuk ${qty} unit "${prod?.name || ''}" berhasil dibuat.`
          : `SPK untuk ${qty} ${targetMat?.unit || 'unit'} "${targetMat?.name || ''}" berhasil dibuat.`;

        toast.success('SPK Berhasil Diterbitkan', label);
        resetForm();
        onClose();
        onSuccess();
      } else {
        setSpkError(res.message || 'Gagal menerbitkan SPK.');
      }
    } catch (err: any) {
      setSpkError(err.message || 'Terjadi kesalahan sistem saat menerbitkan SPK.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || (
    spkCategory === 'NORMAL'
      ? (!spkProductId || (Boolean(effectiveProducts.find((p) => String(p.id) === spkProductId)?.variants?.length) && effectiveProducts.find((p) => String(p.id) === spkProductId)!.variants!.length > 1 && !spkVariantId))
      : !spkSaMaterialId
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Buat SPK Baru"
      size="md"
      actions={
        <>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => handleCreateWorkOrder()}
            disabled={isSubmitDisabled}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menerbitkan...
              </>
            ) : (
              'Terbitkan SPK'
            )}
          </Button>
        </>
      }
    >
      <form onSubmit={handleCreateWorkOrder} className="space-y-4">
        {spkError && (
          <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{spkError}</span>
          </div>
        )}

        <Select
          label="Tipe SPK"
          required
          value={spkCategory}
          onChange={(e) => {
            const cat = e.target.value as 'NORMAL' | 'WIP';
            setSpkCategory(cat);
            setSpkProductId('');
            setSpkVariantId('');
            setSpkSaMaterialId('');
            setSpkError('');
          }}
          options={[
            { value: 'NORMAL', label: 'Produk (Barang Jadi)' },
            { value: 'WIP', label: 'Bahan Setengah Jadi (WIP)' },
          ]}
        />

        {spkCategory === 'NORMAL' ? (
          <Select
            label="Pilih Produk"
            required
            searchable
            searchPlaceholder="Cari produk..."
            value={spkProductId}
            onChange={(e) => {
              const pid = e.target.value;
              setSpkProductId(pid);
              setSpkVariantId('');
              setSpkError('');
            }}
            options={[
              { value: '', label: '-- Pilih Produk --' },
              ...effectiveProducts.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
          />
        ) : (
          <Select
            label="Pilih Bahan Setengah Jadi"
            required
            searchable
            searchPlaceholder="Cari bahan setengah jadi..."
            value={spkSaMaterialId}
            onChange={(e) => {
              setSpkSaMaterialId(e.target.value);
              setSpkError('');
            }}
            options={[
              { value: '', label: '-- Pilih Bahan Setengah Jadi --' },
              ...effectiveMaterials.filter((m) => m.is_sub_assembly).map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />
        )}

        {spkCategory === 'NORMAL' && (() => {
          const selectedProduct = effectiveProducts.find((p) => String(p.id) === spkProductId);
          if (!selectedProduct || !selectedProduct.variants || selectedProduct.variants.length === 0) return null;
          return (
            <Select
              label="Varian Produk"
              required={selectedProduct.variants.length > 1}
              value={spkVariantId}
              onChange={(e) => {
                setSpkVariantId(e.target.value);
                setSpkError('');
              }}
              options={[
                { value: '', label: '-- Pilih Varian --' },
                ...selectedProduct.variants.map((v) => ({
                  value: String(v.id),
                  label: v.label || Object.values(v.combination || {}).join(', ') || v.sku,
                })),
              ]}
            />
          );
        })()}

        <Input
          label="Kuantitas Target"
          required
          type="text"
          inputMode="numeric"
          value={spkTargetQty}
          onChange={(e) => setSpkTargetQty(e.target.value)}
          placeholder="1"
          className="font-semibold"
        />

        <Input
          label="Catatan Produk (Opsional)"
          type="text"
          value={spkNotes}
          onChange={(e) => setSpkNotes(e.target.value)}
          placeholder="Catatan khusus pengerjaan produk..."
        />

        {(() => {
          const targetQtyNum = parseFloat(spkTargetQty.replace(',', '.')) || 0;
          if (targetQtyNum <= 0) return null;

          const insufficientList: {
            name: string;
            requiredQty: number;
            currentStock: number;
            shortageQty: number;
            unit: string;
          }[] = [];

          if (spkCategory === 'NORMAL') {
            const selectedProduct = effectiveProducts.find((p) => String(p.id) === spkProductId);
            const selectedVariant = selectedProduct?.variants && selectedProduct.variants.length > 0
              ? (selectedProduct.variants.find((v) => String(v.id) === spkVariantId) || selectedProduct.variants[0])
              : undefined;
            const bomItems = selectedVariant?.bom_items || [];

            bomItems.forEach((b) => {
              const mat = effectiveMaterials.find((m) => m.id === b.material_id);
              const reqQty = b.qty * targetQtyNum;
              const currentStock = mat?.stock || 0;
              if (currentStock < reqQty) {
                insufficientList.push({
                  name: mat?.name || b.material_name || String(b.material_id),
                  requiredQty: reqQty,
                  currentStock,
                  shortageQty: parseFloat((reqQty - currentStock).toFixed(4)),
                  unit: mat?.unit || b.unit || 'unit',
                });
              }
            });
          } else {
            const targetMat = effectiveMaterials.find((m) => String(m.id) === spkSaMaterialId);
            const currentStock = targetMat?.stock || 0;
            // Jika WIP tidak punya childBom detail di opsi, cek ketersediaan
          }

          if (insufficientList.length === 0) return null;

          return (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Perhatian: Bahan Baku / BOM Kurang</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {insufficientList.map((mat, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {mat.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Butuh: <span className="font-semibold text-slate-700 dark:text-slate-300">{mat.requiredQty} {mat.unit}</span>
                        {' • '}
                        Stok: <span className="font-semibold text-slate-700 dark:text-slate-300">{mat.currentStock} {mat.unit}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        Kurang {mat.shortageQty} {mat.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </form>
    </Modal>
  );
}
