'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { formatVariantLabel } from '@/lib/utils';
import { ReturnedGood, ReturnedGoodAction, Product } from '@/lib/types';
import { resolveProductImageUrl } from '@/services/product.service';
import { inventoryService } from '@/services/inventory.service';
import { MaterialItem } from '@/services/material.service';
import {
  BedDouble,
  Layers,
  Box,
  Armchair,
  Sofa,
  Package,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Wrench,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  BedDouble,
  Layers,
  Box,
  Armchair,
  Sofa,
  Package,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Wrench,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
};

interface ProcessReturnedGoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ReturnedGood | null;
  products: Product[];
  onConfirm: (action: 'RESTOCK' | 'DISASSEMBLE' | 'SCRAP' | 'CANCEL', notes: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function ProcessReturnedGoodModal({
  isOpen,
  onClose,
  item,
  products,
  onConfirm,
  isSubmitting = false,
}: ProcessReturnedGoodModalProps) {
  const [returnAction, setReturnAction] = useState<'RESTOCK' | 'DISASSEMBLE' | 'SCRAP' | 'CANCEL'>('RESTOCK');
  const [returnActionNotes, setReturnActionNotes] = useState('');
  const [apiMaterials, setApiMaterials] = useState<MaterialItem[]>([]);

  useEffect(() => {
    if (isOpen && item) {
      setReturnAction('RESTOCK');
      setReturnActionNotes('');
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen || returnAction !== 'DISASSEMBLE' || apiMaterials.length > 0) return;
    let isMounted = true;
    inventoryService
      .getMaterials({ limit: 200 })
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.data)) {
          setApiMaterials(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [isOpen, returnAction, apiMaterials.length]);

  if (!item) return null;

  const prod = products.find(p => p.id === item.productId || p.name === item.productName);
  const imageUrl = item.productImageUrl
    ? resolveProductImageUrl(item.productImageUrl)
    : prod?.image;
  const IconComp = iconMap[item.productImageIcon || prod?.imageIcon || 'BedDouble'] || BedDouble;
  const displayComplaintRef = item.complaintNumber || item.complaintId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tindak Lanjut Barang Retur"
      size="md"
      actions={
        <div className="flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            variant={returnAction === 'SCRAP' ? 'danger' : 'primary'}
            size="sm"
            onClick={() => onConfirm(returnAction, returnActionNotes.trim())}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Simpan Tindakan
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
        {/* Ringkasan Item */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2.5 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-start gap-3">
            {imageUrl ? (
              <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                <img src={imageUrl} alt={item.productName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                <IconComp className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {item.productName}
              </div>
              {item.variantLabel && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {formatVariantLabel(item.variantLabel)}
                </div>
              )}
              <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                Jumlah Retur: {item.qty} unit
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Referensi</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {displayComplaintRef} • {item.salesOrderNumber} ({item.customerName})
            </span>
          </div>
          {item.conditionReason && (
            <div className="flex justify-between items-start pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 shrink-0 mr-2">Alasan Retur</span>
              <span className="text-right text-slate-700 dark:text-slate-300">
                {item.conditionReason}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400">Dibuat oleh</span>
            <span className="text-slate-700 dark:text-slate-300">
              {item.createdBy || '-'}
            </span>
          </div>
        </div>

        {/* Pilihan Tindakan Alokasi */}
        <div>
          <Select
            label="Pilih Tindakan Alokasi"
            required
            value={returnAction}
            onChange={(e) => setReturnAction(e.target.value as 'RESTOCK' | 'DISASSEMBLE' | 'SCRAP' | 'CANCEL')}
            disabled={isSubmitting}
            options={[
              { value: 'RESTOCK', label: 'Masuk ke Stok Bebas Barang Jadi (Restock)' },
              { value: 'DISASSEMBLE', label: 'Bongkar ke Bahan Baku (Disassemble)' },
              { value: 'SCRAP', label: 'Afkir / Dibuang ke Sampah (Scrap)' },
              { value: 'CANCEL', label: 'Batalkan / Tidak Ditarik' },
            ]}
          />
        </div>

        {/* Input Catatan Tindakan */}
        <div>
          <Input
            label="Catatan Tindakan (Opsional)"
            placeholder="Tambahkan catatan atau instruksi..."
            value={returnActionNotes}
            onChange={(e) => setReturnActionNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </Modal>
  );
}
