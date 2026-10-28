'use client';

import React, { useMemo, useState } from 'react';
import { PermissionItem } from '@/services/role.service';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckSquare, Square, Search, Shield, Check } from 'lucide-react';

export interface PermissionMatrixProps {
  permissions: PermissionItem[];
  selectedIds: number[];
  onChange?: (selectedIds: number[]) => void;
  readOnly?: boolean;
  loading?: boolean;
}

export function PermissionMatrix({
  permissions,
  selectedIds,
  onChange,
  readOnly = false,
  loading = false,
}: PermissionMatrixProps) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all');

  const filteredPermissions = useMemo(() => {
    let list = permissions;
    if (filterMode === 'selected') {
      list = list.filter(p => selectedIds.includes(p.id));
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      p =>
        p.code.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [permissions, selectedIds, filterMode, search]);

  const grouped = useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    for (const p of filteredPermissions) {
      const mod = p.module || 'system';
      if (!map[mod]) {
        map[mod] = [];
      }
      map[mod].push(p);
    }
    return map;
  }, [filteredPermissions]);

  const moduleNames = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const handleToggleOne = (id: number) => {
    if (readOnly || !onChange) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleToggleModule = (moduleName: string) => {
    if (readOnly || !onChange) return;
    const modulePerms = grouped[moduleName] || [];
    const moduleIds = modulePerms.map(p => p.id);
    const allSelected = moduleIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      onChange(selectedIds.filter(id => !moduleIds.includes(id)));
    } else {
      const newIds = Array.from(new Set([...selectedIds, ...moduleIds]));
      onChange(newIds);
    }
  };

  const handleToggleAll = () => {
    if (readOnly || !onChange) return;
    const allVisibleIds = filteredPermissions.map(p => p.id);
    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      onChange(selectedIds.filter(id => !allVisibleIds.includes(id)));
    } else {
      const newIds = Array.from(new Set([...selectedIds, ...allVisibleIds]));
      onChange(newIds);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Memuat katalog hak akses...</p>
      </div>
    );
  }

  const allVisibleIds = filteredPermissions.map(p => p.id);
  const isAllVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari izin berdasarkan kode, modul, atau deskripsi..."
              inputSize="sm"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Semua ({permissions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('selected')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterMode === 'selected'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {readOnly ? 'Izin Aktif' : 'Terpilih'} ({selectedIds.length})
            </button>
          </div>
        </div>

        {readOnly ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium sm:text-right">
            Total: <strong className="text-slate-900 dark:text-white font-semibold">{selectedIds.length}</strong> dari {permissions.length} izin aktif
          </div>
        ) : (
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-white font-semibold">
                {selectedIds.length}
              </strong>{' '}
              dari {permissions.length} dipilih
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleAll}
              className="text-xs"
            >
              {isAllVisibleSelected ? 'Batal Semua' : 'Pilih Semua'}
            </Button>
          </div>
        )}
      </div>

      {moduleNames.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
          {filterMode === 'selected' && selectedIds.length === 0 ? (
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {readOnly ? 'Role ini belum memiliki hak akses aktif' : 'Belum ada hak akses yang dipilih'}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFilterMode('all')}
                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400"
              >
                Tampilkan Semua Katalog Hak Akses
              </Button>
            </div>
          ) : (
            <p>Tidak ada hak akses yang cocok dengan pencarian &quot;{search}&quot;.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {moduleNames.map(modName => {
            const perms = grouped[modName] || [];
            const moduleSelectedCount = perms.filter(p => selectedIds.includes(p.id)).length;
            const isModuleAllSelected = perms.length > 0 && moduleSelectedCount === perms.length;

            return (
              <div
                key={modName}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Modul: {modName}
                    </span>
                    <Badge variant={moduleSelectedCount > 0 ? 'info' : 'default'} className="text-[11px]">
                      {moduleSelectedCount} / {perms.length} Aktif
                    </Badge>
                  </div>

                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleModule(modName)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                    >
                      {isModuleAllSelected ? 'Batal Hak Akses' : 'Pilih Semua Hak Akses'}
                    </Button>
                  )}
                </div>

                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {perms.map(p => {
                    const isChecked = selectedIds.includes(p.id);

                    if (readOnly) {
                      return (
                        <div
                          key={p.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${
                            isChecked
                              ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40'
                              : 'bg-slate-50/40 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/40 opacity-50'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isChecked ? (
                              <div className="flex h-4 w-4 items-center justify-center rounded bg-emerald-600 text-white dark:bg-emerald-500">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="h-4 w-4 rounded border border-slate-300 dark:border-slate-700" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                              {p.code}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {p.description || '-'}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggleOne(p.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer select-none ${
                          isChecked
                            ? 'bg-indigo-50/60 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800/60'
                            : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                            {p.code}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {p.description || '-'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
