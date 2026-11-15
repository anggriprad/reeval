'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Table } from '@/components/ui/Table';
import CustomTable, { type Column } from '@/components/ui/CustomTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useToast } from '@/context/ToastContext';
import {
  formatCurrency,
  formatDateTime,
  getInvoiceStatusLabel,
} from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import {
  invoiceService,
  mapAPPurchaseOrderDTO,
  mapInvoiceDTOToInvoice,
  type APPurchaseOrderViewModel,
  type InvoiceViewModel,
} from '@/services/invoice.service';
import {
  financeReportService,
  type AgingSummaryDTO,
} from '@/services/finance-report.service';
import { ARPaymentModal } from './ARPaymentModal';
import { APPaymentModal } from './APPaymentModal';
import {
  Check,
  CreditCard,
  Search,
  Wallet,
} from 'lucide-react';

interface InvoicesSectionProps {
  subTab: 'ar' | 'ap';
  onSubTabChange: (subTab: 'ar' | 'ap') => void;
  bankAccounts: BankAccount[];
  canPaymentAR: boolean;
  canPaymentAP: boolean;
  refreshTick?: number;
  onSuccess: () => void;
}

const EMPTY_AGING: AgingSummaryDTO = {
  total_outstanding: 0,
  unpaid_count: 0,
  current: 0,
  days_31_to_60: 0,
  days_61_to_90: 0,
  over_90: 0,
};

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

