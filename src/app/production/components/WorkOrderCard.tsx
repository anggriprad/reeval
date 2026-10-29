'use client';

import React from 'react';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Badge } from '@/components/ui/Badge';
import {
  formatDateTime,
  formatDurationBetween,
  formatVariantLabel,
  cn,
} from '@/lib/utils';
import {
  Info,
  XCircle,
  Timer,
  ChevronDown,
  ChevronUp,
  Lock,
  Layers,
  BedDouble,
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
} from 'lucide-react';
import type { WorkOrder, Product, JobCard } from '@/lib/types';
import { JobCardTracker } from './JobCardTracker';

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

interface WorkOrderCardProps {
  wo: WorkOrder;
  tab: 'active' | 'completed' | 'canceled';
  products: Product[];
  allWorkOrders?: WorkOrder[];
  isExpanded?: boolean;
  onToggleExpand?: (woId: string) => void;
  canManage: boolean;
  onOpenKPI: (wo: WorkOrder) => void;
  onOpenCancel?: (wo: WorkOrder) => void;
  onStartJobCard?: (woId: string, jcId: string, e?: React.MouseEvent) => void;
  onPauseJobCard?: (woId: string, jcId: string, e?: React.MouseEvent) => void;
  onOpenCompleteModal?: (woId: string, jc: JobCard, e?: React.MouseEvent) => void;
}

