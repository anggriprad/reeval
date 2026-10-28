'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory, canSeeCosts } from '@/lib/roles';
import {
  productModifierService,
  ProductModifierGroupResponse,
} from '@/services/product-modifier.service';
import { ConfigSection } from './ConfigSection';
import { ProductModifierModal } from './ProductModifierModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import {
  Grip,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function ProductModifierSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const { currentUser } = useApp();

  // Permissions & Roles
  const canReadPerm = can(PERMISSIONS.PRODUCT.MODIFIER_READ);
  const canCreatePerm = can(PERMISSIONS.PRODUCT.MODIFIER_CREATE);
  const canUpdatePerm = can(PERMISSIONS.PRODUCT.MODIFIER_UPDATE);
  const canDeletePerm = can(PERMISSIONS.PRODUCT.MODIFIER_DELETE);
  const isInventoryManager = canManageInventory(currentUser.role);
  const seeCosts = canSeeCosts(currentUser.role);

  const canManage = isInventoryManager || canCreatePerm || canUpdatePerm || canDeletePerm;
  const canCreate = isInventoryManager || canCreatePerm;
  const canUpdate = isInventoryManager || canUpdatePerm;
  const canDelete = isInventoryManager || canDeletePerm;

  // Expansion & lazy load states
  const [isExpanded, setIsExpanded] = useState(false);
  const [groups, setGroups] = useState<ProductModifierGroupResponse[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedModifierGroupId, setExpandedModifierGroupId] = useState<number | null>(null);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Table filters hook for modifier group search & pagination
  const { filters, setFilter } = useTableFilters({
    mod_search: '',
    mod_page: 1,
    mod_per_page: 50,
  });

  const [searchInput, setSearchInput] = useState(filters.mod_search || '');
  const isSearchInitial = useRef(true);

  // Debounce search input (500ms)
  useEffect(() => {
    if (isSearchInitial.current) {
      isSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilter('mod_search', searchInput.trim());
      setFilter('mod_page', 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, setFilter]);

  useEffect(() => {
    setSearchInput(filters.mod_search || '');
  }, [filters.mod_search]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<ProductModifierGroupResponse | null>(null);

  // Load groups from backend
  const loadGroups = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await productModifierService.getGroups({
        page: filters.mod_page,
        per_page: filters.mod_per_page,
        search: filters.mod_search?.trim() || undefined,
      });
      hasFetchedRef.current = true;

      if (response && Array.isArray(response.data)) {
        setGroups(response.data);
        if (response.meta) {
          setTotalGroups(response.meta.total || 0);
          setTotalPages(response.meta.total_pages || 1);
        } else {
          setTotalGroups(response.data.length);
          setTotalPages(1);
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat master grup modifier dari API:', err);
      hasFetchedRef.current = true;
      toast.error('Gagal Memuat Data', 'Tidak dapat mengambil data grup modifier add-on.');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [filters.mod_page, filters.mod_per_page, filters.mod_search, toast]);

  // Trigger fetch when section is expanded or filters change
  useEffect(() => {
    if (isExpanded) {
      loadGroups();
    }
  }, [isExpanded, loadGroups]);

  const handleToggleExpand = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (expanded && !hasFetchedRef.current) {
      loadGroups();
    }
  };

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

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setGroupToEdit(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (group: ProductModifierGroupResponse) => {
    setGroupToEdit(group);
    setIsModalOpen(true);
  };

  // Handle Delete Group
  const handleDeleteGroup = async (group: ProductModifierGroupResponse) => {
    if (!group.can_delete) {
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

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilter('mod_page', newPage);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setFilter('mod_per_page', newPerPage);
    setFilter('mod_page', 1);
  };

  return (
    <>
      <ConfigSection
        title="Grup Modifier Add-On"
        description="Kelola add-on opsional untuk produk (seperti Ekstra Bantal, Engsel Premium, dll) beserta harga dan BOM tambahan."
        icon={Grip}
        iconWrapperClass="bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
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
                placeholder="Cari grup modifier..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            {canCreate && (
              <Button onClick={handleOpenCreateModal} size="sm">
                <Plus className="h-4 w-4" /> Tambah Modifier
              </Button>
            )}
          </div>

          {/* Table Container Matching Original Design */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Nama Modifier</th>
                  <th className="px-4 py-3">Tipe Seleksi</th>
                  <th className="px-4 py-3 text-center">Jumlah Opsi</th>
                  {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="py-10 text-center text-slate-400 dark:text-slate-500">
                      Memuat grup modifier...
                    </td>
                  </tr>
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="py-10 text-center text-slate-400 dark:text-slate-500">
                      {filters.mod_search
                        ? 'Tidak ada modifier yang cocok dengan pencarian.'
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
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
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
                            {options.length} Opsi
                          </td>
                          {canManage && (
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1.5">
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
                                    onClick={() => handleDeleteGroup(group)}
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
                              className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30"
                            >
                              <div className="space-y-3">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                  Daftar Pilihan Opsi & HPP Material:
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
                                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2"
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
        </div>
      </ConfigSection>

      {/* Modal: Create & Edit Modifier Master */}
      <ProductModifierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadGroups}
        groupToEdit={groupToEdit}
      />
    </>
  );
}
