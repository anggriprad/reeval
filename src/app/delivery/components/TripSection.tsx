'use client';

import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import {
  ChevronRight,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { DeliveryTripGroup, TabKey } from './types';

interface TripSectionProps {
  activeTab: 'ready-to-ship' | 'in-transit' | 'delivered';
  trips: DeliveryTripGroup[];
  currentUserName?: string;
  searchTerm: string;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onOpenLoadingModal: (tripId: string) => void;
  canDispatch?: boolean;
}

export function TripSection({
  activeTab,
  trips,
  currentUserName = '',
  searchTerm,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onOpenLoadingModal,
  canDispatch = true,
}: TripSectionProps) {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore || !onLoadMore) return;
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          onLoadMore();
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  if (isLoading && trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Memuat data trip pengiriman...</p>
      </div>
    );
  }

  if (trips.length === 0) {
    if (activeTab === 'ready-to-ship') {
      return (
        <EmptyState
          title={searchTerm ? 'Tidak ada trip siap kirim yang sesuai pencarian' : 'Belum ada trip pengiriman siap kirim'}
          description={
            searchTerm
              ? 'Coba gunakan kata kunci pencarian yang berbeda.'
              : 'Pilih produk dari tab "Antrean Kirim" dengan checkbox dan klik "Terbitkan Surat Jalan".'
          }
        />
      );
    }
    if (activeTab === 'in-transit') {
      return (
        <EmptyState
          title={searchTerm ? 'Tidak ada trip dalam perjalanan yang sesuai pencarian' : 'Tidak ada trip pengiriman yang sedang berjalan'}
          description={
            searchTerm
              ? 'Coba gunakan kata kunci pencarian yang berbeda.'
              : 'Konfirmasi muat barang pada trip di tab "Siap Kirim" untuk memulai perjalanan armada.'
          }
        />
      );
    }
    return (
      <EmptyState
        title={searchTerm ? 'Tidak ada trip terkirim yang sesuai pencarian' : 'Belum ada trip pengiriman yang selesai'}
        description={
          searchTerm
            ? 'Coba gunakan kata kunci pencarian yang berbeda.'
            : 'Trip pengiriman akan otomatis berpindah ke sini setelah semua surat jalan di dalamnya selesai diserahterimakan.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {trips.map(trip => {
        const isMyTask = currentUserName && trip.driverName && currentUserName.toLowerCase() === trip.driverName.toLowerCase();

        return (
          <div
            key={trip.tripId}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
          >
            {/* Header Trip - Klik untuk melihat Detail Trip */}
            <div
              onClick={() => router.push(`/delivery/trip/${trip.tripId}`)}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group select-none"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {trip.driverName}
                  </span>
                  <span className="text-slate-400 mx-1.5">•</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {trip.armadaName ? `${trip.armadaName} • ` : ''}
                    {trip.vehiclePlate}
                  </span>
                </div>
                {isMyTask && (
                  <Badge variant="purple" className="text-[9px] px-1.5 py-0">
                    Tugas Anda
                  </Badge>
                )}
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {activeTab === 'ready-to-ship'
                    ? `Jadwal: ${formatDate(trip.scheduledDate)}`
                    : activeTab === 'in-transit'
                    ? `Berangkat: ${trip.loadedAt ? formatDateTime(trip.loadedAt) : formatDate(trip.scheduledDate)}`
                    : `Selesai: ${formatDate(trip.scheduledDate)}`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {activeTab === 'ready-to-ship' && (
                  <>
                    <span className="inline-block px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                      {trip.totalDestinationsCount} Titik (SJ) • {trip.totalUnitsCount} Unit
                    </span>
                    <Badge variant="warning" className="text-[10px]">
                      Menunggu Muat
                    </Badge>
                    {canDispatch && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLoadingModal(trip.tripId);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Muat Barang
                      </Button>
                    )}
                  </>
                )}

                {activeTab === 'in-transit' && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {(trip.completedCount !== undefined ? trip.completedCount : trip.deliveredCount)} dari {trip.totalDestinationsCount} Selesai • {trip.totalUnitsCount} Unit
                  </span>
                )}

                {activeTab === 'delivered' && (
                  <>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {trip.totalDestinationsCount} Titik (SJ) • {trip.totalUnitsCount} Unit
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      Selesai
                    </Badge>
                  </>
                )}

                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </div>

            {/* List Surat Jalan di dalam Trip */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {trip.deliveryOrders.map(dOrder => {
                const isDelivered = dOrder.status === 'DELIVERED';
                const isFailed = dOrder.status === 'FAILED';
                const doUnits = dOrder.orderItems && dOrder.orderItems.length > 0
                  ? dOrder.orderItems.reduce((acc: number, i: any) => acc + (Number(i.qty) || 1), 0)
                  : (dOrder.items?.length || 1);

                if (activeTab === 'ready-to-ship') {
                  return (
                    <div
                      key={dOrder.id}
                      onClick={() => router.push(`/delivery/sj/${dOrder.id}`)}
                      className="group/item p-3.5 pl-6 sm:pl-8 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
                    >
                      <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                        <div className="sm:col-span-4 min-w-0">
                          <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover/item:underline block truncate">
                            Pesanan #{dOrder.salesOrderNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {formatDate(dOrder.createdAt)}
                          </span>
                        </div>

                        <div className="sm:col-span-8 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {dOrder.customerName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{dOrder.customerAddress || 'Alamat tidak dispesifikasikan'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                          {doUnits} Unit
                        </span>
                        <Badge variant="purple" className="text-[10px]">
                          Siap Angkut
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 group-hover/item:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>
                  );
                }

                if (activeTab === 'in-transit') {
                  return (
                    <div
                      key={dOrder.id}
                      onClick={() => router.push(`/delivery/sj/${dOrder.id}`)}
                      className={cn(
                        'group/item p-3.5 pl-6 sm:pl-8 flex items-center justify-between gap-4 transition-colors cursor-pointer select-none',
                        isDelivered
                          ? 'bg-emerald-50/15 dark:bg-emerald-950/10 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                          : isFailed
                          ? 'bg-rose-50/15 dark:bg-rose-950/10 hover:bg-rose-50/30 dark:hover:bg-rose-950/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      )}
                    >
                      {/* Kiri: Icon + Info Nama Pelanggan & Alamat */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {dOrder.customerName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {dOrder.customerAddress || 'Alamat tidak dispesifikasikan'}
                          </p>
                        </div>
                      </div>

                      {/* Kanan: Nomor Pesanan & Jumlah Barang, lalu Status Item, lalu Chevron */}
                      <div className="flex items-center gap-3.5 shrink-0">
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                            #{dOrder.salesOrderNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            {doUnits} barang
                          </span>
                        </div>

                        <Badge
                          variant={isDelivered ? 'success' : isFailed ? 'danger' : 'info'}
                          className="text-[10px]"
                        >
                          {isDelivered ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Terkirim
                            </span>
                          ) : isFailed ? (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Gagal Kirim
                            </span>
                          ) : (
                            'Dalam Perjalanan'
                          )}
                        </Badge>

                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 group-hover/item:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>
                  );
                }

                // activeTab === 'delivered'
                return (
                  <div
                    key={dOrder.id}
                    onClick={() => router.push(`/delivery/sj/${dOrder.id}`)}
                    className={cn(
                      'group/item p-3.5 pl-6 sm:pl-8 flex items-center justify-between gap-4 transition-colors cursor-pointer select-none',
                      isFailed
                        ? 'bg-rose-50/15 dark:bg-rose-950/10 hover:bg-rose-50/30 dark:hover:bg-rose-950/20'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    )}
                  >
                    {/* Kiri: Icon + Info Nama Pelanggan & Alamat */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {dOrder.customerName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {dOrder.customerAddress || 'Alamat tidak dispesifikasikan'}
                        </p>
                      </div>
                    </div>

                    {/* Kanan: Nomor Pesanan & Jumlah Barang, lalu Status Item, lalu Chevron */}
                    <div className="flex items-center gap-3.5 shrink-0">
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                          #{dOrder.salesOrderNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {doUnits} barang
                        </span>
                      </div>

                      <Badge
                        variant={isFailed ? 'danger' : 'success'}
                        className="text-[10px]"
                      >
                        {isFailed ? (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Gagal Kirim
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Terkirim
                          </span>
                        )}
                      </Badge>

                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 group-hover/item:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-2 flex items-center justify-center">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Memuat lebih banyak...</span>
          </div>
        )}
      </div>
    </div>
  );
}
