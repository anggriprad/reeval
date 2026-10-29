'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Pencil, Loader2 } from 'lucide-react';
import { formatCurrency, formatDateTime, formatDurationBetween, formatVariantLabel, cn } from '@/lib/utils';
import { workOrderService, type WorkOrderKPIResponse } from '@/services/work-order.service';
import type { WorkOrder, Product, ProductionOperation, JobCard } from '@/lib/types';

interface WorkOrderKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWO: WorkOrder | null;
  products: Product[];
  operations: ProductionOperation[];
  onOpenEditOperator?: (woId: string, jc: JobCard) => void;
}

export function WorkOrderKpiModal({
  isOpen,
  onClose,
  selectedWO,
  products,
  operations,
  onOpenEditOperator,
}: WorkOrderKpiModalProps) {
  const [kpiData, setKpiData] = useState<WorkOrderKPIResponse | null>(null);
  const [isLoadingKPI, setIsLoadingKPI] = useState(false);

  useEffect(() => {
    if (!selectedWO || !isOpen) {
      setKpiData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingKPI(true);

    workOrderService
      .getWorkOrderKPI(Number(selectedWO.id))
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setKpiData(res.data);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat KPI dari backend, fallback ke kalkulasi lokal:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingKPI(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWO, isOpen]);

  if (!selectedWO) return null;

  const prod = products.find(
    (p) => p.id === selectedWO.productId || p.name === selectedWO.productName
  );

  const plannedJobMins = selectedWO.jobCards.reduce((acc, jc) => {
    const op = operations.find(
      (o) =>
        o.id === jc.operationId ||
        (jc.operationName && o.name && o.name.toLowerCase() === jc.operationName.toLowerCase())
    );
    return acc + (jc.plannedMinutes || op?.durationMinutes || 0);
  }, 0);

  const targetMinutes = kpiData?.total_planned_minutes ?? (
    plannedJobMins > 0
      ? plannedJobMins
      : (prod?.defaultEstimatedHours ? Math.round(prod.defaultEstimatedHours * 60) : 0)
  );

  const elapsedMinutes = selectedWO.completedAt && selectedWO.issuedAt
    ? Math.max(0, Math.round((new Date(selectedWO.completedAt).getTime() - new Date(selectedWO.issuedAt).getTime()) / 60000))
    : 0;

  const totalActualJobMins = selectedWO.jobCards.reduce(
    (acc, jc) => acc + (typeof jc.actualMinutes === 'number' ? jc.actualMinutes : 0),
    0
  );

  const actualMinutes = kpiData?.total_actual_minutes ?? (
    elapsedMinutes > 0 ? elapsedMinutes : totalActualJobMins
  );

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

  const totalLaborCost = kpiData?.total_actual_labor_cost ?? selectedWO.jobCards.reduce((acc, jc) => {
    const op = operations.find((o) => o.id === jc.operationId);
    if (!op) return acc;
    if (op.costingMethod === 'fixed') return acc + (op.fixedLaborCost || 0);
    const hrs = (jc.actualMinutes || jc.plannedMinutes) / 60;
    return acc + (hrs * (op.laborCostPerHour || 0));
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Analisis Kinerja"
      size="md"
    >
      <div className="space-y-5">
        {/* Summary Box */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="pb-2 flex items-start justify-between border-b border-slate-200 dark:border-slate-800 gap-3">
            <div>
              <div className="font-bold text-base text-slate-900 dark:text-white">
                {selectedWO.productName}
              </div>
              {selectedWO.variantName && (
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                  {formatVariantLabel(selectedWO.variantName)}
                </div>
              )}
            </div>
            <Badge
              variant={
                selectedWO.status === 'COMPLETED'
                  ? 'success'
                  : selectedWO.status === 'PROCESSING' || selectedWO.status === 'IN_PROGRESS'
                    ? 'info'
                    : selectedWO.status === 'CANCELED'
                      ? 'danger'
                      : 'warning'
              }
            >
              {selectedWO.status === 'COMPLETED'
                ? 'Selesai'
                : selectedWO.status === 'PROCESSING' || selectedWO.status === 'IN_PROGRESS'
                  ? 'Berjalan'
                  : selectedWO.status === 'CANCELED'
                    ? 'Dibatalkan'
                    : 'Menunggu'}
            </Badge>
          </div>
          <div className="space-y-2 mt-4 text-[13.5px] md:text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">No. Order</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                {selectedWO.salesOrderNumber || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Waktu Mulai</span>
              <span className="text-slate-800 dark:text-slate-200">
                {formatDateTime(selectedWO.issuedAt)}
              </span>
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
                {selectedWO.completedAt
                  ? formatDurationBetween(selectedWO.issuedAt, selectedWO.completedAt)
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* List Card Operasi */}
        <div className="space-y-2">
          {selectedWO.jobCards
            .slice()
            .sort((a, b) => a.sequence - b.sequence)
            .map((jc) => {
              const op = operations.find(
                (o) =>
                  o.id === jc.operationId ||
                  (jc.operationName && o.name && o.name.toLowerCase() === jc.operationName.toLowerCase())
              );
              const targetOpMins =
                jc.plannedMinutes ||
                op?.durationMinutes ||
                (prod?.defaultEstimatedHours
                  ? Math.round((prod.defaultEstimatedHours * 60) / Math.max(1, selectedWO.jobCards.length))
                  : 45);
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

              const laborCost = op
                ? op.costingMethod === 'fixed'
                  ? (op.fixedLaborCost || 0) * jc.targetQty
                  : ((typeof actualMins === 'number' ? actualMins : targetOpMins) / 60) *
                    (op.laborCostPerHour || 0)
                : 0;

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
                      {onOpenEditOperator && (
                        <button
                          type="button"
                          onClick={() => onOpenEditOperator(selectedWO.id, jc)}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md transition-colors shrink-0 cursor-pointer"
                          title="Ubah Operator"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
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
            {formatCurrency(totalLaborCost)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
