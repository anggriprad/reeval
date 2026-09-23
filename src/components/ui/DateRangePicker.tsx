'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  /** Label to show on trigger when a shortcut is active */
  shortcutLabel?: string;
  onShortcutLabelChange?: (label: string | null) => void;
  /** Set a default active shortcut key (e.g. 'thisMonth') */
  defaultShortcut?: ShortcutKey;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function endOfDay(d: Date) {
  const r = new Date(d); r.setHours(23, 59, 59, 999); return r;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
export function formatDateRangeLabel(from: Date | null, to: Date | null): string {
  if (!from) return '';
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')} ${MONTHS_ID[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  if (!to || isSameDay(from, to)) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

// ─── Default "Bulan Ini" range ────────────────────────────────────────────────

export function getThisMonthRange(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: startOfDay(from), to: endOfDay(to) };
}

// ─── Shortcuts ────────────────────────────────────────────────────────────────

type ShortcutKey =
  | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisWeek' | 'thisMonth' | 'thisYear';

interface Shortcut {
  key: ShortcutKey;
  label: string;
  range: () => DateRange;
}

const SHORTCUTS: Shortcut[] = [
  {
    key: 'today',
    label: 'Hari Ini',
    range: () => { const d = new Date(); return { from: startOfDay(d), to: endOfDay(d) }; },
  },
  {
    key: 'yesterday',
    label: 'Kemarin',
    range: () => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return { from: startOfDay(d), to: endOfDay(d) };
    },
  },
  {
    key: 'last7',
    label: '7 Hari Terakhir',
    range: () => {
      const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(to) };
    },
  },
  {
    key: 'last30',
    label: '30 Hari Terakhir',
    range: () => {
      const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 29);
      return { from: startOfDay(from), to: endOfDay(to) };
    },
  },
  {
    key: 'thisWeek',
    label: 'Minggu Ini',
    range: () => {
      const now = new Date();
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const from = new Date(now); from.setDate(now.getDate() - day);
      const to = new Date(from); to.setDate(from.getDate() + 6);
      return { from: startOfDay(from), to: endOfDay(to) };
    },
  },
  {
    key: 'thisMonth',
    label: 'Bulan Ini',
    range: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: startOfDay(from), to: endOfDay(to) };
    },
  },
  {
    key: 'thisYear',
    label: 'Tahun Ini',
    range: () => {
      const y = new Date().getFullYear();
      return { from: startOfDay(new Date(y, 0, 1)), to: endOfDay(new Date(y, 11, 31)) };
    },
  },
];

// ─── Calendar Component ───────────────────────────────────────────────────────

interface CalendarProps {
  calYear: number;
  calMonth: number;
  selecting: Date | null;
  selected: DateRange;
  hovered: Date | null;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date | null) => void;
  onPrev: () => void;
  onNext: () => void;
}

