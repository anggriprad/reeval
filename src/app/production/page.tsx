'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { formatCurrency, formatDate, formatDateTime, formatDurationBetween, formatVariantLabel } from '@/lib/utils';
import { canManageProduction } from '@/lib/roles';
import type { WorkOrder, JobCard } from '@/lib/types';
import {
  Factory,
  CheckCircle,
  Settings,
  Play,
  Pause,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  UserCheck,
  BarChart3,
  TrendingUp,
  Clock,
  Calendar,
  Timer,
  AlertTriangle,
  Award,
  Zap,
  DollarSign,
  Users,
  Wrench,
  ShieldAlert,
  Sparkles,
  TrendingDown,
} from 'lucide-react';

function ProductionContent() {
  const { toast } = useToast();
  const {
    currentUser,
    workOrders,
    operators = [],
    operations = [],
    startJobCard,
    pauseJobCard,
    completeJobCard,
  } = useApp();

  const canManage = canManageProduction(currentUser.role);
  const [activeTab, setActiveTab] = useUrlTab(['active', 'completed', 'analytics'] as const, 'active');
  const [searchTerm, setSearchTerm] = useState('');
  const [spkTypeFilter, setSpkTypeFilter] = useState('');

  // ... (keeping other states same)
  const [selectedWOId, setSelectedWOId] = useState<string | null>(null);
  const selectedWO = workOrders.find(w => w.id === selectedWOId) || null;

  // Track expanded accordion cards for active SPKs
  const [expandedWOIds, setExpandedWOIds] = useState<Record<string, boolean>>({});

  // Local worker input per job card
  const [workerInputs, setWorkerInputs] = useState<Record<string, string>>({});

  const toggleExpand = (woId: string) => {
    setExpandedWOIds(prev => {
      const isCurrentlyExpanded = prev[woId] !== false;
      return {
        ...prev,
        [woId]: !isCurrentlyExpanded,
      };
    });
  };

  const handleStart = (woId: string, jcId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    startJobCard(woId, jcId);
  };

  const handlePause = (woId: string, jcId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    pauseJobCard(woId, jcId);
  };

  const handleComplete = (woId: string, jc: JobCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const picName = (workerInputs[jc.id] || jc.picName || '').trim();
    if (!picName) {
      toast.warning('Operator Belum Dipilih', 'Silakan pilih Operator Pekerja terlebih dahulu.');
      return;
    }
    const foundOp = operators.find(o => o.name === picName);
    completeJobCard(woId, jc.id, jc.targetQty, picName, undefined, foundOp?.id);
    toast.success('Pekerjaan Selesai', `Tugas "${jc.operationName}" telah diselesaikan.`);
  };

  const activeWOs = workOrders.filter(w => w.status !== 'COMPLETED');
  const completedWOs = workOrders.filter(w => w.status === 'COMPLETED');
  const activeOperators = operators.filter(o => o.status === 'ACTIVE');

  const filterWO = (woList: typeof workOrders) => {
    let list = woList;
    if (spkTypeFilter === 'CUSTOM') {
      list = list.filter(w => w.isCustom);
    } else if (spkTypeFilter === 'STANDARD') {
      list = list.filter(w => !w.isCustom);
    }

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(wo =>
      wo.spkNumber.toLowerCase().includes(q) ||
      wo.salesOrderNumber.toLowerCase().includes(q) ||
      wo.productName.toLowerCase().includes(q) ||
      (wo.variantName && wo.variantName.toLowerCase().includes(q)) ||
      (wo.customNotes && wo.customNotes.toLowerCase().includes(q)) ||
      (wo.selectedModifiers && wo.selectedModifiers.some(g => g.selectedOptions.some(opt => opt.name.toLowerCase().includes(q)))) ||
      wo.jobCards.some(j => j.operationName.toLowerCase().includes(q) || (j.picName && j.picName.toLowerCase().includes(q)))
    );
  };

  const displayActiveWOs = filterWO(activeWOs);
  const displayCompletedWOs = filterWO(completedWOs);

  // =========================================================================
  // EXECUTIVE PRODUCTION ANALYTICS CALCULATIONS (BoD Level)
  // =========================================================================
  const completedJobCards = workOrders.flatMap(w => w.jobCards).filter(j => j.status === 'COMPLETED');

  // 1. Time Efficiency Rate (% of completed jobs done on-time or faster)
  const onTimeJobsCount = completedJobCards.filter(j => (j.actualMinutes || 0) <= (j.plannedMinutes || 0)).length;
  const timeEfficiencyRate = completedJobCards.length > 0
    ? Math.round((onTimeJobsCount / completedJobCards.length) * 100)
    : 100;

  // 2. SPK On-Time Delivery Rate
  const completedWOsCount = completedWOs.length;
  const totalWOsCount = workOrders.length;
  const spkCompletionRate = totalWOsCount > 0 ? Math.round((completedWOsCount / totalWOsCount) * 100) : 0;

  // 3. Labor Cost Budget & Variance
  const totalPlannedLaborCost = workOrders.reduce((acc, w) => acc + (w.plannedLaborCost || 0), 0);
  const totalActualLaborCost = workOrders.reduce((acc, w) => acc + (w.actualLaborCost || 0), 0);
  const laborCostSavings = totalPlannedLaborCost - totalActualLaborCost;

  // 4. Average SPK Lead Time (Hours)
  const completedWOsWithTimes = completedWOs.filter(w => w.completedAt && w.issuedAt);
  const avgLeadTimeHours = completedWOsWithTimes.length > 0
    ? (completedWOsWithTimes.reduce((acc, w) => {
      const ms = new Date(w.completedAt!).getTime() - new Date(w.issuedAt).getTime();
      return acc + (ms / (1000 * 60 * 60));
    }, 0) / completedWOsWithTimes.length).toFixed(1)
    : '0';

  // 5. Bottleneck Analysis per Master Operation
  const operationAnalytics = operations.map(op => {
    const matchingJcs = completedJobCards.filter(j => j.operationId === op.id || j.operationName === op.name);
    const count = matchingJcs.length;
    const targetMins = op.durationMinutes || 45;
    const avgActualMins = count > 0
      ? Math.round(matchingJcs.reduce((acc, j) => acc + (j.actualMinutes || targetMins), 0) / count)
      : targetMins;
    const delayCount = matchingJcs.filter(j => (j.actualMinutes || targetMins) > targetMins).length;
    const delayPercentage = count > 0 ? Math.round((delayCount / count) * 100) : 0;
    const isBottleneck = delayPercentage > 30 || avgActualMins > targetMins * 1.15;

    return {
      id: op.id,
      name: op.name,
      targetMins,
      avgActualMins,
      completedCount: count,
      delayPercentage,
      isBottleneck,
      costingMethod: op.costingMethod,
    };
  }).sort((a, b) => (b.avgActualMins - b.targetMins) - (a.avgActualMins - a.targetMins));

  // 6. Operator Performance & Efficiency Leaderboard
  const operatorAnalytics = operators.map(op => {
    const matchingJcs = completedJobCards.filter(j => j.operatorId === op.id || j.picName === op.name);
    const completedCount = matchingJcs.length;
    const totalPlannedMins = matchingJcs.reduce((acc, j) => acc + (j.plannedMinutes || 0), 0);
    const totalActualMins = matchingJcs.reduce((acc, j) => acc + (j.actualMinutes || j.plannedMinutes || 0), 0);
    const efficiencyScore = totalActualMins > 0 ? Math.round((totalPlannedMins / totalActualMins) * 100) : 100;
    const onTimeCount = matchingJcs.filter(j => (j.actualMinutes || 0) <= (j.plannedMinutes || 0)).length;

    const totalEarnedCost = matchingJcs.reduce((acc, j) => {
      const foundOp = operations.find(o => o.id === j.operationId);
      if (!foundOp) return acc;
      if (foundOp.costingMethod === 'fixed') return acc + ((foundOp.fixedLaborCost || 0) * j.targetQty);
      return acc + (((j.actualMinutes || j.plannedMinutes) / 60) * (foundOp.laborCostPerHour || 0));
    }, 0);

    return {
      id: op.id,
      name: op.name,
      role: op.roleSpecialization || 'Umum',
      completedCount,
      totalHours: (totalActualMins / 60).toFixed(1),
      efficiencyScore,
      onTimeRatio: completedCount > 0 ? `${onTimeCount}/${completedCount}` : '-',
      totalEarnedCost,
    };
  }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Manajemen Produksi"
      >
        <Link href="/production/config">
          <Button variant="outline">
            <Settings className="h-4 w-4" /> Konfigurasi
          </Button>
        </Link>
      </PageHeader>

      {/* Reusable Segmented Control */}
      <SegmentedControl
        value={activeTab}
        onChange={(tab) => setActiveTab(tab as typeof activeTab)}
        options={[
          { key: 'active', label: 'SPK Berjalan', count: activeWOs.length, icon: Factory },
          { key: 'completed', label: 'SPK Selesai', icon: CheckCircle },
          { key: 'analytics', label: 'Analitik Kinerja (BoD)', icon: BarChart3 },
        ]}
        filterValue={spkTypeFilter}
        onFilterChange={setSpkTypeFilter}
        filterPlaceholder="Semua Tipe SPK"
        filterOptions={[
          { value: 'CUSTOM', label: 'Pesanan Kustom' },
          { value: 'STANDARD', label: 'Pesanan Standar' },
        ]}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari SPK, no. order, produk..."
      />

      {/* ========================================================================= */}
      {/* TAB 1: SPK BERJALAN */}
      {/* ========================================================================= */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {displayActiveWOs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              <p className="font-semibold text-base text-slate-600 dark:text-slate-300">{searchTerm ? 'Tidak ada SPK yang sesuai dengan pencarian.' : 'Tidak ada SPK yang sedang berjalan.'}</p>
            </div>
          ) : (
            displayActiveWOs.map(wo => {
              const sortedJc = [...wo.jobCards].sort((a, b) => a.sequence - b.sequence);
              const completedJc = wo.jobCards.filter(j => j.status === 'COMPLETED').length;
              const totalJc = wo.jobCards.length;
              // Default open if unset or true
              const isExpanded = expandedWOIds[wo.id] !== false;

              return (
                <div
                  key={wo.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Card Header (Accordion Trigger) */}
                  <div
                    onClick={() => toggleExpand(wo.id)}
                    className="p-4 cursor-pointer flex flex-col md:flex-row md:items-start justify-between gap-4 bg-slate-50/60 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    {/* Left Side: SPK Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-extrabold text-base text-indigo-600 dark:text-indigo-400">
                          {wo.spkNumber}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Order #{wo.salesOrderNumber}
                        </span>
                      </div>

                      <div className='space-y-1'>
                        <div className='flex items-center gap-2'>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                            {wo.productName}
                          </h3>
                          <button
                            type="button"
                            className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                        {wo.variantName && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {formatVariantLabel(wo.variantName)}
                          </p>
                        )}
                        {wo.selectedModifiers && wo.selectedModifiers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {wo.selectedModifiers.map(mGroup => (
                              mGroup.selectedOptions.map(opt => (
                                <span key={opt.optionId} className="text-sm bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-medium">
                                  +{opt.name}
                                </span>
                              ))
                            ))}
                          </div>
                        )}
                        {wo.customNotes && (
                          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                            {wo.customNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Timestamp, Progress Counter, KPI Button & Accordion Toggle */}
                    <div className="flex flex-col items-end gap-3 shrink-0 self-start">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">{formatDateTime(wo.issuedAt)}</strong>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-xs font-bold">
                          <span>{completedJc} / {totalJc} Tahap</span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWOId(wo.id);
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                          title="Buka Analisis KPI & Rekap Upah Pekerja"
                        >
                          <Info className="h-3.5 w-3.5 text-indigo-500" />
                          Analisis KPI
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Accordion Body: Container Tahapan Operasi Horizontal */}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                  >
                    <div className="overflow-hidden">
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex flex-wrap items-center gap-2 py-1">
                          {sortedJc.map((jc, idx) => {
                            const isPending = jc.status === 'PENDING';
                            const isInProgress = jc.status === 'IN_PROGRESS';
                            const isPaused = jc.status === 'PAUSED';
                            const isCompleted = jc.status === 'COMPLETED';

                            return (
                              <React.Fragment key={jc.id}>
                                <div
                                  className={`shrink-0 rounded-lg p-3 border flex flex-col justify-between min-w-[210px] max-w-[250px] ${isCompleted
                                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900'
                                    : isInProgress
                                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400 dark:bg-blue-950/40 dark:border-blue-700'
                                      : isPaused
                                        ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800'
                                        : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                    }`}
                                >
                                  <div className="mb-2">
                                    <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                      {jc.operationName}
                                    </div>
                                  </div>

                                  {/* Aksi Sederhana */}
                                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                                    {isPending && canManage && (
                                      <button
                                        onClick={(e) => handleStart(wo.id, jc.id, e)}
                                        className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1"
                                      >
                                        <Play className="h-3.5 w-3.5 fill-white" />
                                        Mulai
                                      </button>
                                    )}

                                    {isPaused && canManage && (
                                      <button
                                        onClick={(e) => handleStart(wo.id, jc.id, e)}
                                        className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1"
                                      >
                                        <Play className="h-3.5 w-3.5 fill-white" />
                                        Lanjutkan
                                      </button>
                                    )}

                                    {isInProgress && canManage && (
                                      <div className="space-y-1.5">
                                        {/* Dropdown Operator Produksi */}
                                        <select
                                          value={workerInputs[jc.id] ?? jc.picName ?? ''}
                                          onChange={(e) => setWorkerInputs({ ...workerInputs, [jc.id]: e.target.value })}
                                          className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option value="">-- Pilih Operator --</option>
                                          {activeOperators.map(op => (
                                            <option key={op.id} value={op.name}>
                                              {op.name} ({op.roleSpecialization || 'Umum'})
                                            </option>
                                          ))}
                                        </select>

                                        <div className="flex gap-1">
                                          <button
                                            onClick={(e) => handlePause(wo.id, jc.id, e)}
                                            className="flex-1 py-1 px-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded flex items-center justify-center gap-1"
                                          >
                                            <Pause className="h-3 w-3 fill-white" />
                                            Jeda
                                          </button>
                                          <button
                                            onClick={(e) => handleComplete(wo.id, jc, e)}
                                            className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1"
                                          >
                                            <Check className="h-3 w-3" />
                                            Selesai
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {isCompleted && (
                                      <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-between">
                                        <span className="flex items-center gap-1">
                                          <Check className="h-3.5 w-3.5" /> Selesai
                                        </span>
                                        {jc.picName && (
                                          <span className="text-[10px] text-slate-500 font-normal truncate max-w-[100px] flex items-center gap-0.5">
                                            <UserCheck className="h-3 w-3 text-emerald-600" />
                                            {jc.picName}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SPK SELESAI */}
      {/* ========================================================================= */}
      {activeTab === 'completed' && (
        <div className="space-y-3">
          {displayCompletedWOs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              <p className="font-semibold text-base text-slate-600 dark:text-slate-300">{searchTerm ? 'Tidak ada riwayat SPK yang sesuai dengan pencarian.' : 'Belum ada riwayat SPK selesai.'}</p>
            </div>
          ) : (
            displayCompletedWOs.slice().reverse().map(wo => {
              const durationStr = formatDurationBetween(wo.issuedAt, wo.completedAt || wo.issuedAt);

              return (
                <div
                  key={wo.id}
                  onClick={() => setSelectedWOId(wo.id)}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-start justify-between gap-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  {/* Left Block: SPK Number & Product Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-extrabold text-base text-indigo-600 dark:text-indigo-400">
                        {wo.spkNumber}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Order #{wo.salesOrderNumber}
                      </span>
                      {wo.isCustom && (
                        <span className="inline-block text-[10px] text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase border border-indigo-200 dark:border-indigo-800/60">
                          KUSTOM
                        </span>
                      )}
                    </div>

                    <div className='space-y-1'>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                        {wo.productName}
                      </h3>
                      {wo.variantName && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {formatVariantLabel(wo.variantName)}
                        </p>
                      )}
                      {wo.selectedModifiers && wo.selectedModifiers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {wo.selectedModifiers.map(mGroup => (
                            mGroup.selectedOptions.map(opt => (
                              <span key={opt.optionId} className="text-sm bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-medium">
                                +{opt.name}
                              </span>
                            ))
                          ))}
                        </div>
                      )}
                      {wo.customNotes && (
                        <div className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                          {wo.customNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Block: Duration */}
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2 rounded-lg border border-slate-100 dark:border-slate-800 w-fit">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      Waktu Pengerjaan
                    </div>
                    <div className="flex items-center gap-2 font-bold text-green-600 dark:text-green-400 text-sm mt-0.5">
                      <Timer className="h-3 w-3 text-green-500" /> {durationStr}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXECUTIVE PRODUCTION ANALYTICS (BoD & MANAGEMENT LEVEL) */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Executive Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-2 border border-indigo-400/30">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Executive Production Evaluation Dashboard
                </div>
                <h2 className="text-xl font-black tracking-tight text-white">
                  Analitik Kinerja Divisi Produksi & Evaluasi BoD
                </h2>
                <p className="text-slate-400 text-xs mt-1 max-w-xl">
                  Ikhtisar metrik efisiensi waktu, varians anggaran upah, deteksi titik hambatan (*bottleneck*), dan skor performa operator untuk evaluasi keputusan manajemen.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 shrink-0">
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Output Produksi</span>
                  <span className="text-base font-bold text-emerald-400">{completedWOsCount} / {totalWOsCount} SPK Selesai</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {spkCompletionRate}%
                </div>
              </div>
            </div>
          </div>

          {/* 4 Key Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Time Efficiency Rate */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Efisiensi Waktu Operasi</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Zap className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {timeEfficiencyRate}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {onTimeJobsCount} dari {completedJobCards.length} operasi selesai tepat waktu
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, timeEfficiencyRate)}%` }}
                />
              </div>
            </div>

            {/* KPI 2: On-Time Delivery Rate */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Penyelesaian SPK</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {spkCompletionRate}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {completedWOsCount} SPK Selesai • {activeWOs.length} SPK Berjalan
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, spkCompletionRate)}%` }}
                />
              </div>
            </div>

            {/* KPI 3: Labor Cost Variance */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Varians Anggaran Upah</span>
                <div className={`p-2 rounded-xl ${laborCostSavings >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : 'bg-red-50 text-red-600 dark:bg-red-950'}`}>
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(totalActualLaborCost)}
              </div>
              <div className="flex items-center gap-1 text-xs mt-1">
                {laborCostSavings >= 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                    <TrendingDown className="h-3.5 w-3.5" /> Hemat {formatCurrency(laborCostSavings)}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-0.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Over {formatCurrency(Math.abs(laborCostSavings))}
                  </span>
                )}
                <span className="text-slate-400">vs Rencana</span>
              </div>
            </div>

            {/* KPI 4: Rata-Rata Lead Time */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Rata-Rata Lead Time</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {avgLeadTimeHours} <span className="text-sm font-semibold text-slate-500">Jam / SPK</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Dihitung dari penerbitan hingga selesai
              </p>
            </div>
          </div>

          {/* Section 2: Bottleneck Analysis & Executive Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Widget 1: Bottleneck Operations (Analisis Hambatan lantai pabrik) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    Analisis Hambatan Operasi Produksi (Bottleneck)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Membandingkan Durasi Standar Target vs Durasi Realisasi di lapangan per operasi
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {operationAnalytics.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">Belum ada data operasi terdaftar.</div>
                ) : (
                  operationAnalytics.map(op => {
                    const isDelayed = op.avgActualMins > op.targetMins;
                    const diffMins = op.avgActualMins - op.targetMins;

                    return (
                      <div key={op.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{op.name}</span>
                            {op.isBottleneck ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> HAMBATAN
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                LANCAR
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            Target: {op.targetMins}m • Realisasi: <span className={isDelayed ? 'text-amber-600 font-extrabold' : 'text-emerald-600'}>{op.avgActualMins}m</span>
                          </div>
                        </div>

                        {/* Progress comparison bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden flex">
                          <div
                            className="bg-indigo-600 h-2"
                            style={{ width: `${Math.min(100, (op.targetMins / (Math.max(op.targetMins, op.avgActualMins))) * 100)}%` }}
                            title={`Target: ${op.targetMins}m`}
                          />
                          {isDelayed && (
                            <div
                              className="bg-amber-500 h-2"
                              style={{ width: `${Math.min(100, (diffMins / (Math.max(op.targetMins, op.avgActualMins))) * 100)}%` }}
                              title={`Delay: +${diffMins}m`}
                            />
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                          <span>Dikerjakan {op.completedCount} kali</span>
                          {isDelayed ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">Rata-rata terlambat +{diffMins} menit</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Sesuai target standar</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Widget 2: Strategic Insights & Executive Evaluation (BoD Callout) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Rekomendasi Evaluasi BoD
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-900 dark:bg-indigo-950/50 dark:border-indigo-900/50 dark:text-indigo-200">
                  <div className="font-bold mb-1 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    Evaluasi Efisiensi Biaya
                  </div>
                  <p className="leading-relaxed">
                    {laborCostSavings >= 0
                      ? `Anggaran upah produksi berada dalam batas efisien dengan penghematan ${formatCurrency(laborCostSavings)} dari standar rencana.`
                      : `Terjadi pembengkakan upah sebesar ${formatCurrency(Math.abs(laborCostSavings))} akibat over-durasi pada beberapa alur SPK.`
                    }
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-100 text-amber-900 dark:bg-amber-950/50 dark:border-amber-900/50 dark:text-amber-200">
                  <div className="font-bold mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Fokus Alokasi Sumber Daya
                  </div>
                  <p className="leading-relaxed">
                    {operationAnalytics.some(o => o.isBottleneck)
                      ? `Operasi "${operationAnalytics.find(o => o.isBottleneck)?.name}" teridentifikasi sebagai titik hambatan. Disarankan penambahan operator atau peralatan kerja pendukung.`
                      : 'Alur operasi lantai produksi berjalan sangat lancar tanpa titik hambatan signifikan.'
                    }
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-900/50 dark:text-emerald-200">
                  <div className="font-bold mb-1 flex items-center gap-1">
                    <Award className="h-4 w-4 text-emerald-600" />
                    Performa Operator Tertinggi
                  </div>
                  <p className="leading-relaxed">
                    {operatorAnalytics.length > 0 && operatorAnalytics[0].completedCount > 0
                      ? `Operator "${operatorAnalytics[0].name}" memiliki skor efisiensi tertinggi (${operatorAnalytics[0].efficiencyScore}%) dengan ${operatorAnalytics[0].completedCount} tugas selesai.`
                      : 'Data evaluasi operator akan terbarui secara otomatis seiring penyelesaian tahap SPK.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Operator Evaluation & Leaderboard Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Evaluasi Performa & Skor Efisiensi Operator Produksi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daftar peringkat efisiensi waktu, akumulasi jam kerja, dan total upah yang dihasilkan oleh masing-masing operator
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Rank & Operator</th>
                    <th className="px-5 py-3.5">Spesialisasi</th>
                    <th className="px-5 py-3.5 text-center">Tugas Selesai</th>
                    <th className="px-5 py-3.5 text-center">Total Jam Kerja</th>
                    <th className="px-5 py-3.5 text-center">Rasio Ketepatan Waktu</th>
                    <th className="px-5 py-3.5 text-center">Skor Efisiensi KPI</th>
                    <th className="px-5 py-3.5 text-right">Hasil Upah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {operatorAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Belum ada operator terdaftar.
                      </td>
                    </tr>
                  ) : (
                    operatorAnalytics.map((op, idx) => (
                      <tr key={op.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{op.name}</div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                          {op.role}
                        </td>
                        <td className="px-5 py-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {op.completedCount}
                        </td>
                        <td className="px-5 py-4 text-center font-mono text-slate-600 dark:text-slate-300">
                          {op.totalHours} Jam
                        </td>
                        <td className="px-5 py-4 text-center font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {op.onTimeRatio}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono ${op.efficiencyScore >= 100
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : op.efficiencyScore >= 80
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                            {op.efficiencyScore}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(op.totalEarnedCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: ANALISIS KPI PEKERJA & REKAP UPAH */}
      <Modal
        isOpen={!!selectedWO}
        onClose={() => setSelectedWOId(null)}
        title={`Analisis Kinerja`}
        size="lg"
      >
        {selectedWO && (
          <div className="space-y-5">
            {/* Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm border border-slate-100 dark:border-slate-700">
              <div className='flex justify-between gap-4'>
                <div>
                  <div className="font-bold text-base text-slate-900 dark:text-white">{selectedWO.productName}</div>
                  {selectedWO?.variantName && (
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-0.5">{formatVariantLabel(selectedWO.variantName)}</div>
                  )}
                </div>
                <span className='text-xs text-slate-600 dark:text-slate-400'>Order #{selectedWO.salesOrderNumber}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-sm">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Mulai</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-medium">{formatDateTime(selectedWO.issuedAt)}</strong>
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Selesai</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-medium">
                    {selectedWO.completedAt ? formatDateTime(selectedWO.completedAt) : '-'}
                  </strong>
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Durasi</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-medium">
                    {selectedWO.completedAt ? formatDurationBetween(selectedWO.issuedAt, selectedWO.completedAt) : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* KPI Analysis Table per Operation Step */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Operasi</th>
                    <th className="py-3 px-3.5">Operator PIC</th>
                    <th className="py-3 px-3.5 text-center">Durasi Target vs Realisasi</th>
                    <th className="py-3 px-3.5 text-center">Performa KPI</th>
                    <th className="py-3 px-3.5 text-right">Upah Operasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {selectedWO.jobCards.slice().sort((a, b) => a.sequence - b.sequence).map(jc => {
                    const op = operations.find(o => o.id === jc.operationId);
                    const plannedMins = jc.plannedMinutes || op?.durationMinutes || 0;
                    const actualMins = jc.actualMinutes;
                    const diff = typeof actualMins === 'number' ? actualMins - plannedMins : 0;

                    const laborCost = op ? (
                      op.costingMethod === 'fixed'
                        ? (op.fixedLaborCost || 0) * jc.targetQty
                        : ((typeof actualMins === 'number' ? actualMins : plannedMins) / 60) * (op.laborCostPerHour || 0)
                    ) : 0;

                    return (
                      <tr key={jc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3.5 font-semibold text-slate-800 dark:text-slate-200">{jc.operationName}</td>
                        <td className="py-3 px-3.5">
                          {jc.picName ? (
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                              {jc.picName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Belum Ditugaskan</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono">
                          {plannedMins}m vs <span className="font-bold">{typeof actualMins === 'number' ? `${actualMins}m` : '-'}</span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {typeof actualMins !== 'number' ? (
                            <span className="text-slate-400 text-[10px] font-bold">MENUNGGU</span>
                          ) : diff < 0 ? (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Cepat +{Math.abs(diff)}m
                            </span>
                          ) : diff === 0 ? (
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Tepat Waktu
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Terlambat +{diff}m
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(laborCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-xs uppercase font-bold text-slate-400">Total Upah</div>
              <div className="font-extrabold text-indigo-600 dark:text-indigo-400 text-base">
                {formatCurrency(selectedWO.jobCards.reduce((acc, jc) => {
                  const op = operations.find(o => o.id === jc.operationId);
                  if (!op) return acc;
                  if (op.costingMethod === 'fixed') return acc + (op.fixedLaborCost || 0);
                  const hrs = (jc.actualMinutes || jc.plannedMinutes) / 60;
                  return acc + (hrs * (op.laborCostPerHour || 0));
                }, 0))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat Production...</div>}>
      <ProductionContent />
    </Suspense>
  );
}
