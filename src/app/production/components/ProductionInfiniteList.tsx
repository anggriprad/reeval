'use client';

import React, { useEffect, useRef } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Factory, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { WorkOrder, Product, JobCard } from '@/lib/types';
import { WorkOrderCard } from './WorkOrderCard';

interface ProductionInfiniteListProps {
  tab: 'active' | 'completed' | 'canceled';
  items: WorkOrder[];
  allWorkOrders?: WorkOrder[];
  products: Product[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  searchTerm?: string;
  expandedWOIds: Record<string, boolean>;
  onToggleExpand: (woId: string) => void;
  canManage: boolean;
  onOpenKPI: (wo: WorkOrder) => void;
  onOpenCancel?: (wo: WorkOrder) => void;
  onStartJobCard?: (woId: string, jcId: string, e?: React.MouseEvent) => void;
  onPauseJobCard?: (woId: string, jcId: string, e?: React.MouseEvent) => void;
  onOpenCompleteModal?: (woId: string, jc: JobCard, e?: React.MouseEvent) => void;
}

export function ProductionInfiniteList({
  tab,
  items,
  allWorkOrders = [],
  products,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  searchTerm = '',
  expandedWOIds,
  onToggleExpand,
  canManage,
  onOpenKPI,
  onOpenCancel,
  onStartJobCard,
  onPauseJobCard,
  onOpenCompleteModal,
}: ProductionInfiniteListProps) {
  const observerTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) return;

    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Memuat data SPK...</p>
      </div>
    );
  }

  if (items.length === 0 && !isLoading) {
    if (tab === 'active') {
      return (
        <EmptyState
          title="Tidak Ada SPK Berjalan"
          description={
            searchTerm
              ? 'Tidak ada SPK yang sesuai dengan pencarian.'
              : 'Tidak ada SPK yang sedang berjalan.'
          }
          icon={<Factory className="h-7 w-7 text-slate-400" />}
        />
      );
    }
    if (tab === 'completed') {
      return (
        <EmptyState
          title="Belum Ada SPK Selesai"
          description={
            searchTerm
              ? 'Tidak ada riwayat SPK yang sesuai dengan pencarian.'
              : 'Belum ada riwayat SPK selesai.'
          }
          icon={<CheckCircle className="h-7 w-7 text-slate-400" />}
        />
      );
    }
    return (
      <EmptyState
        title="Tidak Ada SPK Dibatalkan"
        description={
          searchTerm
            ? 'Tidak ada SPK dibatalkan yang sesuai dengan pencarian.'
            : 'Tidak ada SPK yang dibatalkan.'
        }
        icon={<XCircle className="h-7 w-7 text-slate-400" />}
      />
    );
  }

  return (
    <div className={tab === 'active' ? 'space-y-4' : 'space-y-3'}>
      {items.map((wo) => (
        <WorkOrderCard
          key={wo.id}
          wo={wo}
          tab={tab}
          products={products}
          allWorkOrders={allWorkOrders}
          isExpanded={Boolean(expandedWOIds[wo.id])}
          onToggleExpand={onToggleExpand}
          canManage={canManage}
          onOpenKPI={onOpenKPI}
          onOpenCancel={onOpenCancel}
          onStartJobCard={onStartJobCard}
          onPauseJobCard={onPauseJobCard}
          onOpenCompleteModal={onOpenCompleteModal}
        />
      ))}

      {/* Sentinel for infinite scrolling */}
      <div ref={observerTarget} className="h-4" />

      {isLoadingMore && (
        <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          <span>Memuat SPK lainnya...</span>
        </div>
      )}

      {hasMore && !isLoadingMore && (
        <div className="text-center pt-2 pb-6">
          <button
            type="button"
            onClick={onLoadMore}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline px-4 py-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30"
          >
            Muat lebih banyak
          </button>
        </div>
      )}
    </div>
  );
}
