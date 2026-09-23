import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  accessor?: keyof T | ((item: T, index: number) => React.ReactNode);
  cell?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  loading?: boolean;
  onRowClick?: (item: T, index: number) => void;
  expandedRowRender?: (item: T, index: number) => React.ReactNode;
  className?: string;
  containerClassName?: string;
  footer?: React.ReactNode;
  dense?: boolean;
  hoverable?: boolean;
  striped?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyTitle = 'Tidak ada data',
  emptyDescription = 'Belum ada data yang tersedia untuk ditampilkan.',
  emptyIcon,
  loading = false,
  onRowClick,
  expandedRowRender,
  className = '',
  containerClassName = '',
  footer,
  dense = false,
  hoverable = true,
  striped = false,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className={`w-full rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 shadow-xs ${containerClassName}`}>
        <div className="flex flex-col items-center justify-center space-y-3 py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Memuat data...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs ${containerClassName}`}>
        <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />
      </div>
    );
  }

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      case 'left':
      default:
        return 'text-left';
    }
  };

  const getCellContent = (item: T, col: TableColumn<T>, index: number) => {
    if (col.cell) {
      return col.cell(item, index);
    }
    if (typeof col.accessor === 'function') {
      return col.accessor(item, index);
    }
    if (col.accessor && typeof col.accessor === 'string' && item) {
      return (item as any)[col.accessor] ?? '';
    }
    return '';
  };

  return (
    <div className={`w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs overflow-hidden ${containerClassName}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-sm border-collapse ${className}`}>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`py-3 px-3.5 ${getAlignClass(col.align)} ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {data.map((item, index) => {
              const rowKey = keyExtractor ? keyExtractor(item, index) : (item as any)?.id || index;
              const expandedContent = expandedRowRender ? expandedRowRender(item, index) : null;
              return (
                <React.Fragment key={String(rowKey)}>
                  <tr
                    onClick={() => onRowClick && onRowClick(item, index)}
                    className={`transition-colors ${
                      hoverable ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40' : ''
                    } ${
                      striped && index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${dense ? 'py-2 px-3' : 'py-3 px-3.5'} ${getAlignClass(col.align)} ${col.className || ''}`}
                      >
                        {getCellContent(item, col, index)}
                      </td>
                    ))}
                  </tr>
                  {expandedContent && (
                    <tr>
                      <td colSpan={columns.length} className="p-0 border-b border-slate-200 dark:border-slate-800">
                        {expandedContent}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          {footer && (
            <tfoot className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 font-semibold">
              {footer}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
