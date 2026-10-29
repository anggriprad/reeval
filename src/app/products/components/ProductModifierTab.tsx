'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory, canSeeCosts } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import {
  productModifierService,
  ProductModifierGroupResponse,
} from '@/services/product-modifier.service';
import { ProductModifierModal } from './ProductModifierModal';
import {
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface ProductModifierTabProps {
  selectTypeFilter?: string;
  searchTerm?: string;
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export function ProductModifierTab({
  selectTypeFilter,
  searchTerm,
  isAddModalOpen = false,
  onCloseAddModal,
}: ProductModifierTabProps) {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const { currentUser } = useApp();

  const isInventoryManager = canManageInventory(currentUser.role);
  const seeCosts = canSeeCosts(currentUser.role);
  const canCreatePerm = can(PERMISSIONS.PRODUCT.MODIFIER_CREATE);
  const canUpdatePerm = can(PERMISSIONS.PRODUCT.MODIFIER_UPDATE);
  const canDeletePerm = can(PERMISSIONS.PRODUCT.MODIFIER_DELETE);

  const canCreate = isInventoryManager || canCreatePerm;
  const canUpdate = isInventoryManager || canUpdatePerm;
  const canDelete = isInventoryManager || canDeletePerm;
  const canManage = isInventoryManager || canCreate || canUpdate || canDelete;

  const [groups, setGroups] = useState<ProductModifierGroupResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedModifierGroupId, setExpandedModifierGroupId] = useState<number | null>(null);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<ProductModifierGroupResponse | null>(null);

  const { filters, setFilter } = useTableFilters({
    mod_search: searchTerm || '',
    mod_select_type: selectTypeFilter || '',
    mod_page: 1,
    mod_per_page: 20,
  });

  // Sync external search/filter props from parent SegmentedControl into table filters
  useEffect(() => {
    if (searchTerm !== undefined && searchTerm !== filters.mod_search) {
      setFilter('mod_search', searchTerm);
      setFilter('mod_page', 1);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (selectTypeFilter !== undefined && selectTypeFilter !== filters.mod_select_type) {
      setFilter('mod_select_type', selectTypeFilter);
      setFilter('mod_page', 1);
    }
  }, [selectTypeFilter]);

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const page = Number(filters.mod_page) || 1;
      const perPage = Number(filters.mod_per_page) || 20;
      const search = filters.mod_search ? String(filters.mod_search).trim() : undefined;
      const selectType = filters.mod_select_type ? String(filters.mod_select_type).trim() : undefined;

      const res = await productModifierService.getGroups({
        page,
        per_page: perPage,
        search,
        select_type: selectType,
      });

      if (res && res.data) {
        setGroups(res.data);
        const metaTotal = res.meta?.total ?? res.data.length;
        setTotal(metaTotal);
        setTotalPages(res.meta?.total_pages ?? Math.max(1, Math.ceil(metaTotal / perPage)));
      } else {
        setGroups([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error('Gagal Memuat Modifier', err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem.');
      setGroups([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [filters.mod_search, filters.mod_select_type, filters.mod_page, filters.mod_per_page, toast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleToggleRow = async (groupId: number) => {
    if (expandedModifierGroupId === groupId) {
      setExpandedModifierGroupId(null);
      return;
    }
    setExpandedModifierGroupId(groupId);

    const target = groups.find((g) => g.id === groupId);
    if (target && (!target.options || target.options.length === 0)) {
      try {
        const res = await productModifierService.getGroupById(groupId);
        if (res?.data) {
          setGroups((prev) =>
            prev.map((g) => (g.id === groupId ? res.data : g))
          );
        }
      } catch (err) {
        console.warn('Gagal lazy load rincian opsi grup modifier:', err);
      }
    }
  };

  const handleOpenEditModal = (group: ProductModifierGroupResponse) => {
    setGroupToEdit(group);
    setIsEditModalOpen(true);
  };

  const handleDeleteModifier = async (group: ProductModifierGroupResponse) => {
    if (!canDelete) {
      toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk menghapus grup modifier.');
      return;
    }

    if (group.can_delete === false) {
      toast.error(
        'Tidak Dapat Dihapus',
        'Grup modifier sedang aktif digunakan oleh produk.'
      );
      return;
    }

    const isConfirmed = await confirm({
      title: 'Hapus Grup Modifier',
      message: `Apakah Anda yakin ingin menghapus grup modifier "${group.name}"? Data yang dihapus tidak dapat dipulihkan.`,
      confirmText: 'Hapus Modifier',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await productModifierService.deleteGroup(group.id);
      toast.success('Modifier Dihapus', `Grup modifier "${group.name}" berhasil dihapus.`);
      loadGroups();
    } catch (err: any) {
      toast.error(
        'Gagal Menghapus',
        err?.response?.data?.message || 'Gagal menghapus grup modifier.'
      );
    }
  };

  const currentPage = Number(filters.mod_page) || 1;
  const perPage = Number(filters.mod_per_page) || 20;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilter('mod_page', newPage);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setFilter('mod_per_page', newPerPage);
    setFilter('mod_page', 1);
  };

  const handleCloseModal = () => {
    if (isAddModalOpen && onCloseAddModal) {
      onCloseAddModal();
    }
    setIsEditModalOpen(false);
    setGroupToEdit(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <th className="px-4 py-3">Nama Modifier</th>
              <th className="px-4 py-3">Tipe Seleksi</th>
              <th className="px-4 py-3 text-center">Jumlah Opsi</th>
              {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  Memuat grup modifier...
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  {filters.mod_search
                    ? 'Tidak ada modifier yang cocok.'
                    : 'Belum ada grup modifier terdaftar.'}
                </td>
              </tr>
            ) : (
              groups.map((group) => {
                const isExpanded = expandedModifierGroupId === group.id;
                const options = group.options || [];

                return (
                  <React.Fragment key={group.id}>
                    <tr
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                      onClick={() => handleToggleRow(group.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {group.name}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={group.select_type === 'MULTI' ? 'info' : 'default'}>
                          {group.select_type === 'MULTI'
                            ? 'Multi-select (Checklist)'
                            : 'Single-select (Pilih Satu)'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {options.length || group.options_count || 0} Opsi
                      </td>
                      {canManage && (
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-2">
                            {canUpdate && (
                              <button
                                onClick={() => handleOpenEditModal(group)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                title="Edit Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteModifier(group)}
                                disabled={group.can_delete === false}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  group.can_delete === false
                                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                }`}
                                title={
                                  group.can_delete === false
                                    ? 'Modifier sedang aktif digunakan oleh produk'
                                    : 'Hapus Modifier'
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={canManage ? 4 : 3}
                          className="px-4 py-3 bg-slate-50/30 dark:bg-slate-900/10"
                        >
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                              Daftar Pilihan / Opsi & HPP Material:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {options.map((opt) => {
                                const bom = opt.bom || [];
                                const bomCost =
                                  opt.bom_cost ??
                                  bom.reduce(
                                    (sum, b) =>
                                      sum + (b.unit_cost || 0) * b.quantity,
                                    0
                                  );

                                return (
                                  <div
                                    key={opt.id}
                                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2"
                                  >
                                    <div className="flex justify-between font-semibold">
                                      <span className="text-slate-900 dark:text-white">
                                        {opt.name}
                                      </span>
                                      <span className="text-emerald-600 dark:text-emerald-400">
                                        +{formatCurrency(opt.additional_price || 0)}
                                      </span>
                                    </div>
                                    {bom.length > 0 ? (
                                      <div className="text-xs space-y-1 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                                          Bahan Baku (BOM):
                                        </p>
                                        {bom.map((b) => (
                                          <div
                                            key={b.id || b.material_id}
                                            className="flex justify-between text-slate-600 dark:text-slate-400"
                                          >
                                            <span>
                                              {b.material_name || `Material #${b.material_id}`}{' '}
                                              ({b.quantity} {b.material_unit || ''})
                                            </span>
                                            {seeCosts && (
                                              <span>
                                                {formatCurrency(
                                                  (b.unit_cost || 0) * b.quantity
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                        {seeCosts && (
                                          <div className="flex justify-between font-semibold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                            <span>Est. HPP Material:</span>
                                            <span>{formatCurrency(bomCost)}</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-slate-400 italic">
                                        Tidak membutuhkan bahan baku tambahan.
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
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

      {/* Server-side Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Menampilkan</span>
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>
            dari <strong className="text-slate-700 dark:text-slate-200">{total}</strong> modifier
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            Halaman <strong className="text-slate-700 dark:text-slate-200">{currentPage}</strong> dari{' '}
            <strong className="text-slate-700 dark:text-slate-200">{totalPages || 1}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              aria-label="Previous Page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              aria-label="Next Page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Modifier Modal (Create / Edit) */}
      <ProductModifierModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={handleCloseModal}
        onSuccess={loadGroups}
        groupToEdit={isEditModalOpen ? groupToEdit : null}
      />
    </div>
  );
}
