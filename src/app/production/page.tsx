'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTableFilters } from '@/hooks/useTableFilters';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageProduction } from '@/lib/roles';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  Factory,
  CheckCircle,
  XCircle,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react';
import {
  workOrderService,
  mapWorkOrderResponseToWorkOrder,
  WorkOrderStatusCountsResponse,
} from '@/services/work-order.service';
import { productionOperationService } from '@/services/production-operation.service';
import { productionOperatorService } from '@/services/production-operator.service';
import type { WorkOrder, JobCard, ProductionOperation, ProductionOperator } from '@/lib/types';

import { CreateSpkModal } from './components/CreateSpkModal';
import { CancelSpkModal } from './components/CancelSpkModal';
import { CompleteJobCardModal } from './components/CompleteJobCardModal';
import { AssignOperatorModal } from './components/AssignOperatorModal';
import { WorkOrderKpiModal } from './components/WorkOrderKpiModal';
import { ProductionInfiniteList } from './components/ProductionInfiniteList';
import {
  ProductionAnalyticsTab,
  type AnalyticsPeriod,
} from './components/ProductionAnalyticsTab';

function ProductionContent() {
  const { toast } = useToast();
  const { can } = usePermission();
  const {
    currentUser,
    products = [],
    materials = [],
    operators = [],
    operations = [],
    setOperationsList,
    setOperatorsList,
  } = useApp();

  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') || searchParams.get('status') || 'active';

  const { filters, setFilter } = useTableFilters({
    status: 'active',
    spk_type: '',
    search: '',
    period: 'THIS_MONTH',
  });

  const activeTab = (filters.status || 'active') as 'active' | 'completed' | 'canceled' | 'analytics';

  const canCreate = can(PERMISSIONS.PRODUCTION.CREATE) || canManageProduction(currentUser.role);
  const canManage = can(PERMISSIONS.PRODUCTION.UPDATE) || canManageProduction(currentUser.role);

  // Debounced search input (600ms)
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

  // Synchronize master operations from API
  useEffect(() => {
    productionOperationService
      .getOperations({ per_page: 100 })
      .then((res) => {
        if (res && Array.isArray(res.data)) {
          const mapped: ProductionOperation[] = res.data.map((op) => ({
            id: String(op.id),
            name: op.name,
            costingMethod: op.wage_type === 'HOURLY' ? 'hourly' : 'fixed',
            durationMinutes: op.standard_duration_minutes,
            laborCostPerHour: op.cost_per_hour,
            fixedLaborCost: op.fixed_cost,
            description: op.description,
          }));
          setOperationsList(mapped);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat master operasi dari API:', err);
      });
  }, [setOperationsList]);

  // Synchronize master operators from API
  useEffect(() => {
    productionOperatorService
      .getOperators({ per_page: 100 })
      .then((res) => {
        if (res && Array.isArray(res.data)) {
          const mapped: ProductionOperator[] = res.data.map((op) => ({
            id: String(op.id),
            name: op.user_name || op.user_email || `Operator #${op.id}`,
            skills: [],
            status: op.is_active ? 'ACTIVE' : 'INACTIVE',
          }));
          setOperatorsList(mapped);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat master operator dari API:', err);
      });
  }, [setOperatorsList]);

  // Tab counter from dedicated API (/production/work-orders/counts)
  const [statusCounts, setStatusCounts] = useState<WorkOrderStatusCountsResponse | null>(null);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const spkType = filters.spk_type || undefined;
      const search = filters.search || undefined;

      const res = await workOrderService.getStatusCounts({ spk_type: spkType, search });
      if (res.success && res.data) {
        setStatusCounts(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat counter status SPK:', err);
    }
  }, [filters.spk_type, filters.search]);

  useEffect(() => {
    fetchStatusCounts();
  }, [fetchStatusCounts]);



  // Infinite list state & cancellation refs
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [allActiveWOs, setAllActiveWOs] = useState<WorkOrder[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedWOIds, setExpandedWOIds] = useState<Record<string, boolean>>({});

  const activeRequestRef = useRef<number>(0);
  const currentPageRef = useRef<number>(1);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cancelTargetWO, setCancelTargetWO] = useState<WorkOrder | null>(null);
  const [completeTarget, setCompleteTarget] = useState<{ woId: string; jc: JobCard } | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ woId: string; jc: JobCard } | null>(null);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  const toggleExpand = (woId: string) => {
    setExpandedWOIds((prev) => ({
      ...prev,
      [woId]: !prev[woId],
    }));
  };

  // Data fetching routine with stale request cancellation
  const fetchWorkOrders = useCallback(
    async (pageToFetch: number, isInitial: boolean) => {
      if (activeTab === 'analytics') {
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      const reqId = ++activeRequestRef.current;
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await workOrderService.getWorkOrders({
          page: pageToFetch,
          per_page: 20,
          status: activeTab,
          spk_type: filters.spk_type || undefined,
          search: filters.search || undefined,
        });

        if (activeRequestRef.current !== reqId) return;

        if (res.success && Array.isArray(res.data)) {
          const mappedWOs = res.data.map(mapWorkOrderResponseToWorkOrder);
          const totalCount = res.meta?.total ?? mappedWOs.length;
          const lastPage = res.meta?.total_pages ?? 1;

          if (isInitial) {
            setWorkOrders(mappedWOs);
            if (activeTab === 'active') {
              setAllActiveWOs(mappedWOs);
            }
          } else {
            setWorkOrders((prev) => {
              const existingIds = new Set(prev.map((item) => item.id));
              const newItems = mappedWOs.filter((item) => !existingIds.has(item.id));
              return [...prev, ...newItems];
            });
            if (activeTab === 'active') {
              setAllActiveWOs((prev) => {
                const existingIds = new Set(prev.map((item) => item.id));
                const newItems = mappedWOs.filter((item) => !existingIds.has(item.id));
                return [...prev, ...newItems];
              });
            }
          }

          setHasMore(pageToFetch < lastPage);
          currentPageRef.current = pageToFetch;
        } else {
          if (isInitial) setWorkOrders([]);
          setHasMore(false);
        }
      } catch (err: any) {
        if (activeRequestRef.current === reqId) {
          console.warn('Gagal memuat daftar SPK:', err);
          if (isInitial) setWorkOrders([]);
          setHasMore(false);
        }
      } finally {
        if (activeRequestRef.current === reqId) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [activeTab, filters.spk_type, filters.search]
  );

  // Trigger initial fetch on filter or tab change
  useEffect(() => {
    setPage(1);
    currentPageRef.current = 1;
    fetchWorkOrders(1, true);
  }, [fetchWorkOrders]);

  // Load more for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    const nextPage = currentPageRef.current + 1;
    setPage(nextPage);
    fetchWorkOrders(nextPage, false);
  }, [isLoading, isLoadingMore, hasMore, fetchWorkOrders]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    currentPageRef.current = 1;
    fetchWorkOrders(1, true);
    fetchStatusCounts();
  }, [fetchWorkOrders, fetchStatusCounts]);

  // Job card execution handlers
  const handleStartJobCard = async (woId: string, jcId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await workOrderService.startJobCard(Number(woId), Number(jcId));
      if (res.success) {
        toast.success('Operasi Dimulai', 'Operasi telah berhasil dimulai.');
        handleRefresh();
      } else {
        toast.error(res.message || 'Gagal memulai operasi.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  const handlePauseJobCard = async (woId: string, jcId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await workOrderService.pauseJobCard(Number(woId), Number(jcId));
      if (res.success) {
        toast.success('Operasi Dijeda', 'Operasi telah berhasil dijeda.');
        handleRefresh();
      } else {
        toast.error(res.message || 'Gagal menjeda operasi.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader title="Manajemen Produksi">
        {canCreate && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Buat SPK Baru
          </Button>
        )}
        <Link href="/production/config">
          <Button variant="outline">
            <Settings className="h-4 w-4" /> Konfigurasi
          </Button>
        </Link>
      </PageHeader>

      <SegmentedControl
        value={activeTab}
        onChange={(tab) => {
          setFilter('status', tab);
        }}
        options={[
          {
            key: 'active',
            label: 'Berjalan',
            count: statusCounts?.active && statusCounts.active > 0 ? statusCounts.active : undefined,
            icon: Factory,
          },
          {
            key: 'completed',
            label: 'Selesai',
            // count: statusCounts?.completed && statusCounts.completed > 0 ? statusCounts.completed : undefined,
            icon: CheckCircle,
          },
          {
            key: 'canceled',
            label: 'Dibatalkan',
            // count: statusCounts?.canceled && statusCounts.canceled > 0 ? statusCounts.canceled : undefined,
            icon: XCircle,
          },
          {
            key: 'analytics',
            label: 'Analitik Kinerja',
            icon: BarChart3,
          },
        ]}
        filterValue={filters.spk_type}
        onFilterChange={(val) => setFilter('spk_type', val)}
        filterPlaceholder="Semua Tipe SPK"
        filterOptions={[
          { value: 'FINISHED_GOOD', label: 'Barang Jadi' },
          { value: 'SUB_ASSEMBLY', label: 'Bahan Setengah Jadi' },
        ]}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Cari SPK, no. order, produk..."
      />

      {/* Main Content Area */}
      {activeTab === 'analytics' ? (
        <ProductionAnalyticsTab
          period={(filters.period as AnalyticsPeriod) || 'THIS_MONTH'}
          onPeriodChange={(p) => setFilter('period', p)}
          workOrders={workOrders}
          operations={operations}
          operators={operators}
        />
      ) : (
        <ProductionInfiniteList
          tab={activeTab}
          items={workOrders}
          allWorkOrders={allActiveWOs}
          products={products}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          searchTerm={filters.search}
          expandedWOIds={expandedWOIds}
          onToggleExpand={toggleExpand}
          canManage={canManage}
          onOpenKPI={(wo) => setSelectedWO(wo)}
          onOpenCancel={(wo) => setCancelTargetWO(wo)}
          onStartJobCard={handleStartJobCard}
          onPauseJobCard={handlePauseJobCard}
          onOpenCompleteModal={(woId, jc) => setCompleteTarget({ woId, jc })}
        />
      )}

      {/* Modals */}
      <CreateSpkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleRefresh}
        products={products}
        materials={materials}
      />

      <CancelSpkModal
        isOpen={!!cancelTargetWO}
        onClose={() => setCancelTargetWO(null)}
        onSuccess={() => {
          setFilter('status', 'canceled');
          handleRefresh();
        }}
        targetWO={cancelTargetWO}
      />

      <CompleteJobCardModal
        isOpen={!!completeTarget}
        onClose={() => setCompleteTarget(null)}
        onSuccess={handleRefresh}
        target={completeTarget}
        operators={operators}
      />

      <AssignOperatorModal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        onSuccess={() => {
          handleRefresh();
          if (selectedWO) {
            workOrderService
              .getWorkOrderById(selectedWO.id)
              .then((res) => {
                if (res.success && res.data) {
                  setSelectedWO(mapWorkOrderResponseToWorkOrder(res.data));
                }
              })
              .catch(() => {});
          }
        }}
        target={assignTarget}
        operators={operators}
      />

      <WorkOrderKpiModal
        isOpen={!!selectedWO}
        onClose={() => setSelectedWO(null)}
        selectedWO={selectedWO}
        products={products}
        operations={operations}
        onOpenEditOperator={(woId, jc) => {
          setAssignTarget({ woId, jc });
        }}
      />
    </div>
  );
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat Production...</div>}>
      <ProductionContent />
    </Suspense>
  );
}
