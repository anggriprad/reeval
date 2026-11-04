'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Play, Pause, Check, User, Plus, Edit2, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobCard, ProductionOperation } from '@/lib/types';

interface JobCardTrackerProps {
  workOrderId: string;
  jobCards: JobCard[];
  operations?: ProductionOperation[];
  canManage: boolean;
  onAssignOperator: (woId: string, jc: JobCard, e?: React.MouseEvent) => void;
  onStart: (woId: string, jcId: string, e?: React.MouseEvent) => void;
  onPause: (woId: string, jcId: string, e?: React.MouseEvent) => void;
  onComplete: (woId: string, jc: JobCard, e?: React.MouseEvent) => void;
}

function formatCountdown(totalSeconds: number): string {
  const isOvertime = totalSeconds < 0;
  const abs = Math.abs(Math.floor(totalSeconds));
  const hrs = Math.floor(abs / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  const secs = abs % 60;
  const prefix = isOvertime ? '-' : '';
  if (hrs > 0) {
    return `${prefix}${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${prefix}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function JobCardTracker({
  workOrderId,
  jobCards,
  operations = [],
  canManage,
  onAssignOperator,
  onStart,
  onPause,
  onComplete,
}: JobCardTrackerProps) {
  const sortedJc = [...jobCards].sort((a, b) => a.sequence - b.sequence);
  const hasRunningCard = jobCards.some((jc) => jc.status === 'IN_PROGRESS');
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!hasRunningCard) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [hasRunningCard]);

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-3 md:gap-2 py-1">
      {sortedJc.map((jc) => {
        const isPending = jc.status === 'PENDING';
        const isInProgress = jc.status === 'IN_PROGRESS';
        const isPaused = jc.status === 'PAUSED';
        const isCompleted = jc.status === 'COMPLETED';
        const hasOperator = Boolean(jc.picName && jc.picName.trim());

        const op = operations.find(
          (o) =>
            o.id === jc.operationId ||
            (jc.operationName && o.name && o.name.toLowerCase() === jc.operationName.toLowerCase())
        );
        const targetMinutes = jc.plannedMinutes || op?.durationMinutes || 0;
        const plannedSeconds = targetMinutes * 60;

        let elapsedSeconds = (jc.totalDurationMinutes || 0) * 60;
        if (isInProgress) {
          const activeStart = jc.lastStartedAt || jc.startedAt;
          if (activeStart) {
            const runSec = Math.max(0, Math.floor((now - new Date(activeStart).getTime()) / 1000));
            elapsedSeconds += runSec;
          }
        } else if (isPaused && elapsedSeconds === 0 && jc.startedAt && jc.lastPausedAt) {
          elapsedSeconds = Math.max(
            0,
            Math.floor((new Date(jc.lastPausedAt).getTime() - new Date(jc.startedAt).getTime()) / 1000)
          );
        } else if (isCompleted) {
          elapsedSeconds = (jc.actualMinutes ?? jc.totalDurationMinutes ?? 0) * 60;
        }

        const remainingSeconds = plannedSeconds - elapsedSeconds;
        const isOvertime = remainingSeconds < 0;

        return (
          <div
            key={jc.id}
            className={cn(
              'relative overflow-hidden w-full md:w-[250px] shrink-0 rounded-xl md:rounded-lg p-3.5 md:p-3 border flex flex-col gap-2.5 transition-all',
              isCompleted
                ? 'border-transparent bg-slate-100/60 dark:bg-slate-800/40 opacity-75'
                : 'bg-slate-50/70 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'
            )}
          >
            {/* Header: Nama Operasi & Countdown / Completed Check */}
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-[15px] md:text-sm text-slate-900 dark:text-white leading-tight min-w-0">
                {jc.operationName}
              </div>

              {isCompleted ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  {(targetMinutes > 0 || typeof jc.actualMinutes === 'number') && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs md:text-[11px] font-mono font-semibold tabular-nums',
                        isOvertime
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      )}
                    >
                      <Timer className="h-3 w-3 shrink-0" />
                      {formatCountdown(remainingSeconds)}
                    </span>
                  )}
                  <div className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-xs shrink-0">
                    <Check className="h-3 w-3 stroke-[2.5]" />
                  </div>
                </div>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs md:text-[11px] font-mono font-bold tabular-nums shrink-0',
                    isPending && 'bg-slate-200/80 text-slate-700 dark:bg-slate-700/80 dark:text-slate-300',
                    isPaused && 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
                    isInProgress &&
                      (isOvertime
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 animate-pulse'
                        : plannedSeconds > 0 && remainingSeconds <= plannedSeconds * 0.2
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300')
                  )}
                >
                  <Timer className="h-3 w-3 shrink-0" />
                  {formatCountdown(remainingSeconds)}
                </span>
              )}
            </div>

            {/* Informasi Operator pada Card */}
            <div className="flex items-center justify-between gap-2 text-[13.5px] md:text-xs">
              {hasOperator ? (
                <div
                  className={cn(
                    'flex items-center gap-1.5 min-w-0 font-medium',
                    isCompleted
                      ? 'text-emerald-800 dark:text-emerald-200'
                      : 'text-slate-700 dark:text-slate-300'
                  )}
                >
                  <User
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                    )}
                  />
                  <span className="truncate">{jc.picName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 text-slate-400 dark:text-slate-500">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Belum ada operator</span>
                </div>
              )}

              {hasOperator && !isCompleted && canManage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssignOperator(workOrderId, jc, e);
                  }}
                  className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md transition-colors shrink-0 cursor-pointer"
                  title="Ubah Operator"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Aksi Operasi */}
            {!isCompleted && canManage && (
              <div>
                {!hasOperator ? (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="w-full h-11 md:h-10 text-sm font-semibold bg-white dark:bg-slate-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignOperator(workOrderId, jc, e);
                    }}
                  >
                    <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    Pilih Operator
                  </Button>
                ) : (
                  <>
                    {isPending && (
                      <Button
                        type="button"
                        size="lg"
                        variant="primary"
                        className="w-full h-11 md:h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                        onClick={(e) => onStart(workOrderId, jc.id, e)}
                      >
                        <Play className="h-4 w-4 md:h-3.5 md:w-3.5 fill-white" />
                        Mulai
                      </Button>
                    )}

                    {isPaused && (
                      <Button
                        type="button"
                        size="lg"
                        variant="primary"
                        className="w-full h-11 md:h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white border-0"
                        onClick={(e) => onStart(workOrderId, jc.id, e)}
                      >
                        <Play className="h-4 w-4 md:h-3.5 md:w-3.5 fill-white" />
                        Lanjutkan
                      </Button>
                    )}

                    {isInProgress && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="lg"
                          className="h-11 md:h-10 text-sm font-semibold text-white border-0"
                          onClick={(e) => onPause(workOrderId, jc.id, e)}
                        >
                          <Pause className="h-4 w-4 md:h-3.5 md:w-3.5 fill-white" />
                        </Button>
                        <Button
                          type="button"
                          variant="success"
                          size="lg"
                          className="flex-1 h-11 md:h-10 text-sm font-semibold"
                          onClick={(e) => onComplete(workOrderId, jc, e)}
                        >
                          <Check className="h-4 w-4 md:h-3.5 md:w-3.5" />
                          Selesai
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
