'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArmadaSection } from './components/ArmadaSection';
import { ShippingRateSection } from './components/ShippingRateSection';

export default function DeliveryConfigPage() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      <PageHeader
        title="Konfigurasi Pengiriman"
        backHref="/delivery"
      />

      <div className="space-y-4">
        {/* ============================================================== */}
        {/* ARMADA CONFIGURATION */}
        {/* ============================================================== */}
        <ArmadaSection />

        {/* ============================================================== */}
        {/* SHIPPING RATE CONFIGURATION */}
        {/* ============================================================== */}
        <ShippingRateSection />
      </div>
    </div>
  );
}
