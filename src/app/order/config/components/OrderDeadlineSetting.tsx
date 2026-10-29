'use client';

import React from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { Input } from '@/components/ui/Input';
import { Clock } from 'lucide-react';

export interface DeadlineValues {
  days: string | number;
  hours: string | number;
  minutes: string | number;
}

interface OrderDeadlineSettingProps {
  enabled: boolean;
  onToggle: (val: boolean) => void;
  deadlineProcessed: DeadlineValues;
  onProcessedChange: (val: DeadlineValues) => void;
  deadlineReady: DeadlineValues;
  onReadyChange: (val: DeadlineValues) => void;
  deadlineShipped: DeadlineValues;
  onShippedChange: (val: DeadlineValues) => void;
  disabled?: boolean;
}

export function OrderDeadlineSetting({
  enabled,
  onToggle,
  deadlineProcessed,
  onProcessedChange,
  deadlineReady,
  onReadyChange,
  deadlineShipped,
  onShippedChange,
  disabled = false,
}: OrderDeadlineSettingProps) {
  return (
    <div className="transition-colors">
      <div className="p-4 sm:p-5 flex items-center justify-between gap-8">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              enabled
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Batas Waktu Pesanan
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Atur batas maksimal durasi waktu dari pesanan masuk hingga statusnya berubah (SLA pesanan).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Toggle
            checked={enabled}
            onChange={onToggle}
            disabled={disabled}
            showStatusBadge
            color="indigo"
          />
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          enabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20 space-y-4">
              {/* Field 1: Batas Waktu Pesanan Diproses */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Batas Waktu Pesanan Diproses
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Batas maksimal dari pesanan masuk hingga status{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                      Diproses (SPK Terbit)
                    </strong>
                    .
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-sm w-full sm:w-auto">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Hari
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={deadlineProcessed.days}
                      onChange={(e) =>
                        onProcessedChange({ ...deadlineProcessed, days: e.target.value })
                      }
                      inputSize="sm"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Jam
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="0"
                      value={deadlineProcessed.hours}
                      onChange={(e) =>
                        onProcessedChange({ ...deadlineProcessed, hours: e.target.value })
                      }
                      inputSize="sm"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Menit
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={deadlineProcessed.minutes}
                      onChange={(e) =>
                        onProcessedChange({ ...deadlineProcessed, minutes: e.target.value })
                      }
                      inputSize="sm"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>

              {/* Field 2: Batas Waktu Pesanan Siap Kirim */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Batas Waktu Pesanan Siap Kirim
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Batas maksimal dari pesanan masuk hingga status{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                      Siap Kirim
                    </strong>
                    .
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-sm w-full sm:w-auto">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Hari
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={deadlineReady.days}
                      onChange={(e) =>
                        onReadyChange({ ...deadlineReady, days: e.target.value })
                      }
                      inputSize="sm"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Jam
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="0"
                      value={deadlineReady.hours}
                      onChange={(e) =>
                        onReadyChange({ ...deadlineReady, hours: e.target.value })
                      }
                      inputSize="sm"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Menit
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={deadlineReady.minutes}
                      onChange={(e) =>
                        onReadyChange({ ...deadlineReady, minutes: e.target.value })
                      }
                      inputSize="sm"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>

              {/* Field 3: Batas Waktu Pesanan Terkirim */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Batas Waktu Pesanan Terkirim
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Batas maksimal dari pesanan masuk hingga status{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                      Terkirim (Selesai)
                    </strong>
                    .
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-sm w-full sm:w-auto">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Hari
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={deadlineShipped.days}
                      onChange={(e) =>
                        onShippedChange({ ...deadlineShipped, days: e.target.value })
                      }
                      inputSize="sm"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Jam
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="0"
                      value={deadlineShipped.hours}
                      onChange={(e) =>
                        onShippedChange({ ...deadlineShipped, hours: e.target.value })
                      }
                      inputSize="sm"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Menit
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={deadlineShipped.minutes}
                      onChange={(e) =>
                        onShippedChange({ ...deadlineShipped, minutes: e.target.value })
                      }
                      inputSize="sm"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