function CalendarView({
  calYear, calMonth, selecting, selected, hovered,
  onDayClick, onDayHover, onPrev, onNext,
}: CalendarProps) {
  const daysCount = getDaysInMonth(calYear, calMonth);
  const firstDow = getFirstDayOfWeek(calYear, calMonth);
  const cells: (Date | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysCount; d++) {
    cells.push(new Date(calYear, calMonth, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  let rangeFrom: Date | null = selected.from;
  let rangeTo: Date | null = selected.to;
  if (selecting) {
    rangeFrom = selecting;
    rangeTo = hovered ? (hovered >= selecting ? hovered : selecting) : null;
    if (hovered && hovered < selecting) { rangeFrom = hovered; rangeTo = selecting; }
  }

  const isInRange = (d: Date) => {
    if (!rangeFrom || !rangeTo) return false;
    return d >= startOfDay(rangeFrom) && d <= endOfDay(rangeTo);
  };
  const isFrom = (d: Date) => rangeFrom && isSameDay(d, rangeFrom);
  const isTo = (d: Date) => rangeTo && isSameDay(d, rangeTo);
  const isToday = (d: Date) => isSameDay(d, new Date());

  return (
    <div className="select-none w-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrev}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          {MONTHS_ID[calMonth]} {calYear}
        </span>
        <button
          type="button"
          onClick={onNext}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ID.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const inRange = isInRange(date);
          const isStart = isFrom(date);
          const isEnd = isTo(date);
          const isEndpoint = isStart || isEnd;
          const today = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={cn(
                'relative flex items-center justify-center',
                inRange && !isEndpoint && 'bg-indigo-50 dark:bg-indigo-950/40',
                isStart && 'rounded-l-full',
                isEnd && 'rounded-r-full',
              )}
            >
              <button
                type="button"
                onClick={() => onDayClick(date)}
                onMouseEnter={() => onDayHover(date)}
                onMouseLeave={() => onDayHover(null)}
                className={cn(
                  'w-8 h-8 text-xs font-medium rounded-full transition-all flex items-center justify-center',
                  !isEndpoint && today && 'ring-1 ring-indigo-400 text-indigo-600 dark:text-indigo-400',
                  !isEndpoint && !today && 'text-slate-700 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
                  isEndpoint && 'bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-sm',
                )}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pilih periode',
  className,
  align = 'left',
  defaultShortcut,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  // activeShortcut: which shortcut is currently selected (null = custom range via calendar)
  const [activeShortcut, setActiveShortcut] = useState<ShortcutKey | null>(defaultShortcut ?? null);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selecting, setSelecting] = useState<Date | null>(null); // first click pending second
  const [hovered, setHovered] = useState<Date | null>(null);
  // draft is only used for custom range (calendar clicks)
  const [draft, setDraft] = useState<DateRange>({ from: null, to: null });

  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    // When opening, sync calendar draft from current value if no shortcut active
    if (!activeShortcut) {
      setDraft({ from: value.from, to: value.to });
    } else {
      setDraft({ from: null, to: null });
    }
    setSelecting(null);
    setOpen(v => !v);
  };

  // Shortcut click: immediately apply, close panel
  const applyShortcut = (sc: Shortcut) => {
    const range = sc.range();
    setActiveShortcut(sc.key);
    setDraft({ from: null, to: null });
    setSelecting(null);
    onChange(range);
    setOpen(false);
  };

  // Day click on calendar: custom range mode
  const handleDayClick = useCallback((date: Date) => {
    // When user touches the calendar, switch to custom mode
    setActiveShortcut(null);
    if (!selecting) {
      setSelecting(date);
      setDraft({ from: date, to: null });
    } else {
      let from = selecting;
      let to = date;
      if (to < from) [from, to] = [to, from];
      setDraft({ from: startOfDay(from), to: endOfDay(to) });
      setSelecting(null);
    }
  }, [selecting]);

  // Apply custom range (calendar) — only shown when custom range is being built
  const handleApplyCustom = () => {
    if (draft.from) {
      onChange(draft);
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ from: null, to: null });
    setActiveShortcut(null);
    setDraft({ from: null, to: null });
    setSelecting(null);
  };

  const hasValue = value.from !== null;
  // Custom range = has value but NOT from a shortcut
  const isCustomRange = hasValue && !activeShortcut;

  // Determine trigger label
  const triggerLabel = (() => {
    if (!hasValue) return placeholder;
    if (activeShortcut) {
      return SHORTCUTS.find(s => s.key === activeShortcut)?.label ?? placeholder;
    }
    // Custom range — show date string
    return formatDateRangeLabel(value.from, value.to);
  })();

  // Show apply button only when user is building a custom range
  const showApply = !activeShortcut && (draft.from !== null || selecting !== null);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'inline-flex items-center gap-2 rounded-md border px-3 h-9 text-xs font-medium transition-colors',
          'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
          open && 'border-indigo-500 ring-2 ring-indigo-500/20',
          isCustomRange && 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-600',
        )}
      >
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <span className="max-w-[200px] truncate">{triggerLabel}</span>
        {isCustomRange ? (
          <X
            className="w-3.5 h-3.5 shrink-0 text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 ml-0.5"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1.5 flex rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900',
            'ring-1 ring-black/5 dark:ring-white/5',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {/* Left: Shortcuts */}
          <div className="w-40 border-r border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1.5 pt-1">
              Periode
            </p>
            {SHORTCUTS.map(sc => (
              <button
                key={sc.key}
                type="button"
                onClick={() => applyShortcut(sc)}
                className={cn(
                  'w-full text-left text-xs rounded-md px-2 py-1.5 font-medium transition-colors',
                  activeShortcut === sc.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                {sc.label}
              </button>
            ))}

            {/* Divider above custom hint */}
            <div className="border-t border-slate-100 dark:border-slate-800 mt-1.5 pt-1.5 px-2">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                Atau pilih tanggal kustom di kalender →
              </p>
            </div>
          </div>

          {/* Right: Calendar */}
          <div className="p-4 flex flex-col gap-3">
            <CalendarView
              calYear={calYear}
              calMonth={calMonth}
              selecting={selecting}
              selected={activeShortcut ? { from: null, to: null } : draft}
              hovered={hovered}
              onDayClick={handleDayClick}
              onDayHover={setHovered}
              onPrev={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                else setCalMonth(m => m - 1);
              }}
              onNext={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                else setCalMonth(m => m + 1);
              }}
            />

            {/* Custom range preview + Apply — only visible when building custom range */}
            {showApply && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 min-h-[16px]">
                  {draft.from && (
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {formatDateRangeLabel(draft.from, draft.to)}
                    </span>
                  )}
                  {selecting && !draft.to && (
                    <span className="text-indigo-500"> — pilih tanggal akhir</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  disabled={!draft.from || selecting !== null}
                  className={cn(
                    'w-full rounded-lg py-2 text-xs font-bold transition-colors',
                    draft.from && selecting === null
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800',
                  )}
                >
                  Terapkan Range Kustom
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
