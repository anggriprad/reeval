'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory } from '@/lib/roles';
import {
  productCategoryService,
  ProductCategoryItem,
} from '@/services/product-category.service';
import { ConfigSection } from './ConfigSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  FolderTree,
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from 'lucide-react';

export function ProductCategorySection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    currentUser,
    products = [],
    productCategories = [],
    addProductCategory,
    deleteProductCategory,
  } = useApp();

  // Permissions
  const canReadPerm = can(PERMISSIONS.PRODUCT.CATEGORY_READ);
  const canCreatePerm = can(PERMISSIONS.PRODUCT.CATEGORY_CREATE);
  const canUpdatePerm = can(PERMISSIONS.PRODUCT.CATEGORY_UPDATE);
  const canDeletePerm = can(PERMISSIONS.PRODUCT.CATEGORY_DELETE);
  const isInventoryManager = canManageInventory(currentUser.role);

  const canManage = isInventoryManager || canCreatePerm || canUpdatePerm || canDeletePerm;
  const canCreate = isInventoryManager || canCreatePerm;
  const canUpdate = isInventoryManager || canUpdatePerm;
  const canDelete = isInventoryManager || canDeletePerm;

  // Expansion & lazy load states (Default = false / collapsed)
  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Table filters hook for product category search & pagination
  const { filters, setFilter } = useTableFilters({
    cat_search: '',
    cat_page: 1,
    cat_per_page: 50,
  });

  const [searchInput, setSearchInput] = useState(filters.cat_search || '');
  const isSearchInitial = useRef(true);

  // Debounce search input (500ms)
  useEffect(() => {
    if (isSearchInitial.current) {
      isSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilter('cat_search', searchInput.trim());
      setFilter('cat_page', 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, setFilter]);

  useEffect(() => {
    setSearchInput(filters.cat_search || '');
  }, [filters.cat_search]);

  // Add state (muncul ketika tombol tambah diklik)
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Inline edit states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadCategories = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await productCategoryService.getCategories({
        page: filters.cat_page,
        per_page: filters.cat_per_page,
        search: filters.cat_search?.trim() || undefined,
      });
      hasFetchedRef.current = true;

      if (response && Array.isArray(response.data)) {
        setCategories(response.data);
        // Synchronize AppContext productCategories
        response.data.forEach((cat) => {
          if (cat.name && !productCategories.some((c) => c.toLowerCase() === cat.name.toLowerCase())) {
            addProductCategory(cat.name);
          }
        });
      }
    } catch (err: any) {
      console.warn('Gagal memuat kategori produk dari API, fallback ke AppContext:', err);
      hasFetchedRef.current = true;
      setCategories((prev) => {
        if (prev.length > 0) return prev;
        return productCategories.map((name, index) => {
          const count = products.filter((p) => p.category?.toLowerCase() === name.toLowerCase()).length;
          return {
            id: index + 1,
            company_id: 1,
            name,
            product_count: count,
            can_delete: count === 0,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });
      });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [filters.cat_page, filters.cat_per_page, filters.cat_search, addProductCategory, productCategories, products]);

  useEffect(() => {
    if (isExpanded) {
      loadCategories();
    }
  }, [isExpanded, loadCategories]);

  const handleToggle = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (expanded && !hasFetchedRef.current) {
      loadCategories();
    }
  };

  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error('Gagal', 'Nama kategori tidak boleh kosong.');
      return;
    }

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Sudah Ada', `Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }

    try {
      setIsCreating(true);
      const res = await productCategoryService.createCategory({ name: trimmed });
      const createdItem: ProductCategoryItem = res.data || {
        id: Date.now(),
        company_id: 1,
        name: trimmed,
        product_count: 0,
        can_delete: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCategories((prev) => [...prev, createdItem]);
      addProductCategory(trimmed);
      setNewCategoryName('');
      setShowAddCat(false);
      toast.success('Berhasil', `Kategori "${trimmed}" berhasil ditambahkan.`);
    } catch (err: any) {
      toast.error('Gagal Menambahkan', err?.message || 'Terjadi kesalahan saat menambahkan kategori.');
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (cat: ProductCategoryItem) => {
    setShowAddCat(false);
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (id: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error('Gagal', 'Nama kategori tidak boleh kosong.');
      return;
    }

    const isDuplicate = categories.some(
      (c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      toast.error('Sudah Ada', `Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }

    try {
      setIsUpdating(true);
      const res = await productCategoryService.updateCategory(id, { name: trimmed });
      const updatedItem = res.data;

      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: updatedItem?.name || trimmed } : c))
      );
      toast.success('Berhasil', `Kategori "${trimmed}" berhasil diperbarui.`);
      cancelEdit();
    } catch (err: any) {
      toast.error('Gagal Memperbarui', err?.message || 'Terjadi kesalahan saat memperbarui kategori.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCategory = async (cat: ProductCategoryItem) => {
    const count = cat.product_count ?? products.filter((p) => p.category?.toLowerCase() === cat.name.toLowerCase()).length;
    if (count > 0 || !cat.can_delete) {
      toast.error('Gagal Menghapus', `Kategori "${cat.name}" tidak dapat dihapus karena masih digunakan oleh ${count} produk di katalog.`);
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Kategori Produk?',
      message: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"? Kategori yang sedang digunakan oleh produk aktif tidak dapat dihapus.`,
      confirmText: 'Hapus Kategori',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!isOk) return;

    try {
      await productCategoryService.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      deleteProductCategory(cat.name);
      toast.success('Berhasil Dihapus', `Kategori "${cat.name}" berhasil dihapus.`);
    } catch (err: any) {
      toast.error('Gagal Menghapus', err?.message || 'Terjadi kesalahan saat menghapus kategori.');
    }
  };

  return (
    <ConfigSection
      title="Master Kategori Produk"
      description="Kelola daftar kategori untuk pengelompokan produk di katalog."
      icon={FolderTree}
      iconWrapperClass="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
      defaultExpanded={false}
      isControlled={true}
      isExpandedControlled={isExpanded}
      onToggle={handleToggle}
    >
      <div className="space-y-3 pt-3">
        {/* Header Action: Pencarian & Tombol Tambah Kategori */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari kategori produk..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 text-xs"
              inputSize="sm"
            />
          </div>
          {canCreate && (
            <Button
              size="sm"
              onClick={() => {
                setShowAddCat(true);
                setEditingId(null);
                setNewCategoryName('');
              }}
              disabled={showAddCat || !!editingId}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Kategori Produk
            </Button>
          )}
        </div>

        {/* Tabel Kategori Produk */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Nama Kategori</th>
                <th className="px-4 py-3 text-center">Jumlah Produk Terkait</th>
                {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && categories.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 3 : 2} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span>Memuat data kategori produk...</span>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 3 : 2} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    {filters.cat_search
                      ? 'Tidak ada kategori yang cocok dengan pencarian.'
                      : 'Belum ada kategori produk terdaftar.'}
                  </td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const count =
                    cat.product_count ??
                    products.filter((p) => p.category?.toLowerCase() === cat.name.toLowerCase()).length;
                  const isEditing = editingId === cat.id;

                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {isEditing ? (
                          <div className="flex items-center gap-2 max-w-xs">
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                            <Input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              disabled={isUpdating}
                              className="text-xs h-7 py-1 px-2"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(cat.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(cat.id)}
                              disabled={isUpdating || !editingName.trim()}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-40"
                              title="Simpan Perubahan"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={isUpdating}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Batal"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                            <span>{cat.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={count > 0 ? 'info' : 'default'}>
                          {count} Produk
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && !isEditing && (
                              <button
                                type="button"
                                onClick={() => startEdit(cat)}
                                disabled={showAddCat}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Edit Kategori"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && !isEditing && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                disabled={showAddCat || (!cat.can_delete && count > 0)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={
                                  cat.can_delete && count === 0
                                    ? 'Hapus Kategori'
                                    : 'Kategori tidak dapat dihapus karena masih digunakan produk'
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Baris Input Tambah Kategori Produk (Muncul saat tombol Tambah Kategori diklik) */}
          {showAddCat && (
            <div className="p-2.5 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <form onSubmit={handleAddCategory} className="flex items-center gap-2">
                <Input
                  autoFocus
                  placeholder="Nama Kategori Produk Baru..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  disabled={isCreating}
                  inputSize="sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowAddCat(false);
                  }}
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="submit"
                    size="sm"
                    variant="success"
                    disabled={!newCategoryName.trim() || isCreating}
                    isLoading={isCreating}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddCat(false)}
                    disabled={isCreating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </ConfigSection>
  );
}
