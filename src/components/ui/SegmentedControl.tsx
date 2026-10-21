'use client';

import React from 'react';
import { Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MobileControlsSyncDetail } from '@/components/layout/MobileHeader';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string = string> {
  key: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
  countColor?: string;
}

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  // Search props
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  // Single filter dropdown props
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: FilterSelectOption[];
  filterPlaceholder?: string;
  // Multiple filter dropdowns prop
  filters?: FilterConfig[];
  // Extra controls (e.g. toggle, checkbox, buttons) in filter row
  extraControls?: React.ReactNode;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  filterValue,
  onFilterChange,
  filterOptions,
  filterPlaceholder = 'Semua Filter',
  filters,
  extraControls,
}: SegmentedControlProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isPrimary, setIsPrimary] = React.useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);

  const allFilters: FilterConfig[] = React.useMemo(() => {
    const list: FilterConfig[] = [];
    if (filters && filters.length > 0) {
      list.push(...filters);
    } else if (onFilterChange !== undefined && filterValue !== undefined && filterOptions && filterOptions.length > 0) {
      list.push({
        value: filterValue,
        onChange: onFilterChange,
        options: filterOptions,
        placeholder: filterPlaceholder,
      });
    }
    return list;
  }, [filters, filterValue, onFilterChange, filterOptions, filterPlaceholder]);

  const hasSearch = onSearchChange !== undefined && searchValue !== undefined;
  const hasFilters = allFilters.length > 0;
  const hasControlsRow = hasSearch || hasFilters || !!extraControls;
  const isFilterActive = allFilters.some(
    (f) => Boolean(f.value) && String(f.value).toUpperCase() !== 'ALL'
  );

  const onSearchChangeRef = React.useRef(onSearchChange);
  React.useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // Detect if this is the primary top-level SegmentedControl on the page or a nested sub-tab bar
  React.useEffect(() => {
    if (typeof document !== 'undefined' && containerRef.current) {
      const all = document.querySelectorAll('[data-segmented-control="true"]');
      setIsPrimary(all.length === 0 || all[0] === containerRef.current);
    }
  }, []);

  // Automatically sync Search & Filter controls with MobileHeader for all pages
  React.useEffect(() => {
    if (!isPrimary || (!hasSearch && !hasFilters)) return;

    const detail: MobileControlsSyncDetail = {
      search: hasSearch
        ? {
            value: searchValue || '',
            onChange: (val: string) => onSearchChangeRef.current?.(val),
            placeholder: searchPlaceholder,
          }
        : undefined,
      filter: hasFilters
        ? {
            isActive: isFilterActive,
            onOpen: () => setMobileFilterOpen(true),
          }
        : undefined,
    };

    window.dispatchEvent(new CustomEvent('mobile-controls-sync', { detail }));

    return () => {
      window.dispatchEvent(new CustomEvent('mobile-controls-sync', { detail: null }));
    };
  }, [isPrimary, hasSearch, hasFilters, searchValue, searchPlaceholder, isFilterActive]);

  const itemRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  React.useEffect(() => {
    const activeEl = itemRefs.current.get(value);
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [value]);

  return (
    <div ref={containerRef} data-segmented-control="true" className={`space-y-3.5 md:space-y-5 ${className}`}>
      {/* Tab Segment Container: Flush to top under MobileHeader on mobile (if primary), standard pills on desktop / secondary sub-tabs */}
      <div
        className={
          isPrimary
            ? 'max-md:!-mt-4 max-md:-mx-4 md:mt-0 md:mx-0 sticky top-16 left-0 right-0 z-20 md:static h-12 md:h-auto md:w-fit max-w-none md:max-w-full flex items-stretch md:items-center gap-0 md:gap-1.5 rounded-none md:rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md md:bg-slate-100 md:dark:bg-slate-800 p-0 md:p-1 border-b border-slate-200/90 dark:border-slate-800/90 md:border-b-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : 'w-full md:w-fit max-w-full flex items-center gap-1.5 rounded-xl md:rounded-lg bg-slate-100 dark:bg-slate-800 p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        }
      >
        {options.map((option) => {
          const isActive = value === option.key;
          const Icon = option.icon;

          return (
            <button
              key={option.key}
              type="button"
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(option.key, el);
                } else {
                  itemRefs.current.delete(option.key);
                }
              }}
              onClick={() => onChange(option.key)}
              className={
                isPrimary
                  ? `flex items-center justify-center gap-2 rounded-none md:rounded-md px-3.5 py-0 md:py-1.5 h-full md:h-auto text-[13.5px] md:text-sm font-semibold transition-all cursor-pointer shrink-0 min-w-[86px] md:min-w-[95px] border-b-[3px] md:border-b-0 active:scale-[0.99] touch-manipulation ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300 md:border-transparent md:bg-white md:text-indigo-600 md:shadow-xs md:dark:bg-slate-700 md:dark:text-white'
                        : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 md:hover:bg-slate-200/60 md:dark:hover:bg-slate-700/50'
                    }`
                  : `flex items-center justify-center gap-2 rounded-lg md:rounded-md px-3.5 py-2 md:py-1.5 text-[13.5px] md:text-sm font-semibold transition-all cursor-pointer shrink-0 min-w-[86px] active:scale-[0.99] touch-manipulation ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                    }`
              }
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              <span className="whitespace-nowrap">{option.label}</span>
              {typeof option.count === 'number' && option.count > 0 && (
                <span
                  className={`inline-flex items-center justify-center rounded-full transition-colors shrink-0 font-bold h-4.5 min-w-[18px] px-1 text-[12px] leading-none shadow-xs md:h-auto md:min-w-0 md:px-2 md:py-0.5 md:text-xs md:leading-normal md:shadow-none ${
                    option.countColor
                      ? `${option.countColor} text-white`
                      : isActive
                        ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white'
                        : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {option.count > 99 ? '99+' : option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Extra Controls on Mobile (e.g. Toggle switch) */}
      {extraControls && (
        <div className="flex md:hidden items-center pt-0.5">
          {extraControls}
        </div>
      )}

      {/* Filter Dropdown + Search Bar Row (Desktop only: on mobile, search & filter are synced to MobileHeader) */}
      {hasControlsRow && (
        <div className="hidden md:flex flex-col gap-2.5 sm:flex-row sm:items-center pt-0.5">
          {/* Left: Search Input */}
          {hasSearch && (
            <div className="relative w-full sm:w-64 md:w-72 shrink-0">
              <Input
                inputSize="md"
                icon={Search}
                value={searchValue}
                onChange={(e) => onSearchChange!(e.target.value)}
                placeholder={searchPlaceholder}
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange!('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold z-10 p-1"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Dropdown Filters (After Search Input) */}
          {allFilters.map((f, i) => {
            const hasAllOption = f.options.some(
              (opt) => String(opt.value) === '' || String(opt.value).toUpperCase() === 'ALL'
            );
            const resolvedOptions = hasAllOption
              ? f.options
              : [{ value: '', label: f.placeholder || 'Semua Filter' }, ...f.options];

            return (
              <div key={f.id || i} className="w-full sm:max-w-48 shrink-0">
                <Select
                  inputSize="md"
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  placeholder={f.placeholder || 'Semua Filter'}
                  options={resolvedOptions}
                />
              </div>
            );
          })}

          {/* Extra Controls */}
          {extraControls && (
            <div className="flex items-center shrink-0 sm:ml-auto">
              {extraControls}
            </div>
          )}
        </div>
      )}

      {/* Automatic Mobile Filter Bottom Sheet */}
      {hasFilters && (
        <BottomSheet
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          title={allFilters.length === 1 ? (allFilters[0].placeholder || 'Filter') : 'Filter'}
        >
          <div className="space-y-4 py-1">
            {allFilters.map((f, idx) => {
              const hasAllOption = f.options.some(
                (opt) => String(opt.value) === '' || String(opt.value).toUpperCase() === 'ALL'
              );
              const resolvedOptions = hasAllOption
                ? f.options
                : [{ value: '', label: f.placeholder || 'Semua' }, ...f.options];

              return (
                <div key={f.id || idx} className="space-y-1">
                  {allFilters.length > 1 && (
                    <div className="px-2 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {f.placeholder || `Filter ${idx + 1}`}
                    </div>
                  )}
                  {resolvedOptions.map((opt) => {
                    const isSelected = String(f.value) === String(opt.value);
                    return (
                      <button
                        key={String(opt.value) || 'all'}
                        type="button"
                        onClick={() => {
                          f.onChange(String(opt.value));
                          if (allFilters.length === 1) {
                            setMobileFilterOpen(false);
                          }
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm transition-colors text-left cursor-pointer',
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                        )}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
