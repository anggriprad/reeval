'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { cn, formatDateTime, formatVariantLabel, getComplaintStatusLabel } from '@/lib/utils';
import { ComplaintAttachment, SalesOrder, OrderComplaint, WorkOrder, ReturnedGood } from '@/lib/types';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { orderService, mapOrderResponseToSalesOrder, mapComplaintResponseToOrderComplaint } from '@/services/order.service';
import { finishedGoodService, FinishedGoodItem } from '@/services/finished-good.service';
import { workOrderService, mapWorkOrderResponseToWorkOrder } from '@/services/work-order.service';
import { deliveryService, DeliveryOrder } from '@/services/delivery.service';
import { returnedGoodService, mapReturnedGoodResponseToReturnedGood } from '@/services/returned-good.service';
import { RejectComplaintModal } from './components/RejectComplaintModal';
import { ManualResolveComplaintModal } from './components/ManualResolveComplaintModal';
import { RefundComplaintModal } from './components/RefundComplaintModal';
import { ReplaceComplaintModal } from './components/ReplaceComplaintModal';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Truck,
  Wallet,
  Clock,
  Play,
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

export default function ComplaintDetailPage() {
  const router = useRouter();
  const params = useParams();
  const complaintId = params?.id as string;
  const { toast } = useToast();

  const {
    products,
    invoices,
    bankAccounts,
    finishedGoods: contextFinishedGoods,
  } = useApp();
  const { can } = usePermission();
  const canRespondComplaint = can(PERMISSIONS.COMPLAINT.RESPONS);

  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const [replacementSource, setReplacementSource] = useState<'NEW_SPK' | 'FINISHED_STOCK'>('NEW_SPK');
  const [isReturnRequested, setIsReturnRequested] = useState(true);
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');

  const [isManualCompleteModalOpen, setIsManualCompleteModalOpen] = useState(false);
  const [manualCompleteNotes, setManualCompleteNotes] = useState('');

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundNotes, setRefundNotes] = useState('');
  const [refundBankAccountId, setRefundBankAccountId] = useState('');
  const [isRefundReturnRequested, setIsRefundReturnRequested] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<ComplaintAttachment | null>(null);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  const [liveComplaint, setLiveComplaint] = useState<OrderComplaint | null>(null);
  const [liveOrder, setLiveOrder] = useState<SalesOrder | null>(null);
  const [apiFinishedGoods, setApiFinishedGoods] = useState<FinishedGoodItem[]>([]);
  const [linkedWorkOrder, setLinkedWorkOrder] = useState<WorkOrder | null>(null);
  const [linkedDeliveryOrder, setLinkedDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [linkedReturnedGood, setLinkedReturnedGood] = useState<ReturnedGood | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLiveComplaint = useCallback(async () => {
    if (!complaintId) return;
    setIsLoading(true);
    try {
      const res = await orderService.getComplaintById(complaintId);
      if (res.success && res.data) {
        const mappedComplaint = mapComplaintResponseToOrderComplaint(res.data);
        setLiveComplaint(mappedComplaint);

        if (mappedComplaint.orderId) {
          try {
            const orderRes = await orderService.getOrderById(mappedComplaint.orderId);
            if (orderRes.success && orderRes.data) {
              setLiveOrder(mapOrderResponseToSalesOrder(orderRes.data));
            }
          } catch {
            // fallback to constructed order from complaint
          }
        }

        try {
          const fgRes = await finishedGoodService.getFinishedGoods({ per_page: 200, show_empty: true });
          if (fgRes.success && Array.isArray(fgRes.data)) {
            setApiFinishedGoods(fgRes.data);
          }
        } catch {
          // fallback to context finished goods
        }

        if (mappedComplaint.replacementWOId) {
          try {
            const woRes = await workOrderService.getWorkOrderById(mappedComplaint.replacementWOId);
            if (woRes.success && woRes.data) {
              setLinkedWorkOrder(mapWorkOrderResponseToWorkOrder(woRes.data));
            }
          } catch {
            setLinkedWorkOrder(null);
          }
        } else {
          setLinkedWorkOrder(null);
        }

        if (mappedComplaint.replacementDOId) {
          try {
            const doRes = await deliveryService.getDeliveryOrderById(mappedComplaint.replacementDOId);
            if (doRes.success && doRes.data) {
              setLinkedDeliveryOrder(doRes.data);
            }
          } catch {
            setLinkedDeliveryOrder(null);
          }
        } else {
          setLinkedDeliveryOrder(null);
        }

        if (mappedComplaint.returnGoodId) {
          try {
            const rgRes = await returnedGoodService.getReturnedGoodById(mappedComplaint.returnGoodId);
            if (rgRes.success && rgRes.data) {
              setLinkedReturnedGood(mapReturnedGoodResponseToReturnedGood(rgRes.data));
            } else {
              setLinkedReturnedGood(null);
            }
          } catch {
            setLinkedReturnedGood(null);
          }
        } else if (mappedComplaint.id && !Number.isNaN(Number(mappedComplaint.id))) {
          try {
            const rgListRes = await returnedGoodService.getReturnedGoods({
              complaint_id: Number(mappedComplaint.id),
              per_page: 5,
            });
            const matchedRg = Array.isArray(rgListRes.data)
              ? rgListRes.data.find(
                  (rg) =>
                    Number(rg.complaint_id) === Number(mappedComplaint.id) ||
                    (mappedComplaint.complaintNumber && rg.complaint_number === mappedComplaint.complaintNumber)
                )
              : undefined;
            if (rgListRes.success && matchedRg) {
              setLinkedReturnedGood(mapReturnedGoodResponseToReturnedGood(matchedRg));
            } else {
              setLinkedReturnedGood(null);
            }
          } catch {
            setLinkedReturnedGood(null);
          }
        } else {
          setLinkedReturnedGood(null);
        }
      }
    } catch (err) {
      console.error('Failed to load complaint:', err);
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchLiveComplaint();
  }, [fetchLiveComplaint]);

  const complaint: OrderComplaint | undefined = liveComplaint || undefined;
  const order: SalesOrder | null = liveOrder || (complaint ? {
    id: complaint.orderId || '',
    orderNumber: complaint.orderNumber || '',
    createdBy: 'Sales',
    customer: { name: complaint.customerName || 'Pelanggan', phone: '', address: '' },
    items: (complaint.items || []).map(itm => ({
      productId: itm.productId,
      variantId: itm.variantId,
      productName: itm.productName,
      variantLabel: itm.variantLabel,
      qty: itm.qty,
      unitPrice: itm.unitPrice,
      selectedModifiers: [],
      isCustom: false,
      producedQty: itm.qty,
      shippedQty: itm.qty,
      deliveredQty: itm.qty,
      isBomCustomized: false,
    })),
    status: 'SENT' as const,
    totalAmount: (complaint.items || []).reduce((acc, itm) => acc + (itm.unitPrice || 0) * itm.qty, 0),
    shippingCost: 0,
    createdAt: complaint.createdAt,
    complaints: [complaint],
  } : null);

  useEffect(() => {
    if (bankAccounts.length > 0 && !refundBankAccountId) {
      setRefundBankAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, refundBankAccountId]);

  if (isLoading && (!order || !complaint)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!order || !complaint) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <PageHeader backHref="/order?status=komplain" title="Detail Komplain" />
        <EmptyState
          icon={<AlertCircle className="h-7 w-7" />}
          title="Komplain Tidak Ditemukan"
          description="Tiket komplain dengan ID tersebut tidak tersedia atau telah dihapus."
          action={<Button onClick={() => router.push('/order')}>Kembali ke Daftar Order</Button>}
        />
      </div>
    );
  }

  const invoice = invoices.find(inv => inv.salesOrderId === order.id || inv.salesOrderNumber === order.orderNumber);

  const refundAmount = complaint.refundAmount && complaint.refundAmount > 0
    ? complaint.refundAmount
    : complaint.items.reduce((sum: number, item: any) => {
        const price = (item.unitPrice && item.unitPrice > 0)
          ? item.unitPrice
          : (order.items.find((oi: any) => oi.productId === item.productId)?.unitPrice ?? 0);
        return sum + (price * item.qty);
      }, 0);

  const currentTotal = order.totalAmount;
  const newTotal = Math.max(0, currentTotal - refundAmount);
  const currentPaid = invoice ? invoice.paidAmount : 0;
  const cashToReturn = Math.max(0, currentPaid - newTotal);
  const newRemainingUnpaid = Math.max(0, newTotal - currentPaid);

  const getAvailableStockForComplaintItem = (ci: any): number => {
    if (apiFinishedGoods.length > 0) {
      const matchedFg = apiFinishedGoods.find(f => {
        const prodMatch = String(f.product_id) === String(ci.productId) || f.product_name === ci.productName;
        if (!prodMatch) return false;
        if (ci.variantId && f.variant_id) {
          return String(f.variant_id) === String(ci.variantId) || String(f.id) === String(ci.variantId);
        }
        if (ci.variantLabel && f.variant_label) {
          return f.variant_label === ci.variantLabel;
        }
        return true;
      });
      if (matchedFg) {
        return Math.max(0, Number(matchedFg.available_stock ?? 0));
      }
    }

    const fg = contextFinishedGoods.find(f =>
      (f.productId === ci.productId || f.productName === ci.productName) &&
      ((ci.variantId && f.variantId === ci.variantId) || (ci.variantLabel && f.variantLabel === ci.variantLabel) || (!ci.variantId && !ci.variantLabel))
    );
    if (!fg) return 0;
    const reservedCount = (fg.units || []).filter(u => u.status === 'RESERVED').length;
    return Math.max(0, fg.stock - reservedCount);
  };

  const totalAvailableStockForComplaint = complaint.items.reduce((acc: number, ci: any) => {
    return acc + getAvailableStockForComplaintItem(ci);
  }, 0);
  const totalNeededStock = complaint.items.reduce((acc: number, ci: any) => acc + ci.qty, 0);
  const canFulfillFromFinishedStock =
    complaint.items.length > 0 &&
    complaint.items.every((ci: any) => getAvailableStockForComplaintItem(ci) >= ci.qty) &&
    totalAvailableStockForComplaint >= totalNeededStock;

  const handleConfirmFulfillment = async () => {
    setIsSubmitting(true);
    try {
      const res = await orderService.resolveComplaint(complaint.id, {
        resolution: 'Penuhi Barang Pengganti',
        resolution_notes: fulfillmentNotes.trim() || undefined,
        replacement_source: replacementSource,
        is_return_requested: isReturnRequested,
      });
      if (res.success) {
        if (replacementSource === 'FINISHED_STOCK') {
          toast.success('Komplain Sedang Ditangani', 'Unit dialokasikan dari stok bebas gudang dan masuk ke Antrean Kirim.');
        } else {
          toast.success('Komplain Sedang Ditangani', 'SPK pengganti telah diterbitkan untuk produksi.');
        }
        await fetchLiveComplaint();
        setIsFulfillmentModalOpen(false);
        return;
      }
      toast.error('Gagal Memproses Komplain', res.message || 'Gagal memproses penggantian barang komplain.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal memproses penggantian barang komplain.';
      toast.error('Gagal Memproses Komplain', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRefund = async () => {
    setIsSubmitting(true);
    try {
      const res = await orderService.resolveComplaint(complaint.id, {
        resolution: 'Batalkan Pesanan (Refund)',
        resolution_notes: refundNotes.trim() || 'Direfund sesuai item yang diretur.',
        refund_amount: refundAmount,
        refund_bank_account_id: refundBankAccountId || undefined,
        is_return_requested: isRefundReturnRequested,
      });
      if (res.success) {
        toast.success('Komplain Diselesaikan', 'Pengembalian dana telah diproses.');
        await fetchLiveComplaint();
        setIsRefundModalOpen(false);
        return;
      }
      toast.error('Gagal Memproses Refund', res.message || 'Gagal memproses pengembalian dana komplain.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal memproses pengembalian dana komplain.';
      toast.error('Gagal Memproses Refund', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmManualComplete = async () => {
    setIsSubmitting(true);
    try {
      const res = await orderService.resolveComplaint(complaint.id, {
        resolution: 'Selesaikan Manual',
        resolution_notes: manualCompleteNotes.trim() || undefined,
      });
      if (res.success) {
        toast.success('Komplain Diselesaikan', 'Status komplain telah ditandai selesai.');
        await fetchLiveComplaint();
        setIsManualCompleteModalOpen(false);
        return;
      }
      toast.error('Gagal Menyelesaikan Komplain', res.message || 'Gagal menandai komplain selesai.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menandai komplain selesai.';
      toast.error('Gagal Menyelesaikan Komplain', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError('Alasan penolakan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await orderService.rejectComplaint(complaint.id, {
        reason: rejectionReason.trim(),
      });
      if (res.success) {
        toast.success('Komplain Ditolak', 'Pengajuan komplain telah ditolak.');
        await fetchLiveComplaint();
        setIsRejectModalOpen(false);
        return;
      }
      toast.error('Gagal Menolak Komplain', res.message || 'Gagal menolak pengajuan komplain.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menolak pengajuan komplain.';
      toast.error('Gagal Menolak Komplain', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayComplaintNumber = complaint.complaintNumber || complaint.id;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 lg:pb-12 text-slate-900 dark:text-slate-100">
      <PageHeader
        backHref="/order?status=komplain"
        title="Detail Komplain"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Detail Komplain */}
        <div className="lg:col-span-8 space-y-4">
          {/* Card 1: Kategori Kendala, Badge Status & Deskripsi */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-bold text-lg md:text-base text-slate-900 dark:text-white">
                {complaint.category}
              </h3>
              <Badge
                variant={
                  complaint.status === 'SELESAI' ? 'success' :
                  complaint.status === 'DITOLAK' ? 'danger' :
                  complaint.status === 'DITANGANI' ? 'info' :
                  'warning'
                }
              >
                {getComplaintStatusLabel(complaint.status)}
              </Badge>
            </div>

            {complaint.description && (
              <p className="text-[13.5px] md:text-xs text-slate-800 dark:text-slate-200 font-normal leading-relaxed whitespace-pre-line pt-0.5">
                <span className="text-slate-400 dark:text-slate-500 font-normal">Deskripsi: </span>
                {complaint.description}
              </p>
            )}
          </div>

          {/* Card 2: Item Bermasalah */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-base md:text-sm text-slate-900 dark:text-white">
              Item Bermasalah
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {complaint.items.map((item: any, idx: number) => {
                const product = products.find(p => p.id === item.productId || p.name === item.productName);
                const IconComp = iconMap[product?.imageIcon || 'BedDouble'] || BedDouble;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {product?.image ? (
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                          <img src={product.image} alt={item.productName} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                          <IconComp className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white block truncate">{item.productName}</span>
                        {item.variantLabel && (
                          <span className="text-slate-500 text-xs block truncate">
                            {formatVariantLabel(item.variantLabel)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-3">x{item.qty}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Bukti Lampiran */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-base md:text-sm text-slate-900 dark:text-white">
              Bukti Lampiran
            </h3>
            {complaint.attachments && complaint.attachments.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {complaint.attachments.map((att: any) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => setSelectedMedia(att)}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 hover:ring-2 hover:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
                  >
                    {att.type === 'image' ? (
                      <img
                        src={att.url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                        <video
                          src={att.url}
                          className="w-full h-full object-cover pointer-events-none opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                          <div className="p-1 rounded-full bg-black/60 text-white shadow-xs group-hover:scale-110 transition-transform">
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Tidak ada bukti lampiran yang disertakan.
              </p>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Referensi Pesanan & Aksi */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card Referensi */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-base md:text-sm text-slate-900 dark:text-white">
              Referensi Pesanan
            </h3>
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Nomor Komplain</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {displayComplaintNumber}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span className="text-slate-500 dark:text-slate-400">Tanggal Komplain</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatDateTime(complaint.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span className="text-slate-500 dark:text-slate-400">ID Pesanan</span>
                <Link
                  href={`/order/${order.id}`}
                  className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {order.orderNumber}
                </Link>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span className="text-slate-500 dark:text-slate-400">Nama Pelanggan</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                  {order.customer.name}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span className="text-slate-500 dark:text-slate-400">Tanggal Pesanan</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatDateTime(order.createdAt)}
                </span>
              </div>
              {linkedWorkOrder && (
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                  <span className="text-slate-500 dark:text-slate-400">SPK Pengganti</span>
                  <Link
                    href={`/production/spk/${linkedWorkOrder.id}`}
                    className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {linkedWorkOrder.spkNumber}
                  </Link>
                </div>
              )}
              {linkedDeliveryOrder && (
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Surat Jalan Pengganti</span>
                  <Link
                    href={`/delivery/sj/${linkedDeliveryOrder.id}`}
                    className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {linkedDeliveryOrder.delivery_number}
                  </Link>
                </div>
              )}
              {linkedReturnedGood && (
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Tiket Retur</span>
                  <Link
                    href="/inventory?tab=returns"
                    className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {linkedReturnedGood.returnNumber || `#${linkedReturnedGood.id}`}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Action / Resolusi (Desktop) */}
          {(!complaint.resolution || complaint.status === 'DIAJUKAN' || complaint.status === 'MENUNGGU') ? (
            canRespondComplaint ? (
              <div className="hidden lg:block">
                <Button
                  size="lg"
                  variant="primary"
                  className="w-full h-11 font-semibold text-sm shadow-sm"
                  onClick={() => setIsActionModalOpen(true)}
                >
                  Tanggapi Komplain
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-sm text-amber-800 dark:text-amber-300">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Menunggu Tinjauan Admin</span>
                </div>
                <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                  Pengajuan komplain sedang menunggu tindak lanjut dari Admin.
                </p>
              </div>
            )
          ) : complaint.status === 'DITOLAK' ? (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-red-800 dark:text-red-300">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Komplain Ditolak</span>
              </div>
              {complaint.rejectionReason && (
                <div className="text-[13.5px] sm:text-xs text-red-700 dark:text-red-400 leading-relaxed">
                  <span className="font-semibold">Alasan Penolakan: </span>
                  {complaint.rejectionReason}
                </div>
              )}
              <div className="text-xs sm:text-[11px] text-red-600/80 dark:text-red-500 pt-1">
                {complaint.rejectedAt
                  ? `Ditolak ${complaint.rejectedBy ? `oleh ${complaint.rejectedBy} ` : ''}pada ${formatDateTime(complaint.rejectedAt)}`
                  : 'Status: Ditolak'}
              </div>
            </div>
          ) : (
            <div className={cn(
              "p-4 rounded-xl border space-y-3",
              complaint.status === 'SELESAI'
                ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30"
                : "border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30"
            )}>
              <div className={cn(
                "flex items-center gap-2 font-semibold text-sm",
                complaint.status === 'SELESAI'
                  ? "text-emerald-800 dark:text-emerald-300"
                  : "text-blue-800 dark:text-blue-300"
              )}>
                {complaint.status === 'SELESAI' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 shrink-0" />
                )}
                <span>Resolusi: {complaint.resolution}</span>
              </div>
              {complaint.resolutionNotes && (
                <p className={cn(
                  "text-[13.5px] sm:text-xs leading-relaxed",
                  complaint.status === 'SELESAI'
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-blue-700 dark:text-blue-400"
                )}>
                  {complaint.resolutionNotes}
                </p>
              )}
              {complaint.replacementStatus && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[13px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium">Penggantian:</span>
                  <Badge
                    variant={
                      complaint.replacementStatus === 'READY_FOR_DELIVERY' ? 'success' :
                      complaint.replacementStatus === 'WAITING_PRODUCTION' ? 'warning' : 'purple'
                    }
                  >
                    {complaint.replacementStatus === 'READY_FOR_DELIVERY' ? 'Siap di Antrean Kirim' :
                     complaint.replacementStatus === 'WAITING_PRODUCTION' ? 'Menunggu Produksi (SPK)' :
                     complaint.replacementStatus === 'SHIPPED' || complaint.replacementStatus === 'IN_DELIVERY' ? 'Dalam Pengiriman' : 'Selesai Dikirim'}
                  </Badge>
                </div>
              )}
              <div className={cn(
                "text-xs sm:text-[11px] pt-1",
                complaint.status === 'SELESAI'
                  ? "text-emerald-600/80 dark:text-emerald-500"
                  : "text-blue-600/80 dark:text-blue-500"
              )}>
                {complaint.status === 'SELESAI' && complaint.resolvedAt
                  ? `Diselesaikan pada ${formatDateTime(complaint.resolvedAt)}`
                  : 'Status: Sedang Ditangani'}
              </div>

              {complaint.status === 'DITANGANI' && canRespondComplaint && (
                <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setManualCompleteNotes('');
                      setIsManualCompleteModalOpen(true);
                    }}
                  >
                    Tandai Selesai Manual
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Fixed Bottom Action Bar: Tanggapi Komplain */}
      {canRespondComplaint && (!complaint.resolution || complaint.status === 'DIAJUKAN' || complaint.status === 'MENUNGGU') && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 dark:border-slate-800/90 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pt-3 px-4 pb-[max(12px,calc(env(safe-area-inset-bottom,0px)+4px))] after:content-[''] after:absolute after:top-full after:left-0 after:right-0 after:h-24 after:bg-white dark:after:bg-slate-900 pointer-events-auto">
          <Button
            size="lg"
            variant="primary"
            className="w-full h-12 font-semibold text-[15px] justify-center rounded-xl shadow-sm"
            onClick={() => setIsActionModalOpen(true)}
          >
            Tanggapi Komplain
          </Button>
        </div>
      )}

      {/* Modal: Pilih Tindakan */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title="Pilih Tindakan"
        size="sm"
        bodyClassName="p-3.5 sm:p-5 space-y-0"
      >
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsActionModalOpen(false);
              setIsFulfillmentModalOpen(true);
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-100 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800 transition-colors cursor-pointer text-left select-none active:scale-[0.99]"
          >
            <Truck className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Kirim barang pengganti</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsActionModalOpen(false);
              setIsRefundModalOpen(true);
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-100 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800 transition-colors cursor-pointer text-left select-none active:scale-[0.99]"
          >
            <Wallet className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Batalkan pesanan (refund)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsActionModalOpen(false);
              setRejectionReason('');
              setRejectionError('');
              setIsRejectModalOpen(true);
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-red-600 hover:bg-red-50 active:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:active:bg-red-950/40 transition-colors cursor-pointer text-left select-none active:scale-[0.99]"
          >
            <XCircle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0" />
            <span>Tolak komplain</span>
          </button>
        </div>
      </Modal>

      <RefundComplaintModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        refundAmount={refundAmount}
        currentPaid={currentPaid}
        cashToReturn={cashToReturn}
        newRemainingUnpaid={newRemainingUnpaid}
        bankAccounts={bankAccounts}
        refundBankAccountId={refundBankAccountId}
        onChangeBankAccountId={setRefundBankAccountId}
        isReturnRequested={isRefundReturnRequested}
        onChangeReturnRequested={setIsRefundReturnRequested}
        refundNotes={refundNotes}
        onChangeRefundNotes={setRefundNotes}
        onConfirm={handleConfirmRefund}
        isSubmitting={isSubmitting}
      />

      <ReplaceComplaintModal
        isOpen={isFulfillmentModalOpen}
        onClose={() => setIsFulfillmentModalOpen(false)}
        replacementSource={replacementSource}
        onChangeReplacementSource={setReplacementSource}
        totalAvailableStock={totalAvailableStockForComplaint}
        canFulfillFromStock={canFulfillFromFinishedStock}
        isReturnRequested={isReturnRequested}
        onChangeReturnRequested={setIsReturnRequested}
        fulfillmentNotes={fulfillmentNotes}
        onChangeFulfillmentNotes={setFulfillmentNotes}
        onConfirm={handleConfirmFulfillment}
        isSubmitting={isSubmitting}
      />

      <ManualResolveComplaintModal
        isOpen={isManualCompleteModalOpen}
        onClose={() => setIsManualCompleteModalOpen(false)}
        notes={manualCompleteNotes}
        onChangeNotes={setManualCompleteNotes}
        onConfirm={handleConfirmManualComplete}
        isSubmitting={isSubmitting}
      />

      <RejectComplaintModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        rejectionReason={rejectionReason}
        rejectionError={rejectionError}
        onChangeReason={val => {
          setRejectionReason(val);
          if (rejectionError) setRejectionError('');
        }}
        onConfirm={handleConfirmReject}
        isSubmitting={isSubmitting}
      />

      {/* MEDIA PREVIEW MODAL */}
      <Modal
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
        title={selectedMedia?.type === 'video' ? 'Pratinjau Video Bukti' : 'Pratinjau Foto Bukti'}
        size="lg"
        actions={
          <Button variant="secondary" size="sm" onClick={() => setSelectedMedia(null)}>
            Tutup
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center p-1">
          {selectedMedia?.type === 'image' && (
            <img
              src={selectedMedia.url}
              alt=""
              className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-xs"
            />
          )}
          {selectedMedia?.type === 'video' && (
            <video
              src={selectedMedia.url}
              controls
              autoPlay
              playsInline
              className="max-h-[72vh] w-full rounded-lg bg-black object-contain shadow-xs"
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
