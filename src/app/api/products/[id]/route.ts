import { NextRequest, NextResponse } from 'next/server';
import { getProductById, updateProduct, deleteProduct } from '@/lib/data-provider';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = getProductById(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: `Produk dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengambil detail produk' },
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

    const updatedProduct = updateProduct(id, body);

    if (!updatedProduct) {
      return NextResponse.json(
        { success: false, error: `Produk dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedProduct }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memperbarui produk' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = deleteProduct(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Gagal menghapus produk' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: `Produk ${id} berhasil dihapus` },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menghapus produk' },
      { status: 500 }
    );
  }
}
