'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface ReplaceComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  replacementSource: 'NEW_SPK' | 'FINISHED_STOCK';
  onChangeReplacementSource: (source: 'NEW_SPK' | 'FINISHED_STOCK') => void;
  totalAvailableStock: number;
  canFulfillFromStock: boolean;
  isReturnRequested: boolean;
  onChangeReturnRequested: (checked: boolean) => void;
  fulfillmentNotes: string;
  onChangeFulfillmentNotes: (value: string) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function ReplaceComplaintModal({
  isOpen,
  onClose,
  replacementSource,
  onChangeReplacementSource,
  totalAvailableStock,
  canFulfillFromStock,
  isReturnRequested,
  onChangeReturnRequested,
  fulfillmentNotes,
  onChangeFulfillmentNotes,
  onConfirm,
  isSubmitting = false,
}: ReplaceComplaintModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kirim Barang Pengganti"
      size="md"
      actions={
        <Button
          size="lg"
          variant="primary"
          className="w-full"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          Proses Komplain
        </Button>
      }
    >
      <div className="space-y-6 text-[13.5px] md:text-xs">
        <div className="space-y-2">
          <label className="block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
            Sumber Barang
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label
              className={cn(
                "flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                replacementSource === 'NEW_SPK'
                  ? "border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <input
                type="radio"
                name="replacementSource"
                checked={replacementSource === 'NEW_SPK'}
                onChange={() => onChangeReplacementSource('NEW_SPK')}
                className="mt-0.5 h-4 w-4 text-slate-900 dark:text-slate-100 focus:ring-slate-400"
              />
              <div className="min-w-0">
                <span className="block font-medium text-[13.5px] md:text-xs text-slate-900 dark:text-white">
                  Produksi Barang Baru
                </span>
                <span className="block text-xs md:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Produksi ulang unit
                </span>
              </div>
            </label>

            <label
              className={cn(
                "flex items-start gap-3 p-3 rounded-md border transition-colors",
                !canFulfillFromStock
                  ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  : replacementSource === 'FINISHED_STOCK'
                  ? "border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
              )}
            >
              <input
                type="radio"
                name="replacementSource"
                checked={replacementSource === 'FINISHED_STOCK'}
                onChange={() => onChangeReplacementSource('FINISHED_STOCK')}
                disabled={!canFulfillFromStock}
                className="mt-0.5 h-4 w-4 text-slate-900 dark:text-slate-100 focus:ring-slate-400"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-[13.5px] md:text-xs text-slate-900 dark:text-white">
                    Ambil dari Stok
                  </span>
                  <Badge variant="default">
                    {totalAvailableStock} unit
                  </Badge>
                </div>
                <span className="block text-xs md:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {canFulfillFromStock
                    ? "Ambil dari barang jadi"
                    : "Stok tidak cukup"}
                </span>
              </div>
            </label>
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none py-0.5">
          <Checkbox
            checked={isReturnRequested}
            onChange={checked => onChangeReturnRequested(checked)}
          />
          <span className="font-medium text-[13.5px] md:text-xs text-slate-800 dark:text-slate-200">
            Tarik barang dari pelanggan
          </span>
        </label>

        <Input
          label="Catatan (Opsional)"
          placeholder="Tambahkan catatan jika ada..."
          value={fulfillmentNotes}
          onChange={e => onChangeFulfillmentNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
