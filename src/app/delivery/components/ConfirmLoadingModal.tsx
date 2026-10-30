'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeliveryTripGroup } from './types';

interface ConfirmLoadingModalProps {
  trip: DeliveryTripGroup | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tripId: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function ConfirmLoadingModal({
  trip,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: ConfirmLoadingModalProps) {
  const [checkedLoadingItemKeys, setCheckedLoadingItemKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setCheckedLoadingItemKeys({});
    }
  }, [isOpen, trip?.tripId]);

  const kloterLoadingItems = useMemo(() => {
    if (!trip) return [];
    const items: Array<{
      key: string;
      productName: string;
      variantLabel?: string;
      qty: number;
      spkNumber?: string;
      customerName: string;
      customerAddress?: string;
      salesOrderNumber: string;
    }> = [];

    trip.deliveryOrders.forEach(dOrder => {
      const orderItems = dOrder.orderItems || dOrder.items || [];
      if (orderItems.length > 0 && typeof orderItems[0] === 'object') {
        orderItems.forEach((oi: any, itemIdx: number) => {
          items.push({
            key: `${dOrder.id}__item_${oi.id || itemIdx}`,
            productName: oi.product_name || oi.productName || 'Produk',
            variantLabel: oi.variant_label || oi.variantLabel,
            qty: Number(oi.qty) || 1,
            spkNumber: oi.spk_number || oi.spkNumber,
            customerName: dOrder.customerName || dOrder.customer_name,
            customerAddress: dOrder.customerAddress || dOrder.customer_address,
            salesOrderNumber: oi.sales_order_number || oi.orderNumber || dOrder.salesOrderNumber || dOrder.sales_order_number,
          });
        });
      } else {
        orderItems.forEach((itName: any, itemIdx: number) => {
          items.push({
            key: `${dOrder.id}__legacy_${itemIdx}`,
            productName: typeof itName === 'string' ? itName : 'Produk',
            qty: 1,
            customerName: dOrder.customerName || dOrder.customer_name,
            customerAddress: dOrder.customerAddress || dOrder.customer_address,
            salesOrderNumber: dOrder.salesOrderNumber || dOrder.sales_order_number,
          });
        });
      }
    });

    return items;
  }, [trip]);

  const isAllLoadingItemsChecked =
    kloterLoadingItems.length > 0 &&
    kloterLoadingItems.every(item => !!checkedLoadingItemKeys[item.key]);

  const checkedLoadingCount = kloterLoadingItems.filter(item => !!checkedLoadingItemKeys[item.key]).length;

  const toggleLoadingItem = (key: string) => {
    setCheckedLoadingItemKeys(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllLoadingItems = () => {
    if (isAllLoadingItemsChecked) {
      setCheckedLoadingItemKeys({});
    } else {
      const next: Record<string, boolean> = {};
      kloterLoadingItems.forEach(i => {
        next[i.key] = true;
      });
      setCheckedLoadingItemKeys(next);
    }
  };

  const handleConfirm = async () => {
    if (!trip || !isAllLoadingItemsChecked) return;
    await onConfirm(trip.tripId);
  };

  if (!trip) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfirmasi Muat Barang"
      description="Periksa fisik setiap barang yang dinaikkan ke armada. Centang seluruh item sebelum memulai perjalanan."
      size="md"
      actions={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isAllLoadingItemsChecked || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Memproses...' : 'Mulai Perjalanan'}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        {/* Checklist Header & Progress Bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Ceklis Muatan: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{checkedLoadingCount} / {kloterLoadingItems.length}</strong> selesai
            </span>
            <button
              type="button"
              onClick={toggleAllLoadingItems}
              className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {isAllLoadingItemsChecked ? 'Batalkan Semua' : 'Centang Semua'}
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${kloterLoadingItems.length > 0 ? (checkedLoadingCount / kloterLoadingItems.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Checklist of all items */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {kloterLoadingItems.map(item => {
            const isChecked = !!checkedLoadingItemKeys[item.key];
            return (
              <div
                key={item.key}
                onClick={() => toggleLoadingItem(item.key)}
                className={cn(
                  'p-3 flex items-start gap-3 cursor-pointer transition-colors select-none text-xs',
                  isChecked
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleLoadingItem(item.key)}
                  onClick={e => e.stopPropagation()}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 h-4 w-4 shrink-0 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'font-semibold',
                            isChecked
                              ? 'text-slate-900 dark:text-white line-through opacity-80'
                              : 'text-slate-900 dark:text-white'
                          )}
                        >
                          {item.productName}
                        </span>
                        {item.spkNumber && (
                          <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800">
                            {item.spkNumber}
                          </span>
                        )}
                      </div>
                      {item.variantLabel && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.variantLabel}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {item.qty} Unit
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      Pesanan: {item.salesOrderNumber}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[180px]">{item.customerName}</span>
                    {item.customerAddress && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">{item.customerAddress}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isAllLoadingItemsChecked && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Masih ada {kloterLoadingItems.length - checkedLoadingCount} barang yang belum diceklis.</span>
          </p>
        )}
      </div>
    </Modal>
  );
}
