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
import { formatCurrency, formatDateTime, formatVariantLabel } from '@/lib/utils';
import { ComplaintAttachment } from '@/lib/types';
import { AlertCircle, CheckCircle, Eye, Film, Play } from 'lucide-react';

export default function ComplaintDetailPage() {
  const router = useRouter();
  const params = useParams();
  const complaintId = params?.id as string;
  const { toast } = useToast();

  const { salesOrders, invoices, bankAccounts, resolveOrderComplaint } = useApp();

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundNotes, setRefundNotes] = useState('');
  const [refundBankAccountId, setRefundBankAccountId] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ComplaintAttachment | null>(null);

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

  const handleResolve = (resolution: 'Batalkan Pesanan (Refund)' | 'Kirim Barang Pengganti' | 'Perbaikan', note: string, bankId?: string) => {
    resolveOrderComplaint(order.id, complaint.id, resolution, note, bankId);
    toast.success('Komplain Diselesaikan', `Resolusi: ${resolution}`);
  };

  const handleConfirmRefund = () => {
    handleResolve('Batalkan Pesanan (Refund)', refundNotes.trim() || 'Direfund sesuai item yang diretur.', refundBankAccountId);
    setIsRefundModalOpen(false);
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
              complaint.status === 'DITANGANI' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' :
              'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
            }>
              {complaint.status}
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
                {complaint.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800/80 last:border-0"
                  >
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">{item.productName}</span>
                      {item.variantLabel && (
                        <span className="text-slate-500 text-xs ml-1.5">({formatVariantLabel(item.variantLabel)})</span>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">x{item.qty}</span>
                  </div>
                ))}
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

            {complaint.status !== 'SELESAI' ? (
              <div className="space-y-3">
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
                  onClick={() => handleResolve('Kirim Barang Pengganti', 'Pengiriman unit baru untuk mengganti retur.')}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-xs space-y-1"
                >
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    Kirim Barang Pengganti
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Kirim unit baru kepada pelanggan untuk mengganti barang retur
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleResolve('Perbaikan', 'Barang ditarik untuk diperbaiki ulang (rework).')}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-xs space-y-1"
                >
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    Perbaikan
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tarik barang kembali ke gudang untuk diperbaiki (rework)
                  </div>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Resolusi: {complaint.resolution}</span>
                </div>
                {complaint.resolutionNotes && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    {complaint.resolutionNotes}
                  </p>
                )}
                <div className="text-[11px] text-emerald-600/80 dark:text-emerald-500 pt-1">
                  Diselesaikan pada {formatDateTime(complaint.resolvedAt!)}
                </div>
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
