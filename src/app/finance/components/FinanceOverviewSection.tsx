'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, KPICard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  financeReportService,
  type FinanceOverviewDTO,
} from '@/services/finance-report.service';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';

interface FinanceOverviewSectionProps {
  refreshTick?: number;
  onNavigateTab: (tab: 'cash_bank' | 'invoices', subTab?: 'ar' | 'ap') => void;
}

export function FinanceOverviewSection({
  refreshTick = 0,
  onNavigateTab,
}: FinanceOverviewSectionProps) {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const [overview, setOverview] = useState<FinanceOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeReportService.getOverview();
      if (res.data) {
        setOverview(res.data);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : 'Gagal memuat ringkasan keuangan');
      toastRef.current.error('Gagal Memuat Ringkasan', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void loadOverview();
      }
    });
    return () => {
      active = false;
    };
  }, [loadOverview, refreshTick]);

  const totalBankBalance = overview?.total_bank_balance ?? 0;
  const activeBankCount = overview?.active_bank_count ?? 0;
  const totalAR = overview?.total_ar ?? 0;
  const unpaidInvoiceCount = overview?.unpaid_invoice_count ?? 0;
  const totalAP = overview?.total_ap ?? 0;
  const unpaidAPCount = overview?.unpaid_ap_count ?? 0;
  const totalRevenue = overview?.total_revenue ?? 0;
  const totalExpense = overview?.total_expense ?? 0;
  const netProfit = overview?.net_profit ?? 0;
  const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const arAging = overview?.ar_aging ?? {
    total_outstanding: 0,
    unpaid_count: 0,
    current: 0,
    days_31_to_60: 0,
    days_61_to_90: 0,
    over_90: 0,
  };
  const apAging = overview?.ap_aging ?? {
    total_outstanding: 0,
    unpaid_count: 0,
    current: 0,
    days_31_to_60: 0,
    days_61_to_90: 0,
    over_90: 0,
  };
  const recentMutations = overview?.recent_mutations ?? [];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <KPICard
          title="Kas & Bank"
          value={loading && !overview ? '...' : formatCurrency(totalBankBalance)}
          icon={<Wallet className="h-5 w-5 text-indigo-500" />}
          subtitle={`${activeBankCount} rekening terdaftar`}
        />
        <KPICard
          title="Piutang Usaha"
          value={loading && !overview ? '...' : formatCurrency(totalAR)}
          icon={<Receipt className="h-5 w-5 text-blue-500" />}
          subtitle={`${unpaidInvoiceCount} invoice belum lunas`}
        />
        <KPICard
          title="Hutang Supplier"
          value={loading && !overview ? '...' : formatCurrency(totalAP)}
          icon={<CreditCard className="h-5 w-5 text-amber-500" />}
          subtitle={`${unpaidAPCount} PO belum dibayar`}
        />
        <KPICard
          title="Pendapatan (Omzet)"
          value={loading && !overview ? '...' : formatCurrency(totalRevenue)}
          icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
          subtitle="Tercatat di jurnal penjualan"
        />
        <KPICard
          title="Beban Operasional"
          value={loading && !overview ? '...' : formatCurrency(totalExpense)}
          icon={<ArrowUpRight className="h-5 w-5 text-red-500" />}
          subtitle="Akumulasi akun beban (OPEX)"
        />
        <KPICard
          title="Laba Bersih Aktual"
          value={loading && !overview ? '...' : formatCurrency(netProfit)}
          icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
          subtitle={`Margin: ${netMarginPercent.toFixed(1)}%`}
          trend={netProfit >= 0 ? 'up' : 'down'}
          trendValue={netProfit >= 0 ? 'Surplus' : 'Defisit'}
        />
      </div>

      {/* 2-Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Recent Cash Inflow / Outflow (3/5) */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <DollarSign className="h-4 w-4 text-indigo-500" />
              Arus Kas Terkini (Real-time Mutasi)
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigateTab('cash_bank')}
            >
              Lihat Rekening →
            </Button>
          </div>

          {loading && !overview ? (
            <p className="text-xs text-slate-400 italic py-8 text-center">
              Memuat mutasi kas terbaru...
            </p>
          ) : recentMutations.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-8 text-center">
              Belum ada mutasi kas tercatat.
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentMutations.slice(0, 7).map((tx) => (
                <div
                  key={tx.mutation_key || tx.id}
                  className="flex items-center justify-between py-3 gap-4 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        tx.direction === 'INFLOW'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
                          : 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50'
                      }`}
                    >
                      {tx.direction === 'INFLOW' ? (
                        <ArrowDownRight className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {tx.description}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateTime(tx.date)} · Akun:{' '}
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {tx.bank_account_name}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold whitespace-nowrap ${
                      tx.direction === 'INFLOW'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500'
                    }`}
                  >
                    {tx.direction === 'INFLOW' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Quick Financial Health & Aging Summary (2/5) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Piutang Summary Card */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status Piutang (AR)
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('invoices', 'ar')}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
              >
                Kelola →
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-slate-400 block">
                  Total Outstanding Tagihan
                </span>
                <strong className="text-xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(totalAR)}
                </strong>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">
                    0 - 30 Hari
                  </span>
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {formatCurrency(arAging.current)}
                  </strong>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg">
                  <span className="text-amber-700 dark:text-amber-400 block text-[10px]">
                    &gt; 30 Hari (Jatuh Tempo)
                  </span>
                  <strong className="text-amber-800 dark:text-amber-300 font-semibold">
                    {formatCurrency(
                      arAging.days_31_to_60 +
                        arAging.days_61_to_90 +
                        arAging.over_90
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </Card>

          {/* Hutang Summary Card */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status Hutang Supplier (AP)
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('invoices', 'ap')}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
              >
                Kelola →
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-slate-400 block">
                  Total Tagihan PO Belum Lunas
                </span>
                <strong className="text-xl font-black text-red-600 dark:text-red-400">
                  {formatCurrency(totalAP)}
                </strong>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">
                    0 - 30 Hari
                  </span>
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {formatCurrency(apAging.current)}
                  </strong>
                </div>
                <div className="bg-red-50/50 dark:bg-red-950/20 p-2 rounded-lg">
                  <span className="text-red-600 dark:text-red-400 block text-[10px]">
                    &gt; 30 Hari
                  </span>
                  <strong className="text-red-700 dark:text-red-300 font-semibold">
                    {formatCurrency(
                      apAging.days_31_to_60 +
                        apAging.days_61_to_90 +
                        apAging.over_90
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
