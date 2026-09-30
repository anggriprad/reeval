import { NextRequest, NextResponse } from 'next/server';
import {
  getDeliveryOrders,
  getDeliveryOrderById,
  createDeliveryOrder,
  updateDeliveryStatus,
} from '@/lib/data-provider';
import type { DeliveryStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const delivery = getDeliveryOrderById(id);
      if (!delivery) {
        return NextResponse.json(
          { success: false, error: `Delivery order ${id} tidak ditemukan` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: delivery }, { status: 200 });
    }

    const deliveries = getDeliveryOrders();
    return NextResponse.json({ success: true, data: deliveries }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengambil data delivery order' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    // 1. Update Delivery Status (e.g. IN_TRANSIT or DELIVERED)
    if (action === 'update_status' || action === 'confirm_loading' || (body.deliveryOrderId && body.status)) {
      const doId = body.deliveryOrderId || body.id;
      const status = (action === 'confirm_loading' ? 'IN_TRANSIT' : body.status) as DeliveryStatus;

      const updated = updateDeliveryStatus(doId, status, {
        deliveryProofNote: body.deliveryProofNote,
        deliveryProofPhoto: body.deliveryProofPhoto,
        receiverName: body.receiverName,
        driverName: body.driverName,
      });

      if (!updated) {
        return NextResponse.json(
          { success: false, error: `Delivery order ${doId} tidak ditemukan` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: updated }, { status: 200 });
    }

    // 2. Create Delivery Order (Single or Multi-Order)
    if (action === 'create' || ((body.salesOrderId || body.salesOrderIds) && body.assignedDriverName)) {
      const {
        salesOrderId,
        salesOrderIds,
        selectedItems,
        assignedDriverName,
        driverId,
        driverPhone,
        armadaId,
        armadaName,
        vehiclePlate,
        scheduledDate,
        notes,
      } = body;

      const targetIds = salesOrderIds || (salesOrderId ? [salesOrderId] : []);
      if (targetIds.length === 0 || !assignedDriverName || !vehiclePlate) {
        return NextResponse.json(
          { success: false, error: 'salesOrderId/salesOrderIds, assignedDriverName, dan vehiclePlate wajib diisi' },
          { status: 400 }
        );
      }

      const newDO = createDeliveryOrder({
        salesOrderId: targetIds[0],
        salesOrderIds: targetIds,
        selectedItems,
        assignedDriverName,
        driverId,
        driverPhone,
        armadaId,
        armadaName,
        vehiclePlate,
        scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
        notes,
      });

      return NextResponse.json({ success: true, data: newDO }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: 'Aksi delivery tidak dikenali' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses transaksi delivery' },
      { status: 500 }
    );
  }
}
