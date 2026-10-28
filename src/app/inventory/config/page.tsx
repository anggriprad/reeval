'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { MaterialCategorySection } from './components/MaterialCategorySection';
import { AssetCategorySection } from './components/AssetCategorySection';

export default function InventoryConfigPage() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      <PageHeader
        title="Konfigurasi Inventaris & Aset"
        backHref="/inventory"
      />

      <div className="space-y-3">
        <MaterialCategorySection />
        <AssetCategorySection />
      </div>
    </div>
  );
}
