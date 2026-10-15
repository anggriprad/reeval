'use client';

import React, { useState, useMemo, Suspense, useRef } from 'react';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl, SegmentOption } from '@/components/ui/SegmentedControl';
import { formatDate, formatDateTime, cn, formatPhoneDisplay, getWhatsAppUrl } from '@/lib/utils';
import {
  Truck,
  FileText,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Settings,
  PackageCheck,
  Image as ImageIcon,
  Clock,
  UserCheck,
  X,
  ChevronDown,
  ChevronRight,
  Phone,
  ExternalLink,
  Package,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@/lib/types';

type TabKey = 'queue' | 'ready-to-ship' | 'in-transit' | 'delivered';

export interface ChildUnitItem {
  key: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  productName: string;
  variantLabel?: string;
  itemIndex: number;
  unitNumber: number;
  totalOrderedQty: number;
  spkNumber?: string;
  orderCreatedAt: string;
  unitStatus: 'READY' | 'IN_PRODUCTION' | 'SHIPPED';
  isReplacement?: boolean;
  complaintId?: string;
}

export interface QueueOrderGroup {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  orderCreatedAt: string;
  totalOrderUnitsCount: number;
  totalReadyUnitsCount: number;
  childUnits: ChildUnitItem[];
  status: OrderStatus;
}

export interface DeliveryTripGroup {
  tripId: string;
  tripNumber: string;
  driverId?: string;
  driverName: string;
  driverPhone?: string;
  armadaId?: string;
  armadaName?: string;
  vehiclePlate: string;
  scheduledDate: string;
  notes?: string;
  loadedAt?: string;
  loadedBy?: string;
  createdAt: string;
  deliveryOrders: any[];
  totalUnitsCount: number;
  totalDestinationsCount: number;
  deliveredCount: number;
  failedCount?: number;
  completedCount?: number;
  isAllDelivered: boolean;
  isReadyToShip: boolean;
  isInTransit: boolean;
}

const DEFAULT_MOCK_PHOTOS = {
  'photo-1': {
    title: 'Unit di Lokasi Pelanggan',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e293b"/><rect x="80" y="160" width="440" height="160" rx="8" fill="%23334155"/><rect x="100" y="180" width="400" height="110" rx="6" fill="%23475569"/><text x="300" y="240" fill="%23ffffff" font-size="18" font-family="sans-serif" font-weight="bold" text-anchor="middle">REEVAL FURNITURE — UNIT TIBA DI LOKASI</text><text x="300" y="270" fill="%2394a3b8" font-size="13" font-family="sans-serif" text-anchor="middle">Dokumentasi Serah Terima Barang di Lokasi Pelanggan</text><circle cx="530" cy="50" r="24" fill="%2310b981"/><path d="M522 50l6 6 12-12" stroke="%23ffffff" stroke-width="3" fill="none"/></svg>',
  },
  'photo-2': {
    title: 'Tanda Tangan Surat Jalan',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23f8fafc"/><rect x="40" y="40" width="520" height="320" rx="8" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="2"/><text x="300" y="90" fill="%230f172a" font-size="18" font-family="sans-serif" font-weight="bold" text-anchor="middle">SURAT JALAN PENGIRIMAN — TANDA TANGAN PENERIMA</text><line x1="80" y1="120" x2="520" y2="120" stroke="%23e2e8f0" stroke-width="2"/><path d="M120 260 Q 200 180, 280 250 T 440 220" stroke="%232563eb" stroke-width="4" fill="none"/><text x="300" y="290" fill="%2364748b" font-size="13" font-family="sans-serif" text-anchor="middle">Cap Basah &amp; Tanda Tangan Penerima Sah</text><circle cx="520" cy="80" r="18" fill="%2310b981"/><path d="M514 80l4 4 8-8" stroke="%23ffffff" stroke-width="2.5" fill="none"/></svg>',
  },
};

function DeliveryContent() {
  const {
    salesOrders,
    deliveryOrders,
    currentUser,
    armadas,
    drivers,
    workOrders,
    finishedGoods,
    createDeliveryOrder,
    confirmLoadingDelivery,
    confirmDelivery,
  } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useUrlTab(
    ['queue', 'ready-to-ship', 'in-transit', 'delivered'] as const,
    currentUser.role === 'DRIVER' ? 'ready-to-ship' : 'queue'
  );

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState<string | null>(null);

  // Accordion state in Create Surat Jalan modal
  const [expandedCreateOrderIds, setExpandedCreateOrderIds] = useState<Record<string, boolean>>({});

  const toggleCreateOrderExpand = (orderId: string) => {
    setExpandedCreateOrderIds(prev => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState('');

  // Fallback defaults for configuration master data
  const availableDrivers = useMemo(() => {
    if (drivers && drivers.length > 0) return drivers;
    return [
      { id: 'drv-1', name: 'Hasan Basri', phone: '081234567890' },
      { id: 'drv-2', name: 'Budi Santoso', phone: '081298765432' },
      { id: 'drv-3', name: 'Asep Supriyatna', phone: '081211223344' },
    ];
  }, [drivers]);

  const availableArmadas = useMemo(() => {
    if (armadas && armadas.length > 0) return armadas;
    return [
      { id: 'arm-1', name: 'Engkel Box', plateNumber: 'B 1234 CD' },
      { id: 'arm-2', name: 'Grand Max Blind Van', plateNumber: 'B 5678 EF' },
      { id: 'arm-3', name: 'L300 Pickup', plateNumber: 'B 9012 GH' },
    ];
  }, [armadas]);

  // Checkbox selection in Antrean Kirim (Unit-level selection)
  const [selectedUnitKeys, setSelectedUnitKeys] = useState<Record<string, boolean>>({});

  // Accordion state for SO rows
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  // Create DO form state (Driver, Armada, Date, Notes)
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedArmadaId, setSelectedArmadaId] = useState('');
  const [customVehiclePlate, setCustomVehiclePlate] = useState('');
  const [scheduledShipDate, setScheduledShipDate] = useState(new Date().toISOString().split('T')[0]);
  const [shipmentNotes, setShipmentNotes] = useState('');

  // Filter Sales Orders in "Antrean Kirim": Grouped by Sales Order, showing all units with their respective production/shipping status
  const queueOrderGroups = useMemo<QueueOrderGroup[]>(() => {
    const groups: QueueOrderGroup[] = [];

    const relevantOrders = salesOrders.filter(o => {
      if (o.status === 'PENDING' || o.status === 'CANCELED') return false;
      if (o.status !== 'SENT') return true;
      // Safeguard: Jika SO berstatus SENT tetapi sebenarnya masih ada item yang belum terpenuhi (deliveredQty < qty)
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

          // Find matching WOs strictly for this specific item in this Sales Order
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

          const activeDOs = deliveryOrders || [];

          // Generate all ordered units: completed (ready), shipped, or in production
          for (let u = 1; u <= item.qty; u++) {
            // Find 1-to-1 work order for this unit
            let unitWO = matchingWOs.find(w => w.unitIndex === u);
            if (!unitWO) {
              unitWO = matchingWOs[u - 1];
            }

            // Determine if this unit has already been shipped or included in an active DO
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
              // Unit status strictly reflects whether it is already dispatched or its SPK completion
              if (isShipped) {
                unitStatus = 'SHIPPED';
              } else if (unitWO.status === 'COMPLETED') {
                unitStatus = 'READY';
              } else {
                unitStatus = 'IN_PRODUCTION';
              }
            } else {
              // Fallback for items without individual work orders (e.g. ready-stock items)
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

      // Unit penggantian dari komplain pelanggan yang siap kirim
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

      // An SO appears in Antrean Kirim as long as it has at least 1 unit ready to ship!
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
  }, [salesOrders, workOrders, deliveryOrders]);

  // Groups filtered by search term
  const displayOrderGroups = useMemo(() => {
    if (!searchTerm.trim()) return queueOrderGroups;
    const q = searchTerm.toLowerCase();
    return queueOrderGroups
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
          return {
            ...group,
            childUnits: matchingUnits,
          };
        }

        return null;
      })
      .filter(Boolean) as QueueOrderGroup[];
  }, [queueOrderGroups, searchTerm]);

  // Flat list of all visible ready units (only READY units can be selected)
  const allVisibleUnits = useMemo(() => {
    return displayOrderGroups.flatMap(g => g.childUnits.filter(u => u.unitStatus === 'READY'));
  }, [displayOrderGroups]);

  // All ready units in entire system
  const allReadyUnits = useMemo(() => {
    return queueOrderGroups.flatMap(g => g.childUnits.filter(u => u.unitStatus === 'READY'));
  }, [queueOrderGroups]);

  // Total ready units count across all SOs
  const totalReadyUnitsCount = useMemo(() => {
    return queueOrderGroups.reduce((acc, g) => acc + g.totalReadyUnitsCount, 0);
  }, [queueOrderGroups]);

  // Selected units list
  const selectedUnitsList = useMemo(() => {
    return allReadyUnits.filter(u => !!selectedUnitKeys[u.key]);
  }, [allReadyUnits, selectedUnitKeys]);

  const distinctSelectedOrders = useMemo(() => {
    return Array.from(new Set(selectedUnitsList.map(u => u.orderNumber)));
  }, [selectedUnitsList]);

  // Distinct orders list for Modal Surat Jalan
  const selectedOrdersList = useMemo(() => {
    const map = new Map<
      string,
      {
        orderId: string;
        orderNumber: string;
        customerName: string;
        customerPhone?: string;
        customerAddress: string;
      }
    >();

    selectedUnitsList.forEach(item => {
      if (!map.has(item.orderId)) {
        map.set(item.orderId, {
          orderId: item.orderId,
          orderNumber: item.orderNumber,
          customerName: item.customerName,
          customerPhone: item.customerPhone,
          customerAddress: item.customerAddress,
        });
      }
    });

    return Array.from(map.values());
  }, [selectedUnitsList]);


  // Group DOs into Trip / Kloter groups
  const tripGroups = useMemo<DeliveryTripGroup[]>(() => {
    const map = new Map<string, DeliveryTripGroup>();

    deliveryOrders.forEach(d => {
      const tripKey = d.tripId || d.id;
      const tripNumber = d.tripNumber || d.doNumber;

      if (!map.has(tripKey)) {
        map.set(tripKey, {
          tripId: tripKey,
          tripNumber,
          driverId: d.driverId,
          driverName: d.assignedDriverName,
          driverPhone: d.driverPhone,
          armadaId: d.armadaId,
          armadaName: d.armadaName,
          vehiclePlate: d.vehiclePlate,
          scheduledDate: d.scheduledDate,
          notes: d.notes,
          loadedAt: d.loadedAt,
          loadedBy: d.loadedBy,
          createdAt: d.createdAt,
          deliveryOrders: [],
          totalUnitsCount: 0,
          totalDestinationsCount: 0,
          deliveredCount: 0,
          isAllDelivered: false,
          isReadyToShip: false,
          isInTransit: false,
        });
      }

      const group = map.get(tripKey)!;
      group.deliveryOrders.push(d);

      const doUnits = d.orderItems && d.orderItems.length > 0
        ? d.orderItems.reduce((acc, i) => acc + (i.qty || 1), 0)
        : d.items.length;
      group.totalUnitsCount += doUnits;

      if (d.status === 'DELIVERED') {
        group.deliveredCount += 1;
      }
      if (d.status === 'FAILED') {
        group.failedCount = (group.failedCount || 0) + 1;
      }
      if (d.loadedAt && !group.loadedAt) {
        group.loadedAt = d.loadedAt;
        group.loadedBy = d.loadedBy;
      }
    });

    return Array.from(map.values()).map(group => {
      const totalDOs = group.deliveryOrders.length;
      const completedCount = group.deliveryOrders.filter(d => d.status === 'DELIVERED' || d.status === 'FAILED').length;
      const isAllCompleted = totalDOs > 0 && completedCount === totalDOs;
      const isReadyToShip = group.deliveryOrders.every(d => d.status === 'READY_TO_SHIP' || d.status === 'PENDING');
      const isInTransit = !isReadyToShip && !isAllCompleted;

      group.totalDestinationsCount = group.deliveryOrders.length;
      group.isAllDelivered = isAllCompleted;
      group.isReadyToShip = isReadyToShip;
      group.isInTransit = isInTransit;
      group.completedCount = completedCount;

      return group;
    });
  }, [deliveryOrders]);

  const readyToShipTrips = useMemo(() => {
    return tripGroups.filter(g => g.isReadyToShip);
  }, [tripGroups]);

  const inTransitTrips = useMemo(() => {
    return tripGroups.filter(g => g.isInTransit);
  }, [tripGroups]);

  const deliveredTrips = useMemo(() => {
    return tripGroups.filter(g => g.isAllDelivered);
  }, [tripGroups]);

  // Filter trip groups by search and driver
  const filterTripList = (trips: DeliveryTripGroup[]) => {
    let list = trips;
    if (driverFilter) {
      list = list.filter(t => t.driverName === driverFilter);
    }
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      t =>
        t.tripNumber.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q) ||
        t.vehiclePlate.toLowerCase().includes(q) ||
        t.deliveryOrders.some(
          d =>
            d.doNumber.toLowerCase().includes(q) ||
            d.salesOrderNumber.toLowerCase().includes(q) ||
            d.customerName.toLowerCase().includes(q) ||
            (d.customerAddress && d.customerAddress.toLowerCase().includes(q))
        )
    );
  };

  const displayReadyToShipTrips = filterTripList(readyToShipTrips);
  const displayInTransitTrips = filterTripList(inTransitTrips);
  const displayDeliveredTrips = filterTripList(deliveredTrips);

  // Active items being modified in modal
  const loadingTrip = tripGroups.find(
    g => g.tripId === showLoadingModal || g.deliveryOrders.some(d => d.id === showLoadingModal)
  );

  // Checkbox state for loading confirmation (item level checklist)
  const [checkedLoadingItemKeys, setCheckedLoadingItemKeys] = useState<Record<string, boolean>>({});

  const kloterLoadingItems = useMemo(() => {
    if (!loadingTrip) return [];
    const items: Array<{
      key: string;
      productName: string;
      variantLabel?: string;
      qty: number;
      spkNumber?: string;
      customerName: string;
      customerAddress?: string;
      salesOrderNumber: string;
    }> = [];

    loadingTrip.deliveryOrders.forEach(dOrder => {
      if (dOrder.orderItems && dOrder.orderItems.length > 0) {
        dOrder.orderItems.forEach((oi: any, itemIdx: number) => {
          const fallbackWO = (workOrders || []).find(
            w =>
              (w.salesOrderId === dOrder.salesOrderId || w.salesOrderNumber === dOrder.salesOrderNumber) &&
              (oi.itemIndex !== undefined ? w.itemIndex === oi.itemIndex : w.productName === oi.productName)
          );
          const spkNum = oi.spkNumber || fallbackWO?.spkNumber;

          items.push({
            key: `${dOrder.id}__item_${itemIdx}`,
            productName: oi.productName,
            variantLabel: oi.variantLabel,
            qty: oi.qty || 1,
            spkNumber: spkNum,
            customerName: dOrder.customerName,
            customerAddress: dOrder.customerAddress,
            salesOrderNumber: oi.orderNumber || dOrder.salesOrderNumber,
          });
        });
      } else {
        dOrder.items.forEach((itName: string, itemIdx: number) => {
          const fallbackWO = (workOrders || []).find(
            w =>
              (w.salesOrderId === dOrder.salesOrderId || w.salesOrderNumber === dOrder.salesOrderNumber) &&
              (itName.includes(w.productName) || w.productName.includes(itName))
          );
          items.push({
            key: `${dOrder.id}__legacy_${itemIdx}`,
            productName: itName,
            qty: 1,
            spkNumber: fallbackWO?.spkNumber,
            customerName: dOrder.customerName,
            customerAddress: dOrder.customerAddress,
            salesOrderNumber: dOrder.salesOrderNumber,
          });
        });
      }
    });

    return items;
  }, [loadingTrip, workOrders]);

  const isAllLoadingItemsChecked =
    kloterLoadingItems.length > 0 &&
    kloterLoadingItems.every(item => !!checkedLoadingItemKeys[item.key]);

  const checkedLoadingCount = kloterLoadingItems.filter(item => !!checkedLoadingItemKeys[item.key]).length;

  const toggleLoadingItem = (key: string) => {
    setCheckedLoadingItemKeys(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllLoadingItems = () => {
    if (isAllLoadingItemsChecked) {
      setCheckedLoadingItemKeys({});
    } else {
      const next: Record<string, boolean> = {};
      kloterLoadingItems.forEach(i => {
        next[i.key] = true;
      });
      setCheckedLoadingItemKeys(next);
    }
  };

  // Toggle individual unit selection
  const toggleUnitSelection = (key: string) => {
    setSelectedUnitKeys(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle parent SO group selection (all ready units in that SO)
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

  // Master select all state
  const areAllVisibleSelected =
    allVisibleUnits.length > 0 && allVisibleUnits.every(u => !!selectedUnitKeys[u.key]);
  const someVisibleSelected =
    allVisibleUnits.some(u => !!selectedUnitKeys[u.key]);

  const toggleSelectAllVisible = () => {
    if (areAllVisibleSelected) {
      // Unselect all visible units
      setSelectedUnitKeys(prev => {
        const next = { ...prev };
        allVisibleUnits.forEach(u => {
          delete next[u.key];
        });
        return next;
      });
    } else {
      // Select all visible units
      setSelectedUnitKeys(prev => {
        const next = { ...prev };
        allVisibleUnits.forEach(u => {
          next[u.key] = true;
        });
        return next;
      });
    }
  };

  // Toggle expand/collapse single SO row
  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds(prev => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Toggle expand all / collapse all
  const isAllExpanded = displayOrderGroups.length > 0 && displayOrderGroups.every(g => !!expandedOrderIds[g.orderId]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedOrderIds({});
    } else {
      const next: Record<string, boolean> = {};
      displayOrderGroups.forEach(g => {
        next[g.orderId] = true;
      });
      setExpandedOrderIds(next);
    }
  };

  // Open Create Modal (pre-sets initial driver and armada)
  const openCreateModal = () => {
    if (selectedUnitsList.length === 0) return;

    const initialDriver = availableDrivers[0];
    const initialArmada = availableArmadas[0];

    setSelectedDriverId(initialDriver?.id || '');
    setSelectedArmadaId(initialArmada?.id || '');
    setCustomVehiclePlate(initialArmada?.plateNumber || '');
    setScheduledShipDate(new Date().toISOString().split('T')[0]);
    // Deteksi otomatis jika ada unit penggantian komplain yang memerlukan tukar guling (tarik barang)
    const tukarGulingUnits = selectedUnitsList.filter(u => {
      if (!u.isReplacement || !u.complaintId) return false;
      const order = salesOrders.find(o => o.id === u.orderId);
      const cmp = order?.complaints?.find(c => c.id === u.complaintId);
      return cmp?.isReturnRequested;
    });

    if (tukarGulingUnits.length > 0) {
      setShipmentNotes('[TUKAR GULING] Tarik barang komplain/retur fisik dari pelanggan saat serah terima barang baru.');
    } else {
      setShipmentNotes('');
    }
    setExpandedCreateOrderIds({});
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  // Handle Armada selection change
  const handleArmadaChange = (armadaId: string) => {
    setSelectedArmadaId(armadaId);
    const found = availableArmadas.find(a => a.id === armadaId);
    if (found) {
      setCustomVehiclePlate(found.plateNumber);
    }
  };

  // Submit new Surat Jalan
  const handleCreateSuratJalan = () => {
    if (selectedUnitsList.length === 0) {
      toast.error('Pilih minimal satu unit untuk diterbitkan Surat Jalan.');
      return;
    }

    const driverObj = availableDrivers.find(d => d.id === selectedDriverId) || availableDrivers[0];
    const armadaObj = availableArmadas.find(a => a.id === selectedArmadaId);
    const vehiclePlate = customVehiclePlate.trim() || armadaObj?.plateNumber || 'B 1234 CD';

    const selectedOrderIds = Array.from(new Set(selectedUnitsList.map(i => i.orderId)));

    createDeliveryOrder({
      salesOrderIds: selectedOrderIds,
      selectedItems: selectedUnitsList.map(u => ({
        orderId: u.orderId,
        orderNumber: u.orderNumber,
        customerName: u.customerName,
        customerAddress: u.customerAddress,
        productName: u.productName,
        variantLabel: u.variantLabel,
        qty: 1, // each row represents 1 finished physical unit
        itemIndex: u.itemIndex,
        unitIndex: u.unitNumber,
        spkNumber: u.spkNumber,
        isReplacement: u.isReplacement,
        complaintId: u.complaintId,
      })),
      driverId: driverObj?.id,
      driverName: driverObj?.name || 'Driver Pengirim',
      driverPhone: driverObj?.phone,
      armadaId: armadaObj?.id,
      armadaName: armadaObj?.name,
      vehiclePlate,
      scheduledDate: scheduledShipDate,
      notes: shipmentNotes,
    });

    toast.success('Surat Jalan berhasil diterbitkan dan masuk ke daftar Siap Kirim.');
    setSelectedUnitKeys({});
    closeCreateModal();
    setActiveTab('ready-to-ship');
  };

  // Confirm loading goods (Muat Barang)
  const handleConfirmLoading = () => {
    if (!showLoadingModal) return;
    confirmLoadingDelivery(showLoadingModal, currentUser.name);
    toast.success('Barang berhasil dimuat! Status kloter kini Dalam Perjalanan.');
    setShowLoadingModal(null);
    setCheckedLoadingItemKeys({});
    setActiveTab('in-transit');
  };

  // Tab definitions matching user workflow
  const tabOptions: SegmentOption<TabKey>[] = [
    {
      key: 'queue',
      label: 'Antrean Kirim',
      count: queueOrderGroups.length,
      icon: Clock,
    },
    {
      key: 'ready-to-ship',
      label: 'Siap Kirim',
      count: readyToShipTrips.length,
      icon: PackageCheck,
    },
    {
      key: 'in-transit',
      label: 'Dalam Perjalanan',
      count: inTransitTrips.length,
      icon: Truck,
    },
    {
      key: 'delivered',
      label: 'Terkirim',
      icon: CheckCircle2,
    },
  ];

  // Distinct drivers for filtering
  const allDriversInSystem = Array.from(
    new Set([
      ...availableDrivers.map(d => d.name),
      ...deliveryOrders.map(d => d.assignedDriverName),
    ])
  ).filter(Boolean);

  const driverFilterOptions = allDriversInSystem.map(name => ({
    value: name,
    label: name,
  }));

  return (
    <div className="space-y-4">
      {/* Page Header (No redundant Terbitkan button here) */}
      <PageHeader
        title="Pengiriman & Surat Jalan"
      >
        <div className="flex items-center gap-2">
          <Link href="/delivery/config">
            <Button variant="outline">
              <Settings className="h-4 w-4" />
              Konfigurasi
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Tabs & Search Filter */}
      <SegmentedControl
        options={tabOptions}
        value={activeTab}
        onChange={tab => {
          setActiveTab(tab as TabKey);
        }}
        filterValue={driverFilter}
        onFilterChange={setDriverFilter}
        filterPlaceholder="Semua Driver"
        filterOptions={driverFilterOptions}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari surat jalan, order, pelanggan, produk..."
      />

      {/* ========================================================================= */}
      {/* TAHAP 1: ANTREAN KIRIM (List Berbasis Sales Order & Unit Produk)          */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {displayOrderGroups.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title={searchTerm ? 'Tidak ada pesanan di antrean kirim yang sesuai pencarian' : 'Belum ada pesanan di antrean kirim'}
                description={
                  searchTerm
                    ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                    : 'Pesanan akan otomatis masuk ke antrean ini setelah unit produk selesai dikerjakan di produksi.'
                }
              />
            </div>
          ) : (
            <>
              {/* Dynamic Header Toolbar: Fixed height h-[52px] */}
              {selectedUnitsList.length > 0 ? (
                <div className="flex items-center justify-between gap-3 px-4 h-[52px] bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      checked={areAllVisibleSelected}
                      indeterminate={someVisibleSelected && !areAllVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      title={areAllVisibleSelected ? 'Batalkan semua pilihan' : 'Pilih semua unit'}
                    />
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        {selectedUnitsList.length} unit dipilih
                      </span>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400">
                        ({distinctSelectedOrders.length} pesanan)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedUnitKeys({})}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={openCreateModal}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                    >
                      Terbitkan Surat Jalan ({selectedUnitsList.length})
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 px-4 h-[52px] bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={false}
                      onChange={toggleSelectAllVisible}
                      title="Pilih semua unit di daftar"
                    />
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Pilih Semua Unit
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={toggleExpandAll}
                      className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {isAllExpanded ? 'Tutup Semua SO' : 'Buka Semua SO'}
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="font-medium">
                      Total: <strong className="text-slate-900 dark:text-white">{totalReadyUnitsCount}</strong> unit siap ({queueOrderGroups.length} pesanan)
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
                        onClick={() => toggleExpandOrder(group.orderId)}
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
                              onChange={() => toggleGroupSelection(group)}
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
                                onClick={() => isReady && toggleUnitSelection(unit.key)}
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
                                      onChange={() => isReady && toggleUnitSelection(unit.key)}
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
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAHAP 2: SIAP KIRIM (Surat Jalan Terbit, Menunggu Driver Muat Barang)     */}
      {/* ========================================================================= */}
      {activeTab === 'ready-to-ship' && (
        <div className="space-y-4">
          {displayReadyToShipTrips.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <EmptyState
                title={searchTerm ? 'Tidak ada trip siap kirim yang sesuai pencarian' : 'Belum ada trip pengiriman siap kirim'}
                description={
                  searchTerm
                    ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                    : 'Pilih produk dari tab "Antrean Kirim" dengan checkbox dan klik "Terbitkan Surat Jalan".'
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {displayReadyToShipTrips.map(trip => {
                const isMyTask = currentUser.name.toLowerCase() === trip.driverName.toLowerCase();

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
                          Jadwal: {formatDate(trip.scheduledDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                          {trip.totalDestinationsCount} Titik (SJ) • {trip.totalUnitsCount} Unit
                        </span>
                        <Badge variant="warning" className="text-[10px]">
                          Menunggu Muat
                        </Badge>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCheckedLoadingItemKeys({});
                            setShowLoadingModal(trip.tripId);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          Muat Barang
                        </Button>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>

                    {/* List Surat Jalan di dalam Trip */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {trip.deliveryOrders.map(dOrder => {
                        const doUnits = dOrder.orderItems && dOrder.orderItems.length > 0
                          ? dOrder.orderItems.reduce((acc: number, i: any) => acc + (i.qty || 1), 0)
                          : dOrder.items.length;

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
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAHAP 3: DALAM PERJALANAN (Driver Sedang Antar Barang ke Titik Penerima)  */}
      {/* ========================================================================= */}
      {activeTab === 'in-transit' && (
        <div className="space-y-4">
          {displayInTransitTrips.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <EmptyState
                title={searchTerm ? 'Tidak ada trip dalam perjalanan yang sesuai pencarian' : 'Tidak ada trip pengiriman yang sedang berjalan'}
                description={
                  searchTerm
                    ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                    : 'Konfirmasi muat barang pada trip di tab "Siap Kirim" untuk memulai perjalanan armada.'
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {displayInTransitTrips.map(trip => {
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
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Berangkat: {trip.loadedAt ? formatDateTime(trip.loadedAt) : formatDate(trip.scheduledDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {(trip.completedCount !== undefined ? trip.completedCount : trip.deliveredCount)} dari {trip.totalDestinationsCount} Selesai • {trip.totalUnitsCount} Unit
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>

                    {/* List Surat Jalan di dalam Trip */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {trip.deliveryOrders.map(dOrder => {
                        const isDelivered = dOrder.status === 'DELIVERED';
                        const isFailed = dOrder.status === 'FAILED';
                        const doUnits = dOrder.orderItems && dOrder.orderItems.length > 0
                          ? dOrder.orderItems.reduce((acc: number, i: any) => acc + (i.qty || 1), 0)
                          : dOrder.items.length;

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
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAHAP 4: TERKIRIM (Selesai, Bukti Serah Terima & Sales Order Terkirim)     */}
      {/* ========================================================================= */}
      {activeTab === 'delivered' && (
        <div className="space-y-4">
          {displayDeliveredTrips.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <EmptyState
                title={searchTerm ? 'Tidak ada trip terkirim yang sesuai pencarian' : 'Belum ada trip pengiriman yang selesai'}
                description={
                  searchTerm
                    ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                    : 'Trip pengiriman akan otomatis berpindah ke sini setelah semua surat jalan di dalamnya selesai diserahterimakan.'
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {displayDeliveredTrips.map(trip => {
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
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Selesai: {formatDate(trip.scheduledDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {trip.totalDestinationsCount} Titik (SJ) • {trip.totalUnitsCount} Unit
                        </span>
                        <Badge variant="success" className="text-[10px]">
                          Selesai
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>

                    {/* List Surat Jalan di dalam Trip */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {trip.deliveryOrders.map(dOrder => {
                        const isDelivered = dOrder.status === 'DELIVERED';
                        const isFailed = dOrder.status === 'FAILED';
                        const doUnits = dOrder.orderItems && dOrder.orderItems.length > 0
                          ? dOrder.orderItems.reduce((acc: number, i: any) => acc + (i.qty || 1), 0)
                          : dOrder.items.length;

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
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FORM PENERBITAN SURAT JALAN                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        title="Penerbitan Surat Jalan"
        size="lg"
        actions={
          <>
            <Button variant="outline" onClick={closeCreateModal}>
              Batal
            </Button>
            <Button
              onClick={handleCreateSuratJalan}
              disabled={selectedOrdersList.length === 0 || !selectedDriverId || !selectedArmadaId}
            >
              Terbitkan Surat Jalan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* List Pesanan & Unit yang Dikirim (Accordion, normal modal scroll) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {selectedOrdersList.map(order => {
              const orderUnits = selectedUnitsList.filter(u => u.orderId === order.orderId);
              const isOrderExpanded = !!expandedCreateOrderIds[order.orderId];

              return (
                <div key={order.orderId} className="transition-colors">
                  {/* Accordion Collapse Row */}
                  <div
                    onClick={() => toggleCreateOrderExpand(order.orderId)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 select-none transition-colors"
                  >
                    <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-start sm:items-center">
                      {/* Info Pesanan */}
                      <div className="sm:col-span-4 min-w-0">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Pesanan
                        </span>
                        <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 block truncate">
                          {order.orderNumber}
                        </span>
                      </div>

                      {/* Pelanggan & Alamat */}
                      <div className="sm:col-span-8 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {order.customerName}
                        </p>
                        <p
                          className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5"
                          title={order.customerAddress}
                        >
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{order.customerAddress || 'Alamat tidak dispesifikasikan'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Unit Count & Chevron */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                      <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                        {orderUnits.length} Unit
                      </span>

                      <div
                        className={cn(
                          'p-1 text-slate-400 transition-transform duration-200 shrink-0',
                          isOrderExpanded ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
                        )}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Accordion Expand: List Produk */}
                  {isOrderExpanded && (
                    <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {orderUnits.map((unit, idx) => (
                          <div
                            key={unit.key || idx}
                            className="py-2 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex items-center gap-2 flex-wrap">
                              {unit.spkNumber && (
                                <span className="font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 border border-slate-300/50 dark:border-slate-600">
                                  {unit.spkNumber}
                                </span>
                              )}
                              <span className="font-medium text-slate-900 dark:text-white">
                                {unit.productName}
                              </span>
                              {unit.variantLabel && (
                                <span className="text-slate-500 dark:text-slate-400">
                                  • {unit.variantLabel}
                                </span>
                              )}
                              {unit.isReplacement ? (
                                <Badge variant="purple" className="text-[10px] px-1.5 py-0">
                                  Penggantian Komplain
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  Unit #{unit.unitNumber}
                                </span>
                              )}
                            </div>
                            <span className="shrink-0 font-medium text-slate-600 dark:text-slate-300">
                              1 Unit
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Form Input Reusable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Pilih driver"
              value={selectedDriverId}
              onChange={e => setSelectedDriverId(e.target.value)}
              options={availableDrivers.map(d => ({
                value: d.id,
                label: `${d.name} (${d.phone})`,
              }))}
              placeholder="Pilih Driver"
            />

            <Select
              label="Pilih armada"
              value={selectedArmadaId}
              onChange={e => handleArmadaChange(e.target.value)}
              options={availableArmadas.map(a => ({
                value: a.id,
                label: `${a.name} (${a.plateNumber})`,
              }))}
              placeholder="Pilih Armada"
            />

            <Input
              type="date"
              label="Jadwal pengiriman"
              value={scheduledShipDate}
              onChange={e => setScheduledShipDate(e.target.value)}
            />

            <Input
              label="Catatan"
              value={shipmentNotes}
              onChange={e => setShipmentNotes(e.target.value)}
              placeholder="Catatan"
            />
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: KONFIRMASI MUAT BARANG (DRIVER / KOORDINATOR)                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!loadingTrip}
        onClose={() => {
          setShowLoadingModal(null);
          setCheckedLoadingItemKeys({});
        }}
        title="Konfirmasi Muat Barang"
        description="Periksa fisik setiap barang yang dinaikkan ke armada. Centang seluruh item sebelum memulai perjalanan."
        size="md"
        actions={
          loadingTrip ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowLoadingModal(null);
                  setCheckedLoadingItemKeys({});
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmLoading}
                disabled={!isAllLoadingItemsChecked}
                className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                Mulai Perjalanan
              </Button>
            </>
          ) : undefined
        }
      >
        {loadingTrip && (
          <div className="space-y-3.5">
            {/* Checklist Header & Progress Bar */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Ceklis Muatan: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{checkedLoadingCount} / {kloterLoadingItems.length}</strong> selesai
                </span>
                <button
                  type="button"
                  onClick={toggleAllLoadingItems}
                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {isAllLoadingItemsChecked ? 'Batalkan Semua' : 'Centang Semua'}
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${kloterLoadingItems.length > 0 ? (checkedLoadingCount / kloterLoadingItems.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Checklist of all items */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {kloterLoadingItems.map(item => {
                const isChecked = !!checkedLoadingItemKeys[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleLoadingItem(item.key)}
                    className={cn(
                      'p-3 flex items-start gap-3 cursor-pointer transition-colors select-none text-xs',
                      isChecked
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleLoadingItem(item.key)}
                      onClick={e => e.stopPropagation()}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                'font-semibold',
                                isChecked
                                  ? 'text-slate-900 dark:text-white line-through opacity-80'
                                  : 'text-slate-900 dark:text-white'
                              )}
                            >
                              {item.productName}
                            </span>
                            {item.spkNumber && (
                              <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800">
                                {item.spkNumber}
                              </span>
                            )}
                          </div>
                          {item.variantLabel && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.variantLabel}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.qty} Unit
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          Pesanan: {item.salesOrderNumber}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[180px]">{item.customerName}</span>
                        {item.customerAddress && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{item.customerAddress}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isAllLoadingItemsChecked && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Masih ada {kloterLoadingItems.length - checkedLoadingCount} barang yang belum diceklis.</span>
              </p>
            )}
          </div>
        )}
      </Modal>
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
