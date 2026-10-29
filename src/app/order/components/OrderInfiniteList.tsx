'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
import { getOrderStatusLabel } from '@/lib/utils';
import type { OrderStatus, SalesOrder, Product } from '@/lib/types';
import { OrderCard } from './OrderCard';
import { ComplaintCard, ComplaintCardData } from './ComplaintCard';

interface OrderInfiniteListProps {
  statusFilter: string;
  items: SalesOrder[];
  complaints: ComplaintCardData[];
  products: Product[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  expandedOrders: Record<string, boolean>;
  onToggleExpand: (orderId: string) => void;
  canApprove: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onProcessOrder: (orderId: string) => void;
  onOpenCancelModal: (orderId: string) => void;
  onOpenCustomProcessModal: (order: SalesOrder) => void;
}

export function OrderInfiniteList({
  statusFilter,
  items,
  complaints,
  products,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  expandedOrders,
  onToggleExpand,
  canApprove,
  canUpdate,
  canDelete,
  onProcessOrder,
  onOpenCancelModal,
  onOpenCustomProcessModal,
}: OrderInfiniteListProps) {
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // IntersectionObserver for Infinite Scroll
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

  // Initial loading skeleton
  if (isLoading && items.length === 0 && complaints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Memuat data pesanan...</p>
      </div>
    );
  }

  // Komplain Tab rendering
  if (statusFilter === 'komplain') {
    if (complaints.length === 0 && !isLoading) {
      return (
        <EmptyState
          title="Tidak Ada Komplain"
          description="Tidak ada komplain yang sesuai dengan filter/pencarian."
          icon={<AlertCircle className="h-7 w-7 text-slate-400" />}
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-2.5 sm:gap-4 max-md:-mx-4 md:mx-0">
          {complaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} products={products} />
          ))}
        </div>

        {/* Sentinel for infinite scrolling */}
        <div ref={observerTarget} className="h-4" />

        {isLoadingMore && (
          <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Memuat komplain lainnya...</span>
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

  // Regular Sales Order list rendering
  if (items.length === 0 && !isLoading) {
    return (
      <EmptyState
        title="Tidak Ada Order"
        description={`Tidak ada pesanan ${
          statusFilter === 'all'
            ? 'terdaftar.'
            : `dengan status ${getOrderStatusLabel(statusFilter.toUpperCase() as OrderStatus)}.`
        }`}
        icon={<ShoppingCart className="h-7 w-7" />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:gap-4 max-md:-mx-4 md:mx-0">
        {items.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            products={products}
            isExpanded={Boolean(expandedOrders[order.id])}
            onToggleExpand={onToggleExpand}
            canApprove={canApprove}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onProcessOrder={onProcessOrder}
            onOpenCancelModal={onOpenCancelModal}
            onOpenCustomProcessModal={onOpenCustomProcessModal}
          />
        ))}
      </div>

      {/* Sentinel for infinite scrolling */}
      <div ref={observerTarget} className="h-4" />

      {isLoadingMore && (
        <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          <span>Memuat pesanan lainnya...</span>
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
