import { NextRequest, NextResponse } from 'next/server';
import { getSalesOrderById, updateSalesOrder, updateSalesOrderStatus } from '@/lib/data-provider';
import type { OrderStatus } from '@/lib/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = getSalesOrderById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Sales Order dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengambil detail sales order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // If body contains a status change, update sales order status with workflow triggers
    if (body.status) {
      const updatedStatusOrder = updateSalesOrderStatus(
        id,
        body.status as OrderStatus,
        body.cancelReason,
        body.cancelledByRole
      );

      if (!updatedStatusOrder) {
        return NextResponse.json(
          { success: false, error: `Sales Order dengan ID ${id} tidak ditemukan` },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: updatedStatusOrder }, { status: 200 });
    }

    // Otherwise, perform standard fields update
    const updatedOrder = updateSalesOrder(id, body);

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: `Sales Order dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedOrder }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memperbarui sales order' },
      { status: 500 }
    );
  }
}
