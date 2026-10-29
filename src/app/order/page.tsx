'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTableFilters } from '@/hooks/useTableFilters';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl, SegmentOption } from '@/components/ui/SegmentedControl';
import { canApproveOrder, canCreateOrder, USER_ACCOUNTS } from '@/lib/roles';
import type { SalesOrder } from '@/lib/types';
import { orderService, mapOrderResponseToSalesOrder, mapComplaintResponseToOrderComplaint } from '@/services/order.service';
import { userService, UserOption } from '@/services/user.service';
import { CustomProcessModal } from '@/components/order/CustomProcessModal';
import { OrderInfiniteList } from './components/OrderInfiniteList';
import { CancelOrderModal } from './components/CancelOrderModal';
import type { ComplaintCardData } from './components/ComplaintCard';
import {
  Plus,
  Settings,
  AlertCircle,
  Clock,
  Cog,
  Truck,
  CheckCircle,
  XCircle,
  Layers,
} from 'lucide-react';

export function OrderListContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { products, currentUser, showAllOrdersTab, setShowAllOrdersTab } = useApp();
  const { can } = usePermission();

  // Load backend order config on mount to sync dynamic tabs (e.g. showAllOrdersTab)
  useEffect(() => {
    orderService
      .getOrderConfig()
      .then((res) => {
        if (res.success && res.data) {
          setShowAllOrdersTab(Boolean(res.data.show_all_orders_tab));
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat order config di order list:', err);
      });
  }, [setShowAllOrdersTab]);

  const canCreate = can(PERMISSIONS.SALES.CREATE) || canCreateOrder(currentUser.role);
  const canApprove = can(PERMISSIONS.SALES.UPDATE) || can(PERMISSIONS.SALES.APPROVE) || canApproveOrder(currentUser.role);
  const canUpdate = can(PERMISSIONS.SALES.UPDATE) || ['ADMIN', 'SUPER_ADMIN', 'SALES'].includes(currentUser.role);
  const canDelete = can(PERMISSIONS.SALES.DELETE) || ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') || searchParams.get('status') || 'pending';

  // 1. URL Table Filters integration
  const { filters, setFilter } = useTableFilters({
    status: urlTab,
    search: '',
    sales_id: '',
  });

  const activeStatus = filters.status || 'pending';

  // 2. Debounced search input (600ms)
  const [searchInput, setSearchInput] = useState(filters.search || '');
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        setFilter('search', searchInput);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setFilter]);

  // 3. Sales users dropdown options from backend
  const [salesUsers, setSalesUsers] = useState<UserOption[]>([]);
  useEffect(() => {
    userService
      .getUserOptions()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setSalesUsers(res.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load user options for sales filter:', err);
      });
  }, []);

  const salesFilterOptions = [
    { value: '', label: 'Semua Sales' },
    ...salesUsers.map((u) => ({
      value: String(u.id),
      label: u.full_name || u.email,
    })),
  ];

  // 4. Tab status counts updated from backend meta totals
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // 5. Infinite list state & cancellation refs
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [complaints, setComplaints] = useState<ComplaintCardData[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const activeRequestRef = useRef<number>(0);
  const currentPageRef = useRef<number>(1);

  // 6. Modals state
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  const [customProcessOrder, setCustomProcessOrder] = useState<SalesOrder | null>(null);

  const toggleExpandOrder = (id: string) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Data fetching routine with stale request cancellation
  const fetchPageData = useCallback(
    async (pageToFetch: number, isInitial: boolean) => {
      const reqId = ++activeRequestRef.current;
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setErrorMsg('');

      try {
        if (activeStatus === 'komplain') {
          const res = await orderService.getComplaints({
            page: pageToFetch,
            per_page: 15,
            search: filters.search || undefined,
          });

          if (activeRequestRef.current !== reqId) return;

          if (res.success && Array.isArray(res.data)) {
            const mappedComplaints: ComplaintCardData[] = res.data.map((c) => ({
              id: String(c.id),
              orderId: String(c.sales_order_id),
              orderNumber: c.sales_order_number,
              customerName: c.customer_name,
              category: c.category,
              status: c.status,
              description: c.description,
              createdAt: c.created_at,
              items: (c.items || []).map((i) => ({
                productId: String(i.product_id),
                productName: i.product_name,
                variantLabel: i.variant_label,
                qty: i.qty,
              })),
            }));

            if (isInitial) {
              setComplaints(mappedComplaints);
              currentPageRef.current = 1;
              setPage(1);
            } else {
              setComplaints((prev) => [...prev, ...mappedComplaints]);
              currentPageRef.current = pageToFetch;
              setPage(pageToFetch);
            }

            const total = res.meta?.total ?? mappedComplaints.length;
            const perPage = res.meta?.per_page ?? 15;
            const totalPages = res.meta?.total_pages ?? Math.max(1, Math.ceil(total / perPage));
            setHasMore(pageToFetch < totalPages && mappedComplaints.length > 0);

            if (res.meta?.total !== undefined) {
              setStatusCounts((prev) => ({ ...prev, komplain: res.meta!.total }));
            }
          } else {
            if (isInitial) setComplaints([]);
            setHasMore(false);
          }
        } else {
          // Regular Sales Orders with server-side status, search & sales_id
          const statusParam = activeStatus === 'all' ? undefined : activeStatus;
          const salesIdParam = filters.sales_id ? Number(filters.sales_id) : undefined;
          const res = await orderService.getOrders({
            page: pageToFetch,
            per_page: 15,
            status: statusParam,
            search: filters.search || undefined,
            sales_id: salesIdParam,
          });

          if (activeRequestRef.current !== reqId) return;

          if (res.success && Array.isArray(res.data)) {
            const mappedOrders: SalesOrder[] = res.data.map(mapOrderResponseToSalesOrder);

            if (isInitial) {
              setOrders(mappedOrders);
              currentPageRef.current = 1;
              setPage(1);
            } else {
              setOrders((prev) => [...prev, ...mappedOrders]);
              currentPageRef.current = pageToFetch;
              setPage(pageToFetch);
            }

            const total = res.meta?.total ?? mappedOrders.length;
            const perPage = res.meta?.per_page ?? 15;
            const totalPages = res.meta?.total_pages ?? Math.max(1, Math.ceil(total / perPage));
            setHasMore(pageToFetch < totalPages && mappedOrders.length > 0);

            if (res.meta?.total !== undefined) {
              setStatusCounts((prev) => ({ ...prev, [activeStatus]: res.meta!.total }));
            }
          } else {
            if (isInitial) setOrders([]);
            setHasMore(false);
          }
        }
      } catch (err: any) {
        if (activeRequestRef.current === reqId) {
          console.error('Failed to load orders from backend:', err);
          setErrorMsg(err?.response?.data?.message || err?.message || 'Gagal memuat data pesanan dari server.');
        }
      } finally {
        if (activeRequestRef.current === reqId) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [activeStatus, filters.search, filters.sales_id]
  );

  // Refetch on initial mount and when filter criteria change
  useEffect(() => {
    currentPageRef.current = 1;
    setPage(1);
    fetchPageData(1, true);
  }, [fetchPageData]);

  // Load next page
  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    const nextPage = currentPageRef.current + 1;
    fetchPageData(nextPage, false);
  }, [isLoading, isLoadingMore, hasMore, fetchPageData]);

  // Fetch unified aggregated status counts for all tabs
  const fetchStatusCounts = useCallback(async () => {
    try {
      const salesIdParam = filters.sales_id ? Number(filters.sales_id) : undefined;
      const res = await orderService.getStatusCounts({ sales_id: salesIdParam });
      if (res.success && res.data) {
        setStatusCounts({
          all: res.data.all,
          pending: res.data.pending,
          processing: res.data.processing,
          ready: res.data.ready,
          sent: res.data.sent,
          canceled: res.data.canceled,
          komplain: res.data.komplain,
        });
      }
    } catch (err) {
      console.warn('Gagal memuat status counts dari server:', err);
    }
  }, [filters.sales_id]);

  useEffect(() => {
    fetchStatusCounts();
  }, [fetchStatusCounts]);

  // Handle Process Order
  const handleProcessOrder = async (orderId: string) => {
    setErrorMsg('');
    const target = orders.find((o) => o.id === orderId);
    try {
      const res = await orderService.processOrder(orderId);
      if (res.success) {
        toast.success('Pesanan Diproses', `Pesanan ${target?.orderNumber || ''} berhasil diproses.`);
        fetchPageData(1, true);
        fetchStatusCounts();
      } else {
        toast.error('Gagal Memproses Pesanan', res.message || 'Terjadi kesalahan saat memproses pesanan.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal memproses pesanan.';
      setErrorMsg(msg);
      toast.error('Gagal Memproses Pesanan', msg);
    }
  };

  // Handle Open Cancel Modal
  const handleOpenCancelModal = (orderId: string) => {
    setCancelModalOrderId(orderId);
    setCancelReasonInput('');
    setCancelReasonError('');
  };

  // Handle Confirm Cancel Order
  const handleConfirmCancelOrder = async () => {
    if (!cancelReasonInput.trim()) {
      setCancelReasonError('Mohon isi alasan pembatalan order.');
      return;
    }
    if (!cancelModalOrderId) return;

    setIsCanceling(true);
    const targetOrder = orders.find((o) => o.id === cancelModalOrderId);
    try {
      const res = await orderService.cancelOrder(cancelModalOrderId, {
        reason: cancelReasonInput.trim(),
      });
      if (res.success) {
        toast.success(
          'Sales Order Dibatalkan',
          `Sales Order ${targetOrder?.orderNumber || ''} telah berhasil dibatalkan.`
        );
        setCancelModalOrderId(null);
        setCancelReasonInput('');
        fetchPageData(1, true);
        fetchStatusCounts();
      } else {
        toast.error('Gagal Membatalkan Order', res.message || 'Gagal membatalkan order.');
      }
    } catch (err: any) {
      toast.error('Gagal Membatalkan Order', err?.response?.data?.message || err?.message || 'Gagal.');
    } finally {
      setIsCanceling(false);
    }
  };

  const orderToCancel = orders.find((o) => o.id === cancelModalOrderId);

  // Status Tab definitions with dynamic count indicators
  const statusTabOptions: SegmentOption<string>[] = [
    ...(showAllOrdersTab
      ? [
          {
            key: 'all',
            label: 'Semua',
            icon: Layers,
          },
        ]
      : []),
    {
      key: 'pending',
      label: 'Menunggu',
      count: statusCounts['pending'],
      icon: Clock,
    },
    {
      key: 'processing',
      label: 'Diproses',
      count: statusCounts['processing'],
      icon: Cog,
    },
    {
      key: 'ready',
      label: 'Siap Kirim',
      count: statusCounts['ready'],
      icon: Truck,
    },
    {
      key: 'sent',
      label: 'Terkirim',
      count: statusCounts['sent'],
      icon: CheckCircle,
    },
    {
      key: 'canceled',
      label: 'Dibatalkan',
      count: statusCounts['canceled'],
      icon: XCircle,
    },
    {
      key: 'komplain',
      label: 'Komplain',
      count: statusCounts['komplain'],
      icon: AlertCircle,
      countColor: 'bg-red-600',
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader title="Sales Order">
        {canCreate && (
          <Link href="/order/create">
            <Button>
              <Plus className="h-4 w-4" />
              Buat Pesanan
            </Button>
          </Link>
        )}
        <Link href="/order/config">
          <Button variant="outline">
            <Settings className="h-4 w-4" />
            Konfigurasi
          </Button>
        </Link>
      </PageHeader>

      {errorMsg && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-red-800 dark:text-red-300">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-red-400 hover:text-red-600 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Segmented Control Header with Search, Dropdown Filter & URL Tab Sync */}
      <SegmentedControl
        options={statusTabOptions}
        value={activeStatus}
        onChange={(val) => setFilter('status', val)}
        filterValue={filters.sales_id || ''}
        onFilterChange={(val) => setFilter('sales_id', val)}
        filterOptions={salesFilterOptions}
        filterPlaceholder="Semua Sales"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Cari sales order, pelanggan, produk..."
      />

      {/* Infinite Scroll List for Orders and Complaints */}
      <OrderInfiniteList
        statusFilter={activeStatus}
        items={orders}
        complaints={complaints}
        products={products}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        expandedOrders={expandedOrders}
        onToggleExpand={toggleExpandOrder}
        canApprove={canApprove}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onProcessOrder={handleProcessOrder}
        onOpenCancelModal={handleOpenCancelModal}
        onOpenCustomProcessModal={(order) => setCustomProcessOrder(order)}
      />

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={Boolean(cancelModalOrderId)}
        onClose={() => setCancelModalOrderId(null)}
        orderNumber={orderToCancel?.orderNumber}
        reason={cancelReasonInput}
        onReasonChange={setCancelReasonInput}
        error={cancelReasonError}
        onConfirm={handleConfirmCancelOrder}
        isSubmitting={isCanceling}
      />

      {/* Custom Process Modal */}
      {customProcessOrder && (
        <CustomProcessModal
          isOpen={Boolean(customProcessOrder)}
          onClose={() => {
            setCustomProcessOrder(null);
            fetchPageData(1, true);
            fetchStatusCounts();
          }}
          onSuccess={() => {
            fetchPageData(1, true);
            fetchStatusCounts();
          }}
          order={customProcessOrder}
        />
      )}
    </div>
  );
}

export default function OrderListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <OrderListContent />
    </Suspense>
  );
}
