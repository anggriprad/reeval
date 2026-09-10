import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export interface SegmentOption<T extends string = string> {
  key: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
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
}: SegmentedControlProps<T>) {
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
  const hasControlsRow = hasSearch || hasFilters;

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Tab Segment Pills */}
      <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 w-fit">
        {options.map((option) => {
          const isActive = value === option.key;
          const Icon = option.icon;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={`flex items-center justify-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer min-w-[80px] sm:min-w-[95px] ${isActive
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                }`}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              <span className="whitespace-nowrap">{option.label}</span>
              {typeof option.count === 'number' && option.count > 0 && (
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold transition-colors shrink-0 ${isActive
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-xs'
                    : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Dropdown + Search Bar Row (Search Left, Dropdowns After, Normal Gap) */}
      {hasControlsRow && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center pt-1">
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold z-10"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Dropdown Filters (After Search Input) */}
          {allFilters.map((f, i) => (
            <div key={f.id || i} className="w-full sm:max-w-48 shrink-0">
              <Select
                inputSize="md"
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                placeholder={f.placeholder || 'Semua Filter'}
                options={f.options}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



