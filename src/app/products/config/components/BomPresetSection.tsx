'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory, canSeeCosts } from '@/lib/roles';
import {
  bomPresetService,
  BOMPresetResponse,
} from '@/services/bom-preset.service';
import { ConfigSection } from './ConfigSection';
import { BomPresetModal } from './BomPresetModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function BomPresetSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const { currentUser } = useApp();

  // Permissions & Roles
  const canReadPerm = can(PERMISSIONS.PRODUCT.BOM_READ);
  const canCreatePerm = can(PERMISSIONS.PRODUCT.BOM_CREATE);
  const canUpdatePerm = can(PERMISSIONS.PRODUCT.BOM_UPDATE);
  const canDeletePerm = can(PERMISSIONS.PRODUCT.BOM_DELETE);
  const isInventoryManager = canManageInventory(currentUser.role);
  const seeCosts = canSeeCosts(currentUser.role);

  const canManage = isInventoryManager || canCreatePerm || canUpdatePerm || canDeletePerm;
  const canCreate = isInventoryManager || canCreatePerm;
  const canUpdate = isInventoryManager || canUpdatePerm;
  const canDelete = isInventoryManager || canDeletePerm;

  // Expansion & lazy load states (Default = false / collapsed)
  const [isExpanded, setIsExpanded] = useState(false);
  const [presets, setPresets] = useState<BOMPresetResponse[]>([]);
  const [totalPresets, setTotalPresets] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedPresetId, setExpandedPresetId] = useState<number | null>(null);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Table filters hook for BOM preset search & pagination
  const { filters, setFilter } = useTableFilters({
    preset_search: '',
    preset_page: 1,
    preset_per_page: 50,
  });

  const [searchInput, setSearchInput] = useState(filters.preset_search || '');
  const isSearchInitial = useRef(true);

  // Debounce search input (500ms)
  useEffect(() => {
    if (isSearchInitial.current) {
      isSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilter('preset_search', searchInput.trim());
      setFilter('preset_page', 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, setFilter]);

  useEffect(() => {
    setSearchInput(filters.preset_search || '');
  }, [filters.preset_search]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetToEdit, setPresetToEdit] = useState<BOMPresetResponse | null>(null);

  // Load presets from backend
  const loadPresets = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await bomPresetService.getPresets({
        page: filters.preset_page,
        per_page: filters.preset_per_page,
        search: filters.preset_search?.trim() || undefined,
      });
      hasFetchedRef.current = true;

      if (response && Array.isArray(response.data)) {
        setPresets(response.data);
        if (response.meta) {
          setTotalPresets(response.meta.total || 0);
          setTotalPages(response.meta.total_pages || 1);
        } else {
          setTotalPresets(response.data.length);
          setTotalPages(1);
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat master preset BOM dari API:', err);
      hasFetchedRef.current = true;
      toast.error('Gagal Memuat Data', 'Tidak dapat mengambil data master preset BOM.');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [filters.preset_page, filters.preset_per_page, filters.preset_search, toast]);

  // Trigger fetch when section is expanded or filters change
  useEffect(() => {
    if (isExpanded) {
      loadPresets();
    }
  }, [isExpanded, loadPresets]);

  const handleToggleExpand = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (expanded && !hasFetchedRef.current) {
      loadPresets();
    }
  };

  const handleToggleRow = async (presetId: number) => {
    if (expandedPresetId === presetId) {
      setExpandedPresetId(null);
      return;
    }
    setExpandedPresetId(presetId);

    const target = presets.find((p) => p.id === presetId);
    if (target && (!target.items || target.items.length === 0)) {
      try {
        const res = await bomPresetService.getPresetById(presetId);
        if (res?.data) {
          setPresets((prev) =>
            prev.map((p) => (p.id === presetId ? res.data : p))
          );
        }
      } catch (err) {
        console.warn('Gagal lazy load preset items:', err);
      }
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setPresetToEdit(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (preset: BOMPresetResponse) => {
    setPresetToEdit(preset);
    setIsModalOpen(true);
  };

  // Handle Delete Preset
  const handleDeletePreset = async (preset: BOMPresetResponse) => {
    if (!preset.can_delete) {
      toast.error(
        'Tidak Dapat Dihapus',
        'Preset BOM sedang digunakan oleh katalog produk atau SPK aktif.'
      );
      return;
    }

    const isConfirmed = await confirm({
      title: 'Hapus Preset BOM',
      message: `Apakah Anda yakin ingin menghapus preset BOM "${preset.name}"? Data yang dihapus tidak dapat dipulihkan.`,
      confirmText: 'Hapus Preset',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await bomPresetService.deletePreset(preset.id);
      toast.success('Preset Dihapus', `Preset BOM "${preset.name}" berhasil dihapus.`);
      loadPresets();
    } catch (err: any) {
      toast.error(
        'Gagal Menghapus',
        err?.response?.data?.message || 'Gagal menghapus preset BOM.'
      );
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilter('preset_page', newPage);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setFilter('preset_per_page', newPerPage);
    setFilter('preset_page', 1);
  };

  return (
    <>
      <ConfigSection
        title="Master Preset BOM"
        description="Kelola resep material standar yang dapat di-clone ke varian produk saat pembuatan katalog."
        icon={FileSpreadsheet}
        iconWrapperClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
        defaultExpanded={false}
        onToggle={handleToggleExpand}
      >
        <div className="space-y-4 pt-4">
          {/* Header Bar: Search & Add Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari preset BOM..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            {canCreate && (
              <Button onClick={handleOpenCreateModal} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Tambah Preset BOM
              </Button>
            )}
          </div>

          {/* Table Container Matching Original Design */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Nama Preset BOM</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3 text-center">Komponen Material</th>
                  <th className="px-4 py-3 text-right">Est. Total HPP</th>
                  {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="py-10 text-center text-slate-400 dark:text-slate-500">
                      Memuat data preset BOM...
                    </td>
                  </tr>
                ) : presets.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="py-10 text-center text-slate-400 dark:text-slate-500">
                      {filters.preset_search
                        ? 'Tidak ada preset BOM yang cocok dengan pencarian.'
                        : 'Belum ada preset BOM terdaftar.'}
                    </td>
                  </tr>
                ) : (
                  presets.map((tpl) => {
                    const items = tpl.items || [];
                    const totalCost =
                      tpl.total_cost ||
                      items.reduce(
                        (sum, item) => sum + (item.unit_cost || 0) * item.quantity,
                        0
                      );
                    const isRowExpanded = expandedPresetId === tpl.id;

                    return (
                      <React.Fragment key={tpl.id}>
                        <tr
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          onClick={() => handleToggleRow(tpl.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {tpl.name}
                              </span>
                              {isRowExpanded ? (
                                <ChevronUp className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {tpl.description || '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {tpl.item_count || items.length} Material
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {seeCosts ? formatCurrency(totalCost) : '-'}
                          </td>
                          {canManage && (
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                {canUpdate && (
                                  <button
                                    onClick={() => handleOpenEditModal(tpl)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                    title="Edit Preset"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeletePreset(tpl)}
                                    disabled={tpl.can_delete === false}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      tpl.can_delete === false
                                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                        : 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                    }`}
                                    title={
                                      tpl.can_delete === false
                                        ? 'Preset sedang aktif digunakan pada produk/SPK'
                                        : 'Hapus Preset'
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                        {isRowExpanded && (
                          <tr>
                            <td
                              colSpan={canManage ? 5 : 4}
                              className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30"
                            >
                              <div className="space-y-2 max-w-3xl">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                  Rincian Komponen Material Preset:
                                </p>
                                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left font-semibold text-slate-500">
                                        <th className="px-3 py-2">Material</th>
                                        <th className="px-3 py-2 text-right">Kuantitas</th>
                                        <th className="px-3 py-2 text-center">Satuan</th>
                                        {seeCosts && (
                                          <th className="px-3 py-2 text-right">Est. Biaya</th>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {items.length === 0 ? (
                                        <tr>
                                          <td
                                            colSpan={seeCosts ? 4 : 3}
                                            className="px-3 py-3 text-center text-slate-400 italic"
                                          >
                                            Tidak ada komponen material.
                                          </td>
                                        </tr>
                                      ) : (
                                        items.map((item) => (
                                          <tr key={item.id || item.material_id}>
                                            <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                                              {item.material_name}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900 dark:text-white">
                                              {item.quantity}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                                {item.unit || '-'}
                                              </span>
                                            </td>
                                            {seeCosts && (
                                              <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                                {formatCurrency(
                                                  (item.unit_cost || 0) * item.quantity
                                                )}
                                              </td>
                                            )}
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>

           
          </div>
        </div>
      </ConfigSection>

      {/* Modal: Create & Edit Preset BOM */}
      <BomPresetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadPresets}
        presetToEdit={presetToEdit}
      />
    </>
  );
}
