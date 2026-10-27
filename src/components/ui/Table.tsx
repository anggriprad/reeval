import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCardContext } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

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
  embedded?: boolean;
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
  embedded = false,
}: TableProps<T>) {
  const cardContext = useCardContext();
  const isInsideCardOnly = embedded || (cardContext.inCard && cardContext.isOnlyChild);

  if (loading) {
    return (
      <div
        className={cn(
          'w-full shadow-xs',
          isInsideCardOnly
            ? 'bg-transparent border-0 shadow-none rounded-none p-8'
            : 'rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900',
          containerClassName
        )}
      >
        <div className="flex flex-col items-center justify-center space-y-3 py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Memuat data...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          'w-full',
          isInsideCardOnly
            ? 'bg-transparent border-0 shadow-none rounded-none'
            : 'max-md:border-0 max-md:shadow-none rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent md:bg-white dark:bg-transparent dark:md:bg-slate-900 shadow-none md:shadow-xs',
          containerClassName
        )}
      >
        <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} variant="plain" />
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

  const getCellPadding = (colIndex: number) => {
    const isFirst = colIndex === 0;
    const isLast = colIndex === columns.length - 1;

    if (dense) {
      const leftPad = isFirst ? 'pl-3.5 sm:pl-5' : 'pl-2.5 sm:pl-3';
      const rightPad = isLast ? 'pr-3.5 sm:pr-5' : 'pr-2.5 sm:pr-3';
      return `py-2.5 ${leftPad} ${rightPad}`;
    }

    const leftPad = isFirst ? 'pl-3.5 sm:pl-6' : 'pl-3 sm:pl-3.5';
    const rightPad = isLast ? 'pr-3.5 sm:pr-6' : 'pr-3 sm:pr-3.5';
    return `py-3.5 ${leftPad} ${rightPad}`;
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
    <div
      className={cn(
        'w-full overflow-hidden',
        isInsideCardOnly
          ? 'bg-transparent border-0 shadow-none rounded-none'
          : 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs',
        containerClassName
      )}
    >
      <div className="overflow-x-auto">
        <table className={cn('w-full text-sm border-collapse', className)}>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {columns.map((col, colIdx) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'whitespace-nowrap',
                    getCellPadding(colIdx),
                    getAlignClass(col.align),
                    col.headerClassName
                  )}
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
                    className={cn(
                      'transition-colors',
                      hoverable && 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
                      striped && index % 2 === 1 && 'bg-slate-50/30 dark:bg-slate-800/20',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.key}
                        className={cn(
                          'whitespace-nowrap',
                          getCellPadding(colIdx),
                          getAlignClass(col.align),
                          col.className
                        )}
                      >
                        {getCellContent(item, col, index)}
                      </td>
                    ))}
                  </tr>
                  {expandedContent && (
                    <tr>
                      <td colSpan={columns.length} className="p-0 border-b border-slate-200 dark:border-slate-800">
                        <div className="pl-5 sm:pl-6 pr-5 sm:pr-6 py-4 bg-slate-50/40 dark:bg-slate-800/30">
                          {expandedContent}
                        </div>
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

Table.displayName = 'Table';
