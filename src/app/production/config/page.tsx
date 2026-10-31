'use client';

import React, { Suspense } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductionOperationSection } from './components/ProductionOperationSection';
import { ProductionRoutingSection } from './components/ProductionRoutingSection';

function ProductionConfigContent() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        backHref="/production"
        title="Konfigurasi Produksi"
      />

      <div className="space-y-4">
        {/* ========================================================================= */}
        {/* ACCORDION ITEM 1: MASTER OPERASI PRODUKSI */}
        {/* ========================================================================= */}
        <ProductionOperationSection />

        {/* ========================================================================= */}
        {/* ACCORDION ITEM 2: ALUR PRODUKSI (ROUTINGS) */}
        {/* ========================================================================= */}
        <ProductionRoutingSection />
      </div>
    </div>
  );
}

export default function ProductionConfigPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat Konfigurasi Produksi...</div>}>
      <ProductionConfigContent />
    </Suspense>
  );
}
