'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArrowLeft } from 'lucide-react';
import { ProductCategorySection } from './components/ProductCategorySection';
import { ProductAttributeSection } from './components/ProductAttributeSection';
import { BomPresetSection } from './components/BomPresetSection';

function ProductsConfigContent() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Konfigurasi Katalog Produk"
        backHref="/products"
      >
        <Link href="/products">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
          </Button>
        </Link>
      </PageHeader>

      <div className="space-y-4">
        {/* SECTION 1: MASTER KATEGORI PRODUK */}
        <ProductCategorySection />

        {/* SECTION 2: MASTER PRESET BOM */}
        <BomPresetSection />

        {/* SECTION 3: MASTER ATRIBUT VARIAN */}
        <ProductAttributeSection />
      </div>
    </div>
  );
}

export default function ProductsConfigPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Configuration...</div>}>
      <ProductsConfigContent />
    </Suspense>
  );
}
