'use client';

import React, { useState, useRef } from 'react';
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
import { formatDate, formatDateTime, getWhatsAppUrl, formatPhoneDisplay } from '@/lib/utils';
import {
  Truck,
  MapPin,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Camera,
  Package,
  UserCheck,
  FileText,
  X,
  Image as ImageIcon,
} from 'lucide-react';

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { toast } = useToast();

  const {
    deliveryOrders,
    salesOrders,
    confirmLoadingDelivery,
    confirmDelivery,
    currentUser,
  } = useApp();

  const [showProofModal, setShowProofModal] = useState(false);

  // Form state for POD
  const [receiverName, setReceiverName] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedPhotoName, setUploadedPhotoName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dOrder = deliveryOrders.find(d => d.id === id);

  if (!dOrder) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <PageHeader
          backHref="/delivery"
          title="Detail Surat Jalan"
        />
        <EmptyState
          icon={<Truck className="h-7 w-7" />}
          title="Surat Jalan Tidak Ditemukan"
          description="Dokumen Surat Jalan dengan ID tersebut tidak ditemukan di sistem atau telah dihapus."
          action={
            <Button onClick={() => router.push('/delivery')}>
              Kembali ke Daftar Pengiriman
            </Button>
          }
        />
      </div>
    );
  }

  // Calculate total units
  const totalUnits = dOrder.orderItems && dOrder.orderItems.length > 0
    ? dOrder.orderItems.reduce((acc, i) => acc + (i.qty || 1), 0)
    : dOrder.items.length;

  // Find related sales orders
  const relatedOrderIds = dOrder.salesOrderIds && dOrder.salesOrderIds.length > 0
    ? dOrder.salesOrderIds
    : [dOrder.salesOrderId];

  const relatedSalesOrders = salesOrders.filter(so => relatedOrderIds.includes(so.id));

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
      toast.error('Nama penerima di lokasi wajib diisi.');
      return;
    }

    confirmDelivery(dOrder.id, {
      receiverName: receiverName.trim(),
      proofNote: proofNote.trim() || undefined,
      proofPhoto: uploadedPhotoUrl || undefined,
    });

    toast.success(`Pengiriman ${dOrder.doNumber} selesai! Status pesanan otomatis terupdate.`);
    setShowProofModal(false);
  };

  const isDelivered = dOrder.status === 'DELIVERED';
  const isInTransit = dOrder.status === 'IN_TRANSIT';
  const isReadyToShip = dOrder.status === 'READY_TO_SHIP' || dOrder.status === 'PENDING';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <PageHeader
        backHref="/delivery"
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{dOrder.doNumber}</span>
            {isDelivered && (
              <Badge variant="success" className="text-xs">
                Terkirim & Selesai
              </Badge>
            )}
            {isInTransit && (
              <Badge variant="info" className="text-xs">
                Sedang di Perjalanan
              </Badge>
            )}
            {isReadyToShip && (
              <Badge variant="warning" className="text-xs">
                Menunggu Muat Barang
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="h-3 w-3" /> Digital Verifikasi
            </span>
          </div>
        }
        actions={
          isInTransit ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setShowProofModal(true);
                  setReceiverName('');
                  setProofNote('');
                  setUploadedPhotoUrl(null);
                  setUploadedPhotoName('');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Selesaikan Pengiriman
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Driver, Tujuan, List Item (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Driver & Transportasi */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-500" />
              Driver & Transportasi
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Driver Ditugaskan</span>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {dOrder.assignedDriverName}
                </p>
                {dOrder.driverPhone && (
                  <a
                    href={getWhatsAppUrl(dOrder.driverPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5"
                  >
                    <Phone className="h-3 w-3" />
                    {formatPhoneDisplay(dOrder.driverPhone)}
                  </a>
                )}
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Armada & Plat Nomor</span>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {dOrder.armadaName ? `${dOrder.armadaName} • ` : ''}
                  {dOrder.vehiclePlate}
                </p>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Jadwal Pengiriman</span>
                <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formatDate(dOrder.scheduledDate)}
                </p>
              </div>
            </div>

            {dOrder.notes && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Catatan Pengiriman</span>
                <p className="text-slate-600 dark:text-slate-400 italic mt-0.5">
                  &quot;{dOrder.notes}&quot;
                </p>
              </div>
            )}
          </div>

          {/* 2. Tujuan & Pelanggan */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-500" />
              Tujuan & Pelanggan
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Nama Pelanggan</span>
                <p className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5">
                  {dOrder.customerName}
                </p>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1">
                  Sales Order Terkait
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {relatedSalesOrders.length > 0 ? (
                    relatedSalesOrders.map(so => (
                      <Link
                        key={so.id}
                        href={`/order/${so.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-xs font-semibold border border-slate-200 dark:border-slate-700"
                      >
                        {so.orderNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ))
                  ) : (
                    <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {dOrder.salesOrderNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Alamat Pengiriman</span>
                <p className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{dOrder.customerAddress || 'Alamat tidak dispesifikasikan'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* 3. List Item */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-500" />
                  List Item
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daftar fisik unit barang yang dimuat dalam surat jalan pengiriman ini
                </p>
              </div>
              <span className="inline-block px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                Total: {totalUnits} Unit
              </span>
            </div>

            {dOrder.orderItems && dOrder.orderItems.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dOrder.orderItems.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {item.productName}
                        </span>
                        {item.variantLabel && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ({item.variantLabel})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>No. Order: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.orderNumber}</strong></span>
                        <span>Tujuan: <span className="text-slate-600 dark:text-slate-400">{item.customerName}</span></span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                        {item.qty} Unit
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dOrder.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        No. Order: <strong className="font-mono text-slate-700 dark:text-slate-300">{dOrder.salesOrderNumber}</strong>
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                        1 Unit
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Log Ceklis Pengiriman (lg:col-span-1) */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                Log Pengiriman
              </h2>
            </div>

            <div className="p-5 space-y-6">
              {/* Step 1: Surat Jalan Diterbitkan */}
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Surat Jalan Diterbitkan
                  </h3>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {formatDateTime(dOrder.createdAt)}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Surat jalan digital terbit otomatis dari sistem.
                  </p>
                </div>
              </div>

              {/* Step 2: Berangkat ke Tujuan */}
              <div className="flex items-start gap-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                  dOrder.loadedAt || isInTransit || isDelivered
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                  {dOrder.loadedAt || isInTransit || isDelivered ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Berangkat ke Tujuan
                  </h3>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {dOrder.loadedAt ? formatDateTime(dOrder.loadedAt) : 'Belum Berangkat'}
                  </span>
                  {dOrder.loadedAt ? (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Dikonfirmasi oleh <strong>{dOrder.loadedBy || dOrder.assignedDriverName}</strong> ({dOrder.vehiclePlate})
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Menunggu konfirmasi muat barang ke armada.
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3: Serah Terima Barang */}
              <div className="flex items-start gap-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                  isDelivered
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                  {isDelivered ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Serah Terima Barang
                  </h3>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {dOrder.deliveredAt ? formatDateTime(dOrder.deliveredAt) : 'Menunggu Sampai'}
                  </span>

                  {isDelivered ? (
                    <div className="mt-2.5 space-y-3">
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                          <UserCheck className="h-3.5 w-3.5 shrink-0" />
                          <span>Penerima: {dOrder.receiverName || dOrder.customerName}</span>
                        </div>
                        {dOrder.deliveryProofNote && (
                          <p className="text-slate-600 dark:text-slate-400 italic text-[11px]">
                            &quot;{dOrder.deliveryProofNote}&quot;
                          </p>
                        )}
                      </div>

                      {dOrder.deliveryProofPhoto && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Camera className="h-3.5 w-3.5 text-indigo-500" />
                            Bukti Serah Terima:
                          </p>
                          <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={dOrder.deliveryProofPhoto}
                              alt="Bukti Serah Terima"
                              className="w-full max-h-52 object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Menunggu konfirmasi penerimaan di lokasi tujuan.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Modal Konfirmasi Selesaikan Pengiriman (POD) */}
      <Modal
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
        title={`Konfirmasi Tiba di Tujuan — ${dOrder.doNumber}`}
        description="Input nama penerima di lokasi dan lampirkan bukti foto pengiriman untuk menyelesaikan pesanan."
        size="lg"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowProofModal(false)}>
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmitDeliveryProof}
              disabled={!receiverName.trim()}
            >
              Simpan & Selesaikan Pengiriman
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
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
              placeholder="Barang diterima lengkap, tidak ada cacat atau lecet, terpasang rapi di lokasi..."
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
          </div>

          {/* Upload Bukti Foto Pengiriman */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-indigo-500" />
                Upload Bukti Foto Pengiriman (Proof of Delivery / POD)
              </label>
              {uploadedPhotoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadedPhotoUrl(null);
                    setUploadedPhotoName('');
                  }}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Hapus Foto
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFileChange}
            />

            {uploadedPhotoUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/10 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedPhotoUrl}
                  alt="Bukti Pengiriman"
                  className="max-h-52 w-auto object-contain rounded-md"
                />
                <div className="w-full bg-slate-900/80 text-white text-[11px] p-2 text-center flex items-center justify-between px-3">
                  <span className="truncate">{uploadedPhotoName || 'Foto Bukti Pengiriman'}</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-300 hover:text-white underline text-[10px] shrink-0 ml-2"
                  >
                    Ganti Foto
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-white dark:bg-slate-800"
              >
                <Camera className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Klik untuk Ambil Foto Kamera / Pilih File Gambar
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Mendukung format JPG, PNG, WEBP</p>
              </div>
            )}

            {/* Quick Mock Sample Preset */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Atau gunakan contoh foto pengiriman cepat:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectMockPhoto('photo-1')}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all text-[11px] flex items-center gap-1.5"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">Contoh: Unit di Lokasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMockPhoto('photo-2')}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all text-[11px] flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">Contoh: Bukti Serah Terima</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
