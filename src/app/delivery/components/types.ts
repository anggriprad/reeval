import type { OrderStatus } from '@/lib/types';

export type TabKey = 'queue' | 'ready-to-ship' | 'in-transit' | 'delivered';

export interface ChildUnitItem {
  key: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  salesOrderItemId?: number;
  productId?: number;
  productName: string;
  variantId?: number;
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
  status: OrderStatus | string;
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

export function mapQueueResponseToOrderGroup(raw: any): QueueOrderGroup {
  const childUnits: ChildUnitItem[] = (raw.child_units || raw.childUnits || []).map((u: any) => ({
    key: u.key || `${raw.order_id || raw.orderId}__${u.item_index ?? u.itemIndex ?? 0}__${u.unit_number ?? u.unit_index ?? u.unitNumber ?? 1}`,
    orderId: String(u.order_id || raw.order_id || u.orderId || raw.orderId),
    orderNumber: u.order_number || raw.order_number || u.orderNumber || raw.orderNumber || '',
    customerName: u.customer_name || raw.customer_name || u.customerName || raw.customerName || '',
    customerPhone: u.customer_phone || raw.customer_phone || u.customerPhone || raw.customerPhone,
    customerAddress: u.customer_address || raw.customer_address || u.customerAddress || raw.customerAddress || '',
    salesOrderItemId: u.sales_order_item_id || u.salesOrderItemId,
    productId: u.product_id || u.productId,
    productName: u.product_name || u.productName || '',
    variantId: u.variant_id || u.variantId,
    variantLabel: u.variant_label || u.variantLabel,
    itemIndex: u.item_index ?? u.itemIndex ?? 0,
    unitNumber: u.unit_number ?? u.unit_index ?? u.unitNumber ?? 1,
    totalOrderedQty: u.total_ordered_qty ?? u.totalOrderedQty ?? 1,
    spkNumber: u.spk_number || u.spkNumber,
    orderCreatedAt: u.order_created_at || raw.order_created_at || u.orderCreatedAt || raw.orderCreatedAt || '',
    unitStatus: (u.unit_status || u.unitStatus || 'READY') as 'READY' | 'IN_PRODUCTION' | 'SHIPPED',
    isReplacement: Boolean(u.is_replacement ?? u.isReplacement),
    complaintId: u.complaint_id || u.complaintId,
  }));

  return {
    orderId: String(raw.order_id || raw.orderId),
    orderNumber: raw.order_number || raw.orderNumber || '',
    customerName: raw.customer_name || raw.customerName || '',
    customerPhone: raw.customer_phone || raw.customerPhone,
    customerAddress: raw.customer_address || raw.customerAddress || '',
    orderCreatedAt: raw.order_created_at || raw.orderCreatedAt || '',
    totalOrderUnitsCount: raw.total_order_units_count ?? raw.totalOrderUnitsCount ?? childUnits.length,
    totalReadyUnitsCount: raw.total_ready_units_count ?? raw.totalReadyUnitsCount ?? childUnits.filter(u => u.unitStatus === 'READY').length,
    status: (raw.status || 'SENT') as any,
    childUnits,
  };
}

export function buildTripGroups(deliveryOrders: any[]): DeliveryTripGroup[] {
  const map = new Map<string, DeliveryTripGroup>();

  deliveryOrders.forEach(d => {
    const tripKey = String(d.tripId || d.trip_id || d.id);
    const tripNumber = String(d.tripNumber || d.trip_number || d.doNumber || d.delivery_number || tripKey);
    const driverId = d.driverId ? String(d.driverId) : d.driver_id ? String(d.driver_id) : undefined;
    const driverName = d.assignedDriverName || d.driver_name || d.driverName || 'Driver Belum Ditentukan';
    const driverPhone = d.driverPhone || d.driver_phone || '';
    const armadaId = d.armadaId ? String(d.armadaId) : d.vehicle_id ? String(d.vehicle_id) : undefined;
    const armadaName = d.armadaName || '';
    const vehiclePlate = d.vehiclePlate || d.vehicle_plate || '-';
    const scheduledDate = d.scheduledDate || d.scheduled_date || d.createdAt || d.created_at || '';
    const notes = d.notes;
    const loadedAt = d.loadedAt || d.loaded_at;
    const loadedBy = d.loadedBy || d.loaded_by;
    const createdAt = d.createdAt || d.created_at || '';

    const normalizedDO = {
      ...d,
      id: String(d.id),
      doNumber: d.doNumber || d.delivery_number || String(d.id),
      deliveryNumber: d.delivery_number || d.doNumber || String(d.id),
      tripId: tripKey,
      tripNumber,
      salesOrderId: d.salesOrderId || d.sales_order_id,
      salesOrderNumber: d.salesOrderNumber || d.sales_order_number || '',
      customerName: d.customerName || d.customer_name || '',
      customerPhone: d.customerPhone || d.customer_phone || '',
      customerAddress: d.customerAddress || d.customer_address || '',
      status: d.status,
      assignedDriverName: driverName,
      driverPhone,
      vehiclePlate,
      armadaName,
      scheduledDate,
      loadedAt,
      loadedBy,
      createdAt,
      orderItems: d.orderItems || d.items || [],
      items: d.items || d.orderItems || [],
    };

    if (!map.has(tripKey)) {
      map.set(tripKey, {
        tripId: tripKey,
        tripNumber,
        driverId,
        driverName,
        driverPhone,
        armadaId,
        armadaName,
        vehiclePlate,
        scheduledDate,
        notes,
        loadedAt,
        loadedBy,
        createdAt,
        deliveryOrders: [],
        totalUnitsCount: 0,
        totalDestinationsCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        isAllDelivered: false,
        isReadyToShip: false,
        isInTransit: false,
      });
    }

    const group = map.get(tripKey)!;
    group.deliveryOrders.push(normalizedDO);

    const items = normalizedDO.orderItems;
    const doUnits = items && items.length > 0
      ? items.reduce((acc: number, i: any) => acc + (Number(i.qty) || 1), 0)
      : (normalizedDO.items?.length || 1);
    group.totalUnitsCount += doUnits;

    if (normalizedDO.status === 'DELIVERED') {
      group.deliveredCount += 1;
    }
    if (normalizedDO.status === 'FAILED') {
      group.failedCount = (group.failedCount || 0) + 1;
    }
    if (normalizedDO.loadedAt && !group.loadedAt) {
      group.loadedAt = normalizedDO.loadedAt;
      group.loadedBy = normalizedDO.loadedBy;
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
}
