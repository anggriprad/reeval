'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, ListFilter, Lock, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/context/ToastContext';
import { useTableFilters } from '@/hooks/useTableFilters';
import { usePermission } from '@/hooks/usePermission';
import { useApp } from '@/context/AppContext';
import { PERMISSIONS } from '@/lib/permissions';
import { canViewFinance } from '@/lib/roles';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { coaService, type ChartOfAccountOptionDTO } from '@/services/coa.service';
import { journalService, mapJournalEntryDTOToJournalEntry } from '@/services/journal.service';
import type { JournalEntry } from '@/lib/types';

interface JournalSectionProps {
  refreshTrigger?: number;
  onOpenClosingModal?: () => void;
  onOpenManualJournalModal?: () => void;
}

const getSourceBadgeVariant = (
  sourceType: string
): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' => {
  if (sourceType === 'CLOSING_ENTRY') return 'warning';
  if (sourceType === 'DIVIDEND') return 'danger';
  if (sourceType === 'MANUAL_JOURNAL' || sourceType === 'MANUAL') return 'purple';
  return 'info';
};

const getSourceBadgeLabel = (sourceType: string): string => {
  if (sourceType === 'CLOSING_ENTRY') return 'Tutup Buku';
  if (sourceType === 'DIVIDEND') return 'Dividen';
  if (sourceType === 'MANUAL_JOURNAL' || sourceType === 'MANUAL') return 'Jurnal Manual';
  if (sourceType === 'INVOICE_ISSUED' || sourceType === 'INVOICE_PAYMENT') return 'Penjualan';
  if (sourceType === 'PO_RECEIVED' || sourceType === 'PO_PAYMENT' || sourceType === 'DIRECT_PURCHASE') return 'Pembelian';
  if (sourceType === 'REVERSAL_PO_RECEIVED' || sourceType === 'REVERSAL_DIRECT_PURCHASE') return 'Reversal Pembelian';
  if (sourceType === 'REFUND') return 'Refund';
  if (sourceType === 'ASSET_PURCHASE') return 'Pembelian Aset';
  if (sourceType === 'ASSET_SERVICE') return 'Servis Aset';
  if (sourceType === 'ASSET_DEPRECIATION') return 'Penyusutan Aset';
  if (sourceType === 'PRODUCTION_FINISHED') return 'Produksi Selesai';
  if (sourceType === 'COGS_RECOGNITION') return 'Pengakuan HPP';
  if (sourceType === 'EXPENSE') return 'Beban Ops';
  if (sourceType === 'OPENING_BALANCE') return 'Saldo Awal';
  return sourceType;
};

