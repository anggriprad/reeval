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
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { formatDate, formatDateTime, getWhatsAppUrl, formatPhoneDisplay, cn } from '@/lib/utils';
import {
  Check,
  CheckCircle,
  CheckCircle2,
  Camera,
  FileText,
  Eye,
  MessageSquare,
  AlertTriangle,
  XCircle,
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
    reportFailedDelivery,
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
  const [proofNote, setProofNote] = useState('');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedPhotoName, setUploadedPhotoName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal Failed Delivery State
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState('Alamat tidak ditemukan');
  const [failureNote, setFailureNote] = useState('');
  const [uploadedFailurePhoto, setUploadedFailurePhoto] = useState<string | null>(null);
  const [uploadedFailurePhotoName, setUploadedFailurePhotoName] = useState<string>('');
  const failureFileInputRef = useRef<HTMLInputElement>(null);

  const FAILURE_REASON_OPTIONS = [
    { value: 'Alamat tidak ditemukan', label: 'Alamat tidak ditemukan' },
    { value: 'Tidak ada penerima', label: 'Tidak ada penerima' },
    { value: 'Pelanggan minta reschedule', label: 'Pelanggan minta reschedule' },
    { value: 'Akses jalan terhalang', label: 'Akses jalan terhalang' },
    { value: 'Ditolak oleh pelanggan', label: 'Ditolak oleh pelanggan' },
    { value: 'Kendala kendaraan / Cuaca', label: 'Kendala kendaraan / Cuaca' },
    { value: 'Lainnya', label: 'Lainnya' },
  ];

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
  const isFailed = dOrder.status === 'FAILED';

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
    confirmDelivery(dOrder.id, {
      proofNote: proofNote.trim(),
      proofPhoto: uploadedPhotoUrl || undefined,
    });

    toast.success('Pengiriman pesanan berhasil diselesaikan.');
    setShowProofModal(false);
    setProofNote('');
    setUploadedPhotoUrl(null);
    setUploadedPhotoName('');
  };

  const handleFailurePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setUploadedFailurePhoto(event.target?.result as string);
      setUploadedFailurePhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectMockFailurePhoto = (type: 'fail-closed' | 'fail-blocked') => {
    if (type === 'fail-closed') {
      setUploadedFailurePhoto('https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=800&q=80');
      setUploadedFailurePhotoName('rumah_kosong_terkunci.jpg');
    } else {
      setUploadedFailurePhoto('https://images.unsplash.com/photo-1508873696983-2df5293cb325?auto=format&fit=crop&w=800&q=80');
      setUploadedFailurePhotoName('jalan_ditutup_proyek.jpg');
    }
  };

  const handleReportFailedDelivery = () => {
    if (!failureReason) {
      toast.error('Alasan gagal kirim wajib dipilih.');
      return;
    }

    reportFailedDelivery(dOrder.id, {
      reason: failureReason,
      note: failureNote.trim(),
      photo: uploadedFailurePhoto || undefined,
    });

    toast.success('Pengiriman dilaporkan gagal. Barang dikembalikan ke gudang & pesanan kembali ke antrean kirim.');
    setShowFailureModal(false);
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
                isDelivered ? 'success' : isFailed ? 'danger' : isInTransit ? 'info' : 'warning'
              }
            >
              {isDelivered ? 'Terkirim' : isFailed ? 'Gagal Kirim' : isInTransit ? 'Dalam Perjalanan' : 'Siap Kirim'}
            </Badge>
          </div>
        }
      />

      {/* Alert Gagal Kirim (Jika Pengiriman Gagal) */}
      {isFailed && (
        <Alert
          variant="danger"
          title={
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span>Pengiriman Gagal: {dOrder.failureReason || 'Kendala Lapangan'}</span>
              {dOrder.failedAt && (
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                  {formatDateTime(dOrder.failedAt)}
                </span>
              )}
            </div>
          }
          description={
            <div className="space-y-1.5 text-xs">
              {dOrder.failureNote && (
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Catatan: </span>
                  {dOrder.failureNote}
                </p>
              )}
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span>Barang fisik dikembalikan ke rak gudang &amp; stok ditahan telah dilepas.</span>
                {dOrder.failurePhoto && (
                  <button
                    type="button"
                    onClick={() => setPreviewPhotoModal({
                      url: dOrder.failurePhoto!,
                      title: `Bukti Gagal Kirim — Pesanan #${dOrder.salesOrderNumber}`
                    })}
                    className="text-red-600 dark:text-red-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Lihat Foto Bukti</span>
                  </button>
                )}
              </div>
            </div>
          }
        />
      )}

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

          {/* Container Catatan Pesanan dari SO */}
          {orderNotes && (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 shadow-xs flex items-start gap-3">
              <FileText className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-xs sm:text-[10px] font-semibold text-slate-400 dark:text-slate-500 block leading-tight">
                  Catatan Pesanan:
                </span>
                <p className="text-[13.5px] sm:text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed mt-1">
                  {orderNotes}
                </p>
              </div>
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
            <h2 className="text-[15px] sm:text-base font-semibold text-slate-900 dark:text-white mb-4">
              Riwayat Pengiriman
            </h2>

            {(() => {
              type SJTimelineEvent = {
                id: string;
                title: string;
                description: string;
                timestamp?: string;
                actor?: string;
                photo?: string;
                isFailure?: boolean;
              };

              const isLoaded = Boolean(tripInfo?.loadedAt || isInTransit || isDelivered || isFailed);
              const timelineEvents: SJTimelineEvent[] = [
                // 1. Surat Jalan Dibuat
                {
                  id: 'step-created',
                  title: 'Surat Jalan Dibuat',
                  description: 'Surat jalan dijadwalkan untuk pengiriman armada',
                  timestamp: dOrder.createdAt || tripInfo?.createdAt,
                  actor: tripInfo?.driverName ? `${tripInfo.driverName} (${tripInfo.vehiclePlate || 'Armada'})` : 'Admin Logistik',
                },
                // 2. Barang Dimuat
                ...(isLoaded ? [{
                  id: 'step-loaded',
                  title: 'Barang Dimuat ke Armada',
                  description: 'Seluruh barang pesanan telah diverifikasi muat ke armada',
                  timestamp: tripInfo?.loadedAt || dOrder.loadedAt,
                  actor: tripInfo?.loadedBy || dOrder.loadedBy || tripInfo?.driverName || dOrder.assignedDriverName || 'Driver Logistik',
                }] : []),
                // 3. Dalam Pengiriman
                ...(isInTransit || isDelivered || isFailed ? [{
                  id: 'step-transit',
                  title: 'Dalam Pengiriman',
                  description: 'Armada sedang dalam perjalanan menuju lokasi pelanggan',
                  timestamp: tripInfo?.loadedAt || dOrder.loadedAt,
                  actor: tripInfo?.driverName || dOrder.assignedDriverName || 'Driver Logistik',
                }] : []),
                // 4. Hasil Akhir (Selesai / Gagal)
                ...(isDelivered ? [{
                  id: 'step-delivered',
                  title: 'Pesanan Diterima',
                  description: dOrder.receiverName
                    ? `Diterima oleh ${dOrder.receiverName}${dOrder.deliveryProofNote ? ` (${dOrder.deliveryProofNote})` : ''}`
                    : 'Barang telah diterima oleh pelanggan',
                  timestamp: dOrder.deliveredAt,
                  actor: dOrder.receiverName || dOrder.assignedDriverName || 'Driver Logistik',
                  photo: dOrder.deliveryProofPhoto,
                }] : []),
                ...(isFailed ? [{
                  id: 'step-failed',
                  title: 'Pengiriman Gagal',
                  description: dOrder.failureReason || 'Kendala di lokasi pengiriman',
                  timestamp: dOrder.failedAt,
                  actor: tripInfo?.driverName || dOrder.assignedDriverName || 'Driver Logistik',
                  isFailure: true,
                  photo: dOrder.failurePhoto,
                }] : []),
              ];

              const isOrderFinished = isDelivered;

              return (
                <div className="space-y-0">
                  {timelineEvents.map((evt, idx) => {
                    const isLast = idx === timelineEvents.length - 1;
                    const isDone = isOrderFinished ? true : !isLast;
                    const isCurrent = isOrderFinished ? false : isLast;

                    return (
                      <div key={evt.id || idx} className="flex gap-3 text-xs sm:text-sm">
                        {/* Node & Connector Line */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="flex items-center justify-center mt-0.5">
                            {evt.isFailure ? (
                              <XCircle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            ) : isDone ? (
                              <Check className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 shrink-0 stroke-[2.5]" />
                            ) : (
                              <div className="w-4.5 h-4.5 rounded-full border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                              </div>
                            )}
                          </div>
                          {!isLast && (
                            <div className="w-0.5 grow min-h-[24px] bg-slate-200 dark:bg-slate-700/80 my-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`space-y-0.5 min-w-0 flex-1 ${!isLast ? 'pb-3.5' : ''}`}>
                          <div
                            className={`text-[13.5px] sm:text-sm ${
                              evt.isFailure
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : isDone
                                ? 'text-slate-500 dark:text-slate-400 font-medium'
                                : 'text-slate-900 dark:text-white font-bold'
                            }`}
                          >
                            {evt.title}
                          </div>
                          <p
                            className={`text-xs sm:text-[13px] leading-relaxed ${
                              evt.isFailure
                                ? 'text-slate-600 dark:text-slate-300'
                                : isDone
                                ? 'text-slate-400 dark:text-slate-500'
                                : 'text-slate-800 dark:text-white'
                            }`}
                          >
                            {evt.description}
                          </p>
                          {(evt.timestamp || (evt.actor && evt.actor !== '-')) && (
                            <div
                              className={`text-[11px] sm:text-xs pt-0.5 flex items-center gap-1.5 flex-wrap ${
                                isCurrent && !evt.isFailure ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {evt.timestamp && (
                                <span>{formatDateTime(evt.timestamp)}</span>
                              )}
                              {evt.actor && evt.actor !== '-' && (
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
                                  title: `Bukti Foto — Pesanan ${dOrder.salesOrderNumber}`
                                })}
                                className="group relative block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 transition-all cursor-pointer shadow-2xs text-left"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={evt.photo}
                                  alt="Bukti Foto"
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
          <div className="flex items-center gap-2 pt-1">
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
              <>
                <Button
                  variant="success"
                  size="md"
                  onClick={() => {
                    setUploadedPhotoUrl(null);
                    setUploadedPhotoName('');
                    setShowProofModal(true);
                  }}
                  className="flex-1 justify-center shadow-xs"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  <span>Selesaikan Pengiriman</span>
                </Button>

                <ActionMenu
                  triggerSize="md"
                  triggerTitle="Pilihan Tindakan"
                  items={[
                    {
                      label: 'Laporkan Gagal Kirim',
                      icon: <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
                      variant: 'danger',
                      onClick: () => {
                        setFailureReason('Alamat tidak ditemukan');
                        setFailureNote('');
                        setUploadedFailurePhoto(null);
                        setUploadedFailurePhotoName('');
                        setShowFailureModal(true);
                      },
                    },
                  ]}
                />
              </>
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

      {/* Modal Laporkan Gagal Kirim */}
      <Modal
        isOpen={showFailureModal}
        onClose={() => setShowFailureModal(false)}
        title={`Laporkan Gagal Kirim — Pesanan #${dOrder.salesOrderNumber}`}
        size="lg"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowFailureModal(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleReportFailedDelivery}
              disabled={!failureReason}
            >
              Konfirmasi Gagal Kirim
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Nomor Pesanan:</span>
              <strong className="font-mono text-indigo-600 dark:text-indigo-400">#{dOrder.salesOrderNumber}</strong>
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
            <Select
              label="Alasan Gagal Kirim"
              required
              options={FAILURE_REASON_OPTIONS}
              value={failureReason}
              onChange={e => setFailureReason(e.target.value)}
              placeholder="Pilih alasan kendala pengiriman"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan Situasi Lapangan
            </label>
            <textarea
              value={failureNote}
              onChange={e => setFailureNote(e.target.value)}
              placeholder="Contoh: Lokasi tutup/gerbang terkunci dan nomor penerima tidak dapat dihubungi saat tiba..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Foto Bukti Kendala di Lapangan
            </label>
            <input
              type="file"
              ref={failureFileInputRef}
              accept="image/*"
              onChange={handleFailurePhotoFileChange}
              className="hidden"
            />

            {uploadedFailurePhoto ? (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-xs font-mono">
                    {uploadedFailurePhotoName || 'Foto Bukti Terlampir'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFailurePhoto(null);
                      setUploadedFailurePhotoName('');
                    }}
                    className="text-xs text-rose-500 hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedFailurePhoto}
                  alt="Preview Bukti Gagal Kirim"
                  className="h-44 w-full object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => failureFileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500 hover:bg-rose-50/20 dark:hover:bg-rose-950/10 transition-all text-slate-500 dark:text-slate-400 cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-slate-400" />
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      Klik untuk ambil foto / upload bukti kendala
                    </p>
                    <p className="text-[11px] text-slate-400">
                      JPG, PNG, atau WEBP (Maksimal 5 MB)
                    </p>
                  </div>
                </button>

                {/* Quick Mock Photos for Demo / Testing */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[11px] text-slate-400">Foto Cepat:</span>
                  <button
                    type="button"
                    onClick={() => handleSelectMockFailurePhoto('fail-closed')}
                    className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Gerbang Terkunci
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMockFailurePhoto('fail-blocked')}
                    className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Akses Jalan Terhalang
                  </button>
                </div>
              </div>
            )}
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
