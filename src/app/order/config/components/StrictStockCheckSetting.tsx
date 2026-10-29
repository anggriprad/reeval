'use client';

import React from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { ShieldAlert } from 'lucide-react';

interface StrictStockCheckSettingProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

export function StrictStockCheckSetting({
  checked,
  onChange,
  disabled = false,
}: StrictStockCheckSettingProps) {
  return (
    <div className="transition-colors">
      <div className="p-4 sm:p-5 flex items-center justify-between gap-8">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              checked
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Blokir Proses Pesanan saat stok kurang
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Jika aktif, Sales Order tidak dapat diproses apabila stok bahan baku atau barang setengah jadi tidak mencukupi di gudang.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Toggle
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            showStatusBadge
            color="indigo"
          />
        </div>
      </div>
    </div>
  );
}
