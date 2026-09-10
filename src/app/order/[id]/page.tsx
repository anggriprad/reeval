'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  formatCurrency,
  formatDateTime,
  formatPhoneDisplay,
  formatVariantLabel,
  getWhatsAppUrl,
  getOrderStatusColor,
  getOrderStatusLabel,
} from '@/lib/utils';
import { canApproveOrder, USER_ACCOUNTS } from '@/lib/roles';
import {
  ArrowLeft,
  Phone,
  MapPin,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  Edit,
  XCircle,
  AlertCircle,
  Package,
  Clock,
  User,
  ShoppingBag,
} from 'lucide-react';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { toast } = useToast();

  const {
    salesOrders,
    currentUser,
    processOrder,
    cancelOrder,
  } = useApp();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const order = salesOrders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <PageHeader
          backHref="/order"
          title="Detail Sales Order"
        />
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Sales Order Tidak Ditemukan"
          description="Pesanan dengan ID tersebut tidak tersedia atau telah dihapus."
          action={
            <Button onClick={() => router.push('/order')}>
              Kembali ke Daftar Order
            </Button>
          }
        />
      </div>
    );
  }

  const salesPhone = order.salesPhone || USER_ACCOUNTS.find(u => u.name === order.createdBy)?.phone || '';

  const handleProcess = () => {
    const res = processOrder(order.id);
    if (res.success) {
      toast.success(
        'SPK Berhasil Diterbitkan',
        `Sales Order ${order.orderNumber} telah diproses dan dokumen SPK diproduksi.`
      );
    } else {
      toast.error('Gagal Memproses Order', res.error || 'Terjadi kesalahan sistem.');
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelReasonInput.trim()) {
      setCancelReasonError('Alasan pembatalan wajib diisi.');
      return;
    }
    cancelOrder(order.id, cancelReasonInput.trim());
    toast.success('Sales Order Dibatalkan', `Sales Order ${order.orderNumber} telah berhasil dibatalkan.`);
    setCancelModalOpen(false);
    setCancelReasonInput('');
    setCancelReasonError('');
  };

  const salesWaMsg = `Halo ${order.createdBy}, perihal Sales Order ${order.orderNumber}. Detail pesanan dapat dilihat di: ${currentUrl}`;
  const customerWaMsg = `Halo ${order.customer.name}, kami dari Reeval ERP perihal Sales Order ${order.orderNumber}...`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* PAGE HEADER: Nomor SO + Badge Status + Navigation Back + Native Actions & Action Menu */}
      <PageHeader
        backHref="/order"
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{order.orderNumber}</span>
            <Badge className={getOrderStatusColor(order.status)}>
              {getOrderStatusLabel(order.status, order.cancelledByRole)}
            </Badge>
          </div>
        }
        actions={
          canApproveOrder(currentUser.role) && order.status === 'PENDING' ? (
            <Button onClick={handleProcess}>
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Proses & Terbitkan SPK
            </Button>
          ) : undefined
        }
        actionMenuItems={
          order.status === 'PENDING'
            ? [
              {
                label: 'Edit Pesanan',
                icon: Edit,
                onClick: () => router.push(`/order/create?edit=${order.id}`),
              },
              {
                label: 'Batalkan Order',
                icon: XCircle,
                onClick: () => {
                  setCancelReasonInput('');
                  setCancelReasonError('');
                  setCancelModalOpen(true);
                },
                variant: 'danger',
              },
            ]
            : undefined
        }
      />

      {/* CANCELED ORDER REASON ALERT */}
      {order.status === 'CANCELED' && order.cancelReason && (
        <div className="text-xs text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 p-4 rounded-xl border border-red-200 dark:border-red-900/60 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Alasan Pembatalan:</span>
            <span className="mt-0.5 block leading-relaxed">{order.cancelReason}</span>
          </div>
        </div>
      )}

      {/* 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        {/* KOLOM KIRI (7 COLS): DAFTAR CARD ITEM PRODUK & TOTAL AMOUNT */}
        <div className="lg:col-span-7 space-y-4">
          {/* CONTAINER: INFORMASI PELANGGAN (TANPA JUDUL LABEL) */}
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {order.customer.name}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="">
                {formatPhoneDisplay(order.customer.phone)}
              </span>
            </div>
            {order.customer.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{order.customer.address}</span>
              </div>
            )}
          </div>
          {/* SINGLE CONTAINER UNTUK SELURUH ITEM PESANAN DAN TOTAL AMOUNT */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            {/* DAFTAR ITEM PESANAN */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-4 space-y-3">
                  {/* Header Card Item: Product Name, Variant & Modifiers */}
                  <div className="flex justify-between min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.productName}
                        </span>
                      </div>
                      {item.variantLabel && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {formatVariantLabel(item.variantLabel)}
                        </div>
                      )}
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.selectedModifiers.map(mGroup => (
                            mGroup.selectedOptions.map(opt => (
                              <span key={opt.optionId} className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md font-medium">
                                +{opt.name}
                              </span>
                            ))
                          ))}
                        </div>
                      )}
                      {/* Catatan Khusus (If Any) */}
                      {item.customNotes && (
                        <div className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{item.customNotes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-base text-slate-900 dark:text-white">x {item.qty}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{formatCurrency(item.unitPrice)}</span>
                    </div>
                  </div>

                  {/* Subtotal Item Bar */}
                  <div className="flex justify-between items-center gap-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-2.5 font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">Subtotal</span>
                    <span className="text-slate-700 dark:text-slate-300 text-sm">{formatCurrency(item.unitPrice * item.qty)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Amount Summary Section */}
            {order.shippingCost ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800 text-xs font-semibold space-y-2">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Subtotal Produk</span>
                  <span className="font-mono">{formatCurrency(order.totalAmount - order.shippingCost)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Ongkos Kirim</span>
                  <span className="font-mono">{formatCurrency(order.shippingCost)}</span>
                </div>
              </div>
            ) : null}
            <div className="flex justify-between items-center p-4 bg-indigo-50 dark:bg-indigo-950/40 border-t border-slate-200/80 dark:border-slate-800 font-bold text-sm">
              <span className="text-slate-800 dark:text-slate-200">Total Pembayaran</span>
              <span className="text-indigo-600 dark:text-indigo-400 text-lg font-mono">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* TERPISAH: Container Catatan Pesanan (Jika Ada) */}
          {order.orderNotes && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-4 shadow-xs space-y-1.5">
              <span className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                Catatan Pesanan:
              </span>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                {order.orderNotes}
              </p>
            </div>
          )}
        </div>

        {/* KOLOM KANAN (5 COLS): PELANGGAN, RIWAYAT PESANAN, KONTAK WHATSAPP */}
        <div className="lg:col-span-5 space-y-5">
          {/* CONTAINER: RIWAYAT & PELAKSANA PESANAN (VERTICAL LIST JUSTIFY BETWEEN) */}
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Tanggal / Waktu Pesanan</span>
              <span className="text-slate-900 dark:text-white font-medium">{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Sales Executive</span>
              <span className="text-slate-900 dark:text-white font-medium">{order.createdBy}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Diperbarui Pada</span>
              <span className="text-slate-900 dark:text-white font-medium">{order.updatedAt ? formatDateTime(order.updatedAt) : '-'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Diperbarui Oleh</span>
              <span className="text-slate-900 dark:text-white font-medium">{order.updatedBy || '-'}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Terkirim Pada</span>
              <span className="text-slate-900 dark:text-white font-medium">{order.deliveredAt ? formatDateTime(order.deliveredAt) : '-'}</span>
            </div>
          </div>

          {/* CONTAINER: KONTAK WHATSAPP (PELANGGAN & SALES) */}
          <div className="flex gap-2">
            {/* WhatsApp Sales (Memuat Nomor SO & URL Detail SO) */}
            {salesPhone && (
              <a
                href={getWhatsAppUrl(salesPhone, salesWaMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-xs transition-colors"
              >
                <MessageSquare className='w-4 h-4' />
                <span>Hubungi Sales</span>
              </a>
            )}

            {/* WhatsApp Pelanggan */}
            {order.customer.phone && (
              <a
                href={getWhatsAppUrl(order.customer.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <MessageSquare className='w-4 h-4' />
                <span>Hubungi Pelanggan</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* CANCEL ORDER MODAL */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Batalkan Sales Order — ${order.orderNumber}`}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Mohon masukkan alasan pembatalan untuk pesanan ini. Catatan pembatalan ini akan tersimpan pada riwayat pesanan.
          </p>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Pelanggan membatalkan pesanan karena perubahan spesifikasi proyek..."
              value={cancelReasonInput}
              onChange={e => setCancelReasonInput(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors shadow-xs"
            />
            {cancelReasonError && (
              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 block mt-1">
                {cancelReasonError}
              </span>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmCancel}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Konfirmasi Pembatalan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
