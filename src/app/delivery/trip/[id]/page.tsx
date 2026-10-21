'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatDateTime, getWhatsAppUrl, formatPhoneDisplay, cn } from '@/lib/utils';
import {
  Truck,
  Clock,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
  AlertTriangle,
} from 'lucide-react';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const {
    deliveryOrders,
    salesOrders,
  } = useApp();

  // Find all delivery orders belonging to this Trip
  const { targetTripDOs, tripInfo } = useMemo(() => {
    if (!id || deliveryOrders.length === 0) {
      return { targetTripDOs: [], tripInfo: null };
    }

    // Match either by tripId, or doNumber/id
    let matchingDOs = deliveryOrders.filter(
      d => d.tripId === id || d.tripNumber === id
    );

    if (matchingDOs.length === 0) {
      const singleDO = deliveryOrders.find(d => d.id === id || d.doNumber === id);
      if (singleDO && singleDO.tripId) {
        matchingDOs = deliveryOrders.filter(d => d.tripId === singleDO.tripId);
      } else if (singleDO) {
        matchingDOs = [singleDO];
      }
    }

    if (matchingDOs.length === 0) {
      return { targetTripDOs: [], tripInfo: null };
    }

    const firstDO = matchingDOs[0];
    const isAllCompleted = matchingDOs.every(d => d.status === 'DELIVERED' || d.status === 'FAILED');
    const isAnyInTransit = matchingDOs.some(d => d.status === 'IN_TRANSIT');
    const deliveredCount = matchingDOs.filter(d => d.status === 'DELIVERED').length;
    const failedCount = matchingDOs.filter(d => d.status === 'FAILED').length;

    // Total units count across all DOs in this trip
    const totalUnitsCount = matchingDOs.reduce((sum, d) => {
      if (d.orderItems && d.orderItems.length > 0) {
        return sum + d.orderItems.reduce((acc, it) => acc + (it.qty || 1), 0);
      }
      return sum + (d.items?.length || 1);
    }, 0);

    return {
      targetTripDOs: matchingDOs,
      tripInfo: {
        tripId: firstDO.tripId || firstDO.id,
        tripNumber: firstDO.tripNumber || `TRIP-${firstDO.doNumber || firstDO.id}`,
        driverName: firstDO.assignedDriverName || 'Driver Belum Ditentukan',
        driverPhone: firstDO.driverPhone || '',
        armadaName: firstDO.armadaName || 'Armada Standar',
        vehiclePlate: firstDO.vehiclePlate || '-',
        scheduledDate: firstDO.scheduledDate || firstDO.createdAt,
        status: isAllCompleted ? 'DELIVERED' : isAnyInTransit ? 'IN_TRANSIT' : 'READY_TO_SHIP',
        isAllDelivered: isAllCompleted,
        isInTransit: isAnyInTransit,
        deliveredCount,
        failedCount,
        totalDestinationsCount: matchingDOs.length,
        totalUnitsCount,
        loadedAt: firstDO.loadedAt,
        loadedBy: firstDO.loadedBy,
        createdAt: firstDO.createdAt,
      },
    };
  }, [id, deliveryOrders]);

  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ url: string; title: string } | null>(null);

  if (!tripInfo || targetTripDOs.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <PageHeader
          backHref="/delivery"
          title="Detail Pengiriman"
        />
        <EmptyState
          icon={<Truck className="h-7 w-7 text-slate-400" />}
          title="Trip Pengiriman Tidak Ditemukan"
          description="Data trip armada pengiriman dengan ID tersebut tidak ditemukan di sistem."
          action={
            <Button onClick={() => router.push('/delivery')}>
              Kembali ke Daftar Pengiriman
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        backHref="/delivery"
        title="Detail Pengiriman"
      />

      {/* Container Info Trip */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          
          {/* Kolom 1: Driver */}
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Driver</span>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {tripInfo.driverName}
            </p>
            {tripInfo.driverPhone ? (
              <a
                href={getWhatsAppUrl(tripInfo.driverPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline pt-0.5"
              >
                {formatPhoneDisplay(tripInfo.driverPhone)}
              </a>
            ) : (
              <p className="text-slate-400">-</p>
            )}
          </div>

          {/* Kolom 2: Armada */}
          <div className="space-y-1 pt-4 md:pt-0 md:pl-5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Armada</span>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {tripInfo.armadaName}
            </p>
            <p className="font-mono text-slate-600 dark:text-slate-300 pt-0.5">
              {tripInfo.vehiclePlate}
            </p>
          </div>

          {/* Kolom 3: Tujuan */}
          <div className="space-y-1 pt-4 md:pt-0 md:pl-5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Tujuan</span>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {tripInfo.totalDestinationsCount} titik pengiriman
            </p>
            <p className="text-slate-600 dark:text-slate-300 pt-0.5">
              {tripInfo.totalUnitsCount} barang
            </p>
          </div>

          {/* Kolom 4: Waktu Keberangkatan */}
          <div className="space-y-1 pt-4 md:pt-0 md:pl-5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Waktu Keberangkatan</span>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {formatDateTime(tripInfo.loadedAt || tripInfo.scheduledDate)}
            </p>
          </div>

        </div>
      </div>

      {/* Layout Bawah: 2 Kolom (Kiri: List Surat Jalan, Kanan: Log Riwayat Trip) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Kolom Kiri: Section List Surat Jalan */}
        <div className="lg:col-span-7">
          <div className="space-y-3">
            {targetTripDOs.map((dOrder) => {
              const isDelivered = dOrder.status === 'DELIVERED';
              const isFailed = dOrder.status === 'FAILED';
              const unitsCount = dOrder.orderItems?.length || dOrder.items?.length || 1;
              const matchingSO = salesOrders.find(
                s => s.id === dOrder.salesOrderId || s.orderNumber === dOrder.salesOrderNumber
              );
              const orderNotes = matchingSO?.orderNotes || dOrder.notes;

              return (
                <div
                  key={dOrder.id}
                  onClick={() => router.push(`/delivery/sj/${dOrder.id}`)}
                  className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Info Kiri */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* ID Pesanan & Status */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                          #{dOrder.salesOrderNumber}
                        </span>
                        {isDelivered && (
                          <Badge
                            variant="success"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Terkirim
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge
                            variant="danger"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Gagal Kirim
                          </Badge>
                        )}
                      </div>

                      {/* Nama Pelanggan */}
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {dOrder.customerName}
                      </p>

                      {/* Alamat Lengkap */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {dOrder.customerAddress}
                      </p>

                      {/* Catatan Pesanan (Jika Ada) dengan teks warna kuning */}
                      {orderNotes && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                          {orderNotes}
                        </p>
                      )}

                      {/* Info Penerima jika sudah selesai */}
                      {isDelivered && (
                        <div className="text-[11px] pt-0.5 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Diterima oleh {dOrder.receiverName || dOrder.customerName}
                          {dOrder.deliveredAt && ` (${formatDateTime(dOrder.deliveredAt)})`}
                        </div>
                      )}

                      {/* Info Gagal Kirim jika gagal */}
                      {isFailed && (
                        <div className="text-[11px] pt-0.5 text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Gagal: {dOrder.failureReason || 'Kendala Lapangan'}</span>
                        </div>
                      )}
                    </div>

                    {/* Sisi Kanan: Total Unit (Badge) di tengah card + Chevron */}
                    <div className="flex items-center gap-3 shrink-0 self-center">
                      <Badge variant="default" className="text-xs font-medium px-2.5 py-1">
                        {unitsCount} barang
                      </Badge>
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 dark:group-hover:bg-slate-800 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Section Riwayat Pengiriman */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <h2 className="text-[15px] sm:text-base font-semibold text-slate-900 dark:text-white mb-4">
              Riwayat Pengiriman
            </h2>

            {(() => {
              type TripTimelineEvent = {
                id: string;
                title: string;
                description: string;
                timestamp?: string;
                actor?: string;
                photo?: string;
                salesOrderNumber?: string;
              };

              const isLoaded = Boolean(tripInfo.loadedAt || tripInfo.isInTransit || tripInfo.isAllDelivered);
              const isDeparted = Boolean(tripInfo.isInTransit || tripInfo.isAllDelivered);
              const deliveredDOs = targetTripDOs.filter(d => d.status === 'DELIVERED');

              const tripTimelineEvents: TripTimelineEvent[] = [
                // 1. Trip Diterbitkan
                {
                  id: 'trip-created',
                  title: 'Trip Diterbitkan',
                  description: `Armada ${tripInfo.vehiclePlate} (${tripInfo.driverName}) ditugaskan membawa ${tripInfo.totalDestinationsCount} titik tujuan`,
                  timestamp: tripInfo.createdAt,
                  actor: tripInfo.driverName || 'Admin Logistik',
                },
                // 2. Barang Dimuat
                ...(isLoaded ? [{
                  id: 'trip-loaded',
                  title: 'Barang Dimuat ke Armada',
                  description: 'Seluruh muatan barang telah diverifikasi dan dimuat ke dalam armada',
                  timestamp: tripInfo.loadedAt,
                  actor: tripInfo.loadedBy || tripInfo.driverName || 'Driver Logistik',
                }] : []),
                // 3. Dalam Perjalanan
                ...(isDeparted ? [{
                  id: 'trip-departed',
                  title: 'Dalam Perjalanan',
                  description: `Armada berangkat melakukan rute pengiriman ke ${tripInfo.totalDestinationsCount} titik tujuan`,
                  timestamp: tripInfo.loadedAt,
                  actor: tripInfo.driverName || 'Driver Logistik',
                }] : []),
                // 4. Titik-Titik Serah Terima Selesai
                ...deliveredDOs.map((dOrder) => ({
                  id: `trip-point-delivered-${dOrder.id}`,
                  title: `Titik Selesai: ${dOrder.customerName}`,
                  description: `Pesanan #${dOrder.salesOrderNumber} telah diterima oleh ${dOrder.receiverName || dOrder.customerName}${dOrder.deliveryProofNote ? ` (${dOrder.deliveryProofNote})` : ''}`,
                  timestamp: dOrder.deliveredAt,
                  actor: dOrder.receiverName || tripInfo.driverName,
                  photo: dOrder.deliveryProofPhoto,
                  salesOrderNumber: dOrder.salesOrderNumber,
                })),
                // 5. Pengiriman Selesai
                ...(tripInfo.isAllDelivered ? [{
                  id: 'trip-completed',
                  title: 'Pengiriman Selesai',
                  description: `Seluruh titik pengiriman (${tripInfo.totalDestinationsCount} titik) telah berhasil diserahterimakan`,
                  timestamp: deliveredDOs.length > 0 ? deliveredDOs[deliveredDOs.length - 1]?.deliveredAt : tripInfo.loadedAt,
                  actor: tripInfo.driverName || 'Driver Logistik',
                }] : []),
              ];

              const isTripFinished = tripInfo.isAllDelivered;

              return (
                <div className="space-y-0">
                  {tripTimelineEvents.map((evt, idx) => {
                    const isLast = idx === tripTimelineEvents.length - 1;
                    const isDone = isTripFinished ? true : !isLast;
                    const isCurrent = isTripFinished ? false : isLast;

                    return (
                      <div key={evt.id || idx} className="flex gap-3 text-xs sm:text-sm">
                        {/* Node & Connector Line */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="flex items-center justify-center mt-0.5">
                            {isDone ? (
                              <Check className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 shrink-0 stroke-[2.5]" />
                            ) : isCurrent ? (
                              <div className="w-4.5 h-4.5 rounded-full border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                              </div>
                            ) : (
                              <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
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
                              isDone
                                ? 'text-slate-500 dark:text-slate-400 font-medium'
                                : isCurrent
                                ? 'text-slate-900 dark:text-white font-bold'
                                : 'text-slate-400 dark:text-slate-500 font-medium'
                            }`}
                          >
                            {evt.title}
                          </div>
                          <p
                            className={`text-xs sm:text-[13px] leading-relaxed ${
                              isDone
                                ? 'text-slate-400 dark:text-slate-500'
                                : isCurrent
                                ? 'text-slate-800 dark:text-white'
                                : 'text-slate-400 dark:text-slate-600'
                            }`}
                          >
                            {evt.description}
                          </p>
                          {(evt.timestamp || (evt.actor && evt.actor !== '-')) && (
                            <div
                              className={`text-[11px] sm:text-xs pt-0.5 flex items-center gap-1.5 flex-wrap ${
                                isCurrent ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
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

                          {/* Bukti Foto Serah Terima (Jika Ada) */}
                          {evt.photo && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => setPreviewPhotoModal({
                                  url: evt.photo!,
                                  title: `Bukti Serah Terima — Pesanan ${evt.salesOrderNumber || ''}`
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
        </div>

      </div>

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
