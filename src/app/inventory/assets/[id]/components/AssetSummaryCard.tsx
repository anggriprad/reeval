'use client';

import React from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import type { CompanyAssetDetail } from '@/services/company-asset.service';

interface AssetSummaryCardProps {
  asset: CompanyAssetDetail;
  usefulMonths: number;
  cashAccount?: BankAccount;
  isDisposed: boolean;
}

export function AssetSummaryCard({
  asset,
  usefulMonths,
  cashAccount,
  isDisposed,
}: AssetSummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
        {/* Kolom 1: Nilai Finansial */}
        <div className="space-y-3">
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Nilai Buku Saat Ini</span>
            <p className="font-mono font-bold text-slate-900 dark:text-white text-base mt-0.5">
              {formatCurrency(asset.current_book_value ?? asset.purchase_cost)}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Harga Perolehan</span>
            <p className="font-mono font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
              {formatCurrency(asset.purchase_cost)}
            </p>
          </div>
        </div>

        {/* Kolom 2: Depresiasi & Masa Manfaat */}
        <div className="space-y-3 pt-4 md:pt-0 md:pl-5">
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Penyusutan / Bulan</span>
            <p className="font-mono font-bold text-red-600 dark:text-red-400 text-base mt-0.5">
              {formatCurrency(asset.monthly_depreciation)}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Masa Manfaat</span>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
              {usefulMonths} Bulan ({Math.round((usefulMonths / 12) * 10) / 10} Tahun)
            </p>
          </div>
        </div>

        {/* Kolom 3: Perolehan & Sumber Kas */}
        <div className="space-y-3 pt-4 md:pt-0 md:pl-5">
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Tanggal Perolehan</span>
            <p className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5">
              {asset.purchase_date ? formatDate(asset.purchase_date) : '-'}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Sumber Dana</span>
            <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
              {asset.acquisition_type === 'NEW_PURCHASE' && cashAccount
                ? cashAccount.name
                : asset.acquisition_type === 'NEW_PURCHASE'
                  ? 'Kas Keluar'
                  : 'Saldo Awal (Tanpa Kas)'}
            </p>
          </div>
        </div>

        {/* Kolom 4: Kategori & Pemeliharaan */}
        <div className="space-y-3 pt-4 md:pt-0 md:pl-5">
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Kategori</span>
            <p className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5">
              {asset.category_name || asset.category || '-'}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Biaya Servis</span>
            <p className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {formatCurrency(asset.accumulated_service_cost)}
            </p>
          </div>
        </div>
      </div>

      {isDisposed && (
        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold">
              Aset telah {asset.status === 'DISPOSED' ? 'Dijual / Dilepas' : 'Diafkir (Scrap)'}
            </span>
            {asset.disposal_date && (
              <span className="ml-2 text-amber-700 dark:text-amber-300">
                per {formatDate(asset.disposal_date)}
              </span>
            )}
            {asset.notes && <p className="mt-0.5 text-[11px] opacity-85">{asset.notes}</p>}
          </div>
          {asset.status === 'DISPOSED' && (
            <div className="font-mono font-semibold">
              Hasil Penjualan: {formatCurrency(asset.disposal_proceeds || 0)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
