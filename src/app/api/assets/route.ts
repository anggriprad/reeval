import { NextRequest, NextResponse } from 'next/server';
import { initialAssets, initialAssetCategories, initialAssetServiceLogs, initialAssetDepreciations } from '@/lib/initial-data';
import { executeCreateAsset, CreateAssetPayload } from '@/lib/services/assetService';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        assets: initialAssets,
        categories: initialAssetCategories,
        serviceLogs: initialAssetServiceLogs,
        depreciations: initialAssetDepreciations,
      },
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat data aset' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: CreateAssetPayload = await request.json();

    if (!payload.name || !payload.code || !payload.category || !payload.acquisitionType) {
      return NextResponse.json(
        { success: false, error: 'Field name, code, category, dan acquisitionType wajib diisi' },
        { status: 400 }
      );
    }

    if (payload.acquisitionType === 'NEW_PURCHASE' && !payload.cashAccountId) {
      return NextResponse.json(
        { success: false, error: 'Akun kas wajib diisi untuk perolehan Pembelian Baru' },
        { status: 400 }
      );
    }

    // Return success response indicating created asset metadata
    const usefulLifeMonths = Number(payload.usefulLifeMonths || 12);
    const acquisitionCost = Number(payload.acquisitionCost || 0);
    const salvageValue = Number(payload.salvageValue || 0);
    const monthlyDepreciation = (acquisitionCost - salvageValue) / usefulLifeMonths;

    const newAsset = {
      id: `ast-${Date.now()}`,
      code: payload.code.toUpperCase(),
      name: payload.name,
      category: payload.category,
      acquisitionType: payload.acquisitionType,
      purchaseDate: payload.acquisitionDate || new Date().toISOString().split('T')[0],
      purchaseCost: acquisitionCost,
      usefulLifeMonths,
      usefulLifeYears: Math.round((usefulLifeMonths / 12) * 10) / 10,
      salvageValue,
      currentBookValue: acquisitionCost,
      monthlyDepreciation,
      accumulatedServiceCost: 0,
      status: payload.status || 'ACTIVE',
      cashAccountId: payload.acquisitionType === 'NEW_PURCHASE' ? payload.cashAccountId : undefined,
      financeTransactionId: payload.acquisitionType === 'NEW_PURCHASE' ? `exp-${Date.now()}` : undefined,
    };

    return NextResponse.json(
      { success: true, data: newAsset, message: 'Aset berhasil didaftarkan' },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menyimpan data aset' },
      { status: 500 }
    );
  }
}
