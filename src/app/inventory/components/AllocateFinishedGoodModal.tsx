'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { formatVariantLabel } from '@/lib/utils';
import {
  finishedGoodService,
  FinishedGoodItem,
} from '@/services/finished-good.service';
import {
  orderService,
  SalesOrderResponse,
  SalesOrderItemResponse,
} from '@/services/order.service';

interface AllocateFinishedGoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  finishedGood: FinishedGoodItem | null;
  onSuccess: () => void;
}

export function AllocateFinishedGoodModal({
  isOpen,
  onClose,
  finishedGood,
  onSuccess,
}: AllocateFinishedGoodModalProps) {
  const { toast } = useToast();

  const [orders, setOrders] = useState<SalesOrderResponse[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetOrderId, setTargetOrderId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [allocateQty, setAllocateQty] = useState<number>(1);
  const [allocationPurpose, setAllocationPurpose] = useState<'REGULAR' | 'COMPLAINT'>('REGULAR');
  const [targetComplaintId, setTargetComplaintId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch candidate sales orders
  useEffect(() => {
    if (!isOpen || !finishedGood) {
      setOrders([]);
      setTargetOrderId('');
      setSelectedItemId('');
      setAllocateQty(1);
      setAllocationPurpose('REGULAR');
      setTargetComplaintId('');
      setNotes('');
      setErrorMessage('');
      return;
    }

    let isMounted = true;
    setIsLoadingOrders(true);

    orderService
      .getOrders({ per_page: 100 })
      .then((res) => {
        if (isMounted && res.data) {
          setOrders(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load orders for allocation:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOrders(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, finishedGood]);

  // Filter Sales Orders yang membutuhkan produk/varian ini
  const eligibleOrders = useMemo(() => {
    if (!finishedGood) return [];

    return orders.filter((so) => {
      if (so.status === 'CANCELED' || so.status === 'DELIVERED') return false;

      // Cek apakah ada komplain aktif
      const complaints = (so.custom_fields?.complaints as any[]) || [];
      const hasActiveComplaint = complaints.some(
        (c) =>
          (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') &&
          c.replacementStatus !== 'DELIVERED'
      );

      // Cek apakah ada item pesanan yang belum terpenuhi (produced_qty < qty)
      const hasUnfulfilledItem = (so.items || []).some((item) => {
        const matchesProduct = item.product_id === finishedGood.product_id;
        const matchesVariant =
          !finishedGood.variant_id || item.variant_id === finishedGood.variant_id;
        return matchesProduct && matchesVariant && (item.produced_qty || 0) < item.qty;
      });

      return hasUnfulfilledItem || hasActiveComplaint;
    });
  }, [orders, finishedGood]);

  const selectedOrder = useMemo(() => {
    if (!targetOrderId) return null;
    return eligibleOrders.find((so) => String(so.id) === targetOrderId) || null;
  }, [eligibleOrders, targetOrderId]);

  // Item pesanan yang relevan di dalam Sales Order terpilih
  const matchingItems = useMemo(() => {
    if (!selectedOrder || !finishedGood) return [];
    return (selectedOrder.items || []).filter((item) => {
      const matchesProduct = item.product_id === finishedGood.product_id;
      const matchesVariant =
        !finishedGood.variant_id || item.variant_id === finishedGood.variant_id;
      return matchesProduct && matchesVariant;
    });
  }, [selectedOrder, finishedGood]);

  const selectedItem = useMemo(() => {
    if (!matchingItems.length) return null;
    if (selectedItemId) {
      return matchingItems.find((it) => String(it.id) === selectedItemId) || matchingItems[0];
    }
    return matchingItems[0];
  }, [matchingItems, selectedItemId]);

  const maxAvailable = finishedGood?.available_stock || 0;
  const maxNeeded = selectedItem
    ? Math.max(0, (selectedItem.qty || 0) - (selectedItem.produced_qty || 0))
    : maxAvailable;

  const handleOrderChange = (soId: string) => {
    setTargetOrderId(soId);
    setErrorMessage('');
    const so = eligibleOrders.find((o) => String(o.id) === soId);

    const complaints = (so?.custom_fields?.complaints as any[]) || [];
    const activeCmp = complaints.find(
      (c) =>
        (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') &&
        c.replacementStatus !== 'DELIVERED'
    );

    if (activeCmp) {
      setAllocationPurpose('COMPLAINT');
      setTargetComplaintId(String(activeCmp.id || ''));
    } else {
      setAllocationPurpose('REGULAR');
      setTargetComplaintId('');
    }

    // Auto-select first matching item
    const items = (so?.items || []).filter((item) => {
      const matchesProduct = item.product_id === finishedGood?.product_id;
      const matchesVariant =
        !finishedGood?.variant_id || item.variant_id === finishedGood?.variant_id;
      return matchesProduct && matchesVariant;
    });

    if (items.length > 0) {
      setSelectedItemId(String(items[0].id));
      const needed = Math.max(0, items[0].qty - (items[0].produced_qty || 0));
      setAllocateQty(Math.min(maxAvailable, Math.max(1, needed)));
    } else {
      setSelectedItemId('');
      setAllocateQty(Math.min(maxAvailable, 1));
    }
  };

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = matchingItems.find((it) => String(it.id) === itemId);
    if (item) {
      const needed = Math.max(0, item.qty - (item.produced_qty || 0));
      setAllocateQty(Math.min(maxAvailable, Math.max(1, needed)));
    }
  };

  const handleSubmit = async () => {
    if (!finishedGood) return;
    if (!targetOrderId) {
      setErrorMessage('Pilih Sales Order tujuan alokasi.');
      return;
    }
    if (allocateQty <= 0) {
      setErrorMessage('Jumlah alokasi harus lebih dari 0.');
      return;
    }
    if (allocateQty > maxAvailable) {
      setErrorMessage(`Jumlah alokasi melebihi stok bebas yang tersedia (${maxAvailable} unit).`);
      return;
    }
    if (allocationPurpose === 'REGULAR' && selectedItem && allocateQty > maxNeeded) {
      setErrorMessage(`Jumlah alokasi melebihi sisa kebutuhan pesanan (${maxNeeded} unit).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await finishedGoodService.allocateFinishedGood({
        product_id: finishedGood.product_id,
        variant_id: finishedGood.variant_id,
        sales_order_id: Number(targetOrderId),
        sales_order_item_id: selectedItem?.id,
        qty: allocateQty,
        purpose: allocationPurpose,
        complaint_id: allocationPurpose === 'COMPLAINT' ? targetComplaintId : undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          'Alokasi Berhasil',
          res.message || 'Unit barang jadi berhasil dialokasikan ke Antrean Pengiriman.'
        );
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.message || 'Gagal mengalokasikan barang jadi.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem saat alokasi.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!finishedGood) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Alokasikan ke Pengiriman"
      size="md"
      actions={
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!targetOrderId || allocateQty <= 0 || maxAvailable <= 0 || isSubmitting}
            isLoading={isSubmitting}
          >
            Alokasikan Unit
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
        {/* Info Produk & Stok Bebas */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
          <div className="font-semibold text-sm text-slate-900 dark:text-white">
            {finishedGood.product_name}
          </div>
          {finishedGood.variant_label && (
            <div className="text-slate-500">
              {formatVariantLabel(finishedGood.variant_label)}
            </div>
          )}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500">Stok Bebas Tersedia:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {maxAvailable} unit
            </span>
          </div>
        </div>

        {/* Pilihan Sales Order Tujuan */}
        <div>
          <Select
            label="Pilih Sales Order Tujuan"
            required
            value={targetOrderId}
            disabled={isLoadingOrders || isSubmitting}
            onChange={(e) => handleOrderChange(e.target.value)}
            options={[
              {
                value: '',
                label: isLoadingOrders
                  ? 'Memuat data pesanan...'
                  : eligibleOrders.length === 0
                  ? 'Tidak ada SO aktif yang membutuhkan produk ini'
                  : '-- Pilih Sales Order --',
              },
              ...eligibleOrders.map((so) => {
                const complaints = (so.custom_fields?.complaints as any[]) || [];
                const hasCmp = complaints.some(
                  (c) =>
                    (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') &&
                    c.replacementStatus !== 'DELIVERED'
                );
                return {
                  value: String(so.id),
                  label: `${so.order_number} - ${so.customer_name} (${
                    hasCmp ? 'Komplain Aktif' : `Status: ${so.status}`
                  })`,
                };
              }),
            ]}
          />
          {!isLoadingOrders && eligibleOrders.length === 0 && (
            <p className="mt-1 text-[11px] text-slate-500 italic">
              Hanya Sales Order aktif atau yang memiliki komplain berjalan dan memesan produk ini yang dapat dialokasikan.
            </p>
          )}
        </div>

        {/* Pemilihan Item Pesanan Spesifik (jika ada lebih dari 1 item yang cocok) */}
        {matchingItems.length > 1 && (
          <div>
            <Select
              label="Pilih Item Pesanan"
              value={selectedItemId}
              onChange={(e) => handleItemChange(e.target.value)}
              disabled={isSubmitting}
              options={matchingItems.map((item) => ({
                value: String(item.id),
                label: `${item.product_name} (${item.produced_qty}/${item.qty} unit terpenuhi)`,
              }))}
            />
          </div>
        )}

        {/* Tujuan Alokasi jika pesanan memiliki komplain */}
        {selectedOrder && (() => {
          const complaints = (selectedOrder.custom_fields?.complaints as any[]) || [];
          const hasCmp = complaints.some(
            (c) =>
              (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') &&
              c.replacementStatus !== 'DELIVERED'
          );
          const hasReg = (selectedOrder.items || []).some(
            (it) =>
              it.product_id === finishedGood.product_id &&
              (!finishedGood.variant_id || it.variant_id === finishedGood.variant_id) &&
              (it.produced_qty || 0) < it.qty
          );

          if (hasCmp && hasReg) {
            return (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tujuan Alokasi
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="allocPurpose"
                      checked={allocationPurpose === 'REGULAR'}
                      onChange={() => setAllocationPurpose('REGULAR')}
                      disabled={isSubmitting}
                    />
                    <span>Pemenuhan Pesanan Reguler</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="allocPurpose"
                      checked={allocationPurpose === 'COMPLAINT'}
                      onChange={() => setAllocationPurpose('COMPLAINT')}
                      disabled={isSubmitting}
                    />
                    <span>Penggantian Komplain</span>
                  </label>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Input Kuantitas Alokasi */}
        {targetOrderId && (
          <div>
            <Input
              label="Jumlah Alokasi (Unit)"
              type="number"
              min={1}
              max={maxAvailable}
              value={allocateQty}
              onChange={(e) => setAllocateQty(Math.max(1, Number(e.target.value) || 1))}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-[11px] text-slate-500 italic">
              {selectedItem && allocationPurpose === 'REGULAR'
                ? `Sisa kebutuhan pesanan: ${maxNeeded} unit. Maksimum bebas: ${maxAvailable} unit.`
                : `Maksimum alokasi: ${maxAvailable} unit.`}
            </p>
          </div>
        )}

        {/* Catatan Alokasi (Opsional) */}
        {targetOrderId && (
          <div>
            <Input
              label="Catatan Alokasi (Opsional)"
              placeholder="Contoh: Alokasi stok bebas gudang untuk kiriman cepat"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Pesan Error Validasi */}
        {errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            {errorMessage}
          </p>
        )}
      </div>
    </Modal>
  );
}
