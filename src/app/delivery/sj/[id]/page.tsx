'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatDateTime, getWhatsAppUrl, formatPhoneDisplay, cn } from '@/lib/utils';
import {
  CheckCircle,
  CheckCircle2,
  Camera,
  FileText,
  Eye,
  MessageSquare,
} from 'lucide-react';

export default function DeliveryOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { toast } = useToast();

  const {
    deliveryOrders,
    salesOrders,
    confirmDelivery,
  } = useApp();

  // Find Delivery Order
  const dOrder = useMemo(() => {
    return deliveryOrders.find(d => d.id === id || d.doNumber === id);
  }, [deliveryOrders, id]);

  // Find associated Sales Order
  const salesOrder = useMemo(() => {
    if (!dOrder) return null;
    return salesOrders.find(s => s.id === dOrder.salesOrderId || s.orderNumber === dOrder.salesOrderNumber);
  }, [salesOrders, dOrder]);

  // Find all sibling DOs belonging to same trip for trip reference
  const tripDOs = useMemo(() => {
    if (!dOrder?.tripId) return [];
    return deliveryOrders.filter(d => d.tripId === dOrder.tripId);
  }, [deliveryOrders, dOrder]);

  // Trip summary info
  const tripInfo = useMemo(() => {
    if (!dOrder) return null;
    const ref = tripDOs.length > 0 ? tripDOs[0] : dOrder;
    return {
      tripId: dOrder.tripId || 'TRIP-SINGLE',
      tripNumber: dOrder.tripNumber || `TRIP-${dOrder.doNumber}`,
      driverName: ref.assignedDriverName || 'Driver Belum Ditentukan',
      driverPhone: ref.driverPhone || '',
      armadaName: ref.armadaName || 'Armada Standar',
      vehiclePlate: ref.vehiclePlate || '-',
      scheduledDate: ref.scheduledDate || ref.createdAt,
      loadedAt: ref.loadedAt,
      loadedBy: ref.loadedBy,
      createdAt: ref.createdAt,
    };
  }, [dOrder, tripDOs]);

  // Modal Proof of Delivery (POD) State
  const [showProofModal, setShowProofModal] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedPhotoName, setUploadedPhotoName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo Zoom preview modal
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ url: string; title: string } | null>(null);

  if (!dOrder) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <PageHeader
          backHref="/delivery"
          title="Detail Surat Jalan"
        />
        <EmptyState
          icon={<FileText className="h-7 w-7 text-slate-400" />}
          title="Surat Jalan Tidak Ditemukan"
          description="Data surat jalan pengiriman tidak ditemukan di sistem."
          action={
            <Button onClick={() => router.push('/delivery')}>
              Kembali ke Daftar Pengiriman
            </Button>
          }
        />
      </div>
    );
  }

  const isDelivered = dOrder.status === 'DELIVERED';
  const isInTransit = dOrder.status === 'IN_TRANSIT';

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file foto maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      setUploadedPhotoUrl(event.target?.result as string);
      setUploadedPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectMockPhoto = (type: 'photo-1' | 'photo-2') => {
    if (type === 'photo-1') {
      setUploadedPhotoUrl('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80');
      setUploadedPhotoName('bukti_serah_terima_barang.jpg');
    } else {
      setUploadedPhotoUrl('https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80');
      setUploadedPhotoName('foto_surat_jalan_lapangan.jpg');
    }
  };

  const handleSubmitDeliveryProof = () => {
    if (!receiverName.trim()) {
      toast.error('Nama penerima barang di lokasi wajib diisi.');
      return;
    }

    confirmDelivery(dOrder.id, {
      receiverName: receiverName.trim(),
      proofNote: proofNote.trim(),
      proofPhoto: uploadedPhotoUrl || undefined,
    });

    toast.success('Pengiriman pesanan berhasil diselesaikan.');
    setShowProofModal(false);
  };

  const customerPhone = dOrder.customerPhone || salesOrder?.customer?.phone;
  const orderNotes = salesOrder?.orderNotes || dOrder.notes;
  const backUrl = dOrder.tripId ? `/delivery/trip/${dOrder.tripId}` : '/delivery';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        backHref={backUrl}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              #{dOrder.salesOrderNumber}
            </h1>
            <Badge
              variant={
                isDelivered ? 'success' : isInTransit ? 'info' : 'warning'
              }
            >
              {isDelivered ? 'Terkirim' : isInTransit ? 'Dalam Perjalanan' : 'Siap Kirim'}
            </Badge>
          </div>
        }
      />

      {/* Grid Layout: Kiri (Info Pesanan & Daftar Produk), Kanan (Riwayat Pengiriman) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Kolom Kiri: Info Pesanan & List Item Produk */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card Info Pesanan */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5 space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Informasi Pesanan
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* 1. Nama Pelanggan */}
              <div>
                <p className="text-slate-500 dark:text-slate-400">Nama Pelanggan</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {dOrder.customerName}
                </p>
              </div>

              {/* 2. Nomor Telepon */}
              <div>
                <p className="text-slate-500 dark:text-slate-400">Nomor Telepon</p>
                <p className="font-medium text-slate-900 dark:text-white mt-0.5">
                  {customerPhone ? formatPhoneDisplay(customerPhone) : '-'}
                </p>
              </div>

              {/* 3. Alamat Pengiriman */}
              <div>
                <p className="text-slate-500 dark:text-slate-400">Alamat Pengiriman</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                  {dOrder.customerAddress}
                </p>
              </div>

              {/* 4. Tanggal Pengiriman (Paling Akhir) */}
              <div>
                <p className="text-slate-500 dark:text-slate-400">Tanggal Pengiriman</p>
                <p className="font-medium text-slate-900 dark:text-white mt-0.5">
                  {formatDate(dOrder.scheduledDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Card Catatan Pesanan dari SO (Sebelum Daftar Barang) */}
          {orderNotes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20 shadow-xs p-5 space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Catatan Pesanan
              </h2>
              <p className="text-sm font-normal text-amber-900 dark:text-amber-200 leading-relaxed">
                {orderNotes}
              </p>
            </div>
          )}

          {/* Card Daftar Barang */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5 space-y-3.5">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Daftar Barang ({dOrder.orderItems?.length || dOrder.items?.length || 1})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dOrder.orderItems && dOrder.orderItems.length > 0 ? (
                dOrder.orderItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {item.productName}
                        </span>
                        {item.isReplacement && (
                          <Badge variant="purple" className="text-[10px] px-1.5 py-0">
                            Barang Pengganti
                          </Badge>
                        )}
                      </div>
                      {item.variantLabel && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.variantLabel}
                        </p>
                      )}
                    </div>
                    {item.spkNumber && (
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {item.spkNumber}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                dOrder.items.map((itemStr, idx) => (
                  <div
                    key={idx}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-medium text-slate-900 dark:text-white">
                      {itemStr}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Riwayat Pengiriman */}
        <div className="lg:col-span-5 space-y-4">
          {/* Container Timeline Bergaya Detail Sales Order */}
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Riwayat Pengiriman
            </h2>

            {(() => {
              type SJTimelineEvent = {
                id: string;
                title: string;
                description: string;
                timestamp?: string;
                actor?: string;
                status: 'completed' | 'current';
                photo?: string;
              };

              const isLoaded = Boolean(tripInfo?.loadedAt || isInTransit || isDelivered);
              const timelineEvents: SJTimelineEvent[] = [
                {
                  id: 'step-created',
                  title: 'Trip Armada Diterbitkan',
                  description: `Armada ${tripInfo?.vehiclePlate || '-'} (${tripInfo?.driverName || '-'}) dijadwalkan membawa pesanan #${dOrder.salesOrderNumber}.`,
                  timestamp: tripInfo?.createdAt || dOrder.createdAt,
                  actor: tripInfo?.driverName,
                  status: 'completed',
                },
                isLoaded ? {
                  id: 'step-loaded',
                  title: 'Barang Dimuat ke Armada',
                  description: 'Seluruh barang pesanan telah diverifikasi muat ke armada.',
                  timestamp: tripInfo?.loadedAt,
                  actor: tripInfo?.loadedBy || tripInfo?.driverName,
                  status: 'completed',
                } : {
                  id: 'step-loading',
                  title: 'Proses Muat Barang',
                  description: 'Menunggu proses checklist muat barang ke armada.',
                  status: 'current',
                },
                ...(isInTransit ? [{
                  id: 'step-transit',
                  title: 'Dalam Perjalanan ke Lokasi',
                  description: `Armada menuju alamat pengiriman pelanggan: ${dOrder.customerAddress}.`,
                  timestamp: tripInfo?.loadedAt,
                  status: 'current' as const,
                }] : []),
                ...(isDelivered ? [
                  {
                    id: 'step-departed',
                    title: 'Keberangkatan ke Lokasi',
                    description: `Armada berangkat menuju lokasi alamat pengiriman.`,
                    timestamp: tripInfo?.loadedAt,
                    status: 'completed' as const,
                  },
                  {
                    id: 'step-delivered',
                    title: 'Serah Terima Selesai',
                    description: `Barang telah diterima oleh ${dOrder.receiverName || dOrder.customerName}.${dOrder.deliveryProofNote ? ` Catatan: "${dOrder.deliveryProofNote}"` : ''}`,
                    timestamp: dOrder.deliveredAt,
                    actor: dOrder.receiverName,
                    status: 'completed' as const,
                    photo: dOrder.deliveryProofPhoto,
                  }
                ] : []),
              ];

              return (
                <div className="space-y-0">
                  {timelineEvents.map((evt, idx) => {
                    const isLast = idx === timelineEvents.length - 1;
                    const isDone = evt.status === 'completed';

                    return (
                      <div key={evt.id || idx} className="flex gap-3 text-xs">
                        {/* Node & Connector Line */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`flex items-center justify-center rounded-full bg-white dark:bg-slate-900 mt-0.5 ${
                            isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                          }`}>
                            {isDone ? (
                              <CheckCircle className="w-4 h-4 fill-emerald-50 dark:fill-emerald-950/40" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                              </div>
                            )}
                          </div>
                          {!isLast && (
                            <div className="w-0.5 grow min-h-[22px] bg-slate-200 dark:bg-slate-700 my-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`space-y-0.5 min-w-0 flex-1 ${!isLast ? 'pb-3.5' : ''}`}>
                          <div className={`font-semibold ${
                            isDone ? 'text-slate-900 dark:text-white' : 'text-indigo-600 dark:text-indigo-400 font-bold'
                          }`}>
                            {evt.title}
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                            {evt.description}
                          </p>
                          {(evt.timestamp || (isDone && evt.actor && evt.actor !== '-')) && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-0.5 flex items-center gap-1.5 flex-wrap font-mono">
                              {evt.timestamp && (
                                <span>{formatDateTime(evt.timestamp)}</span>
                              )}
                              {isDone && evt.actor && evt.actor !== '-' && (
                                <>
                                  {evt.timestamp && <span>·</span>}
                                  <span>Oleh: {evt.actor}</span>
                                </>
                              )}
                            </div>
                          )}

                          {/* Bukti Foto Penerimaan (Jika Ada) */}
                          {evt.photo && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => setPreviewPhotoModal({
                                  url: evt.photo!,
                                  title: `Bukti Serah Terima — Pesanan ${dOrder.salesOrderNumber}`
                                })}
                                className="group relative block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 transition-all cursor-pointer shadow-2xs text-left"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={evt.photo}
                                  alt="Bukti Serah Terima"
                                  className="w-32 h-20 sm:w-36 sm:h-24 object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 backdrop-blur-xs">
                                    <Eye className="w-3 h-3" />
                                    <span>Lihat Foto</span>
                                  </div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* ACTION BUTTONS DI LUAR CONTAINER LOG RIWAYAT */}
          <div className="flex items-center gap-3 pt-1">
            {customerPhone && (
              <Button
                variant="outline"
                size="md"
                onClick={() => window.open(getWhatsAppUrl(customerPhone), '_blank')}
                className="flex-1 justify-center text-emerald-700 dark:text-emerald-400 border-emerald-600/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Hubungi Pelanggan</span>
              </Button>
            )}

            {isInTransit && (
              <Button
                variant="success"
                size="md"
                onClick={() => {
                  setReceiverName('');
                  setProofNote('');
                  setUploadedPhotoUrl(null);
                  setUploadedPhotoName('');
                  setShowProofModal(true);
                }}
                className="flex-1 justify-center shadow-xs"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                <span>Selesaikan Pengiriman</span>
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Modal Konfirmasi Selesaikan Pengiriman (POD) */}
      <Modal
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
        title={`Konfirmasi Tiba di Tujuan — Pesanan ${dOrder.salesOrderNumber}`}
        size="lg"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowProofModal(false)}>
              Batal
            </Button>
            <Button
              variant="success"
              onClick={handleSubmitDeliveryProof}
              disabled={!receiverName.trim()}
            >
              Simpan &amp; Selesaikan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Nomor Pesanan:</span>
              <strong className="font-mono text-indigo-600 dark:text-indigo-400">{dOrder.salesOrderNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tujuan Pengiriman:</span>
              <strong className="text-slate-900 dark:text-white">{dOrder.customerName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Alamat:</span>
              <span className="text-slate-700 dark:text-slate-300 truncate max-w-sm text-right">
                {dOrder.customerAddress}
              </span>
            </div>
          </div>

          <div>
            <Input
              label="Nama Penerima Barang di Lokasi"
              required
              value={receiverName}
              onChange={e => setReceiverName(e.target.value)}
              placeholder="Contoh: Ibu Ratna (Resepsionis) / Pak Hendra"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan Kondisi Serah Terima Barang
            </label>
            <textarea
              value={proofNote}
              onChange={e => setProofNote(e.target.value)}
              placeholder="Contoh: Barang diterima dalam kondisi baik dan lengkap, sudah ditaruh di lantai 2."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Foto Bukti Serah Terima (POD / Surat Jalan Bertandatangan)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoFileChange}
              className="hidden"
            />

            {uploadedPhotoUrl ? (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-xs font-mono">
                    {uploadedPhotoName || 'Foto Terlampir'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedPhotoUrl(null);
                      setUploadedPhotoName('');
                    }}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedPhotoUrl}
                  alt="Preview Bukti"
                  className="h-44 w-full object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30"
              >
                <Camera className="h-8 w-8 text-slate-400 mb-1" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Ambil Foto / Unggah dari Galeri
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Format JPG, PNG, WEBP (Maksimal 5 MB)
                </p>
              </div>
            )}

            {/* Mock photo options for quick demo testing */}
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-400 mb-1.5">Atau gunakan foto simulasi demo:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectMockPhoto('photo-1')}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Contoh: Unit di Lokasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMockPhoto('photo-2')}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Contoh: Tanda Tangan SJ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Zoom Foto Bukti */}
      <Modal
        isOpen={!!previewPhotoModal}
        onClose={() => setPreviewPhotoModal(null)}
        title={previewPhotoModal?.title || 'Bukti Serah Terima'}
        size="lg"
        actions={
          <Button variant="outline" onClick={() => setPreviewPhotoModal(null)}>
            Tutup
          </Button>
        }
      >
        {previewPhotoModal && (
          <div className="flex flex-col items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhotoModal.url}
              alt="Bukti Serah Terima"
              className="max-h-[70vh] w-auto object-contain rounded-lg border border-slate-200 dark:border-slate-800"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
