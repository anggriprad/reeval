'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T = any> {
  id: string;
  key?: string;
  header?: string | React.ReactNode;
  cell?: (context: { row: T; value: any }) => React.ReactNode;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  accessorFn?: (row: T) => any;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface CustomTableProps<T = any> {
  data?: T[];
  columns?: Column<T>[];
  pagination?: boolean;
  selection?: boolean;
  lastPage?: number;
  total?: number;
  loading?: boolean;
  checkedData?: T[];
  setCheckedData?: (data: T[]) => void;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  currentPage?: number;
  perPage?: number;
  onRowClick?: (rowData: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export default function CustomTable<T extends { id?: string | number } = any>({
  data = [],
  columns = [],
  pagination = false,
  selection = false,
  lastPage = 1,
  total = 0,
  loading = false,
  checkedData = [],
  setCheckedData,
  onPageChange,
  onPerPageChange,
  currentPage,
  perPage: propPerPage,
  onRowClick,
  emptyTitle = 'Tidak Ada Data',
  emptyDescription = 'Belum ada data yang tersedia untuk ditampilkan.',
  className,
}: CustomTableProps<T>) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(propPerPage || 20);

  useEffect(() => {
    if (currentPage !== undefined) {
      setPage(currentPage);
    }
  }, [currentPage]);

  useEffect(() => {
    if (propPerPage !== undefined) {
      setPerPage(propPerPage);
    }
  }, [propPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > (lastPage || 1)) return;

    if (currentPage === undefined) {
      setPage(newPage);
    }
    if (onPageChange) onPageChange(newPage);
  };

  const handlePerPageChange = (newPerPage: number) => {
    if (propPerPage === undefined) {
      setPerPage(newPerPage);
      setPage(1);
    }

    if (onPerPageChange) onPerPageChange(newPerPage);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!setCheckedData) return;
    if (checked) {
      setCheckedData(data);
    } else {
      setCheckedData([]);
    }
  };

  const handleRowSelect = (row: T, checked: boolean) => {
    if (!setCheckedData) return;
    if (checked) {
      setCheckedData([...checkedData, row]);
    } else {
      setCheckedData(checkedData.filter((item) => (item.id !== undefined && row.id !== undefined ? item.id !== row.id : item !== row)));
    }
  };

  const isAllSelected = data.length > 0 && checkedData.length === data.length;
  const isIndeterminate = checkedData.length > 0 && checkedData.length < data.length;

  const renderCellContent = (column: Column<T>, row: T) => {
    const colKey = column.id || column.key || '';
    const value = column.accessorFn
      ? column.accessorFn(row)
      : (row as Record<string, any>)[colKey];

    if (column.cell) {
      return column.cell({ row, value });
    }

    if (column.render) {
      return column.render(value, row);
    }

    return value ?? '-';
  };

  const renderPagination = () => {
    if (!pagination) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Show</span>
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(Number(e.target.value))}
            className="px-2 py-1 text-xs font-medium border border-slate-200 rounded-md dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={60}>60</option>
            <option value={80}>80</option>
          </select>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            from <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span> rows
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page <span className="font-semibold text-slate-700 dark:text-slate-300">{page}</span> from{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{lastPage || 1}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous Page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= (lastPage || 1)}
              aria-label="Next Page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xs', className)}>
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Memuat data...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xs', className)}>
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  {selection && (
                    <TableCell isHeader className="px-4 py-3 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.id || column.key}
                      isHeader
                      style={column.width ? { width: column.width } : undefined}
                      className={cn(
                        'px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs',
                        column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-start',
                        column.className
                      )}
                    >
                      {column.header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
            </Table>
          </div>

          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <h6 className="text-sm font-semibold text-slate-900 dark:text-white">{emptyTitle}</h6>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{emptyDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xs', className)}>
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-full">
          <Table>
            <TableHeader>
              <TableRow>
                {selection && (
                  <TableCell isHeader className="px-4 py-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id || column.key}
                    isHeader
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      'px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs',
                      column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-start',
                      column.className
                    )}
                  >
                    {column.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((row, index) => {
                const isClickable = Boolean(onRowClick);
                const rowKey = (row as any).id ?? index;
                const isChecked = checkedData.some((item) => (item.id !== undefined && row.id !== undefined ? item.id === row.id : item === row));

                return (
                  <TableRow
                    key={rowKey}
                    onClick={() => isClickable && onRowClick?.(row)}
                    className={cn(
                      'transition-colors',
                      isClickable && 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
                      isChecked && 'bg-indigo-50/30 dark:bg-indigo-950/20'
                    )}
                  >
                    {selection && (
                      <TableCell className="px-4 py-3.5 w-12 text-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleRowSelect(row, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell
                        key={column.id || column.key}
                        className={cn(
                          'px-4 py-3.5 text-slate-800 text-sm dark:text-slate-200',
                          column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-start',
                          column.className
                        )}
                      >
                        {renderCellContent(column, row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {renderPagination()}
    </div>
  );
}