export function JournalSection({
  refreshTrigger = 0,
  onOpenClosingModal,
  onOpenManualJournalModal,
}: JournalSectionProps) {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const { currentUser } = useApp();
  const { can, permissions } = usePermission();
  const hasRoleFallback =
    permissions.length === 0 &&
    canViewFinance(
      currentUser.roles && currentUser.roles.length > 0
        ? currentUser.roles
        : currentUser.role
    );
  const canJournalRead = can(PERMISSIONS.FINANCE.JOURNAL_READ) || hasRoleFallback;
  const canClosing = can(PERMISSIONS.FINANCE.CLOSING) || hasRoleFallback;
  const canJournalCreate = can(PERMISSIONS.FINANCE.JOURNAL_CREATE) || hasRoleFallback;

  const { filters, setFilter, setFilters } = useTableFilters({
    journal_account_id: '',
    journal_page: '1',
    journal_per_page: '10',
  });

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accountOptions, setAccountOptions] = useState<ChartOfAccountOptionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const currentPage = Math.max(1, Number(filters.journal_page) || 1);
  const perPage = Math.max(1, Number(filters.journal_per_page) || 10);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      try {
        const res = await coaService.getOptions({ is_header: false });
        if (!cancelled && Array.isArray(res.data)) {
          setAccountOptions(res.data);
        }
      } catch {
        // Non-blocking option load
      }
    };
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const fetchJournals = useCallback(async () => {
    if (!canJournalRead) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const accountIdNum = Number(filters.journal_account_id);
      const res = await journalService.getJournals({
        page: currentPage,
        per_page: perPage,
        account_id: accountIdNum > 0 ? accountIdNum : undefined,
      });
      const mapped = Array.isArray(res.data)
        ? res.data.map(mapJournalEntryDTOToJournalEntry)
        : [];
      const nextTotal = res.meta?.total ?? mapped.length;
      const nextLastPage = Math.max(1, res.meta?.total_pages ?? 1);
      if (nextTotal > 0 && currentPage > nextLastPage) {
        setFilter('journal_page', String(nextLastPage));
        return;
      }
      setEntries(mapped);
      setTotal(nextTotal);
      setLastPage(nextLastPage);
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const msg = apiMsg || (err instanceof Error ? err.message : 'Gagal memuat data jurnal umum.');
      toastRef.current.error('Gagal Memuat Jurnal', msg);
    } finally {
      setIsLoading(false);
    }
  }, [
    canJournalRead,
    currentPage,
    perPage,
    filters.journal_account_id,
    setFilter,
  ]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchJournals();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchJournals, refreshTrigger]);

  if (!canJournalRead) {
    return null;
  }

  const startIndex = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const endIndex = Math.min(currentPage * perPage, total);

  return (
    <Card>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Jurnal Umum</h3>
              <Badge variant="purple" className="text-[10px] px-2 py-0.5 font-semibold">
                Double-Entry Log
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Seluruh postingan jurnal otomatis & manual dari transaksi operasional.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
          <div className="w-full sm:w-64">
            <Select
              icon={ListFilter}
              value={filters.journal_account_id || ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, journal_account_id: e.target.value, journal_page: '1' }))
              }
              activeHighlight
              options={[
                { value: '', label: 'Semua Akun Rekening' },
                ...accountOptions.map((a) => ({
                  value: String(a.id),
                  label: `${a.code} — ${a.name}`,
                })),
              ]}
            />
          </div>

          {(canClosing || canJournalCreate) && (onOpenClosingModal || onOpenManualJournalModal) && (
            <>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

              <div className="flex items-center gap-2 shrink-0">
                {canClosing && onOpenClosingModal && (
                  <Button variant="outline" size="sm" onClick={onOpenClosingModal}>
                    <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Tutup Buku
                  </Button>
                )}
                {canJournalCreate && onOpenManualJournalModal && (
                  <Button size="sm" onClick={onOpenManualJournalModal}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Tambah Jurnal Manual
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-14 space-y-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Memuat data jurnal...
          </span>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="Belum ada jurnal transaksi"
          description="Jurnal otomatis terbentuk saat Anda mencatat pembayaran, invoice, PO, atau biaya operasional."
        />
      ) : (
        <div className="space-y-4">
          {entries.map((je) => {
            const totalEntryAmount =
              typeof je.totalDebit === 'number' && je.totalDebit > 0
                ? je.totalDebit
                : je.lines.reduce((sum, l) => sum + (l.debit || 0), 0);

            return (
              <div
                key={je.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {je.entryNumber || je.id}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="font-mono text-xs text-slate-500">
                      {formatDateTime(je.date)}
                    </span>
                    {je.sourceType && (
                      <Badge variant={getSourceBadgeVariant(je.sourceType)}>
                        {getSourceBadgeLabel(je.sourceType)}
                      </Badge>
                    )}
                    {je.status === 'VOID' && (
                      <Badge variant="danger">VOID</Badge>
                    )}
                  </div>
                  <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Total: {formatCurrency(totalEntryAmount)}
                  </div>
                </div>

                <div className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/40">
                  {je.description}
                </div>

                <Table
                  dense
                  data={je.lines}
                  columns={[
                    {
                      key: 'accountCode',
                      header: 'Kode Akun',
                      width: '8rem',
                      cell: (line) => (
                        <span className="font-mono font-medium text-slate-600 dark:text-slate-400">
                          {line.accountCode}
                        </span>
                      ),
                    },
                    {
                      key: 'accountName',
                      header: 'Nama Akun',
                      cell: (line) => (
                        <span
                          className={
                            line.debit > 0
                              ? 'font-medium text-slate-900 dark:text-white'
                              : 'pl-4 text-slate-700 dark:text-slate-300'
                          }
                        >
                          {line.accountName}
                        </span>
                      ),
                    },
                    {
                      key: 'debit',
                      header: 'Debit (Rp)',
                      align: 'right',
                      width: '9rem',
                      cell: (line) => (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                        </span>
                      ),
                    },
                    {
                      key: 'credit',
                      header: 'Kredit (Rp)',
                      align: 'right',
                      width: '9rem',
                      cell: (line) => (
                        <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold">
                          {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            );
          })}

          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{startIndex}</span> -{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{endIndex}</span> dari{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> jurnal
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilter('journal_page', String(Math.max(1, currentPage - 1)))}
                  disabled={currentPage <= 1}
                  aria-label="Halaman Sebelumnya"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1">
                  Halaman {currentPage} dari {lastPage}
                </span>
                <button
                  type="button"
                  onClick={() => setFilter('journal_page', String(Math.min(lastPage, currentPage + 1)))}
                  disabled={currentPage >= lastPage}
                  aria-label="Halaman Berikutnya"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
