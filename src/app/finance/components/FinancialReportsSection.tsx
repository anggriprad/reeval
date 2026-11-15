'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import CustomTable, { type Column } from '@/components/ui/CustomTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  financeReportService,
  mapHPPAnalysisItemDTO,
  type BalanceSheetDTO,
  type CashFlowStatementDTO,
  type HPPAnalysisViewModel,
  type IncomeStatementDTO,
} from '@/services/finance-report.service';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  ListFilter,
  Loader2,
  Search,
} from 'lucide-react';

export type ReportSubTab = 'income' | 'balance_sheet' | 'cashflow' | 'hpp_analysis';

interface FinancialReportsSectionProps {
  subTab: ReportSubTab;
  onSubTabChange: (subTab: ReportSubTab) => void;
  refreshTick?: number;
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

function getOrderStatusDisplay(rawStatus: string): {
  label: string;
  variant: 'default' | 'warning' | 'success' | 'info' | 'danger';
} {
  switch (rawStatus) {
    case 'PENDING':
      return { label: 'Belum Diproses', variant: 'warning' };
    case 'IN_PROGRESS':
    case 'IN_PRODUCTION':
      return { label: 'Sedang Berjalan', variant: 'default' };
    case 'READY':
      return { label: 'Siap Dikirim', variant: 'info' };
    case 'SENT':
    case 'COMPLETED':
      return { label: 'Selesai', variant: 'success' };
    case 'CANCELED':
      return { label: 'Dibatalkan', variant: 'danger' };
    default:
      return { label: rawStatus || '-', variant: 'default' };
  }
}

export function FinancialReportsSection({
  subTab,
  onSubTabChange,
  refreshTick = 0,
}: FinancialReportsSectionProps) {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const { filters, setFilter, setFilters } = useTableFilters({
    hpp_search: '',
    hpp_status: 'ALL',
    hpp_page: '1',
    hpp_per_page: '20',
  });

  // ── Income Statement State ──
  const [incomeData, setIncomeData] = useState<IncomeStatementDTO | null>(null);
  const [incomeLoading, setIncomeLoading] = useState(false);

  // ── Balance Sheet State ──
  const [balanceData, setBalanceData] = useState<BalanceSheetDTO | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // ── Cash Flow State ──
  const [cashFlowData, setCashFlowData] = useState<CashFlowStatementDTO | null>(null);
  const [cashFlowLoading, setCashFlowLoading] = useState(false);

  // ── HPP Analysis State & Debounce ──
  const [hppSearchInput, setHppSearchInput] = useState(filters.hpp_search || '');
  const [hppSyncedSearch, setHppSyncedSearch] = useState(filters.hpp_search || '');
  const isHppSearchInitial = useRef(true);

  if ((filters.hpp_search || '') !== hppSyncedSearch) {
    const next = filters.hpp_search || '';
    setHppSyncedSearch(next);
    setHppSearchInput(next);
  }

  useEffect(() => {
    if (isHppSearchInitial.current) {
      isHppSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const normalized = hppSearchInput.trim();
      if (normalized !== (filters.hpp_search || '')) {
        setFilters((prev) => ({ ...prev, hpp_search: normalized, hpp_page: '1' }));
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [hppSearchInput, filters.hpp_search, setFilters]);

  const [hppRows, setHppRows] = useState<HPPAnalysisViewModel[]>([]);
  const [hppTotal, setHppTotal] = useState(0);
  const [hppLastPage, setHppLastPage] = useState(1);
  const [hppLoading, setHppLoading] = useState(false);
  const [selectedHPPOrder, setSelectedHPPOrder] = useState<HPPAnalysisViewModel | null>(null);
  const hppFetchSeqRef = useRef(0);

  const hppPage = Math.max(1, Number(filters.hpp_page || '1') || 1);
  const hppPerPage = Math.max(1, Number(filters.hpp_per_page || '20') || 20);

  const fetchIncomeStatement = useCallback(async () => {
    setIncomeLoading(true);
    try {
      const res = await financeReportService.getIncomeStatement();
      if (res.data) {
        setIncomeData(res.data);
      }
    } catch (err: unknown) {
      toastRef.current.error(
        'Gagal Memuat Laba Rugi',
        extractApiError(err, 'Gagal menghitung laporan laba rugi.')
      );
    } finally {
      setIncomeLoading(false);
    }
  }, []);

  const fetchBalanceSheet = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await financeReportService.getBalanceSheet();
      if (res.data) {
        setBalanceData(res.data);
      }
    } catch (err: unknown) {
      toastRef.current.error(
        'Gagal Memuat Neraca',
        extractApiError(err, 'Gagal menghitung laporan neraca keuangan.')
      );
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const fetchCashFlow = useCallback(async () => {
    setCashFlowLoading(true);
    try {
      const res = await financeReportService.getCashFlowStatement();
      if (res.data) {
        setCashFlowData(res.data);
      }
    } catch (err: unknown) {
      toastRef.current.error(
        'Gagal Memuat Arus Kas',
        extractApiError(err, 'Gagal menghitung laporan arus kas.')
      );
    } finally {
      setCashFlowLoading(false);
    }
  }, []);

  const fetchHPPAnalysis = useCallback(async () => {
    const seq = ++hppFetchSeqRef.current;
    setHppLoading(true);
    try {
      const statusParam =
        filters.hpp_status && filters.hpp_status !== 'ALL' ? filters.hpp_status : undefined;
      const res = await financeReportService.getHPPAnalysis({
        page: hppPage,
        per_page: hppPerPage,
        search: filters.hpp_search?.trim() || undefined,
        status: statusParam,
      });
      if (seq !== hppFetchSeqRef.current) return;

      const mapped = Array.isArray(res.data) ? res.data.map(mapHPPAnalysisItemDTO) : [];
      const nextTotal = res.meta?.total ?? mapped.length;
      const nextLastPage = Math.max(1, res.meta?.total_pages ?? 1);
      if (nextTotal > 0 && hppPage > nextLastPage) {
        setFilter('hpp_page', String(nextLastPage));
        return;
      }
      setHppRows(mapped);
      setHppTotal(nextTotal);
      setHppLastPage(nextLastPage);
    } catch (err: unknown) {
      if (seq !== hppFetchSeqRef.current) return;
      toastRef.current.error(
        'Gagal Memuat Analisis HPP',
        extractApiError(err, 'Gagal mengambil data analisis HPP & margin.')
      );
    } finally {
      if (seq === hppFetchSeqRef.current) {
        setHppLoading(false);
      }
    }
  }, [hppPage, hppPerPage, filters.hpp_search, filters.hpp_status, setFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      if (subTab === 'income') {
        fetchIncomeStatement();
      } else if (subTab === 'balance_sheet') {
        fetchBalanceSheet();
      } else if (subTab === 'cashflow') {
        fetchCashFlow();
      } else if (subTab === 'hpp_analysis') {
        fetchHPPAnalysis();
      }
    });
    return () => {
      active = false;
    };
  }, [subTab, fetchIncomeStatement, fetchBalanceSheet, fetchCashFlow, fetchHPPAnalysis, refreshTick]);

  const grossProfit = incomeData ? incomeData.gross_profit : 0;
  const totalRevenue = incomeData ? incomeData.total_revenue : 0;
  const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const hppColumns = useMemo<Column<HPPAnalysisViewModel>[]>(
    () => [
      {
        id: 'createdAt',
        header: 'Tgl Pesanan',
        cell: ({ row }) => (
          <span className="font-mono text-slate-500 whitespace-nowrap">
            {formatDateTime(row.createdAt)}
          </span>
        ),
      },
      {
        id: 'customerName',
        header: 'Nama Pelanggan',
        cell: ({ row }) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {row.customerName}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        align: 'center',
        cell: ({ row }) => {
          const st = getOrderStatusDisplay(row.rawStatus);
          return <Badge variant={st.variant}>{st.label}</Badge>;
        },
      },
      {
        id: 'sellingPrice',
        header: 'Harga Jual',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-mono font-medium text-slate-900 dark:text-white">
            {formatCurrency(row.sellingPrice)}
          </span>
        ),
      },
      {
        id: 'grossMarginPercent',
        header: 'Margin (%)',
        align: 'center',
        cell: ({ row }) => (
          <Badge
            variant={
              row.grossMarginPercent >= 20
                ? 'success'
                : row.grossMarginPercent >= 10
                  ? 'warning'
                  : 'danger'
            }
            className="font-mono text-[11px]"
          >
            {row.grossMarginPercent.toFixed(1)}%
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <SegmentedControl
        value={subTab}
        onChange={(t) => onSubTabChange(t as ReportSubTab)}
        options={[
          { key: 'income', label: 'Laba Rugi' },
          { key: 'balance_sheet', label: 'Neraca Keuangan' },
          { key: 'cashflow', label: 'Arus Kas' },
          { key: 'hpp_analysis', label: 'Analisis HPP & Margin' },
        ]}
      />

      {/* ── 5.1: Income Statement (Laba Rugi) ── */}
      {subTab === 'income' && (
        <Card className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">
              Laporan Laba Rugi (Profit &amp; Loss Statement)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Standar Manufaktur PSAK — Akumulasi Periode Berjalan</p>
          </div>

          {incomeLoading && !incomeData ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Menghitung laba rugi dari buku besar...
            </div>
          ) : (
            <div className="space-y-4 text-xs">
                {/* 1. Pendapatan Usaha */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>1. PENDAPATAN USAHA (REVENUE)</span>
                    <span className="font-mono">{formatCurrency(incomeData?.total_revenue ?? 0)}</span>
                  </div>
                  {(incomeData?.revenue_items?.length ?? 0) === 0 ? (
                    <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-400 italic border-b border-slate-100 dark:border-slate-800">
                      <span>Belum ada jurnal pendapatan pada periode ini</span>
                      <span className="font-mono">{formatCurrency(0)}</span>
                    </div>
                  ) : (
                    incomeData?.revenue_items.map((item) => (
                      <div
                        key={item.account_id}
                        className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                      >
                        <span>
                          {item.account_code} - {item.account_name}
                        </span>
                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* 2. Harga Pokok Penjualan (HPP) */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>2. HARGA POKOK PENJUALAN (HPP / COGS)</span>
                    <span className="font-mono text-red-600 dark:text-red-400">
                      ({formatCurrency(incomeData?.total_cogs ?? 0)})
                    </span>
                  </div>
                  {(incomeData?.cogs_items?.length ?? 0) === 0 ? (
                    <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-400 italic border-b border-slate-100 dark:border-slate-800">
                      <span>Belum ada jurnal HPP pada periode ini</span>
                      <span className="font-mono text-red-600">({formatCurrency(0)})</span>
                    </div>
                  ) : (
                    incomeData?.cogs_items.map((item) => (
                      <div
                        key={item.account_id}
                        className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                      >
                        <span>
                          {item.account_code} - {item.account_name}
                        </span>
                        <span className="font-mono text-red-600">({formatCurrency(item.amount)})</span>
                      </div>
                    ))
                  )}
                </div>

                {/* 3. Laba Kotor */}
                <div className="flex justify-between py-2.5 px-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-sm font-black text-indigo-900 dark:text-indigo-200">
                  <span>LABA KOTOR (GROSS PROFIT) — Margin: {grossMarginPercent.toFixed(1)}%</span>
                  <span className="font-mono">{formatCurrency(grossProfit)}</span>
                </div>

                {/* 4. Beban Operasional */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>3. BEBAN OPERASIONAL &amp; UMUM (OPEX)</span>
                    <span className="font-mono text-red-600 dark:text-red-400">
                      ({formatCurrency(incomeData?.total_expense ?? 0)})
                    </span>
                  </div>
                  {(incomeData?.expense_items?.length ?? 0) === 0 ? (
                    <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-400 italic border-b border-slate-100 dark:border-slate-800">
                      <span>Belum ada jurnal beban operasional pada periode ini</span>
                      <span className="font-mono text-red-600">({formatCurrency(0)})</span>
                    </div>
                  ) : (
                    incomeData?.expense_items.map((item) => (
                      <div
                        key={item.account_id}
                        className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                      >
                        <span>
                          {item.account_code} - {item.account_name}
                        </span>
                        <span className="font-mono text-red-600">({formatCurrency(item.amount)})</span>
                      </div>
                    ))
                  )}
                </div>

                {/* 5. Laba Bersih */}
                <div
                  className={`flex justify-between py-3.5 px-4 rounded-xl text-base font-black border ${
                    (incomeData?.net_profit ?? 0) >= 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
                  }`}
                >
                  <span>LABA BERSIH BERJALAN (NET PROFIT)</span>
                  <span className="font-mono">{formatCurrency(incomeData?.net_profit ?? 0)}</span>
                </div>
            </div>
          )}
        </Card>
      )}

      {/* ── 5.2: Balance Sheet (Neraca) ── */}
      {subTab === 'balance_sheet' && (
        <Card className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">
              Neraca Keuangan (Balance Sheet)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Posisi Keuangan Per Tanggal Hari Ini</p>
            <div
              className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                balanceData?.is_balanced !== false
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
              }`}
            >
              {balanceData?.is_balanced !== false ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Status: Neraca Seimbang (ASET = LIABILITAS + EKUITAS)
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Status: Penyesuaian
                </>
              )}
            </div>
          </div>

          {balanceLoading && !balanceData ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Menghitung neraca keuangan...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Sisi Kiri: ASET */}
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 uppercase tracking-wide">
                      Aset (ASSETS)
                    </h3>

                    {(() => {
                      const assetItems = balanceData?.asset_items ?? [];
                      const currentAssets = assetItems.filter(
                        (item) => !item.account_code.startsWith('1-2')
                      );
                      const fixedAssets = assetItems.filter((item) =>
                        item.account_code.startsWith('1-2')
                      );
                      const totalCurrentAssets = currentAssets.reduce(
                        (sum, item) => sum + item.amount,
                        0
                      );
                      const totalFixedAssets = fixedAssets.reduce(
                        (sum, item) => sum + item.amount,
                        0
                      );

                      return (
                        <>
                          {/* Aset Lancar */}
                          <div className="space-y-2 mb-4">
                            <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                              Aset Lancar
                            </p>
                            {currentAssets.length === 0 ? (
                              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700 text-slate-400 italic">
                                <span>Tidak ada saldo aset lancar</span>
                                <span className="font-mono font-semibold">{formatCurrency(0)}</span>
                              </div>
                            ) : (
                              currentAssets.map((item) => (
                                <div
                                  key={item.account_id}
                                  className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700"
                                >
                                  <span>
                                    {item.account_code} - {item.account_name}
                                  </span>
                                  <span className="font-mono font-semibold">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              ))
                            )}
                            <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                              <span>Total Aset Lancar</span>
                              <span className="font-mono">{formatCurrency(totalCurrentAssets)}</span>
                            </div>
                          </div>

                          {/* Aset Tetap */}
                          <div className="space-y-2">
                            <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                              Aset Tetap &amp; Peralatan
                            </p>
                            {fixedAssets.length === 0 ? (
                              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700 text-slate-400 italic">
                                <span>Tidak ada saldo aset tetap</span>
                                <span className="font-mono font-semibold">{formatCurrency(0)}</span>
                              </div>
                            ) : (
                              fixedAssets.map((item) => (
                                <div
                                  key={item.account_id}
                                  className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700"
                                >
                                  <span>
                                    {item.account_code} - {item.account_name}
                                  </span>
                                  <span className="font-mono font-semibold">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              ))
                            )}
                            <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                              <span>Total Aset Tetap</span>
                              <span className="font-mono">{formatCurrency(totalFixedAssets)}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-sm font-black text-indigo-900 dark:text-indigo-200">
                    <span>TOTAL ASET</span>
                    <span className="font-mono">{formatCurrency(balanceData?.total_assets ?? 0)}</span>
                  </div>
                </div>

                {/* Sisi Kanan: LIABILITAS & EKUITAS */}
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 uppercase tracking-wide">
                      Liabilitas &amp; Ekuitas
                    </h3>

                    {/* Liabilitas */}
                    <div className="space-y-2 mb-4">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        Liabilitas Jangka Pendek
                      </p>
                      {(balanceData?.liability_items?.length ?? 0) === 0 ? (
                        <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700 text-slate-400 italic">
                          <span>Tidak ada saldo liabilitas</span>
                          <span className="font-mono">{formatCurrency(0)}</span>
                        </div>
                      ) : (
                        balanceData?.liability_items.map((item) => (
                          <div
                            key={item.account_id}
                            className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700"
                          >
                            <span>
                              {item.account_code} - {item.account_name}
                            </span>
                            <span className="font-mono font-semibold">{formatCurrency(item.amount)}</span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total Liabilitas</span>
                        <span className="font-mono">{formatCurrency(balanceData?.total_liabilities ?? 0)}</span>
                      </div>
                    </div>

                    {/* Ekuitas */}
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        Ekuitas
                      </p>
                      {balanceData?.equity_items.map((item) => (
                        <div
                          key={item.account_id}
                          className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700"
                        >
                          <span>
                            {item.account_code} - {item.account_name}
                          </span>
                          <span className="font-mono font-semibold">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>Laba Bersih Berjalan (Laba Ditahan)</span>
                        <span
                          className={`font-mono font-semibold ${
                            (balanceData?.current_net_profit ?? 0) >= 0
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(balanceData?.current_net_profit ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total Ekuitas</span>
                        <span className="font-mono">{formatCurrency(balanceData?.total_equity ?? 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-sm font-black text-purple-900 dark:text-purple-200">
                    <span>TOTAL LIABILITAS &amp; EKUITAS</span>
                    <span className="font-mono">
                      {formatCurrency(balanceData?.total_liabilities_and_equity ?? 0)}
                    </span>
                  </div>
                </div>
            </div>
          )}
        </Card>
      )}

      {/* ── 5.3: Cash Flow Statement (Arus Kas) ── */}
      {subTab === 'cashflow' && (
        <Card className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">
              Laporan Arus Kas (Cash Flow Statement)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Metode Langsung (Direct Method) — Arus Kas Masuk &amp; Keluar Riil
            </p>
          </div>

          {cashFlowLoading && !cashFlowData ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Menghitung arus kas...
            </div>
          ) : (
            <div className="space-y-4 text-xs">
                {/* 1. Aktivitas Operasi */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>A. ARUS KAS DARI AKTIVITAS OPERASI</span>
                    <span className="font-mono">
                      {formatCurrency(cashFlowData?.net_operating_cash_flow ?? 0)}
                    </span>
                  </div>
                  {(cashFlowData?.operating_items?.length ?? 0) === 0 ? (
                    <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-400 italic border-b border-slate-100 dark:border-slate-800">
                      <span>Belum ada arus kas aktivitas operasi</span>
                      <span className="font-mono">{formatCurrency(0)}</span>
                    </div>
                  ) : (
                    cashFlowData?.operating_items.map((item, idx) => (
                      <div
                        key={`op-${idx}-${item.source_type}-${item.account_code || ''}`}
                        className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                      >
                        <span>
                          {item.direction === 'INFLOW' ? '(+) ' : '(-) '}
                          {item.label}
                          {item.account_name ? ` (${item.account_name})` : ''}
                        </span>
                        <span
                          className={`font-mono ${
                            item.direction === 'INFLOW' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {item.direction === 'INFLOW' ? '+' : '-'}
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* 2. Aktivitas Investasi */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>B. ARUS KAS DARI AKTIVITAS INVESTASI</span>
                    <span className="font-mono">
                      {formatCurrency(cashFlowData?.net_investing_cash_flow ?? 0)}
                    </span>
                  </div>
                  {(cashFlowData?.investing_items?.length ?? 0) === 0 ? (
                    <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-400 italic border-b border-slate-100 dark:border-slate-800">
                      <span>Tidak ada aktivitas investasi pada periode ini</span>
                      <span className="font-mono">{formatCurrency(0)}</span>
                    </div>
                  ) : (
                    cashFlowData?.investing_items.map((item, idx) => (
                      <div
                        key={`inv-${idx}-${item.source_type}-${item.account_code || ''}`}
                        className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                      >
                        <span>
                          {item.direction === 'INFLOW' ? '(+) ' : '(-) '}
                          {item.label}
                          {item.account_name ? ` (${item.account_name})` : ''}
                        </span>
                        <span
                          className={`font-mono ${
                            item.direction === 'INFLOW' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {item.direction === 'INFLOW' ? '+' : '-'}
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* 3. Aktivitas Pendanaan */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>C. ARUS KAS DARI AKTIVITAS PENDANAAN</span>
                    <span className="font-mono">
                      {formatCurrency(cashFlowData?.net_financing_cash_flow ?? 0)}
                    </span>
                  </div>
                  {(cashFlowData?.financing_items?.length ?? 0) === 0 ? (
                    <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-400 italic border-b border-slate-100 dark:border-slate-800">
                      <span>Tidak ada aktivitas pendanaan pada periode ini</span>
                      <span className="font-mono">{formatCurrency(0)}</span>
                    </div>
                  ) : (
                    cashFlowData?.financing_items.map((item, idx) => (
                      <div
                        key={`fin-${idx}-${item.source_type}-${item.account_code || ''}`}
                        className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                      >
                        <span>
                          {item.direction === 'INFLOW' ? '(+) ' : '(-) '}
                          {item.label}
                          {item.account_name ? ` (${item.account_name})` : ''}
                        </span>
                        <span
                          className={`font-mono ${
                            item.direction === 'INFLOW' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {item.direction === 'INFLOW' ? '+' : '-'}
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

              {/* Rekonsiliasi Kas */}
              <div className="pt-2 space-y-2">
                <div className="flex justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-sm">
                  <span>KENAIKAN / (PENURUNAN) BERSIH KAS</span>
                  <span className="font-mono">{formatCurrency(cashFlowData?.net_cash_change ?? 0)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-black text-emerald-900 dark:text-emerald-200 text-sm">
                  <span>SALDO KAS &amp; BANK AKHIR RIIL</span>
                  <span className="font-mono">{formatCurrency(cashFlowData?.ending_cash ?? 0)}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── 5.4: Analisis HPP & Margin per Order ── */}
      {subTab === 'hpp_analysis' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 max-w-xs">
              <Input
                icon={Search}
                placeholder="Cari pelanggan atau no. order..."
                value={hppSearchInput}
                onChange={(e) => setHppSearchInput(e.target.value)}
              />
            </div>
            <Select
              icon={ListFilter}
              value={filters.hpp_status || 'ALL'}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  hpp_status: e.target.value,
                  hpp_page: '1',
                }))
              }
              activeHighlight
              options={[
                { value: 'ALL', label: 'Semua Status' },
                { value: 'PENDING', label: 'Belum Diproses' },
                { value: 'IN_PROGRESS', label: 'Sedang Berjalan' },
                { value: 'SENT', label: 'Selesai' },
              ]}
            />
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Menampilkan {hppRows.length} dari {hppTotal} pesanan
          </div>

          <Card>
            <CustomTable<HPPAnalysisViewModel>
              data={hppRows}
              columns={hppColumns}
              loading={hppLoading}
              pagination
              currentPage={hppPage}
              perPage={hppPerPage}
              total={hppTotal}
              lastPage={hppLastPage}
              onPageChange={(nextPage) => setFilter('hpp_page', String(nextPage))}
              onPerPageChange={(nextPerPage) =>
                setFilters((prev) => ({
                  ...prev,
                  hpp_per_page: String(nextPerPage),
                  hpp_page: '1',
                }))
              }
              emptyTitle="Tidak ada pesanan ditemukan"
              emptyDescription="Data analisis margin akan muncul otomatis saat ada pesanan baru masuk."
              onRowClick={(row) => setSelectedHPPOrder(row)}
            />
          </Card>

          <Modal
            isOpen={!!selectedHPPOrder}
            onClose={() => setSelectedHPPOrder(null)}
            title="Detail Analisis HPP & Margin"
            size="md"
            actions={
              <Button variant="outline" size="sm" onClick={() => setSelectedHPPOrder(null)}>
                Tutup Rincian
              </Button>
            }
          >
            {selectedHPPOrder && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800 text-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                    <span className="text-slate-500 font-semibold">Nomor Sales Order</span>
                    <Link
                      href={`/order/${selectedHPPOrder.id}`}
                      className="font-mono font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded"
                      title="Buka Halaman Detail Order"
                    >
                      {selectedHPPOrder.orderNumber} <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider text-[10px]">
                      Rincian Komponen HPP
                    </h4>
                    <div className="space-y-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Biaya Material (BOM)
                        </span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {formatCurrency(selectedHPPOrder.materialCost)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Biaya Upah (Labor)
                        </span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {formatCurrency(selectedHPPOrder.laborCost)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">Total Harga Jual</span>
                      <span className="font-mono text-slate-900 dark:text-white">
                        {formatCurrency(selectedHPPOrder.sellingPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">Total HPP Produksi</span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        -{formatCurrency(selectedHPPOrder.totalHPP)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      Laba Kotor (Margin)
                    </span>
                    <div className="text-right">
                      <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                        +{formatCurrency(selectedHPPOrder.grossProfit)}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                        Persentase:{' '}
                        <span
                          className={
                            selectedHPPOrder.grossMarginPercent >= 20
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }
                        >
                          {selectedHPPOrder.grossMarginPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
