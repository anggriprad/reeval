'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory } from '@/lib/roles';
import {
  productAttributeService,
  ProductAttributeItem,
} from '@/services/product-attribute.service';
import { ConfigSection } from './ConfigSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Tag,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export function ProductAttributeSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    currentUser,
    attributes: appAttributes = [],
    addAttribute: addAppAttribute,
    updateAttribute: updateAppAttribute,
    deleteAttribute: deleteAppAttribute,
  } = useApp();

  // PBAC Permissions
  const canReadPerm = can(PERMISSIONS.PRODUCT.ATTRIBUTE_READ);
  const canCreatePerm = can(PERMISSIONS.PRODUCT.ATTRIBUTE_CREATE);
  const canUpdatePerm = can(PERMISSIONS.PRODUCT.ATTRIBUTE_UPDATE);
  const canDeletePerm = can(PERMISSIONS.PRODUCT.ATTRIBUTE_DELETE);
  const isInventoryManager = canManageInventory(currentUser.role);

  const canManage = isInventoryManager || canCreatePerm || canUpdatePerm || canDeletePerm;
  const canCreate = isInventoryManager || canCreatePerm;
  const canUpdate = isInventoryManager || canUpdatePerm;
  const canDelete = isInventoryManager || canDeletePerm;

  // Expansion & lazy load states (Default = false / collapsed)
  const [isExpanded, setIsExpanded] = useState(false);
  const [attributes, setAttributes] = useState<ProductAttributeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Table filters hook for product attribute search & pagination
  const { filters, setFilter } = useTableFilters({
    attr_search: '',
    attr_page: 1,
    attr_per_page: 50,
  });

  const [searchInput, setSearchInput] = useState(filters.attr_search || '');
  const isSearchInitial = useRef(true);

  // Debounce search input (500ms)
  useEffect(() => {
    if (isSearchInitial.current) {
      isSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilter('attr_search', searchInput.trim());
      setFilter('attr_page', 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, setFilter]);

  useEffect(() => {
    setSearchInput(filters.attr_search || '');
  }, [filters.attr_search]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formValues, setFormValues] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadAttributes = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await productAttributeService.getAttributes({
        page: filters.attr_page,
        per_page: filters.attr_per_page,
        search: filters.attr_search?.trim() || undefined,
      });
      hasFetchedRef.current = true;

      if (response && Array.isArray(response.data)) {
        setAttributes(response.data);
      }
    } catch (err: any) {
      console.warn('Gagal memuat master atribut dari API:', err);
      hasFetchedRef.current = true;
      toast.error('Gagal Memuat Data', 'Tidak dapat mengambil data master atribut varian.');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [filters.attr_page, filters.attr_per_page, filters.attr_search, toast]);

  useEffect(() => {
    if (isExpanded) {
      loadAttributes();
    }
  }, [isExpanded, loadAttributes]);

  const handleToggle = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (expanded && !hasFetchedRef.current) {
      loadAttributes();
    }
  };

  const openAddAttribute = () => {
    setEditId(null);
    setFormName('');
    setFormValues('');
    setModalError('');
    setShowModal(true);
  };

  const openEditAttribute = (attr: ProductAttributeItem) => {
    setEditId(attr.id);
    setFormName(attr.name);
    const valStrings = (attr.values || []).map((v) =>
      typeof v === 'string' ? v : v.value
    );
    setFormValues(valStrings.join(', '));
    setModalError('');
    setShowModal(true);
  };

  const handleSaveAttribute = async () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setModalError('Nama atribut wajib diisi.');
      return;
    }

    const valArray = formValues
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v);

    if (valArray.length === 0) {
      setModalError('Setidaknya isi satu opsi/nilai varian (pisahkan dengan koma).');
      return;
    }

    try {
      setIsSaving(true);
      if (editId) {
        const res = await productAttributeService.updateAttribute(editId, {
          name: trimmedName,
          values: valArray,
        });
        const updatedItem = res.data;

        setAttributes((prev) =>
          prev.map((a) =>
            a.id === editId
              ? {
                  ...a,
                  name: trimmedName,
                  values: updatedItem?.values || valArray.map((v, i) => ({ id: i + 1, value: v })),
                }
              : a
          )
        );

        updateAppAttribute(String(editId), {
          name: trimmedName,
          values: valArray,
        });

        toast.success('Atribut Diperbarui', `Atribut "${trimmedName}" berhasil diperbarui.`);
      } else {
        const res = await productAttributeService.createAttribute({
          name: trimmedName,
          values: valArray,
        });
        const newItem: ProductAttributeItem = res.data || {
          id: Date.now(),
          name: trimmedName,
          can_delete: true,
          is_active: true,
          values: valArray.map((v, i) => ({ id: i + 1, value: v })),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setAttributes((prev) => [...prev, newItem]);
        addAppAttribute({
          name: trimmedName,
          values: valArray,
        });

        toast.success('Atribut Ditambahkan', `Atribut "${trimmedName}" berhasil ditambahkan.`);
      }
      setShowModal(false);
    } catch (err: any) {
      setModalError(err?.message || 'Terjadi kesalahan saat menyimpan master atribut.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAttribute = async (attrId: number, attrName: string) => {
    const isOk = await confirm({
      title: 'Hapus Master Atribut',
      message: `Apakah Anda yakin ingin menghapus atribut "${attrName}"?`,
      confirmText: 'Hapus Atribut',
      variant: 'danger',
    });
    if (!isOk) return;

    try {
      await productAttributeService.deleteAttribute(attrId);
      setAttributes((prev) => prev.filter((a) => a.id !== attrId));
      deleteAppAttribute(String(attrId));
      toast.success('Atribut Dihapus', `Master atribut "${attrName}" berhasil dihapus.`);
    } catch (err: any) {
      toast.error('Gagal Menghapus', err?.message || 'Atribut ini masih digunakan oleh salah satu produk.');
    }
  };

  return (
    <ConfigSection
      title="Master Atribut Varian"
      description="Kelola atribut master seperti Ukuran, Warna, Finishing, dan Material yang digunakan pada produk."
      icon={Tag}
      iconWrapperClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
      defaultExpanded={false}
      isControlled={true}
      isExpandedControlled={isExpanded}
      onToggle={handleToggle}
    >
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari atribut master..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          {canCreate && (
            <Button onClick={openAddAttribute} size="sm">
              <Plus className="h-4 w-4" /> Tambah Atribut
            </Button>
          )}
        </div>

        {isLoading && attributes.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              <span>Memuat data master atribut...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attributes.length === 0 ? (
              <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                {filters.attr_search
                  ? 'Tidak ada atribut yang cocok dengan pencarian.'
                  : 'Belum ada master atribut terdaftar.'}
              </div>
            ) : (
              attributes.map((attr) => {
                const valuesList = (attr.values || []).map((v) =>
                  typeof v === 'string' ? v : v.value
                );

                return (
                  <div
                    key={attr.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {attr.name}
                        </h4>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditAttribute(attr)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                              title="Edit Atribut"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttribute(attr.id, attr.name)}
                              disabled={!attr.can_delete}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title={
                                attr.can_delete
                                  ? 'Hapus Atribut'
                                  : 'Atribut tidak dapat dihapus karena masih digunakan produk'
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {valuesList.map((val, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* MODAL CRUD MASTER ATRIBUT VARIAN */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Master Atribut' : 'Tambah Master Atribut Varian'}
        size="md"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button onClick={handleSaveAttribute} isLoading={isSaving}>
              {editId ? 'Simpan Perubahan' : 'Tambah Atribut'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {modalError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {modalError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nama Atribut <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contoh: Ukuran, Warna, Finishing, Material"
              className="text-xs"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Opsi / Nilai Varian (pisahkan dengan koma)
            </label>
            <textarea
              rows={3}
              value={formValues}
              onChange={(e) => setFormValues(e.target.value)}
              placeholder="Contoh: 120x200 cm, 160x200 cm, 180x200 cm"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
              disabled={isSaving}
            />
            <p className="text-[10px] text-slate-400">
              Pisahkan setiap opsi dengan tanda koma ( , ).
            </p>
          </div>
        </div>
      </Modal>
    </ConfigSection>
  );
}
