'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PermissionItem, RoleSummary, roleService } from '@/services/role.service';
import { PermissionOverride } from '@/services/user.service';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Search,
  RotateCcw,
  Plus,
  Minus,
  Check,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserRoleOverrideMatrixProps {
  roleOptions: RoleSummary[];
  selectedRoleIds: number[];
  onRoleChange?: (roleIds: number[]) => void;
  allPermissions: PermissionItem[];
  overrides: PermissionOverride[];
  onOverridesChange?: (overrides: PermissionOverride[]) => void;
  readOnly?: boolean;
  loadingPermissions?: boolean;
}

export function UserRoleOverrideMatrix({
  roleOptions,
  selectedRoleIds,
  onRoleChange,
  allPermissions,
  overrides,
  onOverridesChange,
  readOnly = false,
  loadingPermissions = false,
}: UserRoleOverrideMatrixProps) {
  // Collapsed by default unless user already has active overrides
  const [isExpanded, setIsExpanded] = useState<boolean>(() => overrides.length > 0);
  const [search, setSearch] = useState('');
  const [showOnlyOverrides, setShowOnlyOverrides] = useState(false);
  const [rolePermCache, setRolePermCache] = useState<Record<number, number[]>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Sync cache with selected roles to determine inherited permissions
  useEffect(() => {
    let isMounted = true;
    const missingRoleIds = selectedRoleIds.filter(id => !rolePermCache[id]);

    if (missingRoleIds.length === 0) return;

    const fetchRolePerms = async () => {
      const newCache = { ...rolePermCache };
      await Promise.all(
        missingRoleIds.map(async id => {
          try {
            const res = await roleService.getRoleById(id);
            if (res.success && res.data) {
              newCache[id] = (res.data.permissions || []).map(p => p.id);
            } else {
              newCache[id] = [];
            }
          } catch {
            newCache[id] = [];
          }
        })
      );
      if (isMounted) {
        setRolePermCache(newCache);
      }
    };

    fetchRolePerms();

    return () => {
      isMounted = false;
    };
  }, [selectedRoleIds, rolePermCache]);

  const roleGrantedPermIds = useMemo(() => {
    const set = new Set<number>();
    for (const rid of selectedRoleIds) {
      const perms = rolePermCache[rid] || [];
      for (const pid of perms) {
        set.add(pid);
      }
    }
    return set;
  }, [selectedRoleIds, rolePermCache]);

  const overrideMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const o of overrides) {
      map.set(o.permission_id, o.is_granted);
    }
    return map;
  }, [overrides]);

  const getPermissionStatus = useCallback(
    (permId: number) => {
      if (overrideMap.has(permId)) {
        return overrideMap.get(permId) ? 'OVERRIDE_GRANTED' : 'OVERRIDE_DENIED';
      }
      return roleGrantedPermIds.has(permId) ? 'INHERITED_GRANTED' : 'INHERITED_DENIED';
    },
    [overrideMap, roleGrantedPermIds]
  );

  const stats = useMemo(() => {
    let effectiveCount = 0;
    let overrideGranted = 0;
    let overrideDenied = 0;

    for (const p of allPermissions) {
      const status = getPermissionStatus(p.id);
      if (status === 'OVERRIDE_GRANTED') {
        effectiveCount++;
        overrideGranted++;
      } else if (status === 'OVERRIDE_DENIED') {
        overrideDenied++;
      } else if (status === 'INHERITED_GRANTED') {
        effectiveCount++;
      }
    }

    return {
      total: allPermissions.length,
      effectiveCount,
      overrideGranted,
      overrideDenied,
      totalOverrides: overrides.length,
    };
  }, [allPermissions, getPermissionStatus, overrides.length]);

  const setOverrideState = (permId: number, target: 'inherited' | 'grant' | 'deny') => {
    if (readOnly || !onOverridesChange) return;

    if (target === 'inherited') {
      onOverridesChange(overrides.filter(o => o.permission_id !== permId));
      return;
    }

    const isGranted = target === 'grant';
    const existingIndex = overrides.findIndex(o => o.permission_id === permId);
    if (existingIndex !== -1) {
      const next = [...overrides];
      next[existingIndex] = { permission_id: permId, is_granted: isGranted };
      onOverridesChange(next);
    } else {
      onOverridesChange([...overrides, { permission_id: permId, is_granted: isGranted }]);
    }
  };

  const handleResetAllOverrides = () => {
    if (readOnly || !onOverridesChange) return;
    onOverridesChange([]);
  };

  const filteredPermissions = useMemo(() => {
    return allPermissions.filter(p => {
      if (showOnlyOverrides && !overrideMap.has(p.id)) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.code.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [allPermissions, showOnlyOverrides, overrideMap, search]);

  const grouped = useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    for (const p of filteredPermissions) {
      const mod = p.module || 'system';
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    }
    return map;
  }, [filteredPermissions]);

  const moduleNames = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const toggleModuleCollapse = (mod: string) => {
    setCollapsedModules(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  const handleRoleToggle = (roleId: number) => {
    if (readOnly || !onRoleChange) return;
    if (selectedRoleIds.includes(roleId)) {
      onRoleChange(selectedRoleIds.filter(id => id !== roleId));
    } else {
      onRoleChange([...selectedRoleIds, roleId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Primary Role Selection */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
           
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Peran Pengguna (Role)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih satu atau lebih peran utama untuk karyawan ini.
              </p>
            </div>
          </div>
          <Badge
            variant={selectedRoleIds.length > 0 ? 'default' : 'warning'}
            className="text-xs font-semibold px-2.5 py-1"
          >
            {selectedRoleIds.length > 0 ? `${selectedRoleIds.length} Peran Dipilih` : 'Belum Memilih Peran'}
          </Badge>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {roleOptions.map(role => {
            const isSelected = selectedRoleIds.includes(role.id);
            return (
              <button
                key={role.id}
                type="button"
                disabled={readOnly}
                onClick={() => handleRoleToggle(role.id)}
                className={cn(
                  'relative flex items-center justify-between p-3.5 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900',
                  readOnly && 'cursor-default opacity-90'
                )}
              >
                <div className="min-w-0 pr-3">
                  <p
                    className={cn(
                      'text-xs font-bold truncate leading-tight',
                      isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-900 dark:text-white'
                    )}
                  >
                    {role.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                    {role.code}
                  </p>
                </div>
                <div
                  className={cn(
                    'h-5 w-5 shrink-0 rounded-md flex items-center justify-center border transition-colors',
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <Info className="h-4 w-4 shrink-0 text-indigo-500" />
          <span>
            Pengguna otomatis mendapatkan wewenang standar dari peran yang dipilih. Tidak perlu pengaturan wewenang manual kecuali membutuhkan pengecualian khusus.
          </span>
        </div>
      </div>

      {/* 2. Collapsible Custom Permissions (Progressive Disclosure) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all">
        {/* Accordion Trigger Bar */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors select-none"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5 transition-colors',
                overrides.length > 0
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Kustomisasi Hak Akses Khusus
                </h3>
                <span className="text-[11px] font-medium text-slate-400">(Opsional / Lanjutan)</span>
                {overrides.length > 0 ? (
                  <Badge className="bg-amber-600 dark:bg-amber-500 text-white text-[10px] font-bold">
                    {overrides.length} Wewenang Disesuaikan
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-[10px] text-slate-500 dark:text-slate-400">
                    Standar Peran
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gunakan hanya jika Anda ingin memberi izin tambahan atau membatasi wewenang tertentu di luar peran standar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={e => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <>
                  Tutup
                  <ChevronUp className="h-3.5 w-3.5 ml-1" />
                </>
              ) : (
                <>
                  Atur Khusus
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-4 md:p-5 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
            {/* Toolbar: Search, Filter, and Reset */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari hak akses..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 text-xs h-8 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowOnlyOverrides(!showOnlyOverrides)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                    showOnlyOverrides
                      ? 'border-amber-600 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  )}
                >
                  {showOnlyOverrides ? 'Menampilkan: Khusus Override' : 'Tampilkan: Semua Wewenang'}
                </button>

                {!readOnly && overrides.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetAllOverrides}
                    className="text-xs h-8 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset ke Standar
                  </Button>
                )}
              </div>
            </div>

            {/* Permission List by Module */}
            {loadingPermissions ? (
              <div className="py-8 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Memuat katalog hak akses...</p>
              </div>
            ) : moduleNames.length === 0 ? (
              <div className="py-8 text-center border rounded-xl border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {showOnlyOverrides
                    ? 'Belum ada hak akses yang di-override.'
                    : 'Tidak ada hak akses yang sesuai pencarian.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {moduleNames.map(mod => {
                  const permsInMod = grouped[mod] || [];
                  const isCollapsed = Boolean(collapsedModules[mod]);
                  const modOverridesCount = permsInMod.filter(p => overrideMap.has(p.id)).length;

                  return (
                    <div
                      key={mod}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900"
                    >
                      {/* Module Header Bar */}
                      <button
                        type="button"
                        onClick={() => toggleModuleCollapse(mod)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Modul: {mod}
                          </span>
                          <span className="text-[11px] text-slate-400">({permsInMod.length})</span>
                          {modOverridesCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {modOverridesCount} Override
                            </span>
                          )}
                        </div>
                        {isCollapsed ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </button>

                      {/* Permissions Rows */}
                      {!isCollapsed && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                          {permsInMod.map(perm => {
                            const status = getPermissionStatus(perm.id);
                            const hasOverride = overrideMap.has(perm.id);
                            const isOverrideGranted = status === 'OVERRIDE_GRANTED';
                            const isOverrideDenied = status === 'OVERRIDE_DENIED';
                            const isInheritedGranted = status === 'INHERITED_GRANTED';

                            return (
                              <div
                                key={perm.id}
                                className={cn(
                                  'flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2.5 transition-colors',
                                  isOverrideGranted && 'bg-emerald-50/40 dark:bg-emerald-950/20',
                                  isOverrideDenied && 'bg-red-50/40 dark:bg-red-950/20'
                                )}
                              >
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                                      {perm.code}
                                    </span>

                                    {/* Clear Status Badges */}
                                    {isOverrideGranted && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                                        <Plus className="h-3 w-3 stroke-[3]" /> Diberikan Khusus
                                      </span>
                                    )}
                                    {isOverrideDenied && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                                        <Minus className="h-3 w-3 stroke-[3]" /> Dicabut Khusus
                                      </span>
                                    )}
                                    {!hasOverride && (
                                      <span
                                        className={cn(
                                          'px-2 py-0.5 rounded text-[10px] font-medium border',
                                          isInheritedGranted
                                            ? 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30'
                                            : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                        )}
                                      >
                                        Bawaan Peran: {isInheritedGranted ? 'Diizinkan' : 'Ditolak'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {perm.description || 'Tidak ada deskripsi rinci wewenang ini.'}
                                  </p>
                                </div>

                                {/* 3-Way Segmented Control */}
                                {!readOnly ? (
                                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 p-0.5 shrink-0 self-start sm:self-center">
                                    <button
                                      type="button"
                                      onClick={() => setOverrideState(perm.id, 'inherited')}
                                      className={cn(
                                        'px-2.5 py-1 text-xs rounded transition-all',
                                        !hasOverride
                                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                      )}
                                    >
                                      Standar Peran
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setOverrideState(perm.id, 'grant')}
                                      className={cn(
                                        'px-2 py-1 text-xs rounded transition-all flex items-center gap-1',
                                        isOverrideGranted
                                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                          : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40'
                                      )}
                                    >
                                      <Plus className="h-3 w-3" /> Beri Izin
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setOverrideState(perm.id, 'deny')}
                                      className={cn(
                                        'px-2 py-1 text-xs rounded transition-all flex items-center gap-1',
                                        isOverrideDenied
                                          ? 'bg-red-600 text-white font-bold shadow-xs'
                                          : 'text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/40'
                                      )}
                                    >
                                      <Minus className="h-3 w-3" /> Cabut
                                    </button>
                                  </div>
                                ) : (
                                  <div className="shrink-0 text-xs">
                                    {isOverrideGranted || isInheritedGranted ? (
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <Check className="h-3.5 w-3.5" /> Diizinkan
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-500">
                                        Tidak Diizinkan
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
