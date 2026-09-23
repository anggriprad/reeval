import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/data-provider';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;

    const products = getProducts(category);
    return NextResponse.json({ success: true, data: products }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengambil data produk' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nama produk (name) wajib diisi' },
        { status: 400 }
      );
    }

    if (!body.category || typeof body.category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Kategori produk (category) wajib diisi' },
        { status: 400 }
      );
    }

    const newProduct = createProduct(body);
    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal membuat produk baru' },
      { status: 500 }
    );
  }
}
