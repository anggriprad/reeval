'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import CustomTable, { type Column } from '@/components/ui/CustomTable';
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { CashMutationItem } from '@/lib/types';
import {
  cashTransactionService,
  mapCashMutationDTO,
} from '@/services/cash-transaction.service';
import { ArrowUpRight, Search } from 'lucide-react';

interface CashMutationsSectionProps {
  refreshTrigger?: number;
  onDrillDownInvoice?: (invoiceId: string) => void;
  onDrillDownPO?: (poId: string) => void;
}

type CashMutationTableRow = Omit<CashMutationItem, 'id'> & {
  id: string;
  rawId: number;
};

function formatDateParam(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateParam(raw?: string): Date | null {
  if (!raw) return null;
  const parts = raw.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function extractApiError(err: unknown, fallback: string): string {
  const resData = (err as {
    response?: {
      data?: {
        message?: string;
        error?: string;
        errors?: Array<{ message?: string }>;
      };
    };
  })?.response?.data;
  if (Array.isArray(resData?.errors) && resData.errors[0]?.message) {
    return resData.errors[0].message;
  }
  return resData?.message || resData?.error || (err instanceof Error ? err.message : fallback);
}

function getSourceBadge(
  sourceType: string,
  direction?: string
): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
} {
  switch (sourceType) {
    case 'DIRECT_CASH':
      return { label: 'Direct Cash', variant: 'purple' };
    case 'TRANSFER':
      return { label: 'Transfer', variant: 'default' };
    case 'DIVIDEND':
      return { label: 'Dividen', variant: 'warning' };
    case 'AR_PAYMENT':
      return direction === 'OUTFLOW'
        ? { label: 'Refund Pelanggan', variant: 'danger' }
        : { label: 'Pelunasan AR', variant: 'info' };
    case 'AP_PAYMENT':
      return { label: 'Pembayaran AP', variant: 'danger' };
    case 'DIRECT_PURCHASE':
      return { label: 'Pembelian Langsung', variant: 'warning' };
    case 'ASSET_PURCHASE':
      return { label: 'Pembelian Aset', variant: 'info' };
    case 'ASSET_SERVICE':
      return { label: 'Servis Aset', variant: 'warning' };
    case 'REFUND':
      return { label: 'Refund', variant: 'danger' };
    default:
      return { label: sourceType || 'Transaksi', variant: 'default' };
  }
}

export function CashMutationsSection({
  refreshTrigger = 0,
  onDrillDownInvoice,
  onDrillDownPO,
}: CashMutationsSectionProps) {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const { filters, setFilter, setFilters } = useTableFilters({
    cash_bank_id: '',
    cash_search: '',
    cash_start_date: '',
    cash_end_date: '',
    cash_page: '1',
    cash_per_page: '20',
  });

  const [searchInput, setSearchInput] = useState(filters.cash_search || '');
  const [syncedSearch, setSyncedSearch] = useState(filters.cash_search || '');
  const isSearchInitial = useRef(true);

  if ((filters.cash_search || '') !== syncedSearch) {
    const next = filters.cash_search || '';
    setSyncedSearch(next);
    setSearchInput(next);
  }

  useEffect(() => {
    if (isSearchInitial.current) {
      isSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized !== (filters.cash_search || '')) {
        setFilters((prev) => ({ ...prev, cash_search: normalized, cash_page: '1' }));
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchInput, filters.cash_search, setFilters]);

  const [rows, setRows] = useState<CashMutationTableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const fetchSeqRef = useRef(0);

  const page = Math.max(1, Number(filters.cash_page || '1') || 1);
  const perPage = Math.max(1, Number(filters.cash_per_page || '20') || 20);
  const selectedBankId = filters.cash_bank_id ? Number(filters.cash_bank_id) : undefined;

  const dateRangeValue = useMemo<DateRange>(() => ({
    from: parseDateParam(filters.cash_start_date),
    to: parseDateParam(filters.cash_end_date),
  }), [filters.cash_start_date, filters.cash_end_date]);

  const fetchMutations = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    try {
      const res = await cashTransactionService.getMutations({
        page,
        per_page: perPage,
        search: filters.cash_search?.trim() || undefined,
        bank_account_id:
          selectedBankId && !Number.isNaN(selectedBankId) ? selectedBankId : undefined,
        start_date: filters.cash_start_date || undefined,
        end_date: filters.cash_end_date || undefined,
      });

      if (seq !== fetchSeqRef.current) return;

      const items = Array.isArray(res.data)
        ? res.data.map((dto) => {
            const mapped = mapCashMutationDTO(dto);
            return {
              ...mapped,
              rawId: mapped.id,
              id: mapped.mutationKey,
            };
          })
        : [];
      const nextTotal = res.meta?.total ?? items.length;
      const nextLastPage = Math.max(1, res.meta?.total_pages ?? 1);
      if (nextTotal > 0 && page > nextLastPage) {
        setFilter('cash_page', String(nextLastPage));
        return;
      }
      setRows(items);
      setTotal(nextTotal);
      setLastPage(nextLastPage);
    } catch (err: unknown) {
      if (seq !== fetchSeqRef.current) return;
      const msg = extractApiError(err, 'Gagal memuat daftar mutasi kas terpadu.');
      toastRef.current.error('Gagal Memuat Mutasi Kas', msg);
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [
    page,
    perPage,
    filters.cash_search,
    filters.cash_start_date,
    filters.cash_end_date,
    selectedBankId,
    setFilter,
  ]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchMutations();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchMutations, refreshTrigger]);

  const columns: Column<CashMutationTableRow>[] = useMemo(
    () => [
      {
        id: 'date',
        key: 'date',
        header: 'Tanggal',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
            {formatDateTime(row.date)}
          </span>
        ),
      },
      {
        id: 'bankAccountName',
        key: 'bankAccountName',
        header: 'Rekening',
        cell: ({ row }) => (
          <Badge variant="default" className="font-medium">
            {row.bankAccountName}
          </Badge>
        ),
      },
      {
        id: 'description',
        key: 'description',
        header: 'Deskripsi / Kategori Transaksi',
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <p className="font-semibold text-slate-900 dark:text-white text-xs">
              {row.description}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 italic">
              {row.coaAccountName || row.counterpartyBankName || row.transactionNumber || '-'}
            </p>
          </div>
        ),
      },
      {
        id: 'sourceType',
        key: 'sourceType',
        header: 'Tipe Sumber',
        align: 'center',
        cell: ({ row }) => {
          const badge = getSourceBadge(row.sourceType, row.direction);
          return <Badge variant={badge.variant}>{badge.label}</Badge>;
        },
      },
      {
        id: 'amount',
        key: 'amount',
        header: 'Mutasi Kas (Rp)',
        align: 'right',
        cell: ({ row }) => (
          <span
            className={`font-mono font-bold text-xs whitespace-nowrap ${
              row.direction === 'INFLOW'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-500'
            }`}
          >
            {row.direction === 'INFLOW' ? '+' : '-'}
            {formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        id: 'runningBalance',
        key: 'runningBalance',
        header: 'Saldo Berjalan',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
            {formatCurrency(row.runningBalance || 0)}
          </span>
        ),
      },
      {
        id: 'actions',
        key: 'actions',
        header: 'Aksi',
        align: 'center',
        cell: ({ row }) =>
          row.referenceType === 'INVOICE' && row.referenceId ? (
            <button
              type="button"
              onClick={() => onDrillDownInvoice?.(row.referenceId!)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Faktur #{row.referenceNumber} <ArrowUpRight className="h-3 w-3" />
            </button>
          ) : row.referenceType === 'PO' && row.referenceId ? (
            <button
              type="button"
              onClick={() => onDrillDownPO?.(row.referenceId!)}
              className="text-[11px] font-semibold text-amber-600 hover:text-amber-800 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              PO #{row.referenceNumber} <ArrowUpRight className="h-3 w-3" />
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 italic">-</span>
          ),
      },
    ],
    [onDrillDownInvoice, onDrillDownPO]
  );

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="w-full sm:w-64">
          <Input
            icon={Search}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari transaksi, nomor faktur/PO..."
            inputSize="sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <DateRangePicker
            value={dateRangeValue}
            onChange={(range) =>
              setFilters((prev) => ({
                ...prev,
                cash_start_date: formatDateParam(range.from),
                cash_end_date: formatDateParam(range.to),
                cash_page: '1',
              }))
            }
            align="right"
            defaultShortcut="thisMonth"
          />
          {(filters.cash_start_date || filters.cash_end_date) && (
            <button
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  cash_start_date: '',
                  cash_end_date: '',
                  cash_page: '1',
                }))
              }
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline whitespace-nowrap cursor-pointer"
            >
              Reset Tgl
            </button>
          )}
        </div>
      </div>

      <CustomTable<CashMutationTableRow>
        data={rows}
        columns={columns}
        loading={loading}
        pagination
        currentPage={page}
        perPage={perPage}
        total={total}
        lastPage={lastPage}
        onPageChange={(nextPage) => setFilter('cash_page', String(nextPage))}
        onPerPageChange={(nextPerPage) =>
          setFilters((prev) => ({ ...prev, cash_per_page: String(nextPerPage), cash_page: '1' }))
        }
        emptyTitle="Belum ada transaksi mutasi kas"
        emptyDescription="Catat pengeluaran operasional, kas masuk, atau pelunasan tagihan untuk melihat catatan mutasi di sini."
      />
    </Card>
  );
}
