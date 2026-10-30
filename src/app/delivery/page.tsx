'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUrlTab } from '@/lib/useUrlTab';
import { useTableFilters } from '@/hooks/useTableFilters';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SegmentedControl, SegmentOption } from '@/components/ui/SegmentedControl';
import {
  Settings,
  Clock,
  PackageCheck,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import {
  deliveryService,
  DeliveryOrderStatusCounts,
  DeliveryOrder as ApiDeliveryOrder,
  CreateDeliveryOrderPayload,
  SelectedUnitItemPayload,
} from '@/services/delivery.service';
import { driverService, DriverOption } from '@/services/driver.service';
import {
  TabKey,
  ChildUnitItem,
  QueueOrderGroup,
  DeliveryTripGroup,
  mapQueueResponseToOrderGroup,
  buildTripGroups,
} from './components/types';
import { QueueSection } from './components/QueueSection';
import { TripSection } from './components/TripSection';
import { CreateSuratJalanModal } from './components/CreateSuratJalanModal';
import { ConfirmLoadingModal } from './components/ConfirmLoadingModal';

function DeliveryContent() {
  const {
    currentUser,
    salesOrders,
    deliveryOrders: contextDeliveryOrders,
    workOrders,
    finishedGoods,
    createDeliveryOrder: contextCreateDeliveryOrder,
    confirmLoadingDelivery: contextConfirmLoadingDelivery,
  } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const { can } = usePermission();

  const canCreate = can(PERMISSIONS.DELIVERY.CREATE) || ['ADMIN', 'SUPER_ADMIN', 'ADMIN_DELIVERY'].includes(currentUser?.role || '');
  const canDispatch = can(PERMISSIONS.DELIVERY.DISPATCH) || ['ADMIN', 'SUPER_ADMIN', 'ADMIN_DELIVERY', 'DRIVER'].includes(currentUser?.role || '');
  const canConfig = can(PERMISSIONS.DELIVERY.VEHICLE_READ) || can(PERMISSIONS.DELIVERY.DRIVER_READ) || ['ADMIN', 'SUPER_ADMIN', 'ADMIN_DELIVERY'].includes(currentUser?.role || '');

  const [activeTab, setActiveTab] = useUrlTab(
    ['queue', 'ready-to-ship', 'in-transit', 'delivered'] as const,
    currentUser?.role === 'DRIVER' ? 'ready-to-ship' : 'queue'
  );

  // 1. URL Table Filters integration (search & driver_id)
  const { filters, setFilter } = useTableFilters({
    search: '',
    driver_id: '',
  });

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

  const [driverOptions, setDriverOptions] = useState<DriverOption[]>([]);

  // Tab Status Counts
  const [statusCounts, setStatusCounts] = useState<DeliveryOrderStatusCounts>({
    queue: 0,
    ready_to_ship: 0,
    in_transit: 0,
    delivered: 0,
    failed: 0,
    all: 0,
  });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selection & Accordion state in Queue
  const [selectedUnitKeys, setSelectedUnitKeys] = useState<Record<string, boolean>>({});
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  // Data state
  const [queueGroups, setQueueGroups] = useState<QueueOrderGroup[]>([]);
  const [visibleQueueCount, setVisibleQueueCount] = useState(20);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Trips data state with pagination
  const [tripsData, setTripsData] = useState<ApiDeliveryOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreTrips, setHasMoreTrips] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [isLoadingMoreTrips, setIsLoadingMoreTrips] = useState(false);

  // Load driver options directly from live backend
  useEffect(() => {
    driverService
      .getDriverOptions()
      .then(res => {
        if (res.success && res.data) {
          setDriverOptions(res.data);
        }
      })
      .catch(err => {
        console.error('Failed to load driver options:', err);
      });
  }, []);

  // Fetch status counts
  const loadCounts = useCallback(async (driverId?: string) => {
    try {
      const res = await deliveryService.getCounts({
        driver_id: driverId ? Number(driverId) : undefined,
      });
      if (res.success && res.data) {
        setStatusCounts(res.data);
      }
    } catch (err) {
      console.warn('Failed to load delivery status counts:', err);
    }
  }, []);

  useEffect(() => {
    loadCounts(filters.driver_id);
  }, [loadCounts, filters.driver_id]);

  // Fallback local calculation for Queue if backend queue is empty
  const localFallbackQueue = useMemo<QueueOrderGroup[]>(() => {
    const groups: QueueOrderGroup[] = [];
    const relevantOrders = (salesOrders || []).filter(o => {
      if (o.status === 'PENDING' || o.status === 'CANCELED') return false;
      if (o.status !== 'SENT') return true;
      const hasUnfulfilledItems = o.items.some(it => (it.deliveredQty || 0) < it.qty);
      if (hasUnfulfilledItems) return true;
      return (o.complaints || []).some(
        c => (c.resolution === 'Penuhi Barang Pengganti' || c.resolution === 'Kirim Barang Pengganti') && c.replacementStatus === 'READY_FOR_DELIVERY'
      );
    });

    relevantOrders.forEach(order => {
      const allUnits: ChildUnitItem[] = [];
      let totalOrderUnits = 0;
      const isOrderFullySent = order.status === 'SENT' && !order.items.some(it => (it.deliveredQty || 0) < it.qty);

      if (!isOrderFullySent) {
        order.items.forEach((item, itemIdx) => {
          totalOrderUnits += item.qty;
          const shippedCount = item.shippedQty || 0;
          const availableQty = Math.max(0, (item.producedQty || 0) - shippedCount);

          const matchingWOs = (workOrders || []).filter(
            w =>
              (w.salesOrderId === order.id || w.salesOrderNumber === order.orderNumber) &&
              !w.isSubAssembly &&
              !w.isComplaintReplacement &&
              (w.itemIndex !== undefined
                ? w.itemIndex === itemIdx
                : (w.productId && item.productId
                  ? w.productId === item.productId && (w.variantId && item.variantId ? w.variantId === item.variantId : true)
                  : w.productName === item.productName))
          );

          const activeDOs = contextDeliveryOrders || [];

          for (let u = 1; u <= item.qty; u++) {
            let unitWO = matchingWOs.find(w => w.unitIndex === u) || matchingWOs[u - 1];
            let isShipped = false;
            if (unitWO && unitWO.spkNumber) {
              isShipped = activeDOs.some(d =>
                d.status !== 'FAILED' &&
                (d.orderItems || []).some(
                  oi =>
                    (oi.orderId === order.id || oi.orderNumber === order.orderNumber) &&
                    oi.spkNumber === unitWO.spkNumber
                )
              );
            }
            if (!isShipped) {
              isShipped = activeDOs.some(d =>
                d.status !== 'FAILED' &&
                (d.orderItems || []).some(
                  oi =>
                    (oi.orderId === order.id || oi.orderNumber === order.orderNumber) &&
                    oi.itemIndex === itemIdx &&
                    oi.unitIndex === u
                )
              );
            }

            let unitStatus: 'READY' | 'IN_PRODUCTION' | 'SHIPPED';
            if (unitWO) {
              if (isShipped) {
                unitStatus = 'SHIPPED';
              } else if (unitWO.status === 'COMPLETED') {
                unitStatus = 'READY';
              } else {
                unitStatus = 'IN_PRODUCTION';
              }
            } else {
              if (isShipped || u <= shippedCount) {
                unitStatus = 'SHIPPED';
              } else if (u <= shippedCount + availableQty) {
                unitStatus = 'READY';
              } else {
                unitStatus = 'IN_PRODUCTION';
              }
            }

            allUnits.push({
              key: `${order.id}__${itemIdx}__${u}`,
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customer.name,
              customerPhone: order.customer.phone,
              customerAddress: order.customer.address || '',
              productName: item.productName,
              variantLabel: item.variantLabel,
              itemIndex: itemIdx,
              unitNumber: u,
              totalOrderedQty: item.qty,
              spkNumber: unitWO?.spkNumber,
              orderCreatedAt: order.createdAt,
              unitStatus,
            });
          }
        });
      }

      // Complaint replacements
      (order.complaints || []).forEach(comp => {
        if ((comp.resolution === 'Penuhi Barang Pengganti' || comp.resolution === 'Kirim Barang Pengganti') && comp.replacementStatus === 'READY_FOR_DELIVERY') {
          (comp.items || []).forEach((ci, ciIdx) => {
            totalOrderUnits += ci.qty;
            const replWO = (workOrders || []).find(
              w => w.complaintId === comp.id && (w.productId ? w.productId === ci.productId : w.productName === ci.productName)
            );
            const reservedUnit = (finishedGoods || [])
              .flatMap(fg => fg.units || [])
              .find(u => u.complaintId === comp.id);

            for (let u = 1; u <= ci.qty; u++) {
              allUnits.push({
                key: `repl__${comp.id}__${ci.productId || ciIdx}__${u}`,
                orderId: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customer.name,
                customerPhone: order.customer.phone,
                customerAddress: order.customer.address || '',
                productName: ci.productName,
                variantLabel: ci.variantLabel,
                itemIndex: -1,
                unitNumber: u,
                totalOrderedQty: ci.qty,
                spkNumber: replWO?.spkNumber || (reservedUnit?.spkNumber ? `${reservedUnit.spkNumber} (Gudang)` : reservedUnit ? 'Stok Gudang' : undefined),
                orderCreatedAt: comp.resolvedAt || order.createdAt,
                unitStatus: 'READY',
                isReplacement: true,
                complaintId: comp.id,
              });
            }
          });
        }
      });

      const readyCount = allUnits.filter(u => u.unitStatus === 'READY').length;
      if (readyCount > 0) {
        groups.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          customerPhone: order.customer.phone,
          customerAddress: order.customer.address || '',
          orderCreatedAt: order.createdAt,
          totalOrderUnitsCount: totalOrderUnits,
          totalReadyUnitsCount: readyCount,
          childUnits: allUnits,
          status: order.status,
        });
      }
    });

    return groups;
  }, [salesOrders, workOrders, contextDeliveryOrders, finishedGoods]);

  // Load Queue data
  const loadQueueData = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const res = await deliveryService.getQueue({ search: filters.search || undefined });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map(mapQueueResponseToOrderGroup);
        setQueueGroups(mapped);
      } else {
        // Use local fallback
        if (!filters.search?.trim()) {
          setQueueGroups(localFallbackQueue);
        } else {
          const q = filters.search.toLowerCase();
          const filtered = localFallbackQueue
            .map(group => {
              const matchOrder =
                group.orderNumber.toLowerCase().includes(q) ||
                group.customerName.toLowerCase().includes(q) ||
                group.customerAddress.toLowerCase().includes(q);
              if (matchOrder) return group;
              const matchingUnits = group.childUnits.filter(
                u =>
                  u.productName.toLowerCase().includes(q) ||
                  (u.variantLabel && u.variantLabel.toLowerCase().includes(q)) ||
                  (u.spkNumber && u.spkNumber.toLowerCase().includes(q))
              );
              if (matchingUnits.length > 0) {
                return { ...group, childUnits: matchingUnits };
              }
              return null;
            })
            .filter(Boolean) as QueueOrderGroup[];
          setQueueGroups(filtered);
        }
      }
    } catch (err) {
      console.warn('Backend queue fetch error, using fallback:', err);
      setQueueGroups(localFallbackQueue);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [filters.search, localFallbackQueue]);

  // Load Trips data for ready-to-ship, in-transit, delivered
  const loadTripsData = useCallback(
    async (pageToLoad: number, append: boolean = false) => {
      if (activeTab === 'queue') return;

      if (append) {
        setIsLoadingMoreTrips(true);
      } else {
        setIsLoadingTrips(true);
      }

      const statusParam =
        activeTab === 'ready-to-ship'
          ? 'READY_TO_SHIP'
          : activeTab === 'in-transit'
            ? 'IN_TRANSIT'
            : 'DELIVERED, FAILED';

      try {
        const res = await deliveryService.getDeliveryOrders({
          page: pageToLoad,
          per_page: 20,
          status: statusParam,
          search: filters.search || undefined,
          driver_id: filters.driver_id ? Number(filters.driver_id) : undefined,
        });

        if (res.success && Array.isArray(res.data)) {
          const newItems = res.data;
          setTripsData(prev => {
            const next = append ? [...prev, ...newItems] : newItems;
            const total = res.meta?.total ?? (res as any).pagination?.total ?? next.length;
            setHasMoreTrips(next.length < total && newItems.length > 0);
            return next;
          });
          setCurrentPage(pageToLoad);
        } else {
          // If backend list is empty, fallback to context delivery orders
          if (!append) {
            setTripsData(contextDeliveryOrders as any);
            setHasMoreTrips(false);
          }
        }
      } catch (err) {
        console.warn('Failed to load delivery orders from API:', err);
        if (!append) {
          setTripsData(contextDeliveryOrders as any);
          setHasMoreTrips(false);
        }
      } finally {
        setIsLoadingTrips(false);
        setIsLoadingMoreTrips(false);
      }
    },
    [activeTab, filters.search, filters.driver_id, contextDeliveryOrders]
  );

  // Trigger tab data refresh
  useEffect(() => {
    if (activeTab === 'queue') {
      setVisibleQueueCount(20);
      loadQueueData();
    } else {
      setCurrentPage(1);
      loadTripsData(1, false);
    }
  }, [activeTab, filters.search, filters.driver_id]);

  // Progressive infinite scroll for queue
  const hasMoreQueue = visibleQueueCount < queueGroups.length;
  const handleLoadMoreQueue = useCallback(() => {
    setVisibleQueueCount(prev => prev + 20);
  }, []);
  const displayQueueGroups = useMemo(() => {
    return queueGroups.slice(0, visibleQueueCount);
  }, [queueGroups, visibleQueueCount]);

  // Infinite scroll load more handler for trips
  const handleLoadMoreTrips = useCallback(() => {
    if (!hasMoreTrips || isLoadingTrips || isLoadingMoreTrips) return;
    loadTripsData(currentPage + 1, true);
  }, [hasMoreTrips, isLoadingTrips, isLoadingMoreTrips, currentPage, loadTripsData]);

  // Group trips
  const tripGroups = useMemo<DeliveryTripGroup[]>(() => {
    return buildTripGroups(tripsData);
  }, [tripsData]);

  // Filtered trips for active tab
  const displayTrips = useMemo(() => {
    if (activeTab === 'ready-to-ship') {
      return tripGroups.filter(g => g.isReadyToShip);
    }
    if (activeTab === 'in-transit') {
      return tripGroups.filter(g => g.isInTransit);
    }
    if (activeTab === 'delivered') {
      return tripGroups.filter(g => g.isAllDelivered);
    }
    return [];
  }, [tripGroups, activeTab]);

  // Queue Selection computations
  const allVisibleUnits = useMemo(() => {
    return queueGroups.flatMap(g => g.childUnits.filter(u => u.unitStatus === 'READY'));
  }, [queueGroups]);

  const selectedUnitsList = useMemo(() => {
    return allVisibleUnits.filter(u => !!selectedUnitKeys[u.key]);
  }, [allVisibleUnits, selectedUnitKeys]);

  const distinctSelectedOrdersCount = useMemo(() => {
    return new Set(selectedUnitsList.map(u => u.orderNumber)).size;
  }, [selectedUnitsList]);

  const totalReadyUnitsCount = useMemo(() => {
    return queueGroups.reduce((acc, g) => acc + g.totalReadyUnitsCount, 0);
  }, [queueGroups]);

  const areAllVisibleSelected =
    allVisibleUnits.length > 0 && allVisibleUnits.every(u => !!selectedUnitKeys[u.key]);
  const someVisibleSelected =
    allVisibleUnits.some(u => !!selectedUnitKeys[u.key]);

  const toggleSelectAllVisible = () => {
    if (areAllVisibleSelected) {
      setSelectedUnitKeys(prev => {
        const next = { ...prev };
        allVisibleUnits.forEach(u => delete next[u.key]);
        return next;
      });
    } else {
      setSelectedUnitKeys(prev => {
        const next = { ...prev };
        allVisibleUnits.forEach(u => (next[u.key] = true));
        return next;
      });
    }
  };

  const toggleUnitSelection = (key: string) => {
    setSelectedUnitKeys(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleGroupSelection = (group: QueueOrderGroup) => {
    const readyUnitKeys = group.childUnits.filter(u => u.unitStatus === 'READY').map(u => u.key);
    const isAllSelected = readyUnitKeys.length > 0 && readyUnitKeys.every(k => !!selectedUnitKeys[k]);

    setSelectedUnitKeys(prev => {
      const next = { ...prev };
      readyUnitKeys.forEach(k => {
        if (isAllSelected) {
          delete next[k];
        } else {
          next[k] = true;
        }
      });
      return next;
    });
  };

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds(prev => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const isAllExpanded = queueGroups.length > 0 && queueGroups.every(g => !!expandedOrderIds[g.orderId]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedOrderIds({});
    } else {
      const next: Record<string, boolean> = {};
      queueGroups.forEach(g => (next[g.orderId] = true));
      setExpandedOrderIds(next);
    }
  };

  // Submit new Surat Jalan
  const handleCreateSuratJalanSubmit = async (data: {
    driverId?: number;
    driverName: string;
    driverPhone?: string;
    armadaId?: number;
    armadaName?: string;
    vehiclePlate: string;
    scheduledDate: string;
    notes?: string;
  }) => {
    if (selectedUnitsList.length === 0) {
      toast.error('Pilih minimal satu unit untuk diterbitkan Surat Jalan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedUnits: SelectedUnitItemPayload[] = selectedUnitsList.map(u => ({
        sales_order_id: Number(u.orderId),
        sales_order_number: u.orderNumber,
        sales_order_item_id: u.salesOrderItemId,
        unit_index: u.unitNumber,
        unit_number: u.unitNumber,
        item_index: u.itemIndex,
        spk_number: u.spkNumber,
        product_id: u.productId,
        variant_id: u.variantId,
        product_name: u.productName,
        variant_label: u.variantLabel,
        qty: 1,
        is_replacement: u.isReplacement,
        complaint_id: u.complaintId,
      }));

      const payload: CreateDeliveryOrderPayload = {
        selected_units: selectedUnits,
        selected_items: selectedUnits,
        sales_order_ids: Array.from(new Set(selectedUnits.map(u => u.sales_order_id))),
        driver_id: data.driverId,
        driver_name: data.driverName,
        driver_phone: data.driverPhone,
        vehicle_id: data.armadaId,
        armada_id: data.armadaId,
        armada_name: data.armadaName,
        vehicle_plate: data.vehiclePlate,
        scheduled_date: data.scheduledDate,
        notes: data.notes,
      };

      const res = await deliveryService.createDeliveryOrder(payload);

      // Context sync
      if (contextCreateDeliveryOrder) {
        contextCreateDeliveryOrder({
          salesOrderIds: Array.from(new Set(selectedUnitsList.map(i => i.orderId))),
          selectedItems: selectedUnitsList.map(u => ({
            orderId: u.orderId,
            orderNumber: u.orderNumber,
            customerName: u.customerName,
            customerAddress: u.customerAddress,
            productName: u.productName,
            variantLabel: u.variantLabel,
            qty: 1,
            itemIndex: u.itemIndex,
            unitIndex: u.unitNumber,
            spkNumber: u.spkNumber,
            isReplacement: u.isReplacement,
            complaintId: u.complaintId,
          })),
          driverId: data.driverId ? String(data.driverId) : undefined,
          driverName: data.driverName,
          driverPhone: data.driverPhone,
          armadaId: data.armadaId ? String(data.armadaId) : undefined,
          armadaName: data.armadaName,
          vehiclePlate: data.vehiclePlate,
          scheduledDate: data.scheduledDate,
          notes: data.notes,
        });
      }

      toast.success('Surat Jalan berhasil diterbitkan dan masuk ke daftar Siap Kirim.');
      setSelectedUnitKeys({});
      setShowCreateModal(false);
      loadCounts();
      setActiveTab('ready-to-ship');
    } catch (err: any) {
      console.error('Error creating delivery order:', err);
      toast.error(err?.response?.data?.message || 'Gagal menerbitkan Surat Jalan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm loading goods
  const handleConfirmLoadingSubmit = async (tripId: string) => {
    setIsSubmitting(true);
    try {
      await deliveryService.confirmTripLoading(tripId, { loaded_by: currentUser?.name || 'Driver' });

      // Context sync
      if (contextConfirmLoadingDelivery) {
        contextConfirmLoadingDelivery(tripId, currentUser?.name || 'Driver');
      }

      toast.success('Barang berhasil dimuat! Status kloter kini Dalam Perjalanan.');
      setLoadingTripId(null);
      loadCounts();
      setActiveTab('in-transit');
    } catch (err: any) {
      console.error('Error confirming trip loading:', err);
      // Fallback
      if (contextConfirmLoadingDelivery) {
        contextConfirmLoadingDelivery(tripId, currentUser?.name || 'Driver');
      }
      toast.success('Barang berhasil dimuat! Status kloter kini Dalam Perjalanan.');
      setLoadingTripId(null);
      loadCounts();
      setActiveTab('in-transit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find active trip for Loading modal
  const activeLoadingTrip = useMemo(() => {
    if (!loadingTripId) return null;
    return tripGroups.find(
      g => g.tripId === loadingTripId || g.deliveryOrders.some(d => d.id === loadingTripId)
    ) || null;
  }, [loadingTripId, tripGroups]);

  // Tab definitions
  const tabOptions: SegmentOption<TabKey>[] = [
    {
      key: 'queue',
      label: 'Antrean Kirim',
      count: statusCounts.queue,
      icon: Clock,
    },
    {
      key: 'ready-to-ship',
      label: 'Siap Kirim',
      count: statusCounts.ready_to_ship,
      icon: PackageCheck,
    },
    {
      key: 'in-transit',
      label: 'Dalam Perjalanan',
      count: statusCounts.in_transit,
      icon: Truck,
    },
    {
      key: 'delivered',
      label: 'Terkirim',
      icon: CheckCircle2,
      count: statusCounts.delivered + statusCounts.failed,
    },
  ];

  // Distinct drivers options for filtering (sends driver_id)
  const driverFilterOptions = useMemo(() => {
    return driverOptions.map(d => ({
      value: String(d.id),
      label: d.name,
    }));
  }, [driverOptions]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader title="Pengiriman & Surat Jalan">
        <div className="flex items-center gap-2">
          {canConfig && (
            <Link href="/delivery/config">
              <Button variant="outline">
                <Settings className="h-4 w-4" />
                Konfigurasi
              </Button>
            </Link>
          )}
        </div>
      </PageHeader>

      {/* Tabs & Search Filter */}
      <SegmentedControl
        options={tabOptions}
        value={activeTab}
        onChange={tab => {
          setActiveTab(tab as TabKey);
        }}
        filterValue={filters.driver_id || ''}
        onFilterChange={val => setFilter('driver_id', val)}
        filterPlaceholder="Semua Driver"
        filterOptions={driverFilterOptions}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Cari surat jalan, order, pelanggan, produk..."
      />

      {/* Tab 1: Antrean Kirim */}
      {activeTab === 'queue' && (
        <QueueSection
          displayOrderGroups={displayQueueGroups}
          totalReadyUnitsCount={totalReadyUnitsCount}
          totalOrdersCount={queueGroups.length}
          selectedUnitsList={selectedUnitsList}
          selectedUnitKeys={selectedUnitKeys}
          expandedOrderIds={expandedOrderIds}
          searchTerm={filters.search}
          isLoading={isLoadingQueue}
          hasMore={hasMoreQueue}
          onLoadMore={handleLoadMoreQueue}
          canCreate={canCreate}
          onToggleExpandOrder={toggleExpandOrder}
          onToggleExpandAll={toggleExpandAll}
          isAllExpanded={isAllExpanded}
          onToggleUnitSelection={toggleUnitSelection}
          onToggleGroupSelection={toggleGroupSelection}
          onToggleSelectAllVisible={toggleSelectAllVisible}
          onClearSelection={() => setSelectedUnitKeys({})}
          onOpenCreateModal={() => setShowCreateModal(true)}
          areAllVisibleSelected={areAllVisibleSelected}
          someVisibleSelected={someVisibleSelected}
          distinctSelectedOrdersCount={distinctSelectedOrdersCount}
        />
      )}

      {/* Tab 2, 3, 4: Ready to Ship, In Transit, Delivered */}
      {activeTab !== 'queue' && (
        <TripSection
          activeTab={activeTab}
          trips={displayTrips}
          currentUserName={currentUser?.name}
          searchTerm={filters.search}
          isLoading={isLoadingTrips}
          isLoadingMore={isLoadingMoreTrips}
          hasMore={hasMoreTrips}
          onLoadMore={handleLoadMoreTrips}
          onOpenLoadingModal={id => setLoadingTripId(id)}
          canDispatch={canDispatch}
        />
      )}

      {/* Modal 1: Form Penerbitan Surat Jalan */}
      <CreateSuratJalanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        selectedUnitsList={selectedUnitsList}
        onSubmit={handleCreateSuratJalanSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Modal 2: Konfirmasi Muat Barang */}
      <ConfirmLoadingModal
        isOpen={Boolean(loadingTripId && activeLoadingTrip)}
        trip={activeLoadingTrip}
        onClose={() => setLoadingTripId(null)}
        onConfirm={handleConfirmLoadingSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat Delivery...</div>}>
      <DeliveryContent />
    </Suspense>
  );
}
