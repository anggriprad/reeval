'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PermissionItem, RoleSummary, roleService } from '@/services/role.service';
import { PermissionOverride } from '@/services/user.service';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import {
  Lock,
  Search,
  RotateCcw,
  Check,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Sparkles,
  X,
  Target,
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

// Mapping of role codes to prioritized modules
const ROLE_MODULE_PRIORITY: Record<string, string[]> = {
  SALES: ['sales'],
  DELIVERY: ['delivery'],
  PRODUCTION: ['production'],
  INVENTORY: ['inventory', 'product'],
  FINANCE: ['finance'],
  PURCHASING: ['inventory'],
  ADMIN: ['user', 'role', 'company', 'system'],
  SUPER_ADMIN: ['system', 'company', 'user', 'role'],
  VIEWER: ['sales', 'delivery', 'inventory', 'production', 'finance'],
};

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
  const hasSelectedRole = selectedRoleIds.length > 0;

  // Collapsed by default unless user already has active overrides AND role is selected
  const [isExpanded, setIsExpanded] = useState<boolean>(() => hasSelectedRole && overrides.length > 0);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'custom'>('all');
  const [rolePermCache, setRolePermCache] = useState<Record<number, number[]>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Auto-collapse and lock when no role is selected
  useEffect(() => {
    if (!hasSelectedRole) {
      setIsExpanded(false);
    }
  }, [hasSelectedRole]);

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

  // Priority modules based on selected role codes
  const priorityModulesList = useMemo(() => {
    const list: string[] = [];
    for (const r of roleOptions) {
      if (selectedRoleIds.includes(r.id)) {
        const mods = ROLE_MODULE_PRIORITY[r.code.toUpperCase()] || [];
        for (const m of mods) {
          if (!list.includes(m)) list.push(m);
        }
      }
    }
    return list;
  }, [roleOptions, selectedRoleIds]);

  // Per-module statistics
  const moduleStats = useMemo(() => {
    const map: Record<string, { total: number; active: number; overrides: number }> = {};
    for (const p of allPermissions) {
      const mod = p.module || 'system';
      if (!map[mod]) map[mod] = { total: 0, active: 0, overrides: 0 };
      map[mod].total++;
      const isRoleDefault = roleGrantedPermIds.has(p.id);
      const ov = overrideMap.get(p.id);
      const isActive = ov !== undefined ? ov : isRoleDefault;
      if (isActive) map[mod].active++;
      if (ov !== undefined) map[mod].overrides++;
    }
    return map;
  }, [allPermissions, roleGrantedPermIds, overrideMap]);

  // Overall statistics
  const stats = useMemo(() => {
    let effectiveCount = 0;
    let overrideGranted = 0;
    let overrideDenied = 0;
    let roleDefaultActive = 0;

    for (const p of allPermissions) {
      const isRoleDefault = roleGrantedPermIds.has(p.id);
      const ov = overrideMap.get(p.id);
      const isActive = ov !== undefined ? ov : isRoleDefault;

      if (isActive) effectiveCount++;
      if (ov === true) overrideGranted++;
      if (ov === false) overrideDenied++;
      if (isRoleDefault && ov === undefined) roleDefaultActive++;
    }

    return {
      total: allPermissions.length,
      effectiveCount,
      roleDefaultActive,
      overrideGranted,
      overrideDenied,
      totalOverrides: overrides.length,
    };
  }, [allPermissions, roleGrantedPermIds, overrideMap, overrides.length]);

  // Toggle permission directly (Aktif / Nonaktif)
  const handleTogglePermission = useCallback(
    (permId: number) => {
      if (readOnly || !onOverridesChange) return;

      const isRoleDefault = roleGrantedPermIds.has(permId);
      const currentOverride = overrideMap.get(permId);
      const currentlyActive = currentOverride !== undefined ? currentOverride : isRoleDefault;

      if (currentlyActive) {
        // User turns it OFF
        if (isRoleDefault) {
          // It was ON in the role, so turning OFF creates a DENY override
          const next = overrides.filter(o => o.permission_id !== permId);
          next.push({ permission_id: permId, is_granted: false });
          onOverridesChange(next);
        } else {
          // It was ON by a GRANT override, turning OFF reverts to role default (OFF)
          onOverridesChange(overrides.filter(o => o.permission_id !== permId));
        }
      } else {
        // User turns it ON
        if (!isRoleDefault) {
          // It was OFF in the role, so turning ON creates a GRANT override
          const next = overrides.filter(o => o.permission_id !== permId);
          next.push({ permission_id: permId, is_granted: true });
          onOverridesChange(next);
        } else {
          // It was OFF by a DENY override, turning ON reverts to role default (ON)
          onOverridesChange(overrides.filter(o => o.permission_id !== permId));
        }
      }
    },
    [readOnly, onOverridesChange, roleGrantedPermIds, overrideMap, overrides]
  );

  const handleRevertPermission = useCallback(
    (permId: number) => {
      if (readOnly || !onOverridesChange) return;
      onOverridesChange(overrides.filter(o => o.permission_id !== permId));
    },
    [readOnly, onOverridesChange, overrides]
  );

  const handleResetAllOverrides = () => {
    if (readOnly || !onOverridesChange) return;
    onOverridesChange([]);
  };

  const filteredPermissions = useMemo(() => {
    return allPermissions.filter(p => {
      const isRoleDefault = roleGrantedPermIds.has(p.id);
      const ov = overrideMap.get(p.id);
      const isActive = ov !== undefined ? ov : isRoleDefault;
      const hasOverride = ov !== undefined;

      if (filterMode === 'active' && !isActive) return false;
      if (filterMode === 'custom' && !hasOverride) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.code.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [allPermissions, filterMode, roleGrantedPermIds, overrideMap, search]);

  const grouped = useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    for (const p of filteredPermissions) {
      const mod = p.module || 'system';
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    }
    return map;
  }, [filteredPermissions]);

  // Automatically sort modules:
  // 1. Priority modules based on selected role codes (e.g. SALES -> sales at top)
  // 2. Modules with active permissions from selected roles
  // 3. Alphabetical fallback
  const moduleNames = useMemo(() => {
    const keys = Object.keys(grouped);
    return keys.sort((a, b) => {
      // 1. Role priority index
      const indexA = priorityModulesList.indexOf(a);
      const indexB = priorityModulesList.indexOf(b);
      if (indexA !== -1 && indexB !== -1) {
        if (indexA !== indexB) return indexA - indexB;
      } else if (indexA !== -1) {
        return -1;
      } else if (indexB !== -1) {
        return 1;
      }

      // 2. Count of active permissions in this module
      const countA = moduleStats[a]?.active || 0;
      const countB = moduleStats[b]?.active || 0;
      if (countA > 0 && countB === 0) return -1;
      if (countB > 0 && countA === 0) return 1;
      if (countA !== countB) return countB - countA;

      // 3. Alphabetical fallback
      return a.localeCompare(b);
    });
  }, [grouped, priorityModulesList, moduleStats]);

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
      {/* 1. Primary & Secondary Roles Selection (Multi-Role Baku) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Peran Pengguna (Role)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih satu atau beberapa peran sesuai tanggung jawab tugas akun ini.
              </p>
            </div>
          </div>
          <Badge
            variant={hasSelectedRole ? 'default' : 'warning'}
            className="text-xs font-semibold px-2.5 py-1"
          >
            {hasSelectedRole
              ? `${selectedRoleIds.length} Peran Dipilih`
              : 'Belum Memilih Peran'}
          </Badge>
        </div>

        {/* Role Cards Grid (Multi-Select Checkbox Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {roleOptions.map(role => {
            const isSelected = selectedRoleIds.includes(role.id);
            return (
              <button
                key={role.id}
                type="button"
                disabled={readOnly}
                onClick={() => handleRoleToggle(role.id)}
                className={cn(
                  'relative flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-xs ring-1 ring-indigo-500/30'
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
                      ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <Info className="h-4 w-4 shrink-0 text-indigo-500" />
          <span>
            Pengguna dapat memiliki lebih dari satu peran jika menjalankan beberapa tugas sekaligus. Seluruh hak akses dari peran yang dipilih akan otomatis aktif. Pengaturan wewenang tambahan atau pembatasan khusus dapat disesuaikan pada bagian Kustomisasi Hak Akses di bawah.
          </span>
        </div>
      </div>

      {/* 2. Collapsible Custom Permissions (Progressive Disclosure) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all">
        {/* Accordion Trigger Bar - Locked when no role selected */}
        {!hasSelectedRole ? (
          <div className="flex items-center justify-between p-4 md:p-5 select-none bg-slate-50/60 dark:bg-slate-800/20 cursor-not-allowed border-dashed">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400">
                <Lock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Kustomisasi Hak Akses Khusus
                  </h3>
                  <Badge variant="warning" className="text-[10px] font-semibold">
                    Terkunci: Pilih Minimal 1 Peran
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih minimal 1 peran pengguna di atas terlebih dahulu untuk membuka dan menyesuaikan hak akses.
                </p>
              </div>
            </div>

            <div className="shrink-0 ml-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={true}
                className="text-xs h-8 opacity-60 cursor-not-allowed"
              >
                Pilih Peran Dahulu
                <Lock className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
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
                    : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
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

                  <Badge
                    variant="default"
                    className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold"
                  >
                    {stats.effectiveCount} Hak Akses Aktif
                  </Badge>

                  {overrides.length > 0 && (
                    <Badge className="bg-amber-600 dark:bg-amber-500 text-white text-[10px] font-bold">
                      {overrides.length} Disesuaikan
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Klik untuk melihat daftar hak akses lengkap atau menyesuaikan wewenang khusus bagi akun ini.
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
        )}

        {/* Collapsible Content */}
        {hasSelectedRole && isExpanded && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-4 md:p-5 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
            {/* Quick Stat Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-slate-400">Total Hak Akses Aktif</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {stats.effectiveCount}{' '}
                  <span className="text-[11px] font-normal text-slate-400">/ {stats.total}</span>
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-slate-400">Bawaan Peran</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.roleDefaultActive} Aktif
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-slate-400">Izin Tambahan Khusus</p>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  +{stats.overrideGranted}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-slate-400">Dicabut Khusus</p>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  -{stats.overrideDenied}
                </p>
              </div>
            </div>

            {/* Toolbar: Search, Filter Tabs, and Reset */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari kode atau modul..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 text-xs h-8 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
                {/* Filter mode pills */}
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-semibold transition-colors',
                      filterMode === 'all'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Semua ({allPermissions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('active')}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-semibold transition-colors',
                      filterMode === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Hanya Aktif ({stats.effectiveCount})
                  </button>
                  {overrides.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('custom')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-semibold transition-colors',
                        filterMode === 'custom'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      Disesuaikan ({overrides.length})
                    </button>
                  )}
                </div>

                {!readOnly && overrides.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetAllOverrides}
                    className="text-xs h-8 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
                  {filterMode === 'custom'
                    ? 'Belum ada hak akses yang diatur secara khusus.'
                    : filterMode === 'active'
                      ? 'Tidak ada hak akses aktif yang sesuai pencarian.'
                      : 'Tidak ada hak akses yang sesuai pencarian.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {moduleNames.map(mod => {
                  const permsInMod = grouped[mod] || [];
                  const isCollapsed = Boolean(collapsedModules[mod]);
                  const modStats = moduleStats[mod] || { total: permsInMod.length, active: 0, overrides: 0 };
                  const isPriorityMod = priorityModulesList.includes(mod);

                  return (
                    <div
                      key={mod}
                      className={cn(
                        'rounded-xl border overflow-hidden bg-white dark:bg-slate-900 transition-colors',
                        isPriorityMod
                          ? 'border-indigo-200 dark:border-indigo-900/60 ring-1 ring-indigo-500/10'
                          : 'border-slate-200 dark:border-slate-800'
                      )}
                    >
                      {/* Module Header Bar */}
                      <button
                        type="button"
                        onClick={() => toggleModuleCollapse(mod)}
                        className={cn(
                          'w-full flex items-center justify-between px-3.5 py-2.5 border-b text-left transition-colors',
                          isPriorityMod
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100/40'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                        )}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Layers className={cn('h-3.5 w-3.5', isPriorityMod ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400')} />
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Modul: {mod}
                          </span>

                          {/* Prioritized Role Badge */}
                          {isPriorityMod && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                              <Target className="h-3 w-3" /> Peran Terpilih
                            </span>
                          )}

                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ({modStats.active} dari {modStats.total} Aktif)
                          </span>

                          {modStats.overrides > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {modStats.overrides} Disesuaikan
                            </span>
                          )}
                        </div>
                        {isCollapsed ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />
                        ) : (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />
                        )}
                      </button>

                      {/* Permissions Rows */}
                      {!isCollapsed && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                          {permsInMod.map(perm => {
                            const isRoleDefault = roleGrantedPermIds.has(perm.id);
                            const currentOverride = overrideMap.get(perm.id);
                            const hasOverride = currentOverride !== undefined;
                            const isActive = hasOverride ? currentOverride : isRoleDefault;

                            return (
                              <div
                                key={perm.id}
                                className={cn(
                                  'flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 transition-colors',
                                  isActive
                                    ? hasOverride
                                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                                      : 'bg-emerald-50/15 dark:bg-emerald-950/10'
                                    : hasOverride
                                      ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                )}
                              >
                                {/* Permission Details */}
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                                      {perm.code}
                                    </span>

                                    {/* Clear Status Badges */}
                                    {hasOverride ? (
                                      isActive ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                                          <Sparkles className="h-3 w-3" /> Izin Khusus Ditambahkan
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                                          <X className="h-3 w-3" /> Dicabut Khusus
                                        </span>
                                      )
                                    ) : isRoleDefault ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" /> Aktif dari Peran
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 border border-slate-200 dark:border-slate-800">
                                        Nonaktif
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {perm.description || 'Tidak ada deskripsi rinci wewenang ini.'}
                                  </p>
                                </div>

                                {/* Actions: Revert Button + Single Intuitive Switch Toggle */}
                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                  {!readOnly && hasOverride && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevertPermission(perm.id)}
                                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                      title="Kembalikan ke standar peran"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      <span className="text-[11px]">Kembalikan</span>
                                    </button>
                                  )}

                                  {!readOnly ? (
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          'text-xs font-semibold select-none min-w-[55px] text-right',
                                          isActive
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-400 dark:text-slate-500'
                                        )}
                                      >
                                        {isActive ? 'Aktif' : 'Nonaktif'}
                                      </span>
                                      <Toggle
                                        checked={isActive}
                                        onChange={() => handleTogglePermission(perm.id)}
                                        color={hasOverride ? 'indigo' : 'emerald'}
                                        size="sm"
                                        title={isActive ? 'Klik untuk mematikan wewenang ini' : 'Klik untuk mengaktifkan wewenang ini'}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={cn(
                                          'text-xs font-semibold',
                                          isActive
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-400'
                                        )}
                                      >
                                        {isActive ? 'Aktif' : 'Nonaktif'}
                                      </span>
                                    </div>
                                  )}
                                </div>
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
