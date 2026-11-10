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
  SalesOrderOption,
  SalesOrderResponse,
  OrderComplaintResponse,
} from '@/services/order.service';
import {
  workOrderService,
  WorkOrderResponse,
} from '@/services/work-order.service';

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

  const [orders, setOrders] = useState<SalesOrderOption[]>([]);
  const [apiComplaints, setApiComplaints] = useState<OrderComplaintResponse[]>([]);
  const [apiWorkOrders, setApiWorkOrders] = useState<WorkOrderResponse[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderResponse | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [, setIsLoadingOrderDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetOrderId, setTargetOrderId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [allocateQty, setAllocateQty] = useState<number>(1);
  const [allocationPurpose, setAllocationPurpose] = useState<'REGULAR' | 'COMPLAINT'>('REGULAR');
  const [targetComplaintId, setTargetComplaintId] = useState<string>('');
  const [targetCancelWoId, setTargetCancelWoId] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch candidate sales order options, active complaints, and work orders from API
  useEffect(() => {
    if (!isOpen || !finishedGood) {
      setOrders([]);
      setApiComplaints([]);
      setApiWorkOrders([]);
      setSelectedOrder(null);
      setTargetOrderId('');
      setSelectedItemId('');
      setAllocateQty(1);
      setAllocationPurpose('REGULAR');
      setTargetComplaintId('');
      setTargetCancelWoId(undefined);
      setNotes('');
      setErrorMessage('');
      return;
    }

    let isMounted = true;
    setIsLoadingOrders(true);

    Promise.allSettled([
      orderService.getOrderOptions({
        product_id: finishedGood.product_id,
        variant_id: finishedGood.variant_id || undefined,
      }),
      orderService.getComplaints({ per_page: 100 }),
      workOrderService.getWorkOrders({ per_page: 100 }),
    ])
      .then(([ordersRes, complaintsRes, workOrdersRes]) => {
        if (!isMounted) return;

        const baseOrders: SalesOrderOption[] =
          ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)
            ? [...ordersRes.value.data]
            : [];

        const complaintsList: OrderComplaintResponse[] =
          complaintsRes.status === 'fulfilled' && Array.isArray(complaintsRes.value.data)
            ? complaintsRes.value.data
            : [];
        setApiComplaints(complaintsList);

        const workOrdersList: WorkOrderResponse[] =
          workOrdersRes.status === 'fulfilled' && Array.isArray(workOrdersRes.value.data)
            ? workOrdersRes.value.data
            : [];
        setApiWorkOrders(workOrdersList);

        // Ensure SOs with active complaints for this product/variant are included in options
        const existingOrderIds = new Set(baseOrders.map((o) => o.id));
        for (const cmp of complaintsList) {
          const isActiveStatus =
            cmp.status === 'DITANGANI' ||
            cmp.status === 'DIPROSES' ||
            cmp.status === 'MENUNGGU' ||
            cmp.status === 'DIAJUKAN';
          const needsReplacement =
            cmp.replacement_status !== 'DELIVERED' &&
            cmp.replacement_status !== 'READY_FOR_DELIVERY' &&
            cmp.replacement_status !== 'SHIPPED' &&
            cmp.replacement_status !== 'IN_DELIVERY';

          if (!isActiveStatus || !needsReplacement) continue;

          const matchesItem = (cmp.items || []).some((ci) => {
            const prodMatch = ci.product_id === finishedGood.product_id;
            const varMatch =
              !finishedGood.variant_id ||
              !ci.variant_id ||
              ci.variant_id === finishedGood.variant_id;
            return prodMatch && varMatch;
          });

          if (matchesItem && cmp.sales_order_id && !existingOrderIds.has(cmp.sales_order_id)) {
            existingOrderIds.add(cmp.sales_order_id);
            baseOrders.push({
              id: cmp.sales_order_id,
              order_number: cmp.sales_order_number,
              customer_name: cmp.customer_name,
              customer_phone: '',
              status: 'SENT',
            });
          }
        }

        setOrders(baseOrders);
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

  const eligibleOrders = orders;

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

  const findActiveComplaintForOrder = (so: SalesOrderResponse) => {
    const fromApi = apiComplaints.find(
      (c) =>
        c.sales_order_id === so.id &&
        (c.status === 'MENUNGGU' ||
          c.status === 'DITANGANI' ||
          c.status === 'DIPROSES' ||
          c.status === 'DIAJUKAN') &&
        c.replacement_status !== 'DELIVERED'
    );
    if (fromApi) {
      const pendingWo = apiWorkOrders.find(
        (wo) =>
          (wo.complaint_id === fromApi.id || wo.id === fromApi.replacement_wo_id) &&
          wo.status === 'PENDING'
      );
      return {
        id: String(fromApi.id),
        cancelWoId: pendingWo?.id || fromApi.replacement_wo_id || undefined,
      };
    }

    let cf: any = so.custom_fields;
    if (typeof cf === 'string') {
      try {
        cf = JSON.parse(cf);
      } catch {
        cf = {};
      }
    }
    const complaints = (cf?.complaints as any[]) || [];
    const activeCmp = complaints.find(
      (c) =>
        (c.status === 'MENUNGGU' ||
          c.status === 'DITANGANI' ||
          c.status === 'DIPROSES' ||
          c.status === 'DIAJUKAN') &&
        (c.replacementStatus ?? c.replacement_status) !== 'DELIVERED'
    );
    if (activeCmp) {
      const woIdRaw = activeCmp.replacementWOId ?? activeCmp.replacement_wo_id;
      return {
        id: String(activeCmp.id || ''),
        cancelWoId: woIdRaw ? Number(woIdRaw) : undefined,
      };
    }
    return null;
  };

  const handleOrderChange = (soId: string) => {
    setTargetOrderId(soId);
    setErrorMessage('');
    if (!soId) {
      setSelectedOrder(null);
      setSelectedItemId('');
      setTargetComplaintId('');
      setTargetCancelWoId(undefined);
      return;
    }

    setIsLoadingOrderDetail(true);
    orderService
      .getOrderById(soId)
      .then((res) => {
        const so = res.data;
        if (!so) return;
        setSelectedOrder(so);

        const activeCmp = findActiveComplaintForOrder(so);

        if (activeCmp) {
          setAllocationPurpose('COMPLAINT');
          setTargetComplaintId(activeCmp.id);
          setTargetCancelWoId(activeCmp.cancelWoId);
        } else {
          setAllocationPurpose('REGULAR');
          setTargetComplaintId('');
          setTargetCancelWoId(undefined);
        }

        const items = (so.items || []).filter((item) => {
          const matchesProduct = item.product_id === finishedGood?.product_id;
          const matchesVariant =
            !finishedGood?.variant_id || item.variant_id === finishedGood?.variant_id;
          return matchesProduct && matchesVariant;
        });

        if (items.length > 0) {
          setSelectedItemId(String(items[0].id));
          const needed = Math.max(0, items[0].qty - (items[0].produced_qty || 0));
          setAllocateQty(Math.min(maxAvailable, Math.max(1, needed || 1)));
        } else {
          setSelectedItemId('');
          setAllocateQty(Math.min(maxAvailable, 1));
        }
      })
      .catch((err) => {
        console.error('Failed to load order detail:', err);
      })
      .finally(() => {
        setIsLoadingOrderDetail(false);
      });
  };

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = matchingItems.find((it) => String(it.id) === itemId);
    if (item) {
      const needed = Math.max(0, item.qty - (item.produced_qty || 0));
      setAllocateQty(Math.min(maxAvailable, Math.max(1, needed || 1)));
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
      const isComplaintAlloc = allocationPurpose === 'COMPLAINT';
      const numericComplaintId =
        isComplaintAlloc && targetComplaintId && !Number.isNaN(Number(targetComplaintId))
          ? Number(targetComplaintId)
          : undefined;

      const res = await finishedGoodService.allocateFinishedGood({
        product_id: finishedGood.product_id,
        variant_id: finishedGood.variant_id,
        sales_order_id: Number(targetOrderId),
        sales_order_item_id: selectedItem?.id,
        target_id: isComplaintAlloc ? (numericComplaintId ?? Number(targetOrderId)) : Number(targetOrderId),
        allocation_type: allocationPurpose,
        cancel_wo_id: isComplaintAlloc ? targetCancelWoId : undefined,
        qty: allocateQty,
        purpose: allocationPurpose,
        complaint_id: isComplaintAlloc ? targetComplaintId : undefined,
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
              ...eligibleOrders.map((so) => ({
                value: String(so.id),
                label: `${so.order_number} - ${so.customer_name} (Status: ${so.status})`,
              }))
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
          const activeCmp = findActiveComplaintForOrder(selectedOrder);
          const hasCmp = Boolean(activeCmp);
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
