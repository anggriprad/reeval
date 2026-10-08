import { NextRequest, NextResponse } from 'next/server';
import { initialAssets, initialAssetServiceLogs, initialAssetDepreciations } from '@/lib/initial-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = initialAssets.find(a => a.id === id);

  if (!asset) {
    return NextResponse.json(
      { success: false, error: `Aset dengan ID ${id} tidak ditemukan` },
      { status: 404 }
    );
  }

  const serviceLogs = initialAssetServiceLogs.filter(l => l.assetId === id);
  const depreciations = initialAssetDepreciations.filter(d => d.assetId === id);

  return NextResponse.json({
    success: true,
    data: {
      ...asset,
      serviceLogs,
      depreciations,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = initialAssets.find(a => a.id === id);

    if (!asset) {
      return NextResponse.json(
        { success: false, error: `Aset dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    // 1. COUNT(asset_maintenance_logs WHERE asset_id = :id) == 0
    const serviceCount = initialAssetServiceLogs.filter(l => l.assetId === id).length;
    if (serviceCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Aset tidak dapat dihapus karena memiliki ${serviceCount} catatan riwayat servis.`,
        },
        { status: 422 }
      );
    }

    // 2. COUNT(asset_depreciations WHERE asset_id = :id) == 0
    const depreciationCount = initialAssetDepreciations.filter(d => d.assetId === id).length;
    if (depreciationCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Aset tidak dapat dihapus karena memiliki ${depreciationCount} riwayat penyusutan/depresiasi.`,
        },
        { status: 422 }
      );
    }

    // 3. Evaluasi tipe perolehan
    // Jika EXISTING: lolos validasi -> eksekusi hard delete master aset.
    // Jika NEW_PURCHASE: periksa status finance_transaction_id dan rollback kas keluar.
    return NextResponse.json({
      success: true,
      message: `Aset ${asset.name} (${asset.code}) berhasil dihapus.`,
      deletedId: id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menghapus aset' },
      { status: 500 }
    );
  }
}
