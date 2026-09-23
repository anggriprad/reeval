import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  updateJobCard,
} from '@/lib/data-provider';
import type { JobCard } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('woId');

    if (id) {
      const wo = getWorkOrderById(id);
      if (!wo) {
        return NextResponse.json(
          { success: false, error: `Work Order (SPK) dengan ID ${id} tidak ditemukan` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: wo }, { status: 200 });
    }

    const workOrders = getWorkOrders();
    return NextResponse.json({ success: true, data: workOrders }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengambil data produksi' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    // 1. Update Job Card Progress / Status
    if (
      action === 'update_jobcard' ||
      (body.workOrderId && body.jobCardId)
    ) {
      const { workOrderId, jobCardId, status, completedQty, picName, actualMinutes, operatorId } = body;

      if (!workOrderId || !jobCardId) {
        return NextResponse.json(
          { success: false, error: 'Field workOrderId dan jobCardId wajib diisi' },
          { status: 400 }
        );
      }

      const result = updateJobCard(workOrderId, jobCardId, {
        status: status as JobCard['status'],
        completedQty: completedQty !== undefined ? Number(completedQty) : undefined,
        picName,
        actualMinutes: actualMinutes !== undefined ? Number(actualMinutes) : undefined,
        operatorId,
      });

      if (!result) {
        return NextResponse.json(
          { success: false, error: `Work Order ID ${workOrderId} atau Job Card ID ${jobCardId} tidak ditemukan` },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    // 2. Create Work Order / SPK
    if (action === 'create' || (body.salesOrderId && body.productName)) {
      const {
        salesOrderId,
        salesOrderNumber,
        productName,
        variantName,
        selectedModifiers,
        jobCards,
        materialsConsumed,
        materialCost,
        plannedLaborCost,
        isCustom,
        customNotes,
      } = body;

      if (!salesOrderId || !salesOrderNumber || !productName) {
        return NextResponse.json(
          { success: false, error: 'salesOrderId, salesOrderNumber, dan productName wajib diisi' },
          { status: 400 }
        );
      }

      const newWO = createWorkOrder({
        salesOrderId,
        salesOrderNumber,
        productName,
        variantName,
        selectedModifiers,
        jobCards,
        materialsConsumed,
        materialCost,
        plannedLaborCost,
        isCustom,
        customNotes,
      });

      return NextResponse.json({ success: true, data: newWO }, { status: 201 });
    }

    // 3. Update Work Order directly
    if (action === 'update_wo' || (body.workOrderId && body.updates)) {
      const woId = body.workOrderId || body.id;
      const updates = body.updates || body;
      const updated = updateWorkOrder(woId, updates);

      if (!updated) {
        return NextResponse.json(
          { success: false, error: `Work Order ${woId} tidak ditemukan` },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: updated }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, error: 'Aksi atau payload produksi tidak dikenali' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses transaksi produksi' },
      { status: 500 }
    );
  }
}
