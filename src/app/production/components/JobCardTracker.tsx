'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Play, Pause, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobCard } from '@/lib/types';

interface JobCardTrackerProps {
  workOrderId: string;
  jobCards: JobCard[];
  canManage: boolean;
  onStart: (woId: string, jcId: string, e?: React.MouseEvent) => void;
  onPause: (woId: string, jcId: string, e?: React.MouseEvent) => void;
  onOpenCompleteModal: (woId: string, jc: JobCard, e?: React.MouseEvent) => void;
}

export function JobCardTracker({
  workOrderId,
  jobCards,
  canManage,
  onStart,
  onPause,
  onOpenCompleteModal,
}: JobCardTrackerProps) {
  const sortedJc = [...jobCards].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-3 md:gap-2 py-1">
      {sortedJc.map((jc) => {
        const isPending = jc.status === 'PENDING';
        const isInProgress = jc.status === 'IN_PROGRESS';
        const isPaused = jc.status === 'PAUSED';
        const isCompleted = jc.status === 'COMPLETED';

        return (
          <div
            key={jc.id}
            className={cn(
              'relative overflow-hidden w-full md:w-[250px] shrink-0 rounded-xl md:rounded-lg p-3.5 md:p-3 border flex flex-col gap-3 transition-all',
              isCompleted
                ? 'border-transparent bg-slate-100/60 dark:bg-slate-800/40 opacity-70'
                : 'bg-slate-50/70 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'
            )}
          >
            {isCompleted && (
              <div className="absolute top-2 right-2 bg-emerald-600 text-white w-6 h-6 md:w-5 md:h-5 rounded-full flex items-center justify-center shadow-xs">
                <Check className="h-3.5 w-3.5 md:h-3 md:w-3 stroke-[2.5]" />
              </div>
            )}

            <div>
              <div className={cn('text-slate-900 dark:text-white leading-tight', isCompleted && 'pr-6')}>
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
                  onClick={(e) => onStart(workOrderId, jc.id, e)}
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
                  onClick={(e) => onStart(workOrderId, jc.id, e)}
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
                    onClick={(e) => onPause(workOrderId, jc.id, e)}
                  >
                    <Pause className="h-4 w-4 md:h-3.5 md:w-3.5 fill-white" />
                  </Button>
                  <Button
                    type="button"
                    variant="success"
                    size="lg"
                    className="flex-1 h-11 md:h-10 text-sm font-semibold"
                    onClick={(e) => onOpenCompleteModal(workOrderId, jc, e)}
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
        );
      })}
    </div>
  );
}
