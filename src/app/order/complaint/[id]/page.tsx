'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { cn, formatCurrency, formatDateTime, formatVariantLabel, getComplaintStatusLabel } from '@/lib/utils';
import { ComplaintAttachment } from '@/lib/types';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Film,
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

  const { salesOrders, products, invoices, bankAccounts, finishedGoods, resolveOrderComplaint, rejectOrderComplaint, manuallyResolveComplaint } = useApp();

  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const [replacementSource, setReplacementSource] = useState<'NEW_SPK' | 'FINISHED_STOCK'>('NEW_SPK');
  const [isReturnRequested, setIsReturnRequested] = useState(true);
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');

  const [isManualCompleteModalOpen, setIsManualCompleteModalOpen] = useState(false);
  const [manualCompleteNotes, setManualCompleteNotes] = useState('');

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundNotes, setRefundNotes] = useState('');
  const [refundBankAccountId, setRefundBankAccountId] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ComplaintAttachment | null>(null);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  // Find the order that contains this complaint
  const order = salesOrders.find(o => o.complaints?.some(c => c.id === complaintId));
  const complaint = order?.complaints?.find(c => c.id === complaintId);

  // Set default bank account
  useEffect(() => {
    if (bankAccounts.length > 0 && !refundBankAccountId) {
      setRefundBankAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, refundBankAccountId]);

  if (!order || !complaint) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <PageHeader backHref="/order" title="Detail Komplain" />
        <EmptyState
          icon={<AlertCircle className="h-7 w-7" />}
          title="Komplain Tidak Ditemukan"
          description="Tiket komplain dengan ID tersebut tidak tersedia atau telah dihapus."
          action={<Button onClick={() => router.push('/order')}>Kembali ke Daftar Order</Button>}
        />
      </div>
    );
  }

  // Linked invoice
  const invoice = invoices.find(inv => inv.salesOrderId === order.id || inv.salesOrderNumber === order.orderNumber);

  // Financial calculations
  const refundAmount = complaint.items.reduce((sum, item) => {
    const price = (item.unitPrice && item.unitPrice > 0)
      ? item.unitPrice
      : (order.items.find(oi => oi.productId === item.productId)?.unitPrice ?? 0);
    return sum + (price * item.qty);
  }, 0);

  const currentTotal = order.totalAmount;
  const newTotal = Math.max(0, currentTotal - refundAmount);
  const currentPaid = invoice ? invoice.paidAmount : 0;
  const cashToReturn = Math.max(0, currentPaid - newTotal);
  const newRemainingUnpaid = Math.max(0, newTotal - currentPaid);

  // Check available finished goods stock for complaint items
  const totalAvailableStockForComplaint = complaint.items.reduce((acc, ci) => {
    const fg = finishedGoods.find(f =>
      (f.productId === ci.productId || f.productName === ci.productName) &&
      ((ci.variantId && f.variantId === ci.variantId) || (ci.variantLabel && f.variantLabel === ci.variantLabel) || (!ci.variantId && !ci.variantLabel))
    );
    if (!fg) return acc;
    const reservedCount = (fg.units || []).filter(u => u.status === 'RESERVED').length;
    const avail = Math.max(0, fg.stock - reservedCount);
    return acc + avail;
  }, 0);
  const totalNeededStock = complaint.items.reduce((acc, ci) => acc + ci.qty, 0);

  const handleConfirmFulfillment = () => {
    const res = resolveOrderComplaint(
      order.id,
      complaint.id,
      'Penuhi Barang Pengganti',
      fulfillmentNotes.trim() || undefined,
      undefined,
      {
        replacementSource,
        isReturnRequested,
      }
    ) as { success: boolean; inStock?: boolean; spkNumber?: string } | undefined;

    if (replacementSource === 'FINISHED_STOCK') {
      toast.success('Komplain Sedang Ditangani', 'Unit dialokasikan dari stok bebas gudang dan masuk ke Antrean Kirim.');
    } else {
      toast.success('Komplain Sedang Ditangani', res?.spkNumber ? `${res.spkNumber} telah diterbitkan untuk produksi.` : 'SPK pengganti telah diterbitkan.');
    }
    setIsFulfillmentModalOpen(false);
  };

  const handleConfirmRefund = () => {
    resolveOrderComplaint(
      order.id,
      complaint.id,
      'Batalkan Pesanan (Refund)',
      refundNotes.trim() || 'Direfund sesuai item yang diretur.',
      refundBankAccountId,
      {
        isReturnRequested,
      }
    );
    toast.success('Komplain Diselesaikan', 'Pengembalian dana telah diproses.');
    setIsRefundModalOpen(false);
  };

  const handleConfirmManualComplete = () => {
    manuallyResolveComplaint(order.id, complaint.id, manualCompleteNotes.trim() || undefined);
    toast.success('Komplain Diselesaikan', 'Status komplain telah ditandai selesai.');
    setIsManualCompleteModalOpen(false);
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setRejectionError('Alasan penolakan wajib diisi.');
      return;
    }
    rejectOrderComplaint(order.id, complaint.id, rejectionReason.trim());
    toast.success('Komplain Ditolak', 'Pengajuan komplain telah ditolak.');
    setIsRejectModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 text-slate-900 dark:text-slate-100">
      <PageHeader
        backHref="/order"
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{complaint.id}</span>
            <Badge className={
              complaint.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' :
              complaint.status === 'DITOLAK' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800' :
              complaint.status === 'DITANGANI' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' :
              'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
            }>
              {getComplaintStatusLabel(complaint.status)}
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Info Detail Komplain */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 space-y-5">
            {/* 1. Kategori Kendala */}
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                Kategori Kendala
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                {complaint.category}
              </div>
            </div>

            {/* 2. Referensi Pesanan */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                Referensi Pesanan
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                {order.customer.name}, {formatDateTime(complaint.createdAt)}. ID Pesanan{' '}
                <Link
                  href={`/order/${order.id}`}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  {order.orderNumber}
                </Link>
              </div>
            </div>

            {/* 3. Item Bermasalah */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                Item Bermasalah
              </div>
              <div className="space-y-2">
                {complaint.items.map((item, idx) => {
                  const product = products.find(p => p.id === item.productId || p.name === item.productName);
                  const IconComp = iconMap[product?.imageIcon || 'BedDouble'] || BedDouble;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0"
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

            {/* 4. Deskripsi Komplain */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Deskripsi Komplain
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {complaint.description}
              </p>
            </div>

            {/* 5. Bukti Foto & Video */}
            {complaint.attachments && complaint.attachments.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2.5">
                  Bukti Foto & Video
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {complaint.attachments.map((att) => (
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
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Tindakan Resolusi */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Tindakan Resolusi
            </div>

            {(!complaint.resolution || complaint.status === 'DIAJUKAN' || complaint.status === 'MENUNGGU') ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsFulfillmentModalOpen(true)}
                  className="w-full text-left p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-xs space-y-1"
                >
                  <div className="font-semibold text-sm text-indigo-700 dark:text-indigo-400">
                    Penuhi Barang Pengganti
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Selesaikan komplain dengan unit pengganti (SPK baru atau ambil stok gudang)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(true)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-xs space-y-1"
                >
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    Batalkan Pesanan (Refund)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Batalkan item yang bermasalah dan proses pengembalian dana
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRejectionReason('');
                    setRejectionError('');
                    setIsRejectModalOpen(true);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-red-200 dark:border-red-900/60 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-xs space-y-1"
                >
                  <div className="font-semibold text-sm text-red-600 dark:text-red-400">
                    Tolak Komplain
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tolak pengajuan komplain pelanggan dan berikan alasan penolakan
                  </div>
                </button>
              </div>
            ) : complaint.status === 'DITOLAK' ? (
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-red-800 dark:text-red-300">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Komplain Ditolak</span>
                </div>
                {complaint.rejectionReason && (
                  <div className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    <span className="font-semibold">Alasan Penolakan: </span>
                    {complaint.rejectionReason}
                  </div>
                )}
                <div className="text-[11px] text-red-600/80 dark:text-red-500 pt-1">
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
                    "text-xs leading-relaxed",
                    complaint.status === 'SELESAI'
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-blue-700 dark:text-blue-400"
                  )}>
                    {complaint.resolutionNotes}
                  </p>
                )}
                {complaint.replacementStatus && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Penggantian:</span>
                    <Badge
                      variant={
                        complaint.replacementStatus === 'READY_FOR_DELIVERY' ? 'success' :
                        complaint.replacementStatus === 'WAITING_PRODUCTION' ? 'warning' : 'purple'
                      }
                      className="text-[10px]"
                    >
                      {complaint.replacementStatus === 'READY_FOR_DELIVERY' ? 'Siap di Antrean Kirim' :
                       complaint.replacementStatus === 'WAITING_PRODUCTION' ? 'Menunggu Produksi (SPK)' :
                       complaint.replacementStatus === 'SHIPPED' ? 'Dalam Pengiriman' : 'Selesai Dikirim'}
                    </Badge>
                  </div>
                )}
                <div className={cn(
                  "text-[11px] pt-1",
                  complaint.status === 'SELESAI'
                    ? "text-emerald-600/80 dark:text-emerald-500"
                    : "text-blue-600/80 dark:text-blue-500"
                )}>
                  {complaint.status === 'SELESAI' && complaint.resolvedAt
                    ? `Diselesaikan pada ${formatDateTime(complaint.resolvedAt)}`
                    : 'Status: Sedang Ditangani'}
                </div>

                {complaint.status === 'DITANGANI' && (
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
      </div>

      {/* Modal Konfirmasi Resolusi Refund */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Konfirmasi Resolusi Refund"
        size="lg"
        actions={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsRefundModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmRefund}
              disabled={cashToReturn > 0 && !refundBankAccountId}
            >
              Proses Refund
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          {/* Ringkasan Item Direfund */}
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Item yang Direfund
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {complaint.items.map((item, idx) => {
                const itemPrice = (item.unitPrice && item.unitPrice > 0)
                  ? item.unitPrice
                  : (order.items.find(oi => oi.productId === item.productId)?.unitPrice ?? 0);
                const subtotal = itemPrice * item.qty;
                return (
                  <div key={idx} className="p-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.productName}
                      </div>
                      <div className="text-slate-500">
                        {item.variantLabel ? `${formatVariantLabel(item.variantLabel)} • ` : ''}{item.qty} unit × {formatCurrency(itemPrice)}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(subtotal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rincian Finansial & Tagihan */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Total Tagihan Pesanan Awal</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(currentTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-medium">
              <span>Nilai Item Direfund</span>
              <span>- {formatCurrency(refundAmount)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex justify-between items-center font-bold text-slate-900 dark:text-white">
              <span>Total Tagihan Pesanan Baru</span>
              <span>{formatCurrency(newTotal)}</span>
            </div>
          </div>

          {/* Status Pembayaran & Dampak Finansial */}
          <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Sudah Dibayar Pelanggan</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(currentPaid)}</span>
            </div>

            {cashToReturn > 0 ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Kelebihan Bayar (Dana Kembali ke Pelanggan)</span>
                <span className="text-sm">{formatCurrency(cashToReturn)}</span>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center font-medium">
                <span className="text-slate-600 dark:text-slate-400">Sisa Tagihan / Piutang Baru</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(newRemainingUnpaid)}</span>
              </div>
            )}
          </div>

          {/* Jika ada kas keluar yang harus dikembalikan ke pelanggan */}
          {cashToReturn > 0 && (
            <div>
              <Select
                label="Rekening Pengeluaran Kas / Bank"
                required
                value={refundBankAccountId}
                onChange={e => setRefundBankAccountId(e.target.value)}
                options={bankAccounts.map(ba => ({
                  value: ba.id,
                  label: `${ba.name} (Saldo: ${formatCurrency(ba.balance)})`,
                }))}
              />
            </div>
          )}

          {/* Catatan Resolusi */}
          <div>
            <Input
              label="Catatan Resolusi (Opsional)"
              placeholder="Contoh: Refund ditransfer via bank atas retur barang"
              value={refundNotes}
              onChange={e => setRefundNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Resolusi Pemenuhan Barang Pengganti */}
      <Modal
        isOpen={isFulfillmentModalOpen}
        onClose={() => setIsFulfillmentModalOpen(false)}
        title="Penuhi Barang Pengganti"
        size="lg"
        actions={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsFulfillmentModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmFulfillment}
            >
              Setujui Pemenuhan
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Item yang Diganti
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {complaint.items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {item.productName}
                    </div>
                    {item.variantLabel && (
                      <div className="text-slate-500">
                        {formatVariantLabel(item.variantLabel)}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {item.qty} unit
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pilihan Sumber Pemenuhan */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih Sumber Pemenuhan Unit <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                  replacementSource === 'NEW_SPK'
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500 ring-1 ring-indigo-600/30"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <input
                  type="radio"
                  name="replacementSource"
                  checked={replacementSource === 'NEW_SPK'}
                  onChange={() => setReplacementSource('NEW_SPK')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="min-w-0">
                  <span className="block font-semibold text-xs text-slate-900 dark:text-white">
                    Terbitkan SPK Produksi Baru
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Membuat tiket SPK baru di modul Produksi agar tukang mengerjakan unit pengganti.
                  </span>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border transition-all",
                  totalAvailableStockForComplaint < totalNeededStock
                    ? "opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    : replacementSource === 'FINISHED_STOCK'
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500 ring-1 ring-indigo-600/30 cursor-pointer"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                )}
              >
                <input
                  type="radio"
                  name="replacementSource"
                  checked={replacementSource === 'FINISHED_STOCK'}
                  onChange={() => setReplacementSource('FINISHED_STOCK')}
                  disabled={totalAvailableStockForComplaint < totalNeededStock}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">
                      Ambil dari Stok Bebas Gudang
                    </span>
                    <Badge variant={totalAvailableStockForComplaint >= totalNeededStock ? "success" : "default"} className="text-[10px]">
                      Stok Bebas: {totalAvailableStockForComplaint}
                    </Badge>
                  </div>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {totalAvailableStockForComplaint >= totalNeededStock
                      ? "Langsung tahan unit barang jadi di gudang dan masuk ke Antrean Kirim."
                      : "Stok bebas di gudang tidak mencukupi, harap gunakan SPK baru."}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Opsi Penarikan Barang Lama (Tukar Guling) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isReturnRequested}
                onChange={e => setIsReturnRequested(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="min-w-0">
                <span className="block font-semibold text-xs text-slate-900 dark:text-white">
                  Tarik barang lama dari pelanggan (Tukar Guling)
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Item lama akan tercatat di tab Barang Retur (menunggu fisik) dan otomatis menjadi instruksi penarikan bagi supir saat pengantaran barang pengganti.
                </span>
              </div>
            </label>
          </div>

          {/* Catatan Resolusi */}
          <div>
            <Input
              label="Catatan Resolusi (Opsional)"
              placeholder="Contoh: Unit pengganti dijadwalkan selesai minggu ini..."
              value={fulfillmentNotes}
              onChange={e => setFulfillmentNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Modal Tandai Selesai Manual */}
      <Modal
        isOpen={isManualCompleteModalOpen}
        onClose={() => setIsManualCompleteModalOpen(false)}
        title="Tandai Selesai Manual"
        size="md"
        actions={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsManualCompleteModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmManualComplete}
            >
              Tandai Selesai
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Gunakan opsi ini jika komplain telah diselesaikan melalui kesepakatan damai atau di luar sistem pengiriman otomatis. Tiket komplain akan langsung ditandai selesai.
          </p>
          <div>
            <Input
              label="Catatan Penyelesaian (Opsional)"
              placeholder="Contoh: Diselesaikan secara damai / serah terima langsung di workshop..."
              value={manualCompleteNotes}
              onChange={e => setManualCompleteNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Tolak Komplain */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Tolak Pengajuan Komplain"
        size="md"
        actions={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsRejectModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
            >
              Tolak Komplain
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Pengajuan komplain dari pelanggan akan ditolak. Pesanan tidak akan mengalami perubahan tagihan dan tidak ada barang retur yang masuk ke inventaris.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Alasan Penolakan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={e => {
                setRejectionReason(e.target.value);
                if (rejectionError) setRejectionError('');
              }}
              placeholder="Tuliskan alasan penolakan secara jelas..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {rejectionError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                {rejectionError}
              </p>
            )}
          </div>
        </div>
      </Modal>

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