export function InvoicesSection({
  subTab,
  onSubTabChange,
  bankAccounts,
  canPaymentAR,
  canPaymentAP,
  refreshTick = 0,
  onSuccess,
}: InvoicesSectionProps) {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const { filters, setFilter, setFilters } = useTableFilters({
    ar_search: '',
    ar_status: 'ALL',
    ar_page: '1',
    ar_per_page: '20',
    ap_page: '1',
    ap_per_page: '20',
  });

  // ── AR Debounced Search ──
  const [arSearchInput, setArSearchInput] = useState(filters.ar_search || '');
  const [arSyncedSearch, setArSyncedSearch] = useState(filters.ar_search || '');
  const isArSearchInitial = useRef(true);

  if ((filters.ar_search || '') !== arSyncedSearch) {
    const next = filters.ar_search || '';
    setArSyncedSearch(next);
    setArSearchInput(next);
  }

  useEffect(() => {
    if (isArSearchInitial.current) {
      isArSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const normalized = arSearchInput.trim();
      if (normalized !== (filters.ar_search || '')) {
        setFilters((prev) => ({ ...prev, ar_search: normalized, ar_page: '1' }));
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [arSearchInput, filters.ar_search, setFilters]);

  // ── AR State ──
  const [arRows, setArRows] = useState<InvoiceViewModel[]>([]);
  const [arTotal, setArTotal] = useState(0);
  const [arLastPage, setArLastPage] = useState(1);
  const [arLoading, setArLoading] = useState(false);
  const [arAging, setArAging] = useState<AgingSummaryDTO>(EMPTY_AGING);
  const [totalPayable, setTotalPayable] = useState(0);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceViewModel | null>(null);
  const arFetchSeqRef = useRef(0);

  // ── AP State ──
  const [apRows, setApRows] = useState<APPurchaseOrderViewModel[]>([]);
  const [apTotal, setApTotal] = useState(0);
  const [apLastPage, setApLastPage] = useState(1);
  const [apLoading, setApLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<APPurchaseOrderViewModel | null>(null);
  const apFetchSeqRef = useRef(0);

  const arPage = Math.max(1, Number(filters.ar_page || '1') || 1);
  const arPerPage = Math.max(1, Number(filters.ar_per_page || '10') || 10);
  const apPage = Math.max(1, Number(filters.ap_page || '1') || 1);
  const apPerPage = Math.max(1, Number(filters.ap_per_page || '10') || 10);

  const loadSummaryMetrics = useCallback(async () => {
    try {
      const res = await financeReportService.getOverview();
      if (res.data) {
        setArAging(res.data.ar_aging || EMPTY_AGING);
        setTotalPayable(Number(res.data.total_ap ?? 0));
      }
    } catch {
      // Summary error is non-blocking; tables show explicit errors if needed
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    const seq = ++arFetchSeqRef.current;
    setArLoading(true);
    try {
      const statusParam =
        filters.ar_status && filters.ar_status !== 'ALL' ? filters.ar_status : undefined;
      const res = await invoiceService.getInvoices({
        page: arPage,
        per_page: arPerPage,
        search: filters.ar_search?.trim() || undefined,
        status: statusParam,
      });
      if (seq !== arFetchSeqRef.current) return;

      const mapped = Array.isArray(res.data) ? res.data.map(mapInvoiceDTOToInvoice) : [];
      const nextTotal = res.meta?.total ?? mapped.length;
      const nextLastPage = Math.max(1, res.meta?.total_pages ?? 1);
      if (nextTotal > 0 && arPage > nextLastPage) {
        setFilter('ar_page', String(nextLastPage));
        return;
      }
      setArRows(mapped);
      setArTotal(nextTotal);
      setArLastPage(nextLastPage);
    } catch (err: unknown) {
      if (seq !== arFetchSeqRef.current) return;
      toastRef.current.error(
        'Gagal Memuat Piutang (AR)',
        extractApiError(err, 'Gagal mengambil daftar invoice piutang.')
      );
    } finally {
      if (seq === arFetchSeqRef.current) {
        setArLoading(false);
      }
    }
  }, [arPage, arPerPage, filters.ar_search, filters.ar_status, setFilter]);

  const fetchAPPurchaseOrders = useCallback(async () => {
    const seq = ++apFetchSeqRef.current;
    setApLoading(true);
    try {
      const res = await invoiceService.getAPPurchaseOrders({
        page: apPage,
        per_page: apPerPage,
      });
      if (seq !== apFetchSeqRef.current) return;

      const mapped = Array.isArray(res.data) ? res.data.map(mapAPPurchaseOrderDTO) : [];
      const nextTotal = res.meta?.total ?? mapped.length;
      const nextLastPage = Math.max(1, res.meta?.total_pages ?? 1);
      if (nextTotal > 0 && apPage > nextLastPage) {
        setFilter('ap_page', String(nextLastPage));
        return;
      }
      setApRows(mapped);
      setApTotal(nextTotal);
      setApLastPage(nextLastPage);
    } catch (err: unknown) {
      if (seq !== apFetchSeqRef.current) return;
      toastRef.current.error(
        'Gagal Memuat Hutang Supplier (AP)',
        extractApiError(err, 'Gagal mengambil daftar tagihan PO.')
      );
    } finally {
      if (seq === apFetchSeqRef.current) {
        setApLoading(false);
      }
    }
  }, [apPage, apPerPage, setFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      loadSummaryMetrics();
    });
    return () => {
      active = false;
    };
  }, [loadSummaryMetrics, refreshTick]);

  useEffect(() => {
    if (subTab !== 'ar') return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      fetchInvoices();
    });
    return () => {
      active = false;
    };
  }, [subTab, fetchInvoices, refreshTick]);

  useEffect(() => {
    if (subTab !== 'ap') return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      fetchAPPurchaseOrders();
    });
    return () => {
      active = false;
    };
  }, [subTab, fetchAPPurchaseOrders, refreshTick]);

  const handlePaymentSuccess = async () => {
    await Promise.all([
      loadSummaryMetrics(),
      subTab === 'ar' ? fetchInvoices() : fetchAPPurchaseOrders(),
    ]);
    onSuccess();
  };

  const arColumns = useMemo<Column<InvoiceViewModel>[]>(
    () => [
      {
        id: 'invoiceNumber',
        header: 'No. Invoice',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {row.invoiceNumber}
          </span>
        ),
      },
      {
        id: 'salesOrderNumber',
        header: 'No. Order',
        cell: ({ row }) => <span className="font-mono text-slate-500">{row.salesOrderNumber}</span>,
      },
      {
        id: 'customerName',
        header: 'Pelanggan',
        cell: ({ row }) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.customerName}</span>
        ),
      },
      {
        id: 'totalAmount',
        header: 'Total Tagihan',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {formatCurrency(row.totalAmount)}
          </span>
        ),
      },
      {
        id: 'paidAmount',
        header: 'Terbayar',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(row.paidAmount)}
          </span>
        ),
      },
      {
        id: 'sisaPiutang',
        header: 'Sisa Piutang',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-red-600">
            {formatCurrency(row.remainingAmount)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        align: 'center',
        cell: ({ row }) => (
          <Badge
            variant={
              row.status === 'PAID'
                ? 'success'
                : row.status === 'PARTIAL'
                  ? 'warning'
                  : 'danger'
            }
          >
            {getInvoiceStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Aksi',
        align: 'center',
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            {row.status !== 'PAID' ? (
              canPaymentAR ? (
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => setSelectedInvoice(row)}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Input Bayar
                </Button>
              ) : (
                <span className="text-xs text-slate-400">-</span>
              )
            ) : (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                <Check className="h-3.5 w-3.5" /> Lunas
              </span>
            )}
          </div>
        ),
      },
    ],
    [canPaymentAR]
  );

  const apColumns = useMemo<Column<APPurchaseOrderViewModel>[]>(
    () => [
      {
        id: 'poNumber',
        header: 'No. PO',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {row.poNumber}
          </span>
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        cell: ({ row }) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.supplier}</span>
        ),
      },
      {
        id: 'totalAmount',
        header: 'Total Tagihan',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {formatCurrency(row.totalAmount)}
          </span>
        ),
      },
      {
        id: 'receivedAt',
        header: 'Tgl Diterima',
        cell: ({ row }) => (
          <span className="text-slate-500">
            {row.receivedAt ? formatDateTime(row.receivedAt) : '-'}
          </span>
        ),
      },
      {
        id: 'paymentStatus',
        header: 'Status Bayar',
        align: 'center',
        cell: ({ row }) => (
          <Badge
            variant={
              row.paymentStatus === 'PAID'
                ? 'success'
                : row.paymentStatus === 'PARTIAL'
                  ? 'warning'
                  : 'danger'
            }
          >
            {row.paymentStatus === 'PAID'
              ? 'Lunas'
              : row.paymentStatus === 'PARTIAL'
                ? 'Cicilan'
                : 'Belum Bayar'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Aksi',
        align: 'center',
        cell: ({ row }) => {
          const lastPayment = row.payments[row.payments.length - 1];
          const payBank = lastPayment?.bankAccountId
            ? bankAccounts.find((b) => String(b.id) === String(lastPayment.bankAccountId))
            : null;
          const bankLabel = payBank?.name || lastPayment?.bankAccountName || 'Bank';
          return row.paymentStatus !== 'PAID' ? (
            canPaymentAP ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => setSelectedPO(row)}
              >
                <Wallet className="h-3.5 w-3.5" /> Bayar Sekarang
              </Button>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )
          ) : (
            <span className="text-[11px] text-slate-500 font-medium">
              via <strong>{bankLabel}</strong>
            </span>
          );
        },
      },
    ],
    [canPaymentAP, bankAccounts]
  );

  const arStatusFilter = filters.ar_status || 'ALL';

  return (
    <div className="space-y-6">
      <SegmentedControl
        value={subTab}
        onChange={(t) => onSubTabChange(t as 'ar' | 'ap')}
        options={[
          { key: 'ar', label: 'Piutang Usaha (AR)' },
          { key: 'ap', label: 'Hutang Supplier (AP)' },
        ]}
      />

      {subTab === 'ar' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">0 - 30 Hari</span>
              <strong className="text-base font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(arAging.current)}
              </strong>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">31 - 60 Hari</span>
              <strong className="text-base font-bold text-amber-600">
                {formatCurrency(arAging.days_31_to_60)}
              </strong>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">61 - 90 Hari</span>
              <strong className="text-base font-bold text-orange-600">
                {formatCurrency(arAging.days_61_to_90)}
              </strong>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">&gt; 90 Hari (Macet)</span>
              <strong className="text-base font-bold text-red-600">
                {formatCurrency(arAging.over_90)}
              </strong>
            </div>
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-3.5 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-semibold">
                Total Piutang (AR)
              </span>
              <strong className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                {formatCurrency(arAging.total_outstanding)}
              </strong>
            </div>
          </div>

          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="w-full sm:w-64">
                <Input
                  icon={Search}
                  inputSize="sm"
                  value={arSearchInput}
                  onChange={(e) => setArSearchInput(e.target.value)}
                  placeholder="Cari invoice / pelanggan..."
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['ALL', 'UNPAID', 'PARTIAL', 'PAID'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, ar_status: st, ar_page: '1' }))
                    }
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      arStatusFilter === st
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'Semua'
                      : st === 'UNPAID'
                        ? 'Belum Bayar'
                        : st === 'PARTIAL'
                          ? 'Cicilan / DP'
                          : 'Lunas'}
                  </button>
                ))}
              </div>
            </div>

            <CustomTable<InvoiceViewModel>
              data={arRows}
              columns={arColumns}
              loading={arLoading}
              pagination
              currentPage={arPage}
              perPage={arPerPage}
              total={arTotal}
              lastPage={arLastPage}
              onPageChange={(nextPage) => setFilter('ar_page', String(nextPage))}
              onPerPageChange={(nextPerPage) =>
                setFilters((prev) => ({
                  ...prev,
                  ar_per_page: String(nextPerPage),
                  ar_page: '1',
                }))
              }
              emptyTitle="Belum ada invoice piutang"
              emptyDescription="Invoice otomatis terbit saat pengiriman barang pesanan diselesaikan driver."
              onRowClick={(inv) =>
                setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id)
              }
              expandedRowRender={(inv) => {
                if (expandedInvoiceId !== inv.id) return null;
                return (
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/30 space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2 text-xs border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
                      <div>
                        <span className="text-slate-400 mr-2">Tanggal Terbit:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatDateTime(inv.issuedAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 mr-2">Sales PIC:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {inv.salesName}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                        Riwayat Pembayaran Masuk
                      </h4>
                      {inv.payments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          Belum ada cicilan atau pembayaran masuk untuk invoice ini.
                        </p>
                      ) : (
                        <Table
                          dense
                          data={inv.payments}
                          columns={[
                            {
                              key: 'date',
                              header: 'Tanggal Pelunasan',
                              cell: (p) => (
                                <span className="text-slate-500 font-mono">
                                  {formatDateTime(p.date)}
                                </span>
                              ),
                            },
                            {
                              key: 'method',
                              header: 'Disetor ke Rekening',
                              cell: (p) => (
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {p.method}
                                </span>
                              ),
                            },
                            {
                              key: 'note',
                              header: 'Catatan / Memo',
                              cell: (p) => (
                                <span className="text-slate-500 italic">{p.note || '-'}</span>
                              ),
                            },
                            {
                              key: 'amount',
                              header: 'Jumlah Masuk',
                              align: 'right',
                              cell: (p) => (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                  +{formatCurrency(p.amount)}
                                </span>
                              ),
                            },
                          ]}
                        />
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </Card>
        </div>
      )}

      {subTab === 'ap' && (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tagihan Supplier (Purchase Order)
                </h3>
                <p className="text-xs text-slate-500">
                  PO bahan baku yang sudah diterima di gudang dan memerlukan pelunasan hutang.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="px-2.5 py-1 text-xs">
                  Total Hutang PO: {formatCurrency(totalPayable)}
                </Badge>
              </div>
            </div>

            <Card>
              <CustomTable<APPurchaseOrderViewModel>
                data={apRows}
                columns={apColumns}
                loading={apLoading}
                pagination
                currentPage={apPage}
                perPage={apPerPage}
                total={apTotal}
                lastPage={apLastPage}
                onPageChange={(nextPage) => setFilter('ap_page', String(nextPage))}
                onPerPageChange={(nextPerPage) =>
                  setFilters((prev) => ({
                    ...prev,
                    ap_per_page: String(nextPerPage),
                    ap_page: '1',
                  }))
                }
                emptyTitle="Belum ada tagihan supplier"
                emptyDescription="Tagihan hutang muncul otomatis saat kiriman bahan baku PO diterima di modul Inventaris."
              />
            </Card>
          </section>
        </div>
      )}

      <ARPaymentModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        bankAccounts={bankAccounts}
        onSuccess={handlePaymentSuccess}
      />

      <APPaymentModal
        po={selectedPO}
        onClose={() => setSelectedPO(null)}
        bankAccounts={bankAccounts}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
