import { NextRequest, NextResponse } from 'next/server';
import {
  getInventory,
  getStockMovements,
  getPurchaseOrders,
  updateStock,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  saveMaterial,
} from '@/lib/data-provider';
import type { StockMovementType, POStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'movements') {
      return NextResponse.json({ success: true, data: getStockMovements() }, { status: 200 });
    }

    if (type === 'po') {
      return NextResponse.json({ success: true, data: getPurchaseOrders() }, { status: 200 });
    }

    if (type === 'materials') {
      return NextResponse.json({ success: true, data: getInventory() }, { status: 200 });
    }

    // Default: Return all inventory data
    return NextResponse.json(
      {
        success: true,
        data: {
          materials: getInventory(),
          movements: getStockMovements(),
          purchaseOrders: getPurchaseOrders(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengambil data inventaris' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    // 1. Record stock movement
    if (action === 'movement' || (body.materialId && body.deltaQty && body.type)) {
      const { materialId, deltaQty, type, reference } = body;

      if (!materialId || !deltaQty || !type) {
        return NextResponse.json(
          { success: false, error: 'Field materialId, deltaQty, dan type wajib diisi' },
          { status: 400 }
        );
      }

      const result = updateStock(
        materialId,
        Number(deltaQty),
        type as StockMovementType,
        reference || 'Penyesuaian Manual'
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: `Material dengan ID ${materialId} tidak ditemukan` },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    // 2. Receive Purchase Order
    if (action === 'receive_po' || (body.poId && body.status === 'RECEIVED')) {
      const poId = body.poId || body.id;
      const updatedPO = updatePurchaseOrderStatus(poId, 'RECEIVED' as POStatus);

      if (!updatedPO) {
        return NextResponse.json(
          { success: false, error: `PO dengan ID ${poId} tidak ditemukan` },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: updatedPO }, { status: 200 });
    }

    // 3. Create Purchase Order / Pengadaan
    if (action === 'po' || (body.supplier && body.items)) {
      const { supplier, items, createdBy, purchaseType, additionalCost } = body;

      if (!supplier || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Pemasok (supplier) dan item pengadaan (items) wajib diisi' },
          { status: 400 }
        );
      }

      const po = createPurchaseOrder({
        supplier,
        createdBy,
        items,
        purchaseType,
        additionalCost,
      });

      return NextResponse.json({ success: true, data: po }, { status: 201 });
    }

    // 4. Save/Update Raw Material Master
    if (action === 'save_material' || body.materialData || (body.name && body.unitCost !== undefined)) {
      const matData = body.materialData || body;
      const savedMat = saveMaterial(matData);
      return NextResponse.json({ success: true, data: savedMat }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, error: 'Aksi atau payload inventaris tidak dikenali' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses aksi inventaris' },
      { status: 500 }
    );
  }
}
