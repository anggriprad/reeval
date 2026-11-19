'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AssetServiceLogItem } from '@/services/company-asset.service';
import { History, Plus, Trash2 } from 'lucide-react';

interface AssetServiceHistoryCardProps {
  serviceLogs: AssetServiceLogItem[];
  canService: boolean;
  canDelete: boolean;
  isDisposed: boolean;
  onAddService: () => void;
  onDeleteService: (serviceId: number) => void;
}

export function AssetServiceHistoryCard({
  serviceLogs,
  canService,
  canDelete,
  isDisposed,
  onAddService,
  onDeleteService,
}: AssetServiceHistoryCardProps) {
  return (
    <Card>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Riwayat Pemeliharaan & Servis
          </h2>
        </div>
        {canService && !isDisposed && (
          <Button size="sm" variant="outline" onClick={onAddService}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Tambah Catatan
          </Button>
        )}
      </div>

      {serviceLogs.length === 0 ? (
        <EmptyState
          title="Belum ada riwayat servis"
          description="Aset ini belum pernah mencatat riwayat perbaikan atau pemeliharaan."
          variant="plain"
        />
      ) : (
        <Table
          data={serviceLogs}
          keyExtractor={(log) => String(log.id)}
          columns={[
            {
              key: 'service_date',
              header: 'Tanggal',
              cell: (log) => (
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                  {formatDate(log.service_date)}
                </span>
              ),
            },
            {
              key: 'description',
              header: 'Deskripsi Pemeliharaan',
              cell: (log) => (
                <div>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {log.description}
                  </span>
                  {log.service_provider && (
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Vendor/Teknisi: {log.service_provider}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'cost',
              header: 'Biaya Servis',
              align: 'right',
              cell: (log) => (
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(log.cost)}
                </span>
              ),
            },
            ...(canDelete
              ? [
                  {
                    key: 'actions',
                    header: 'Aksi',
                    align: 'center' as const,
                    cell: (log: AssetServiceLogItem) => (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteService(log.id)}
                        title="Hapus Catatan"
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
    </Card>
  );
}
