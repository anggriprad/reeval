'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductForm } from '@/components/products/ProductForm';
import { productService, mapProductDetailToProduct } from '@/services/product.service';
import type { Product } from '@/lib/types';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { products } = useApp();

  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const localProduct = products.find(p => p.id === productId);

  const [product, setProduct] = useState<Product | undefined>(localProduct);
  const [isLoading, setIsLoading] = useState(!localProduct);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!productId) return;

    let isMounted = true;
    productService
      .getProductById(productId)
      .then(res => {
        if (!isMounted) return;
        if (res.success && res.data) {
          const mapped = mapProductDetailToProduct(res.data);
          setProduct(mapped);
          setErrorMsg('');
        } else if (!localProduct) {
          setErrorMsg(res.message || 'Produk tidak ditemukan.');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        if (!localProduct) {
          setErrorMsg(err?.response?.data?.message || err?.message || 'Gagal memuat detail produk.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [productId, localProduct]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Memuat data produk...</span>
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {errorMsg || (
            <>
              Produk dengan ID <code className="font-mono">{productId}</code> tidak ditemukan.
            </>
          )}
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
