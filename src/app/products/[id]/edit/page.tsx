'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductForm } from '@/components/products/ProductForm';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { products } = useApp();

  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          Produk dengan ID <code className="font-mono">{productId}</code> tidak ditemukan.
        </div>
        <button
          onClick={() => router.push('/products')}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Kembali ke Katalog Produk
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ProductForm initialProduct={product} />
    </div>
  );
}
