'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { journalService, mapLedgerMutationsDTO } from '@/services/journal.service';
import type { LedgerMutations } from '@/lib/types';

interface LedgerMutationModalProps {
  accountId: string | null;
  accountName?: string;
  onClose: () => void;
}

export function LedgerMutationModal({
  accountId,
  accountName,
  onClose,
}: LedgerMutationModalProps) {
  const [result, setResult] = useState<{
    accountId: string | null;
    data: LedgerMutations | null;
    errorMessage: string;
  }>({ accountId: null, data: null, errorMessage: '' });

  useEffect(() => {
    if (!accountId) return;

    let cancelled = false;
    journalService
      .getLedgerMutations(accountId)
      .then((res) => {
        if (!cancelled) {
          setResult({
            accountId,
            data: res.data ? mapLedgerMutationsDTO(res.data) : null,
            errorMessage: '',
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          const msg = apiMsg || (err instanceof Error ? err.message : 'Gagal memuat mutasi akun.');
          setResult({ accountId, data: null, errorMessage: msg });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const isLoading = Boolean(accountId) && result.accountId !== accountId;
  const data = result.accountId === accountId ? result.data : null;
  const errorMessage = result.accountId === accountId ? result.errorMessage : '';

  const titleName = data?.account?.name || accountName || '';
  const displayMutations = data ? [...data.mutations].reverse() : [];

  return (
    <Modal
      isOpen={!!accountId}
      onClose={onClose}
      title={`Rincian Mutasi Akun — ${titleName}`}
      size="lg"
      actions={
        <Button variant="outline" size="sm" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Memuat riwayat mutasi...</span>
        </div>
      ) : errorMessage ? (
        <p className="text-xs text-red-600 dark:text-red-400 py-6 text-center">{errorMessage}</p>
      ) : displayMutations.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-6 text-center">
          Belum ada riwayat mutasi untuk akun ini.
        </p>
      ) : (
        <div className="space-y-4">
          <Table
            dense
            containerClassName="max-h-[400px] overflow-y-auto"
            data={displayMutations}
            columns={[
              {
                key: 'date',
                header: 'Tanggal',
                cell: (tx) => (
                  <span className="text-slate-500 font-mono whitespace-nowrap">
                    {formatDateTime(tx.date)}
                  </span>
                ),
              },
              {
                key: 'entryNumber',
                header: 'No. Bukti',
                cell: (tx) => (
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {tx.entryNumber}
                  </span>
                ),
              },
              {
                key: 'description',
                header: 'Keterangan',
                cell: (tx) => (
                  <div>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {tx.description}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {tx.sourceType}
                    </span>
                  </div>
                ),
              },
              {
                key: 'contraAccount',
                header: 'Lawan Akun',
                cell: (tx) => (
                  <span
                    className="text-slate-500 text-[11px] truncate max-w-[150px] block"
                    title={tx.contraAccount}
                  >
                    {tx.contraAccount}
                  </span>
                ),
              },
              {
                key: 'debit',
                header: 'Debit',
                align: 'right',
                cell: (tx) => (
                  <span className="font-mono">
                    {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                  </span>
                ),
              },
              {
                key: 'credit',
                header: 'Kredit',
                align: 'right',
                cell: (tx) => (
                  <span className="font-mono">
                    {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                  </span>
                ),
              },
              {
                key: 'runningBalance',
                header: 'Saldo',
                align: 'right',
                cell: (tx) => (
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(tx.runningBalance)}
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
