import { NextRequest, NextResponse } from 'next/server';
import { getSalesOrders, createSalesOrder } from '@/lib/data-provider';
import type { OrderStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const status = statusParam ? (statusParam.toUpperCase() as OrderStatus) : undefined;

    const orders = getSalesOrders(status);
    return NextResponse.json({ success: true, data: orders }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengambil data sales order' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, items, createdBy, salesPhone, orderNotes, shippingCost } = body;

    if (!customer || !customer.name) {
      return NextResponse.json(
        { success: false, error: 'Data pelanggan (customer.name) wajib diisi' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Daftar item pesanan (items) tidak boleh kosong' },
        { status: 400 }
      );
    }

    const newOrder = createSalesOrder({
      customer,
      items,
      createdBy,
      salesPhone,
      orderNotes,
      shippingCost,
    });

    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal membuat sales order baru' },
      { status: 500 }
    );
  }
}
