'use client';

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, cn } from '@/lib/utils';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { QueueOrderGroup, ChildUnitItem } from './types';

interface QueueSectionProps {
  displayOrderGroups: QueueOrderGroup[];
  totalReadyUnitsCount: number;
  totalOrdersCount: number;
  selectedUnitsList: ChildUnitItem[];
  selectedUnitKeys: Record<string, boolean>;
  expandedOrderIds: Record<string, boolean>;
  searchTerm: string;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onToggleExpandOrder: (orderId: string) => void;
  onToggleExpandAll: () => void;
  isAllExpanded: boolean;
  onToggleUnitSelection: (key: string) => void;
  onToggleGroupSelection: (group: QueueOrderGroup) => void;
  onToggleSelectAllVisible: () => void;
  onClearSelection: () => void;
  onOpenCreateModal: () => void;
  areAllVisibleSelected: boolean;
  someVisibleSelected: boolean;
  distinctSelectedOrdersCount: number;
  canCreate?: boolean;
}

export function QueueSection({
  displayOrderGroups,
  totalReadyUnitsCount,
  totalOrdersCount,
  selectedUnitsList,
  selectedUnitKeys,
  expandedOrderIds,
  searchTerm,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onToggleExpandOrder,
  onToggleExpandAll,
  isAllExpanded,
  onToggleUnitSelection,
  onToggleGroupSelection,
  onToggleSelectAllVisible,
  onClearSelection,
  onOpenCreateModal,
  areAllVisibleSelected,
  someVisibleSelected,
  distinctSelectedOrdersCount,
  canCreate = true,
}: QueueSectionProps) {
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

  if (isLoading && displayOrderGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Memuat antrean kirim...</p>
      </div>
    );
  }

  if (displayOrderGroups.length === 0) {
    return (
      <EmptyState
        title={searchTerm ? 'Tidak ada pesanan di antrean kirim yang sesuai pencarian' : 'Belum ada pesanan di antrean kirim'}
        description={
          searchTerm
            ? 'Coba gunakan kata kunci pencarian yang berbeda.'
            : 'Pesanan akan otomatis masuk ke antrean ini setelah unit produk selesai dikerjakan di produksi.'
        }
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Dynamic Header Toolbar: Fixed height h-[52px] */}
      {selectedUnitsList.length > 0 ? (
        <div className="flex items-center justify-between gap-3 px-4 h-[52px] bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <Checkbox
              checked={areAllVisibleSelected}
              indeterminate={someVisibleSelected && !areAllVisibleSelected}
              onChange={onToggleSelectAllVisible}
              title={areAllVisibleSelected ? 'Batalkan semua pilihan' : 'Pilih semua unit'}
            />
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                {selectedUnitsList.length} unit dipilih
              </span>
              <span className="text-xs text-indigo-600 dark:text-indigo-400">
                ({distinctSelectedOrdersCount} pesanan)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={onClearSelection}
            >
              Batal
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={onOpenCreateModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                Terbitkan Surat Jalan ({selectedUnitsList.length})
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 px-4 h-[52px] bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={false}
              onChange={onToggleSelectAllVisible}
              title="Pilih semua unit di daftar"
            />
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Pilih Semua Unit
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleExpandAll}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              {isAllExpanded ? 'Tutup Semua SO' : 'Buka Semua SO'}
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-medium">
              Total: <strong className="text-slate-900 dark:text-white">{totalReadyUnitsCount}</strong> unit siap ({totalOrdersCount} pesanan)
            </span>
          </div>
        </div>
      )}

      {/* Grouped SO Accordion List */}
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {displayOrderGroups.map(group => {
          const isExpanded = !!expandedOrderIds[group.orderId];
          const readyUnitKeys = group.childUnits.filter(u => u.unitStatus === 'READY').map(u => u.key);
          const selectedInGroupCount = readyUnitKeys.filter(k => !!selectedUnitKeys[k]).length;
          const isGroupAllSelected = selectedInGroupCount === readyUnitKeys.length && readyUnitKeys.length > 0;
          const isGroupSomeSelected = selectedInGroupCount > 0 && !isGroupAllSelected;
          const isFullyReady = group.totalReadyUnitsCount === group.totalOrderUnitsCount;

          return (
            <div key={group.orderId} className="transition-colors">
              {/* Parent SO Row Header */}
              <div
                onClick={() => onToggleExpandOrder(group.orderId)}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 cursor-pointer transition-colors select-none',
                  isGroupAllSelected
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                    : isGroupSomeSelected
                    ? 'bg-indigo-50/20 dark:bg-indigo-950/15'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-slate-50/30 dark:bg-slate-800/20'
                )}
              >
                {/* Left: Checkbox + SO Info */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div
                    className="pt-0.5 sm:pt-0 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isGroupAllSelected}
                      indeterminate={isGroupSomeSelected}
                      onChange={() => onToggleGroupSelection(group)}
                      title={isGroupAllSelected ? 'Batalkan pilihan SO ini' : 'Pilih seluruh unit di SO ini'}
                    />
                  </div>

                  <button
                    type="button"
                    className="p-1 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0"
                    aria-label={isExpanded ? 'Tutup daftar unit' : 'Buka daftar unit'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 md:items-center">
                    {/* SO Number & Date (col-span-4) */}
                    <div className="md:col-span-4 min-w-0">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                        {group.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {formatDate(group.orderCreatedAt)}
                      </span>
                    </div>

                    {/* Customer & Address (col-span-8) */}
                    <div className="md:col-span-8 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {group.customerName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{group.customerAddress || 'Alamat tidak dispesifikasikan'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Summary Count & Status */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-11 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                      {group.totalReadyUnitsCount} unit siap
                    </span>
                    {!isFullyReady && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        dari {group.totalOrderUnitsCount} total unit
                      </p>
                    )}
                  </div>

                  <Badge
                    variant={isFullyReady ? 'purple' : 'warning'}
                    className="text-[10px] shrink-0"
                  >
                    {isFullyReady ? 'Semua Siap' : 'Sebagian Siap'}
                  </Badge>
                </div>
              </div>

              {/* Child Units List (Expanded View) */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {group.childUnits.map(unit => {
                    const isReady = unit.unitStatus === 'READY';
                    const isUnitChecked = isReady && !!selectedUnitKeys[unit.key];

                    return (
                      <div
                        key={unit.key}
                        onClick={() => isReady && onToggleUnitSelection(unit.key)}
                        className={cn(
                          'flex items-center justify-between gap-3 pl-11 sm:pl-14 pr-4 py-2.5 transition-colors select-none',
                          isReady
                            ? isUnitChecked
                              ? 'bg-indigo-50/40 dark:bg-indigo-950/25 cursor-pointer'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer'
                            : 'opacity-60 bg-slate-50/50 dark:bg-slate-800/20 cursor-not-allowed'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="shrink-0"
                            onClick={e => isReady && e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isUnitChecked}
                              disabled={!isReady}
                              onChange={() => isReady && onToggleUnitSelection(unit.key)}
                            />
                          </div>

                          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {unit.productName}
                              </p>
                              {unit.variantLabel && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {unit.variantLabel}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {unit.spkNumber && (
                                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                  {unit.spkNumber}
                                </span>
                              )}
                              <span className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded border",
                                unit.isReplacement
                                  ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 font-semibold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700"
                              )}>
                                {unit.isReplacement ? 'Penggantian Komplain' : `Unit #${unit.unitNumber}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {unit.unitStatus === 'READY' ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              1 Unit Siap
                            </span>
                          ) : unit.unitStatus === 'IN_PRODUCTION' ? (
                            <Badge variant="warning" className="text-[10px]">
                              Dalam Produksi
                            </Badge>
                          ) : (
                            <Badge variant="info" className="text-[10px]">
                              Sudah Dikirim
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
