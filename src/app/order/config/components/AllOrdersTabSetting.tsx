'use client';

import React from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { Layers } from 'lucide-react';

interface AllOrdersTabSettingProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

export function AllOrdersTabSetting({
  checked,
  onChange,
  disabled = false,
}: AllOrdersTabSettingProps) {
  return (
    <div className="transition-colors">
      <div className="p-4 sm:p-5 flex items-center justify-between gap-8">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              checked
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <Layers className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Tampilkan Tab &quot;Semua Pesanan&quot;
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Menampilkan tab segmen &quot;Semua&quot; di sebelah kiri tab &quot;Menunggu&quot; pada halaman Sales Order.
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
