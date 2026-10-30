'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Table, type TableColumn } from '@/components/ui/Table';
import {
  Zap,
  CheckCircle,
  DollarSign,
  Clock,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { workOrderService, type ProductionAnalyticsResponse } from '@/services/work-order.service';
import type { WorkOrder, ProductionOperation, ProductionOperator } from '@/lib/types';

export type AnalyticsPeriod = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'ALL';

export const ANALYTICS_PERIOD_OPTIONS = [
  { value: 'THIS_MONTH', label: 'Bulan Ini' },
  { value: 'LAST_MONTH', label: 'Bulan Lalu' },
  { value: 'THIS_QUARTER', label: 'Kuartal Ini' },
  { value: 'THIS_YEAR', label: 'Tahun Ini' },
  { value: 'ALL', label: 'Semua Periode' },
];

function isDateInPeriod(dateStr: string | undefined, period: AnalyticsPeriod): boolean {
  if (!dateStr) return false;
  if (period === 'ALL') return true;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (period) {
    case 'THIS_MONTH':
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    case 'LAST_MONTH': {
      const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getFullYear() === targetYear && date.getMonth() === targetMonth;
    }
    case 'THIS_QUARTER': {
      const currentQuarter = Math.floor(currentMonth / 3);
      const dateQuarter = Math.floor(date.getMonth() / 3);
      return date.getFullYear() === currentYear && dateQuarter === currentQuarter;
    }
    case 'THIS_YEAR':
      return date.getFullYear() === currentYear;
    default:
      return true;
  }
}

interface ProductionAnalyticsTabProps {
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  workOrders: WorkOrder[];
  operations: ProductionOperation[];
  operators: ProductionOperator[];
}

export function ProductionAnalyticsTab({
  period,
  onPeriodChange,
  workOrders,
  operations,
  operators,
}: ProductionAnalyticsTabProps) {
  const [backendAnalytics, setBackendAnalytics] = useState<ProductionAnalyticsResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    workOrderService
      .getAnalytics(period)
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setBackendAnalytics(res.data);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat analitik dari backend, fallback ke kalkulasi lokal:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [period]);

  // Client-side fallback computations
  const periodWorkOrders = useMemo(() => {
    return workOrders.filter((w) => isDateInPeriod(w.completedAt || w.issuedAt, period));
  }, [workOrders, period]);

  const periodCompletedWOs = useMemo(() => {
    return periodWorkOrders.filter((w) => w.status === 'COMPLETED');
  }, [periodWorkOrders]);

  const periodCompletedJobCards = useMemo(() => {
    return workOrders.flatMap((w) =>
      w.jobCards.filter((j) => {
        if (j.status !== 'COMPLETED') return false;
        const relevantDate = j.completedAt || w.completedAt || w.issuedAt;
        return isDateInPeriod(relevantDate, period);
      })
    );
  }, [workOrders, period]);

  // 1. Time Efficiency Rate
  const onTimeJobsCount = periodCompletedJobCards.filter(
    (j) => (j.actualMinutes || 0) <= (j.plannedMinutes || 0)
  ).length;

  const totalCompletedJobs = periodCompletedJobCards.length;

  const timeEfficiencyRate =
    backendAnalytics?.time_efficiency_rate ??
    (totalCompletedJobs > 0 ? Math.round((onTimeJobsCount / totalCompletedJobs) * 100) : 100);

  // 2. SPK Completion Rate
  const completedWOsCount = backendAnalytics?.completed_work_orders ?? periodCompletedWOs.length;
  const totalWOsCount = backendAnalytics?.total_work_orders ?? periodWorkOrders.length;
  const spkCompletionRate =
    backendAnalytics?.spk_completion_rate ??
    (totalWOsCount > 0 ? Math.round((completedWOsCount / totalWOsCount) * 100) : 0);

  // 3. Labor Cost Budget & Variance
  const totalActualLaborCost =
    backendAnalytics?.total_actual_labor_cost ??
    periodWorkOrders.reduce((acc, w) => acc + (w.actualLaborCost || 0), 0);

  const totalPlannedLaborCost =
    backendAnalytics?.total_planned_labor_cost ??
    periodWorkOrders.reduce((acc, w) => acc + (w.plannedLaborCost || 0), 0);

  const laborCostSavings =
    backendAnalytics?.labor_cost_savings ?? (totalPlannedLaborCost - totalActualLaborCost);

  // 4. Average SPK Lead Time (Hours)
  const completedWOsWithTimes = periodCompletedWOs.filter((w) => w.completedAt && w.issuedAt);
  const avgLeadTimeHours =
    backendAnalytics?.avg_lead_time_hours != null
      ? backendAnalytics.avg_lead_time_hours
      : completedWOsWithTimes.length > 0
      ? (
          completedWOsWithTimes.reduce((acc, w) => {
            const ms = new Date(w.completedAt!).getTime() - new Date(w.issuedAt).getTime();
            return acc + ms / (1000 * 60 * 60);
          }, 0) / completedWOsWithTimes.length
        ).toFixed(1)
      : '0';

  // 5. Bottleneck Analysis per Master Operation
  const operationAnalytics = useMemo(() => {
    const rawOps = backendAnalytics?.operation_analytics || backendAnalytics?.operations;
    if (rawOps && Array.isArray(rawOps) && rawOps.length > 0) {
      return rawOps
        .map((op) => ({
          id: String(op.id),
          name: op.name,
          targetMins: op.target_mins,
          avgActualMins: op.avg_actual_mins,
          diffMins: op.diff_mins,
          completedCount: op.completed_count,
          delayPercentage: op.delay_percentage,
          isBottleneck: op.is_bottleneck,
          costingMethod: op.costing_method,
        }))
        .sort((a, b) => b.diffMins - a.diffMins);
    }

    return operations
      .map((op) => {
        const matchingJcs = periodCompletedJobCards.filter(
          (j) => j.operationId === op.id || j.operationName === op.name
        );
        const count = matchingJcs.length;
        const targetMins = op.durationMinutes || 45;
        const avgActualMins =
          count > 0
            ? Math.round(
                matchingJcs.reduce((acc, j) => acc + (j.actualMinutes || targetMins), 0) / count
              )
            : targetMins;
        const diffMins = count > 0 ? avgActualMins - targetMins : 0;
        const delayCount = matchingJcs.filter((j) => (j.actualMinutes || targetMins) > targetMins).length;
        const delayPercentage = count > 0 ? Math.round((delayCount / count) * 100) : 0;
        const isBottleneck = count > 0 && (delayPercentage > 30 || avgActualMins > targetMins * 1.15);

        return {
          id: op.id,
          name: op.name,
          targetMins,
          avgActualMins: count > 0 ? avgActualMins : targetMins,
          diffMins,
          completedCount: count,
          delayPercentage,
          isBottleneck,
          costingMethod: op.costingMethod,
        };
      })
      .sort((a, b) => b.diffMins - a.diffMins);
  }, [backendAnalytics, operations, periodCompletedJobCards]);

  // 6. Operator Performance & Efficiency Leaderboard
  const operatorAnalytics = useMemo(() => {
    const rawOps = backendAnalytics?.operator_analytics || backendAnalytics?.operators;
    if (rawOps && Array.isArray(rawOps) && rawOps.length > 0) {
      return rawOps
        .map((op) => ({
          id: String(op.id || op.name),
          name: op.name,
          role: op.role,
          completedCount: op.completed_count,
          totalHours: op.total_hours,
          efficiencyScore: op.efficiency_score,
          onTimeRatio: op.on_time_ratio,
          totalEarnedCost: op.total_earned_cost,
        }))
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore || b.completedCount - a.completedCount);
    }

    return operators
      .map((op) => {
        const matchingJcs = periodCompletedJobCards.filter(
          (j) => j.operatorId === op.id || j.picName === op.name
        );
        const count = matchingJcs.length;
        const totalPlannedMins = matchingJcs.reduce((acc, j) => acc + (j.plannedMinutes || 0), 0);
        const totalActualMins = matchingJcs.reduce(
          (acc, j) => acc + (j.actualMinutes || j.plannedMinutes || 0),
          0
        );
        const efficiencyScore =
          totalActualMins > 0 ? Math.round((totalPlannedMins / totalActualMins) * 100) : 100;
        const onTimeCount = matchingJcs.filter(
          (j) => (j.actualMinutes || 0) <= (j.plannedMinutes || 0)
        ).length;

        const totalEarnedCost = matchingJcs.reduce((acc, j) => {
          const foundOp = operations.find((o) => o.id === j.operationId);
          if (!foundOp) return acc;
          if (foundOp.costingMethod === 'fixed') {
            return acc + (foundOp.fixedLaborCost || 0) * j.targetQty;
          }
          return (
            acc +
            ((j.actualMinutes || j.plannedMinutes) / 60) * (foundOp.laborCostPerHour || 0)
          );
        }, 0);

        return {
          id: op.id,
          name: op.name,
          role: op.roleSpecialization || 'Umum',
          completedCount: count,
          totalHours: (totalActualMins / 60).toFixed(1),
          efficiencyScore,
          onTimeRatio: count > 0 ? `${onTimeCount}/${count}` : '-',
          totalEarnedCost,
        };
      })
      .filter((op) => op.completedCount > 0)
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore || b.completedCount - a.completedCount);
  }, [backendAnalytics, operators, periodCompletedJobCards, operations]);

  const operatorColumns = useMemo<TableColumn<(typeof operatorAnalytics)[0]>[]>(
    () => [
      {
        key: 'rank_name',
        header: 'Operator',
        align: 'left',
        cell: (item, idx) => (
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold font-mono',
                idx === 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : idx === 1
                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  : idx === 2
                  ? 'bg-amber-50 text-amber-900 border border-amber-300/60 dark:bg-amber-950/50 dark:text-amber-400'
                  : 'text-slate-400'
              )}
            >
              {idx + 1}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Spesialisasi',
        align: 'left',
        cell: (item) => (
          <span className="text-slate-600 dark:text-slate-400 text-xs">{item.role}</span>
        ),
      },
      {
        key: 'completedCount',
        header: 'Tugas Selesai',
        align: 'right',
        cell: (item) => <span className="font-mono font-medium">{item.completedCount}</span>,
      },
      {
        key: 'totalHours',
        header: 'Jam Kerja',
        align: 'right',
        cell: (item) => (
          <span className="font-mono text-slate-600 dark:text-slate-400">
            {item.totalHours} jam
          </span>
        ),
      },
      {
        key: 'efficiencyScore',
        header: 'Skor Efisiensi',
        align: 'center',
        cell: (item) => {
          const variant =
            item.efficiencyScore >= 100
              ? 'success'
              : item.efficiencyScore >= 80
              ? 'info'
              : 'warning';
          return (
            <Badge variant={variant} className="font-mono font-semibold">
              {item.efficiencyScore}%
            </Badge>
          );
        },
      },
      {
        key: 'totalEarnedCost',
        header: 'Total Upah',
        align: 'right',
        cell: (item) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(item.totalEarnedCost)}
          </span>
        ),
      },
    ],
    []
  );

  const operationColumns = useMemo<TableColumn<(typeof operationAnalytics)[0]>[]>(
    () => [
      {
        key: 'name',
        header: 'Tahapan Operasi',
        align: 'left',
        cell: (item) => (
          <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
        ),
      },
      {
        key: 'completedCount',
        header: 'Frekuensi Kerja',
        align: 'right',
        cell: (item) => (
          <span className="font-mono text-slate-600 dark:text-slate-400">
            {item.completedCount} kali
          </span>
        ),
      },
      {
        key: 'targetMins',
        header: 'Target Durasi',
        align: 'right',
        cell: (item) => (
          <span className="font-mono text-slate-600 dark:text-slate-400">{item.targetMins} mnt</span>
        ),
      },
      {
        key: 'avgActualMins',
        header: 'Rata-rata Durasi',
        align: 'right',
        cell: (item) => (
          <span
            className={cn(
              'font-mono font-semibold',
              item.diffMins > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-900 dark:text-white'
            )}
          >
            {item.avgActualMins} mnt
          </span>
        ),
      },
      {
        key: 'diffMins',
        header: 'Selisih',
        align: 'right',
        cell: (item) => {
          if (item.completedCount === 0)
            return <span className="text-slate-400 font-mono text-xs">-</span>;
          if (item.diffMins > 0) {
            return (
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                +{item.diffMins} mnt
              </span>
            );
          }
          return (
            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
              {item.diffMins} mnt
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status Alur',
        align: 'center',
        cell: (item) => {
          if (item.completedCount === 0) {
            return <Badge variant="default">Belum Ada Data</Badge>;
          }
          if (item.isBottleneck) {
            return <Badge variant="warning">Hambatan</Badge>;
          }
          return <Badge variant="success">Lancar</Badge>;
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Analitik Kinerja Produksi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Evaluasi efisiensi waktu pengerjaan, realisasi biaya upah, dan deteksi titik hambatan operasi.
          </p>
        </div>
        <div className="w-full sm:w-48 shrink-0">
          <Select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as AnalyticsPeriod)}
            options={ANALYTICS_PERIOD_OPTIONS}
          />
        </div>
      </div>

      {/* 4 Clean Industrial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Time Efficiency */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Efisiensi Waktu
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {timeEfficiencyRate}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {onTimeJobsCount} dari {totalCompletedJobs} tahap tepat waktu
          </p>
        </div>

        {/* KPI 2: SPK Completion Rate */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Penyelesaian SPK
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {spkCompletionRate}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {completedWOsCount} dari {totalWOsCount} SPK selesai
          </p>
        </div>

        {/* KPI 3: Labor Cost & Variance */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Realisasi Upah
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalActualLaborCost)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {laborCostSavings >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Hemat {formatCurrency(laborCostSavings)} vs rencana
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Over {formatCurrency(Math.abs(laborCostSavings))} vs rencana
              </span>
            )}
          </p>
        </div>

        {/* KPI 4: Lead Time */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rata-rata Lead Time
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {avgLeadTimeHours} <span className="text-sm font-medium text-slate-500">Jam</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Siklus penerbitan hingga selesai SPK
          </p>
        </div>
      </div>

      {/* Section: Operator Evaluation Leaderboard */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Evaluasi Performa Operator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Peringkat skor efisiensi kerja, jam kerja, dan akumulasi perolehan upah operator aktif pada periode ini.
            </p>
          </div>
          {operatorAnalytics.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {operatorAnalytics.length} operator aktif
            </span>
          )}
        </div>
        <Card className="p-0 overflow-hidden">
          <Table
            embedded
            columns={operatorColumns}
            data={operatorAnalytics}
            keyExtractor={(item) => item.id}
            emptyTitle="Tidak Ada Aktivitas Operator"
            emptyDescription="Belum ada pengerjaan tugas produksi yang selesai pada periode yang dipilih."
          />
        </Card>
      </div>

      {/* Section: Bottleneck Analysis */}
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Analisis Hambatan Operasi (Bottleneck)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Perbandingan target durasi standar dengan realisasi lapangan untuk mendeteksi perlambatan pada tahapan kerja.
          </p>
        </div>
        <Card className="p-0 overflow-hidden">
          <Table
            embedded
            columns={operationColumns}
            data={operationAnalytics}
            keyExtractor={(item) => item.id}
            emptyTitle="Tidak Ada Data Operasi"
            emptyDescription="Belum ada riwayat operasi kerja pada periode yang dipilih."
          />
        </Card>
      </div>
    </div>
  );
}