export function WorkOrderCard({
  wo,
  tab,
  products,
  allWorkOrders = [],
  isExpanded = false,
  onToggleExpand,
  canManage,
  onOpenKPI,
  onOpenCancel,
  onStartJobCard,
  onPauseJobCard,
  onOpenCompleteModal,
}: WorkOrderCardProps) {
  const product = products.find((p) => p.id === wo.productId || p.name === wo.productName);
  const ProductIcon = productIconMap[product?.imageIcon || ''] || (wo.isSubAssembly ? Layers : BedDouble);

  // =========================================================================
  // TAB 1: ACTIVE WORK ORDER CARD
  // =========================================================================
  if (tab === 'active') {
    const sortedJc = [...wo.jobCards].sort((a, b) => a.sequence - b.sequence);
    const completedJc = wo.jobCards.filter((j) => j.status === 'COMPLETED').length;
    const totalJc = wo.jobCards.length;
    const progressPercent = totalJc > 0 ? Math.round((completedJc / totalJc) * 100) : 0;
    const hasRunningOp = wo.jobCards.some((j) => j.status === 'IN_PROGRESS');
    const hasStartedOp = wo.jobCards.some(
      (j) => j.status === 'IN_PROGRESS' || j.status === 'PAUSED' || j.status === 'COMPLETED'
    );
    const isLockedBySA =
      !wo.isSubAssembly &&
      allWorkOrders.some(
        (w) => w.salesOrderId === wo.salesOrderId && w.isSubAssembly && w.status !== 'COMPLETED'
      );

    const spkActionMenuItems = [
      {
        label: 'Analisis KPI',
        icon: <Info className="h-4 w-4" />,
        onClick: () => onOpenKPI(wo),
      },
      ...(canManage && onOpenCancel
        ? [
            {
              label: 'Batalkan SPK',
              icon: <XCircle className="h-4 w-4" />,
              variant: 'danger' as const,
              disabled: wo.jobCards.some(
                (j) =>
                  j.status !== 'PENDING' ||
                  (j.completedQty || 0) > 0 ||
                  Boolean(j.startedAt) ||
                  (j.actualMinutes || 0) > 0
              ),
              onClick: () => onOpenCancel(wo),
            },
          ]
        : []),
    ];

    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
        {/* Card Header (Accordion Trigger) */}
        <div
          onClick={() => onToggleExpand?.(wo.id)}
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
                      title={hasRunningOp ? 'Operasi sedang berjalan' : 'SPK berjalan (tidak ada operasi aktif)'}
                    >
                      <span
                        className={cn(
                          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                          hasRunningOp ? 'bg-emerald-400' : 'bg-amber-400'
                        )}
                      />
                      <span
                        className={cn(
                          'relative inline-flex rounded-full h-2.5 w-2.5',
                          hasRunningOp ? 'bg-emerald-500' : 'bg-amber-500'
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
                {wo.isSubAssembly && <Badge variant="purple">WIP</Badge>}
              </div>

              {/* Icon More di Pojok Kanan Card (Mobile) */}
              <div className="md:hidden shrink-0" onClick={(e) => e.stopPropagation()}>
                <ActionMenu align="right" triggerTitle="Opsi SPK" items={spkActionMenuItems} />
              </div>
            </div>

            <div className="flex items-start gap-3 pt-0.5">
              {/* Visual Gambar Produk */}
              {product?.image ? (
                <div className="h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
                  <img src={product.image} alt={wo.productName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className={cn(
                    'h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg flex items-center justify-center shrink-0 border shadow-2xs bg-indigo-50 text-indigo-600 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800/80'
                  )}
                >
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
                    {wo.selectedModifiers.map((mGroup) =>
                      mGroup.selectedOptions.map((opt) => (
                        <span
                          key={opt.optionId}
                          className="text-sm bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          +{opt.name}
                        </span>
                      ))
                    )}
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
                    'h-full rounded-full transition-all duration-300',
                    progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'
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
                <ActionMenu align="right" triggerTitle="Opsi SPK" items={spkActionMenuItems} />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {completedJc} / {totalJc} Tahap
              </span>
              <span
                className={cn(
                  'text-[11px] font-bold px-2 py-0.5 rounded-md border tabular-nums transition-colors',
                  progressPercent === 100
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : progressPercent > 0
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                )}
              >
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Accordion Body: Container Tahapan Operasi */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              {onStartJobCard && onPauseJobCard && onOpenCompleteModal && (
                <JobCardTracker
                  workOrderId={wo.id}
                  jobCards={wo.jobCards}
                  canManage={canManage}
                  onStart={onStartJobCard}
                  onPause={onPauseJobCard}
                  onOpenCompleteModal={onOpenCompleteModal}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAB 2: COMPLETED WORK ORDER CARD
  // =========================================================================
  if (tab === 'completed') {
    const durationStr = formatDurationBetween(wo.issuedAt, wo.completedAt || wo.issuedAt);

    return (
      <div
        onClick={() => onOpenKPI(wo)}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-start justify-between gap-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
      >
        {/* Left Block: SPK Number & Product Details */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono font-extrabold text-base text-indigo-600 dark:text-indigo-400">
              {wo.spkNumber}
            </span>
            {wo.isSubAssembly && <Badge variant="purple">WIP</Badge>}
            {wo.isCustom && (
              <span className="inline-block text-[10px] text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase border border-indigo-200 dark:border-indigo-800/60">
                Custom
              </span>
            )}
          </div>

          <div className="flex items-start gap-3 pt-0.5">
            {product?.image ? (
              <div className="h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
                <img src={product.image} alt={wo.productName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className={cn(
                  'h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg flex items-center justify-center shrink-0 border shadow-2xs bg-indigo-50 text-indigo-600 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800/80'
                )}
              >
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
                  {wo.selectedModifiers.map((mGroup) =>
                    mGroup.selectedOptions.map((opt) => (
                      <span
                        key={opt.optionId}
                        className="text-sm bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-medium"
                      >
                        +{opt.name}
                      </span>
                    ))
                  )}
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
  }

  // =========================================================================
  // TAB 3: CANCELED WORK ORDER CARD
  // =========================================================================
  return (
    <div
      onClick={() => onOpenKPI(wo)}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-start justify-between gap-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all opacity-80 hover:opacity-100"
    >
      {/* Left Block: SPK Number & Product Details */}
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono font-extrabold text-base text-slate-500 dark:text-slate-400 line-through">
            {wo.spkNumber}
          </span>
          <Badge variant="danger">Dibatalkan</Badge>
          {wo.isSubAssembly && <Badge variant="purple">WIP</Badge>}
          {wo.isCustom && (
            <span className="inline-block text-[10px] text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase border border-indigo-200 dark:border-indigo-800/60">
              Kustom
            </span>
          )}
        </div>

        <div className="flex items-start gap-3 pt-0.5">
          {product?.image ? (
            <div className="h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
              <img src={product.image} alt={wo.productName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className={cn(
                'h-12 w-12 md:h-11 md:w-11 rounded-xl md:rounded-lg flex items-center justify-center shrink-0 border shadow-2xs opacity-80 bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80'
              )}
            >
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
}
