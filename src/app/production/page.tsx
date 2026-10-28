'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, type TableColumn } from '@/components/ui/Table';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { formatCurrency, formatDate, formatDateTime, formatDurationBetween, formatVariantLabel, cn } from '@/lib/utils';
import { canManageProduction } from '@/lib/roles';
import type { JobCard, WorkOrder, Product, ProductionOperation } from '@/lib/types';
import { productionOperationService } from '@/services/production-operation.service';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { OptionList } from '@/components/ui/OptionList';
import {
  Factory,
  CheckCircle,
  Settings,
  Play,
  Pause,
  Check,
  Search,
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
  Plus,
  Pencil,
  Layers,
  Package,
  AlertCircle,
  Lock,
  XCircle,
  BedDouble,
  Box,
  Armchair,
  Sofa,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  User,
} from 'lucide-react';

const productIconMap: Record<string, React.ElementType> = {
  BedDouble,
  Layers,
  Box,
  Armchair,
  Sofa,
  Package,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Wrench,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
};

type AnalyticsPeriod = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'ALL';

const ANALYTICS_PERIOD_OPTIONS = [
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

function ProductionContent() {
  const { toast } = useToast();
  const {
    currentUser,
    workOrders,
    products = [],
    materials = [],
    operators = [],
    operations = [],
    setOperationsList,
    updateJobCardOperator,
    startJobCard,
    pauseJobCard,
    completeJobCard,
    createSubAssemblyWorkOrder,
    createNormalWorkOrder,
    cancelWorkOrder,
  } = useApp();

  // Sinkronisasi data master operasi dari API backend
  useEffect(() => {
    productionOperationService.getOperations({ per_page: 100 })
      .then(res => {
        if (res && Array.isArray(res.data)) {
          const mapped: ProductionOperation[] = res.data.map(op => ({
            id: String(op.id),
            name: op.name,
            costingMethod: op.wage_type === 'HOURLY' ? 'hourly' : 'fixed',
            durationMinutes: op.standard_duration_minutes,
            laborCostPerHour: op.cost_per_hour,
            fixedLaborCost: op.fixed_cost,
            description: op.description,
          }));
          setOperationsList(mapped);
        }
      })
      .catch(err => {
        console.warn('Gagal memuat master operasi dari API:', err);
      });
  }, [setOperationsList]);

  const canManage = canManageProduction(currentUser.role);
  const [activeTab, setActiveTab] = useUrlTab(['active', 'completed', 'canceled', 'analytics'] as const, 'active');
  const [searchTerm, setSearchTerm] = useState('');
  const [spkTypeFilter, setSpkTypeFilter] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('THIS_MONTH');

  // SPK Cancel Modal state
  const [cancelTargetWO, setCancelTargetWO] = useState<WorkOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // SPK Creation Modal state (Normal Barang Jadi & WIP)
  const [showSpkModal, setShowSpkModal] = useState(false);
  const [spkCategory, setSpkCategory] = useState<'NORMAL' | 'WIP'>('NORMAL');
  const [spkProductId, setSpkProductId] = useState('');
  const [spkVariantId, setSpkVariantId] = useState('');
  const [spkSaMaterialId, setSpkSaMaterialId] = useState('');
  const [spkTargetQty, setSpkTargetQty] = useState('1');
  const [spkNotes, setSpkNotes] = useState('');
  const [spkError, setSpkError] = useState('');

  // ... (keeping other states same)
  const [selectedWOId, setSelectedWOId] = useState<string | null>(null);
  const selectedWO = workOrders.find(w => w.id === selectedWOId) || null;

  // Track expanded accordion cards for active SPKs
  const [expandedWOIds, setExpandedWOIds] = useState<Record<string, boolean>>({});

  // Local worker input per job card
  const [workerInputs, setWorkerInputs] = useState<Record<string, string>>({});

  const toggleExpand = (woId: string) => {
    setExpandedWOIds(prev => ({
      ...prev,
      [woId]: !prev[woId],
    }));
  };

  const handleStart = (woId: string, jcId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    startJobCard(woId, jcId);
  };

  const handlePause = (woId: string, jcId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    pauseJobCard(woId, jcId);
  };

  // Active operators
  const activeOperators = useMemo(() => operators.filter(o => o.status === 'ACTIVE'), [operators]);

  // JobCard completion modal state
  const [completeTarget, setCompleteTarget] = useState<{ woId: string; jc: JobCard } | null>(null);
  const [selectedOperatorName, setSelectedOperatorName] = useState('');
  const [operatorSearch, setOperatorSearch] = useState('');
  const [completeError, setCompleteError] = useState('');

  const filteredOperators = useMemo(() => {
    if (!operatorSearch.trim()) return activeOperators;
    const q = operatorSearch.toLowerCase();
    return activeOperators.filter(op => op.name.toLowerCase().includes(q));
  }, [activeOperators, operatorSearch]);

  const handleOpenCompleteModal = (woId: string, jc: JobCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompleteTarget({ woId, jc });
    setSelectedOperatorName(workerInputs[jc.id] || jc.picName || '');
    setOperatorSearch('');
    setCompleteError('');
  };

  const handleConfirmComplete = () => {
    if (!completeTarget) return;
    const picName = selectedOperatorName.trim();
    if (!picName) {
      setCompleteError('Silakan pilih operator terlebih dahulu.');
      return;
    }
    const foundOp = operators.find(o => o.name === picName);
    const res = completeJobCard(
      completeTarget.woId,
      completeTarget.jc.id,
      completeTarget.jc.targetQty,
      picName,
      undefined,
      foundOp?.id
    );
    if (res && !res.success) {
      toast.error('Gagal Menyelesaikan SPK', res.error);
      return;
    }
    toast.success('Pekerjaan Selesai', `Tugas "${completeTarget.jc.operationName}" telah diselesaikan.`);
    setCompleteTarget(null);
    setSelectedOperatorName('');
    setOperatorSearch('');
    setCompleteError('');
  };

  // Edit Operator Modal state for Analysis Modal
  const [editingJobCard, setEditingJobCard] = useState<JobCard | null>(null);
  const [editingOperatorName, setEditingOperatorName] = useState('');
  const [editOperatorSearch, setEditOperatorSearch] = useState('');
  const [editOperatorError, setEditOperatorError] = useState('');

  const filteredEditOperators = useMemo(() => {
    if (!editOperatorSearch.trim()) return activeOperators;
    const q = editOperatorSearch.toLowerCase();
    return activeOperators.filter(op => op.name.toLowerCase().includes(q));
  }, [activeOperators, editOperatorSearch]);

  const handleOpenEditOperatorModal = (jc: JobCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingJobCard(jc);
    setEditingOperatorName(jc.picName || '');
    setEditOperatorSearch('');
    setEditOperatorError('');
  };

  const handleSaveOperator = () => {
    if (!selectedWO || !editingJobCard) return;
    const picName = editingOperatorName.trim();
    if (!picName) {
      setEditOperatorError('Silakan pilih operator terlebih dahulu.');
      return;
    }
    const foundOp = operators.find(o => o.name === picName);
    updateJobCardOperator(selectedWO.id, editingJobCard.id, picName, foundOp?.id);
    setWorkerInputs(prev => ({ ...prev, [editingJobCard.id]: picName }));
    toast.success('Operator Diperbarui', `Operator untuk "${editingJobCard.operationName}" berhasil diubah.`);
    setEditingJobCard(null);
    setEditingOperatorName('');
    setEditOperatorSearch('');
    setEditOperatorError('');
  };

  // SPK Berjalan: Urutan terlama di paling atas (FIFO), yang baru di paling bawah
  const activeWOs = useMemo(() => {
    return workOrders
      .filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELED')
      .sort((a, b) => {
        const timeA = new Date(a.issuedAt).getTime() || 0;
        const timeB = new Date(b.issuedAt).getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        return a.spkNumber.localeCompare(b.spkNumber);
      });
  }, [workOrders]);

  // SPK Selesai: Urutan terbaru di paling atas, yang terlama di paling bawah
  const completedWOs = useMemo(() => {
    return workOrders
      .filter(w => w.status === 'COMPLETED')
      .sort((a, b) => {
        const timeA = new Date(a.completedAt || a.issuedAt).getTime() || 0;
        const timeB = new Date(b.completedAt || b.issuedAt).getTime() || 0;
        if (timeA !== timeB) return timeB - timeA;
        return b.spkNumber.localeCompare(a.spkNumber);
      });
  }, [workOrders]);

  // SPK Dibatalkan: Urutan terbaru di paling atas
  const canceledWOs = useMemo(() => {
    return workOrders
      .filter(w => w.status === 'CANCELED')
      .sort((a, b) => {
        const timeA = new Date(a.canceledAt || a.issuedAt).getTime() || 0;
        const timeB = new Date(b.canceledAt || b.issuedAt).getTime() || 0;
        if (timeA !== timeB) return timeB - timeA;
        return b.spkNumber.localeCompare(a.spkNumber);
      });
  }, [workOrders]);

  const filterWO = (woList: typeof workOrders) => {
    let list = woList;
    if (spkTypeFilter === 'FINISHED_GOOD') {
      list = list.filter(w => !w.isSubAssembly);
    } else if (spkTypeFilter === 'SUB_ASSEMBLY') {
      list = list.filter(w => Boolean(w.isSubAssembly));
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
  const displayCanceledWOs = filterWO(canceledWOs);

  // =========================================================================
  // PRODUCTION PERFORMANCE ANALYTICS (Period-Filtered)
  // =========================================================================
  const periodWorkOrders = useMemo(() => {
    return workOrders.filter(w => isDateInPeriod(w.completedAt || w.issuedAt, analyticsPeriod));
  }, [workOrders, analyticsPeriod]);

  const periodCompletedWOs = useMemo(() => {
    return periodWorkOrders.filter(w => w.status === 'COMPLETED');
  }, [periodWorkOrders]);

  const periodCompletedJobCards = useMemo(() => {
    return workOrders.flatMap(w =>
      w.jobCards.filter(j => {
        if (j.status !== 'COMPLETED') return false;
        const relevantDate = j.completedAt || w.completedAt || w.issuedAt;
        return isDateInPeriod(relevantDate, analyticsPeriod);
      })
    );
  }, [workOrders, analyticsPeriod]);

  // 1. Time Efficiency Rate (% of completed jobs done on-time or faster in selected period)
  const onTimeJobsCount = periodCompletedJobCards.filter(j => (j.actualMinutes || 0) <= (j.plannedMinutes || 0)).length;
  const timeEfficiencyRate = periodCompletedJobCards.length > 0
    ? Math.round((onTimeJobsCount / periodCompletedJobCards.length) * 100)
    : 100;

  // 2. SPK Completion Rate in selected period
  const completedWOsCount = periodCompletedWOs.length;
  const totalWOsCount = periodWorkOrders.length;
  const spkCompletionRate = totalWOsCount > 0 ? Math.round((completedWOsCount / totalWOsCount) * 100) : 0;

  // 3. Labor Cost Budget & Variance in selected period
  const totalPlannedLaborCost = periodWorkOrders.reduce((acc, w) => acc + (w.plannedLaborCost || 0), 0);
  const totalActualLaborCost = periodWorkOrders.reduce((acc, w) => acc + (w.actualLaborCost || 0), 0);
  const laborCostSavings = totalPlannedLaborCost - totalActualLaborCost;

  // 4. Average SPK Lead Time (Hours) in selected period
  const completedWOsWithTimes = periodCompletedWOs.filter(w => w.completedAt && w.issuedAt);
  const avgLeadTimeHours = completedWOsWithTimes.length > 0
    ? (completedWOsWithTimes.reduce((acc, w) => {
      const ms = new Date(w.completedAt!).getTime() - new Date(w.issuedAt).getTime();
      return acc + (ms / (1000 * 60 * 60));
    }, 0) / completedWOsWithTimes.length).toFixed(1)
    : '0';

  // 5. Bottleneck Analysis per Master Operation (in selected period)
  const operationAnalytics = useMemo(() => {
    return operations.map(op => {
      const matchingJcs = periodCompletedJobCards.filter(j => j.operationId === op.id || j.operationName === op.name);
      const count = matchingJcs.length;
      const targetMins = op.durationMinutes || 45;
      const avgActualMins = count > 0
        ? Math.round(matchingJcs.reduce((acc, j) => acc + (j.actualMinutes || targetMins), 0) / count)
        : targetMins;
      const diffMins = count > 0 ? avgActualMins - targetMins : 0;
      const delayCount = matchingJcs.filter(j => (j.actualMinutes || targetMins) > targetMins).length;
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
    }).sort((a, b) => b.diffMins - a.diffMins);
  }, [operations, periodCompletedJobCards]);

  // 6. Operator Performance & Efficiency Leaderboard (Only active operators in selected period, prevents overflowing millions of rows)
  const operatorAnalytics = useMemo(() => {
    return operators.map(op => {
      const matchingJcs = periodCompletedJobCards.filter(j => j.operatorId === op.id || j.picName === op.name);
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
    })
      .filter(op => op.completedCount > 0)
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore || b.completedCount - a.completedCount);
  }, [operators, periodCompletedJobCards, operations]);

  const operatorColumns = useMemo<TableColumn<typeof operatorAnalytics[0]>[]>(() => [
    {
      key: 'rank_name',
      header: 'Operator',
      align: 'left',
      cell: (item, idx) => (
        <div className="flex items-center gap-2.5">
          <span className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold font-mono",
            idx === 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
              idx === 1 ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                idx === 2 ? "bg-amber-50 text-amber-900 border border-amber-300/60 dark:bg-amber-950/50 dark:text-amber-400" :
                  "text-slate-400"
          )}>
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
      cell: (item) => <span className="text-slate-600 dark:text-slate-400 text-xs">{item.role}</span>,
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
      cell: (item) => <span className="font-mono text-slate-600 dark:text-slate-400">{item.totalHours} jam</span>,
    },
    {
      key: 'efficiencyScore',
      header: 'Skor Efisiensi',
      align: 'center',
      cell: (item) => {
        const variant = item.efficiencyScore >= 100 ? 'success' : item.efficiencyScore >= 80 ? 'info' : 'warning';
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
  ], []);

  const operationColumns = useMemo<TableColumn<typeof operationAnalytics[0]>[]>(() => [
    {
      key: 'name',
      header: 'Tahapan Operasi',
      align: 'left',
      cell: (item) => <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>,
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
      cell: (item) => <span className="font-mono text-slate-600 dark:text-slate-400">{item.targetMins} mnt</span>,
    },
    {
      key: 'avgActualMins',
      header: 'Rata-rata Durasi',
      align: 'right',
      cell: (item) => (
        <span className={cn("font-mono font-semibold", item.diffMins > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
          {item.avgActualMins} mnt
        </span>
      ),
    },
    {
      key: 'diffMins',
      header: 'Selisih',
      align: 'right',
      cell: (item) => {
        if (item.completedCount === 0) return <span className="text-slate-400 font-mono text-xs">-</span>;
        if (item.diffMins > 0) {
          return <span className="font-mono font-bold text-amber-600 dark:text-amber-400">+{item.diffMins} mnt</span>;
        }
        return <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{item.diffMins} mnt</span>;
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
  ], []);

  const handleOpenSpkModal = () => {
    setSpkCategory('NORMAL');
    setSpkProductId('');
    setSpkVariantId('');
    setSpkSaMaterialId('');
    setSpkTargetQty('1');
    setSpkNotes('');
    setSpkError('');
    setShowSpkModal(true);
  };

  const handleCreateWorkOrder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSpkError('');

    const qty = parseFloat(spkTargetQty.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      setSpkError('Kuantitas rencana produksi harus lebih besar dari 0.');
      return;
    }

    if (spkCategory === 'NORMAL') {
      if (!spkProductId) {
        setSpkError('Silakan pilih produk terlebih dahulu.');
        return;
      }
      const prod = products.find(p => p.id === spkProductId);
      if (prod?.variants && prod.variants.length > 1 && !spkVariantId) {
        setSpkError('Silakan pilih varian produk.');
        return;
      }
      const res = createNormalWorkOrder(spkProductId, spkVariantId || undefined, qty, spkNotes);
      if (!res.success) {
        setSpkError(res.error || 'Gagal menerbitkan SPK.');
        return;
      }
      toast.success('SPK Berhasil Diterbitkan', `SPK Barang Jadi untuk ${qty} unit "${prod?.name}" berhasil dibuat.`);
      setShowSpkModal(false);
    } else {
      if (!spkSaMaterialId) {
        setSpkError('Silakan pilih bahan setengah jadi.');
        return;
      }
      const res = createSubAssemblyWorkOrder(spkSaMaterialId, qty, spkNotes);
      if (!res.success) {
        setSpkError(res.error || 'Gagal menerbitkan SPK bahan setengah jadi.');
        return;
      }
      const targetMat = materials.find(m => m.id === spkSaMaterialId);
      toast.success('SPK Berhasil Diterbitkan', `SPK untuk ${qty} ${targetMat?.unit || 'unit'} "${targetMat?.name}" berhasil dibuat.`);
      setShowSpkModal(false);
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Manajemen Produksi"
      >
        {canManage && (
          <Button
            variant="primary"
            onClick={handleOpenSpkModal}
          >
            <Plus className="h-4 w-4" />
            Buat SPK Baru
          </Button>
        )}
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
          { key: 'active', label: 'Berjalan', count: activeWOs.length, icon: Factory },
          { key: 'completed', label: 'Selesai', icon: CheckCircle },
          { key: 'canceled', label: 'Dibatalkan', icon: XCircle },
          { key: 'analytics', label: 'Analitik Kinerja', icon: BarChart3 },
        ]}
        filterValue={spkTypeFilter}
        onFilterChange={setSpkTypeFilter}
        filterPlaceholder="Semua Tipe SPK"
        filterOptions={[
          { value: 'FINISHED_GOOD', label: 'Barang Jadi' },
          { value: 'SUB_ASSEMBLY', label: 'Bahan Setengah Jadi' },
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
            <EmptyState
              title="Tidak Ada SPK Berjalan"
              description={searchTerm ? 'Tidak ada SPK yang sesuai dengan pencarian.' : 'Tidak ada SPK yang sedang berjalan.'}
              icon={<Factory className="h-7 w-7 text-slate-400" />}
            />
          ) : (
            displayActiveWOs.map(wo => {
              const product = products.find(p => p.id === wo.productId || p.name === wo.productName);
              const ProductIcon = productIconMap[product?.imageIcon || ''] || (wo.isSubAssembly ? Layers : BedDouble);
              const sortedJc = [...wo.jobCards].sort((a, b) => a.sequence - b.sequence);
              const completedJc = wo.jobCards.filter(j => j.status === 'COMPLETED').length;
              const totalJc = wo.jobCards.length;
              const progressPercent = totalJc > 0 ? Math.round((completedJc / totalJc) * 100) : 0;
              const hasRunningOp = wo.jobCards.some(j => j.status === 'IN_PROGRESS');
              const hasStartedOp = wo.jobCards.some(j => j.status === 'IN_PROGRESS' || j.status === 'PAUSED' || j.status === 'COMPLETED');
              // Default collapse (closed) baik di desktop maupun mobile
              const isExpanded = Boolean(expandedWOIds[wo.id]);
              const isLockedBySA = !wo.isSubAssembly && workOrders.some(w => w.salesOrderId === wo.salesOrderId && w.isSubAssembly && w.status !== 'COMPLETED');

              const spkActionMenuItems = [
                {
                  label: 'Analisis KPI',
                  icon: <Info className="h-4 w-4" />,
                  onClick: () => setSelectedWOId(wo.id),
                },
                ...(canManage
                  ? [
                    {
                      label: 'Batalkan SPK',
                      icon: <XCircle className="h-4 w-4" />,
                      variant: 'danger' as const,
                      disabled: wo.jobCards.some(
                        j => j.status !== 'PENDING' || (j.completedQty || 0) > 0 || Boolean(j.startedAt) || (j.actualMinutes || 0) > 0
                      ),
                      onClick: () => {
                        setCancelTargetWO(wo);
                        setCancelReason('');
                      },
                    },
                  ]
                  : []),
              ];

              return (
                <div
                  key={wo.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Card Header (Accordion Trigger) */}
                  <div
                    onClick={() => toggleExpand(wo.id)}
                    className="p-4 cursor-pointer flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 bg-slate-50/60 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 group transition-colors"
                  >
                    {/* Left Side: SPK Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono font-extrabold text-base text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            {hasStartedOp && (
                              <span
                                className="relative flex h-2.5 w-2.5 shrink-0"
                                title={hasRunningOp ? "Operasi sedang berjalan" : "SPK berjalan (tidak ada operasi aktif)"}
                              >
                                <span
                                  className={cn(
                                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                    hasRunningOp ? "bg-emerald-400" : "bg-amber-400"
                                  )}
                                />
                                <span
                                  className={cn(
                                    "relative inline-flex rounded-full h-2.5 w-2.5",
                                    hasRunningOp ? "bg-emerald-500" : "bg-amber-500"
                                  )}
                                />
                              </span>
                            )}
                            {wo.spkNumber}
                            {isLockedBySA && (
                              <span title="Menunggu SPK Bahan Setengah Jadi" className="inline-flex items-center">
                                <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </span>
                          {wo.isSubAssembly && (
                            <Badge variant="purple">WIP</Badge>
                          )}
                        </div>

                        {/* Icon More di Pojok Kanan Card (Mobile) */}
                        <div className="md:hidden shrink-0" onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            align="right"
                            triggerTitle="Opsi SPK"
                            items={spkActionMenuItems}
                          />
                        </div>
                      </div>

                      <div className="flex items-start gap-3 pt-0.5">
                        {/* Visual Gambar Produk */}
                        {product?.image ? (
                          <div className="h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
                            <img
                              src={product.image}
                              alt={wo.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={cn(
                            "h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg flex items-center justify-center shrink-0 border shadow-2xs bg-indigo-50 text-indigo-600 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800/80"
                          )}>
                            <ProductIcon className="h-5 w-5" />
                          </div>
                        )}

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-snug">
                              {wo.productName}
                            </h3>
                            <button
                              type="button"
                              className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/70 transition-all shrink-0"
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

                      {/* Mobile Step Progress Bar */}
                      <div className="md:hidden pt-2 flex items-center gap-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                          {completedJc}/{totalJc} Tahap
                        </span>
                        <div className="flex-1 h-2 bg-slate-200/80 dark:bg-slate-700/60 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              progressPercent === 100
                                ? "bg-emerald-500"
                                : "bg-indigo-600 dark:bg-indigo-500"
                            )}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                          {progressPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Timestamp & Icon More di atas, Progress Counter di bawah (Desktop Only) */}
                    <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0 self-start">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {formatDateTime(wo.issuedAt)}
                        </span>

                        <div onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            align="right"
                            triggerTitle="Opsi SPK"
                            items={spkActionMenuItems}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {completedJc} / {totalJc} Tahap
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-bold px-2 py-0.5 rounded-md border tabular-nums transition-colors",
                            progressPercent === 100
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                              : progressPercent > 0
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          )}
                        >
                          {progressPercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Accordion Body: Container Tahapan Operasi */}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                  >
                    <div className="overflow-hidden">
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-3 md:gap-2 py-1">
                          {sortedJc.map((jc, idx) => {
                            const isPending = jc.status === 'PENDING';
                            const isInProgress = jc.status === 'IN_PROGRESS';
                            const isPaused = jc.status === 'PAUSED';
                            const isCompleted = jc.status === 'COMPLETED';

                            return (
                              <React.Fragment key={jc.id}>
                                <div
                                  className={cn(
                                    "relative overflow-hidden w-full md:w-[250px] shrink-0 rounded-xl md:rounded-lg p-3.5 md:p-3 border flex flex-col gap-3 transition-all",
                                    isCompleted
                                      ? "border-transparent bg-slate-100/60 dark:bg-slate-800/40 opacity-70"
                                      : "bg-slate-50/70 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700"
                                  )}
                                >
                                  {isCompleted && (
                                    <div className="absolute top-2 right-2 bg-emerald-600 text-white w-6 h-6 md:w-5 md:h-5 rounded-full flex items-center justify-center shadow-xs">
                                      <Check className="h-3.5 w-3.5 md:h-3 md:w-3 stroke-[2.5]" />
                                    </div>
                                  )}

                                  <div>
                                    <div className={cn("text-slate-900 dark:text-white leading-tight", isCompleted && "pr-6")}>
                                      {jc.operationName}
                                    </div>
                                  </div>

                                  {/* Aksi Operasi */}
                                  <div>
                                    {isPending && canManage && (
                                      <Button
                                        size="lg"
                                        variant="primary"
                                        className="w-full h-11 md:h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                                        onClick={(e) => handleStart(wo.id, jc.id, e)}
                                      >
                                        <Play className="h-4 w-4 md:h-3.5 md:w-3.5 fill-white" />
                                        Mulai
                                      </Button>
                                    )}

                                    {isPaused && canManage && (
                                      <Button
                                        size="lg"
                                        variant="primary"
                                        className="w-full h-11 md:h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white border-0"
                                        onClick={(e) => handleStart(wo.id, jc.id, e)}
                                      >
                                        <Play className="h-4 w-4 md:h-3.5 md:w-3.5 fill-white" />
                                        Lanjutkan
                                      </Button>
                                    )}

                                    {isInProgress && canManage && (
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="lg"
                                          className="h-11 md:h-10 text-sm font-semibold text-white border-0"
                                          onClick={(e) => handlePause(wo.id, jc.id, e)}
                                        >
                                          <Pause className="h-4 w-4 md:h-3.5 md:w-3.5 fill-white" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="success"
                                          size="lg"
                                          className="flex-1 h-11 md:h-10 text-sm font-semibold"
                                          onClick={(e) => handleOpenCompleteModal(wo.id, jc, e)}
                                        >
                                          <Check className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                          Selesai
                                        </Button>
                                      </div>
                                    )}

                                    {isCompleted && (
                                      <span className="text-sm text-emerald-800 dark:text-emerald-200 font-medium truncate max-w-[150px] md:max-w-[120px] flex items-center gap-1">
                                        <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        {jc.picName}
                                      </span>
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
            <EmptyState
              title="Belum Ada SPK Selesai"
              description={searchTerm ? 'Tidak ada riwayat SPK yang sesuai dengan pencarian.' : 'Belum ada riwayat SPK selesai.'}
              icon={<CheckCircle className="h-7 w-7 text-slate-400" />}
            />
          ) : (
            displayCompletedWOs.map(wo => {
              const product = products.find(p => p.id === wo.productId || p.name === wo.productName);
              const ProductIcon = productIconMap[product?.imageIcon || ''] || (wo.isSubAssembly ? Layers : BedDouble);
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
                      {wo.isSubAssembly && (
                        <Badge variant="purple">WIP</Badge>
                      )}
                      {wo.isCustom && (
                        <span className="inline-block text-[10px] text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase border border-indigo-200 dark:border-indigo-800/60">
                          Custom
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-3 pt-0.5">
                      {product?.image ? (
                        <div className="h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
                          <img
                            src={product.image}
                            alt={wo.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={cn(
                          "h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg flex items-center justify-center shrink-0 border shadow-2xs bg-indigo-50 text-indigo-600 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800/80"
                        )}>
                          <ProductIcon className="h-5 w-5" />
                        </div>
                      )}

                      <div className="space-y-1 flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-snug">
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
                  </div>

                  {/* Right Block: Duration */}
                  <div className="flex items-center justify-between w-full md:w-fit md:flex-col md:items-start md:space-y-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      Waktu Pengerjaan
                    </div>
                    <div className="flex items-center gap-2 font-bold text-green-600 dark:text-green-400 text-sm md:mt-0.5">
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
      {/* TAB: SPK DIBATALKAN */}
      {/* ========================================================================= */}
      {activeTab === 'canceled' && (
        <div className="space-y-3">
          {displayCanceledWOs.length === 0 ? (
            <EmptyState
              title="Tidak Ada SPK Dibatalkan"
              description={searchTerm ? 'Tidak ada SPK dibatalkan yang sesuai dengan pencarian.' : 'Tidak ada SPK yang dibatalkan.'}
              icon={<XCircle className="h-7 w-7 text-slate-400" />}
            />
          ) : (
            displayCanceledWOs.map(wo => {
              const product = products.find(p => p.id === wo.productId || p.name === wo.productName);
              const ProductIcon = productIconMap[product?.imageIcon || ''] || (wo.isSubAssembly ? Layers : BedDouble);

              return (
                <div
                  key={wo.id}
                  onClick={() => setSelectedWOId(wo.id)}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-start justify-between gap-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all opacity-80 hover:opacity-100"
                >
                  {/* Left Block: SPK Number & Product Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-extrabold text-base text-slate-500 dark:text-slate-400 line-through">
                        {wo.spkNumber}
                      </span>
                      <Badge variant="danger">Dibatalkan</Badge>
                      {wo.isSubAssembly && (
                        <Badge variant="purple">WIP</Badge>
                      )}
                      {wo.isCustom && (
                        <span className="inline-block text-[10px] text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase border border-indigo-200 dark:border-indigo-800/60">
                          Kustom
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-3 pt-0.5">
                      {product?.image ? (
                        <div className="h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
                          <img
                            src={product.image}
                            alt={wo.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={cn(
                          "h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg flex items-center justify-center shrink-0 border shadow-2xs opacity-80 bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80"
                        )}>
                          <ProductIcon className="h-5 w-5" />
                        </div>
                      )}

                      <div className="space-y-1 flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base leading-snug">
                          {wo.productName}
                        </h3>
                        {wo.variantName && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {formatVariantLabel(wo.variantName)}
                          </p>
                        )}
                        {wo.customNotes && (
                          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                            Catatan: {wo.customNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Block: Status Keterangan */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2 rounded-lg border border-slate-100 dark:border-slate-800 w-fit shrink-0">
                    <div className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                      Status SPK
                    </div>
                    <div className="font-medium text-slate-700 dark:text-slate-300 text-xs mt-0.5">
                      {wo.cancelReason || 'Dibatalkan'}
                    </div>
                    {wo.canceledAt && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatDateTime(wo.canceledAt)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PRODUCTION PERFORMANCE ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
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
                value={analyticsPeriod}
                onValueChange={(val) => setAnalyticsPeriod(val as AnalyticsPeriod)}
                options={ANALYTICS_PERIOD_OPTIONS}
              />
            </div>
          </div>

          {/* 4 Clean Industrial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Time Efficiency */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Efisiensi Waktu</span>
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {timeEfficiencyRate}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {onTimeJobsCount} dari {periodCompletedJobCards.length} tahap tepat waktu
              </p>
            </div>

            {/* KPI 2: SPK Completion Rate */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Penyelesaian SPK</span>
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
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Realisasi Upah</span>
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrency(totalActualLaborCost)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {laborCostSavings >= 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Hemat {formatCurrency(laborCostSavings)} vs rencana</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Over {formatCurrency(Math.abs(laborCostSavings))} vs rencana</span>
                )}
              </p>
            </div>

            {/* KPI 4: Lead Time */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rata-rata Lead Time</span>
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
      )}

      {/* DETAIL MODAL: ANALISIS KPI PEKERJA & REKAP UPAH */}
      <Modal
        isOpen={!!selectedWO}
        onClose={() => setSelectedWOId(null)}
        title={`Analisis Kinerja`}
        size="md"
      >
        {selectedWO && (() => {
          const prod = products.find(p => p.id === selectedWO.productId || p.name === selectedWO.productName);
          const plannedJobMins = selectedWO.jobCards.reduce((acc, jc) => {
            const op = operations.find(o =>
              o.id === jc.operationId ||
              (jc.operationName && o.name && o.name.toLowerCase() === jc.operationName.toLowerCase())
            );
            return acc + (jc.plannedMinutes || op?.durationMinutes || 0);
          }, 0);
          const targetMinutes = plannedJobMins > 0
            ? plannedJobMins
            : (prod?.defaultEstimatedHours ? Math.round(prod.defaultEstimatedHours * 60) : 0);

          const elapsedMinutes = selectedWO.completedAt && selectedWO.issuedAt
            ? Math.max(0, Math.round((new Date(selectedWO.completedAt).getTime() - new Date(selectedWO.issuedAt).getTime()) / 60000))
            : 0;
          const totalActualJobMins = selectedWO.jobCards.reduce(
            (acc, jc) => acc + (typeof jc.actualMinutes === 'number' ? jc.actualMinutes : 0),
            0
          );
          const actualMinutes = elapsedMinutes > 0 ? elapsedMinutes : totalActualJobMins;

          let durationColorClass = 'text-slate-800 dark:text-slate-200 font-bold';
          if (!selectedWO.completedAt) {
            durationColorClass = 'text-slate-500 dark:text-slate-400 font-bold';
          } else if (targetMinutes > 0) {
            const redThreshold = targetMinutes * 1.25;
            if (actualMinutes <= targetMinutes) {
              durationColorClass = 'text-emerald-600 dark:text-emerald-400 font-semibold';
            } else if (actualMinutes <= redThreshold) {
              durationColorClass = 'text-amber-600 dark:text-amber-400 font-semibold';
            } else {
              durationColorClass = 'text-red-600 dark:text-red-400 font-semibold';
            }
          }

          return (
            <div className="space-y-5">
              {/* Summary Box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="pb-2 flex items-start justify-between border-b border-slate-200 dark:border-slate-800 gap-3">
                  <div>
                    <div className="font-bold text-base text-slate-900 dark:text-white">{selectedWO.productName}</div>
                    {selectedWO?.variantName && (
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-0.5">{formatVariantLabel(selectedWO.variantName)}</div>
                    )}
                  </div>
                  <Badge
                    variant={
                      selectedWO.status === 'COMPLETED'
                        ? 'success'
                        : selectedWO.status === 'PROCESSING'
                          ? 'info'
                          : selectedWO.status === 'CANCELED'
                            ? 'danger'
                            : 'warning'
                    }
                  >
                    {selectedWO.status === 'COMPLETED'
                      ? 'Selesai'
                      : selectedWO.status === 'PROCESSING'
                        ? 'Berjalan'
                        : selectedWO.status === 'CANCELED'
                          ? 'Dibatalkan'
                          : 'Menunggu'}
                  </Badge>
                </div>
                <div className="space-y-2 mt-4 text-[13.5px] md:text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">No. Order</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{selectedWO.salesOrderNumber || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Waktu Mulai</span>
                    <span className="text-slate-800 dark:text-slate-200">{formatDateTime(selectedWO.issuedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Waktu Selesai</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {selectedWO.completedAt ? formatDateTime(selectedWO.completedAt) : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Durasi Pengerjaan</span>
                    <span className={durationColorClass}>
                      {selectedWO.completedAt ? formatDurationBetween(selectedWO.issuedAt, selectedWO.completedAt) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* List Card Operasi */}
              <div className="space-y-2">
                {selectedWO.jobCards.slice().sort((a, b) => a.sequence - b.sequence).map(jc => {
                  const op = operations.find(o =>
                    o.id === jc.operationId ||
                    (jc.operationName && o.name && o.name.toLowerCase() === jc.operationName.toLowerCase())
                  );
                  const targetOpMins = jc.plannedMinutes || op?.durationMinutes || (
                    prod?.defaultEstimatedHours
                      ? Math.round((prod.defaultEstimatedHours * 60) / Math.max(1, selectedWO.jobCards.length))
                      : 45
                  );
                  const actualMins = jc.actualMinutes;

                  let opDurationColor = 'text-slate-500 dark:text-slate-400 font-bold';
                  if (typeof actualMins === 'number') {
                    if (targetOpMins > 0) {
                      const redThreshold = targetOpMins * 1.25;
                      if (actualMins <= targetOpMins) {
                        opDurationColor = 'text-emerald-600 dark:text-emerald-400 font-bold';
                      } else if (actualMins <= redThreshold) {
                        opDurationColor = 'text-amber-600 dark:text-amber-400 font-bold';
                      } else {
                        opDurationColor = 'text-red-600 dark:text-red-400 font-bold';
                      }
                    } else {
                      opDurationColor = 'text-slate-800 dark:text-slate-200 font-bold';
                    }
                  }

                  const laborCost = op ? (
                    op.costingMethod === 'fixed'
                      ? (op.fixedLaborCost || 0) * jc.targetQty
                      : ((typeof actualMins === 'number' ? actualMins : targetOpMins) / 60) * (op.laborCostPerHour || 0)
                  ) : 0;

                  return (
                    <div
                      key={jc.id}
                      className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/80"
                    >
                      <div className="flex items-center justify-between text-sm md:text-base">
                        <span className="text-slate-900 dark:text-white truncate pr-2">
                          {jc.operationName}
                        </span>
                        <span className={cn('shrink-0 text-sm md:text-xs', opDurationColor)}>
                          {typeof actualMins === 'number' ? `${actualMins} menit` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                          <span className="text-slate-500 dark:text-slate-400 truncate">
                            {jc.picName || 'Belum Ditugaskan'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditOperatorModal(jc, e)}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md transition-colors shrink-0 cursor-pointer"
                            title="Ubah Operator"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="shrink-0 text-slate-600 dark:text-slate-300">
                          {formatCurrency(laborCost)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3.5 py-3 rounded-lg border border-slate-200 dark:border-slate-800">
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
          );
        })()}
      </Modal>

      {/* MODAL: BUAT SPK (NORMAL & WIP) */}
      <Modal
        isOpen={showSpkModal}
        onClose={() => setShowSpkModal(false)}
        title="Buat SPK Baru"
        size="md"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowSpkModal(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCreateWorkOrder()}
              disabled={
                spkCategory === 'NORMAL'
                  ? (!spkProductId || (Boolean(products.find(p => p.id === spkProductId)?.variants?.length) && products.find(p => p.id === spkProductId)!.variants.length > 1 && !spkVariantId))
                  : !spkSaMaterialId
              }
            >
              Terbitkan SPK
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateWorkOrder} className="space-y-4">
          {spkError && (
            <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{spkError}</span>
            </div>
          )}

          {/* 1. Dropdown Tipe SPK: Produk (Barang Jadi) / Bahan Setengah Jadi (WIP) */}
          <Select
            label="Tipe SPK"
            required
            value={spkCategory}
            onChange={e => {
              const cat = e.target.value as 'NORMAL' | 'WIP';
              setSpkCategory(cat);
              setSpkProductId('');
              setSpkVariantId('');
              setSpkSaMaterialId('');
              setSpkError('');
            }}
            options={[
              { value: 'NORMAL', label: 'Produk (Barang Jadi)' },
              { value: 'WIP', label: 'Bahan Setengah Jadi (WIP)' },
            ]}
          />

          {/* 2. Dropdown Pilih Produk / Bahan WIP */}
          {spkCategory === 'NORMAL' ? (
            <Select
              label="Pilih Produk"
              required
              searchable
              searchPlaceholder="Cari produk..."
              value={spkProductId}
              onChange={e => {
                const pid = e.target.value;
                setSpkProductId(pid);
                setSpkVariantId('');
                setSpkError('');
              }}
              options={[
                { value: '', label: '-- Pilih Produk --' },
                ...products.map(p => ({ value: p.id, label: p.name })),
              ]}
            />
          ) : (
            <Select
              label="Pilih Bahan Setengah Jadi"
              required
              searchable
              searchPlaceholder="Cari bahan setengah jadi..."
              value={spkSaMaterialId}
              onChange={e => {
                setSpkSaMaterialId(e.target.value);
                setSpkError('');
              }}
              options={[
                { value: '', label: '-- Pilih Bahan Setengah Jadi --' },
                ...materials.filter(m => m.isSubAssembly).map(m => ({ value: m.id, label: m.name })),
              ]}
            />
          )}

          {/* 3. Dropdown Varian jika ada (untuk Produk Jadi) */}
          {spkCategory === 'NORMAL' && (() => {
            const selectedProduct = products.find(p => p.id === spkProductId);
            if (!selectedProduct || !selectedProduct.variants || selectedProduct.variants.length === 0) return null;
            return (
              <Select
                label="Varian Produk"
                required={selectedProduct.variants.length > 1}
                value={spkVariantId}
                onChange={e => {
                  setSpkVariantId(e.target.value);
                  setSpkError('');
                }}
                options={[
                  { value: '', label: '-- Pilih Varian --' },
                  ...selectedProduct.variants.map(v => ({
                    value: v.id,
                    label: Object.values(v.combination || {}).join(', ') || v.sku,
                  })),
                ]}
              />
            );
          })()}

          {/* 4. Input Kuantitas */}
          <Input
            label="Kuantitas Target"
            required
            type="text"
            inputMode="numeric"
            value={spkTargetQty}
            onChange={e => setSpkTargetQty(e.target.value)}
            placeholder="1"
            className="font-semibold"
          />

          {/* 5. Input Catatan (sama dengan catatan produk saat buat sales order) */}
          <Input
            label="Catatan Produk (Opsional)"
            type="text"
            value={spkNotes}
            onChange={e => setSpkNotes(e.target.value)}
            placeholder="Catatan khusus pengerjaan produk..."
          />

          {/* 6. Info BOM Kurang (Hanya jika ada kekurangan stok bahan, dalam bentuk card list sederhana tanpa tabel header) */}
          {(() => {
            const targetQtyNum = parseFloat(spkTargetQty.replace(',', '.')) || 0;
            if (targetQtyNum <= 0) return null;

            const insufficientList: {
              name: string;
              requiredQty: number;
              currentStock: number;
              shortageQty: number;
              unit: string;
            }[] = [];

            if (spkCategory === 'NORMAL') {
              const selectedProduct = products.find(p => p.id === spkProductId);
              const selectedVariant = selectedProduct?.variants && selectedProduct.variants.length > 0
                ? (selectedProduct.variants.find(v => v.id === spkVariantId) || selectedProduct.variants[0])
                : undefined;
              const bomItems = selectedVariant?.bom || [];

              bomItems.forEach(b => {
                const mat = materials.find(m => m.id === b.materialId);
                const reqQty = b.qty * targetQtyNum;
                const currentStock = mat?.stock || 0;
                if (currentStock < reqQty) {
                  insufficientList.push({
                    name: mat?.name || b.materialId,
                    requiredQty: reqQty,
                    currentStock,
                    shortageQty: parseFloat((reqQty - currentStock).toFixed(4)),
                    unit: mat?.unit || 'unit',
                  });
                }
              });
            } else {
              const targetMat = materials.find(m => m.id === spkSaMaterialId);
              const childBom = targetMat?.childBom || [];

              childBom.forEach(b => {
                const mat = materials.find(m => m.id === b.materialId);
                const reqQty = b.qty * targetQtyNum;
                const currentStock = mat?.stock || 0;
                if (currentStock < reqQty) {
                  insufficientList.push({
                    name: mat?.name || b.materialId,
                    requiredQty: reqQty,
                    currentStock,
                    shortageQty: parseFloat((reqQty - currentStock).toFixed(4)),
                    unit: mat?.unit || 'unit',
                  });
                }
              });
            }

            if (insufficientList.length === 0) return null;

            return (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Perhatian: Bahan Baku / BOM Kurang</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {insufficientList.map((mat, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {mat.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Butuh: <span className="font-semibold text-slate-700 dark:text-slate-300">{mat.requiredQty} {mat.unit}</span>
                          {' • '}
                          Stok: <span className="font-semibold text-slate-700 dark:text-slate-300">{mat.currentStock} {mat.unit}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                          Kurang {mat.shortageQty} {mat.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </form>
      </Modal>

      {/* Modal Konfirmasi Pembatalan SPK */}
      <Modal
        isOpen={!!cancelTargetWO}
        onClose={() => setCancelTargetWO(null)}
        title={`Batalkan SPK ${cancelTargetWO?.spkNumber || ''}`}
        description="Apakah Anda yakin ingin membatalkan SPK ini? Tindakan ini tidak dapat dibatalkan."
        size="md"
        actions={
          cancelTargetWO ? (
            <>
              <Button variant="outline" onClick={() => setCancelTargetWO(null)}>
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!cancelTargetWO) return;
                  const res = cancelWorkOrder(cancelTargetWO.id, cancelReason);
                  if (res.success) {
                    toast.success(`SPK ${cancelTargetWO.spkNumber} berhasil dibatalkan.`);
                    setCancelTargetWO(null);
                    setActiveTab('canceled');
                  } else {
                    toast.error(res.error || 'Gagal membatalkan SPK.');
                  }
                }}
              >
                Batalkan SPK
              </Button>
            </>
          ) : undefined
        }
      >
        {cancelTargetWO && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor SPK:</span>
                <strong className="font-mono text-slate-900 dark:text-white">{cancelTargetWO.spkNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Produk:</span>
                <strong className="text-slate-900 dark:text-white">{cancelTargetWO.productName}</strong>
              </div>
              {cancelTargetWO.variantName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Varian:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{formatVariantLabel(cancelTargetWO.variantName)}</span>
                </div>
              )}
              {cancelTargetWO.salesOrderNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Referensi Order:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{cancelTargetWO.salesOrderNumber}</span>
                </div>
              )}
            </div>

            <Input
              label="Alasan Pembatalan (Opsional)"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Contoh: Perubahan rencana produksi / dibatalkan"
            />
          </div>
        )}
      </Modal>

      {/* Modal / Bottom Sheet Pilih Operator saat Selesai Operasi */}
      <Modal
        isOpen={!!completeTarget}
        onClose={() => {
          setCompleteTarget(null);
          setOperatorSearch('');
          setCompleteError('');
        }}
        title="Pilih Operator"
        size="sm"
        sheetHeight="auto"
        actions={
          completeTarget ? (
            <Button
              variant="primary"
              onClick={handleConfirmComplete}
              disabled={!selectedOperatorName}
            >
              Konfirmasi Selesai
            </Button>
          ) : undefined
        }
      >
        {completeTarget && (
          <div className="space-y-3">
            <Input
              icon={Search}
              inputSize="md"
              placeholder="Cari nama operator..."
              value={operatorSearch}
              onChange={e => {
                setOperatorSearch(e.target.value);
                if (completeError) setCompleteError('');
              }}
            />

            {completeError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {completeError}
              </p>
            )}

            <OptionList
              options={filteredOperators.map(op => ({
                value: op.name,
                label: op.name,
              }))}
              value={selectedOperatorName}
              onChange={val => {
                setSelectedOperatorName(String(val));
                if (completeError) setCompleteError('');
              }}
              emptyMessage="Tidak ada operator yang ditemukan."
            />
          </div>
        )}
      </Modal>

      {/* Modal / Bottom Sheet Ubah Operator untuk JobCard */}
      <Modal
        isOpen={!!editingJobCard}
        onClose={() => {
          setEditingJobCard(null);
          setEditingOperatorName('');
          setEditOperatorSearch('');
          setEditOperatorError('');
        }}
        title="Pilih Operator"
        size="sm"
        sheetHeight="auto"
        actions={
          editingJobCard ? (
            <Button
              variant="primary"
              onClick={handleSaveOperator}
              disabled={!editingOperatorName}
            >
              Simpan
            </Button>
          ) : undefined
        }
      >
        {editingJobCard && (
          <div className="space-y-3">
            <Input
              icon={Search}
              inputSize="md"
              placeholder="Cari nama operator..."
              value={editOperatorSearch}
              onChange={e => {
                setEditOperatorSearch(e.target.value);
                if (editOperatorError) setEditOperatorError('');
              }}
            />

            {editOperatorError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {editOperatorError}
              </p>
            )}

            <OptionList
              options={filteredEditOperators.map(op => ({
                value: op.name,
                label: op.name,
              }))}
              value={editingOperatorName}
              onChange={val => {
                setEditingOperatorName(String(val));
                if (editOperatorError) setEditOperatorError('');
              }}
              emptyMessage="Tidak ada operator yang ditemukan."
            />
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
