'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory } from '@/lib/roles';
import {
  productCategoryService,
  ProductCategoryItem,
} from '@/services/product-category.service';
import { ConfigSection } from '@/components/ui/ConfigSection';
import { ReorderableList } from '@/components/ui/ReorderableList';
import { FolderTree } from 'lucide-react';

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

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

  const canCreatePerm = can(PERMISSIONS.PRODUCT.CATEGORY_CREATE);
  const canUpdatePerm = can(PERMISSIONS.PRODUCT.CATEGORY_UPDATE);
  const canDeletePerm = can(PERMISSIONS.PRODUCT.CATEGORY_DELETE);
  const isInventoryManager = canManageInventory(currentUser.role);

  const canCreate = isInventoryManager || canCreatePerm;
  const canUpdate = isInventoryManager || canUpdatePerm;
  const canDelete = isInventoryManager || canDeletePerm;

  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const loadCategories = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await productCategoryService.getCategories({ per_page: 100 });
      hasFetchedRef.current = true;

      if (response && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (err: unknown) {
      console.warn('Gagal memuat kategori produk dari API, menggunakan data lokal AppContext:', err);
      hasFetchedRef.current = true;
      setCategories((prev) => {
        if (prev.length > 0) return prev;
        return productCategories.map((name, index) => ({
          id: index + 1,
          company_id: 1,
          name,
          sort_order: index + 1,
          product_count: products.filter((p) => p.category?.toLowerCase() === name.toLowerCase()).length,
          can_delete: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [productCategories, products]);

  const handleToggle = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (expanded && !hasFetchedRef.current) {
      void loadCategories();
    }
  };

  const handleAddCategory = async (name: string) => {
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Kategori Sudah Ada', `Kategori "${name}" sudah terdaftar.`);
      return false;
    }

    try {
      const res = await productCategoryService.createCategory({ name });
      const newCat: ProductCategoryItem = res.data || {
        id: Date.now(),
        company_id: 1,
        name,
        sort_order: categories.length + 1,
        product_count: 0,
        can_delete: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCategories((prev) => [...prev, newCat]);
      addProductCategory(name);
      toast.success('Kategori Ditambahkan', `Kategori produk "${name}" berhasil ditambahkan.`);
      return true;
    } catch (err: unknown) {
      toast.error(
        'Gagal Menambahkan Kategori',
        getErrorMessage(err, 'Terjadi kesalahan pada server.')
      );
      return false;
    }
  };

  const handleUpdateCategory = async (
    catId: string | number,
    newName: string,
    item: ProductCategoryItem
  ) => {
    const numericId = Number(catId);
    const isDuplicateOther = categories.some(
      (c) => c.id !== numericId && c.name.toLowerCase() === newName.toLowerCase()
    );
    if (isDuplicateOther) {
      toast.error('Kategori Sudah Ada', `Kategori "${newName}" sudah terdaftar.`);
      return false;
    }

    try {
      const res = await productCategoryService.updateCategory(numericId, { name: newName });
      const updatedCat = res.data || {
        ...categories.find((c) => c.id === numericId)!,
        name: newName,
      };

      setCategories((prev) => prev.map((c) => (c.id === numericId ? updatedCat : c)));
      toast.success('Kategori Diperbarui', `Kategori "${item.name}" berhasil diubah menjadi "${newName}".`);
      return true;
    } catch (err: unknown) {
      toast.error(
        'Gagal Memperbarui Kategori',
        getErrorMessage(err, 'Terjadi kesalahan pada server.')
      );
      return false;
    }
  };

  const handleDeleteCategory = async (cat: ProductCategoryItem) => {
    const count =
      cat.product_count !== undefined
        ? cat.product_count
        : products.filter((p) => p.category?.toLowerCase() === cat.name.toLowerCase()).length;

    if (cat.can_delete === false || count > 0) {
      toast.error(
        'Gagal Menghapus Kategori',
        `Kategori "${cat.name}" tidak dapat dihapus karena masih digunakan oleh ${count} produk di katalog.`
      );
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Kategori Produk',
      message: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`,
      confirmText: 'Hapus Kategori',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await productCategoryService.deleteCategory(cat.id);
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        deleteProductCategory(cat.name);
        toast.success('Kategori Dihapus', `Kategori "${cat.name}" berhasil dihapus.`);
      } catch (err: unknown) {
        toast.error(
          'Gagal Menghapus Kategori',
          getErrorMessage(err, 'Terjadi kesalahan pada server.')
        );
      }
    }
  };

  const handleReorderCategories = async (updated: ProductCategoryItem[]) => {
    const previous = categories;
    setCategories(updated);

    try {
      const itemIds = updated.map((c) => c.id);
      await productCategoryService.reorderCategories(itemIds);
    } catch {
      setCategories(previous);
      toast.error('Gagal Menyimpan Urutan', 'Terjadi kesalahan saat menyimpan urutan kategori.');
    }
  };

  const displayItems = categories.map((cat) => ({
    ...cat,
    count:
      cat.product_count !== undefined
        ? cat.product_count
        : products.filter((p) => p.category?.toLowerCase() === cat.name.toLowerCase()).length,
  }));

  return (
    <ConfigSection
      title="Master Kategori Produk"
      description="Kelola daftar kategori untuk pengelompokan produk di katalog. Geser item untuk mengubah urutan."
      icon={FolderTree}
      defaultExpanded={false}
      isExpanded={isExpanded}
      onToggle={handleToggle}
      isLoading={isLoading}
    >
      <ReorderableList
        items={displayItems}
        isLoading={isLoading}
        entityName="Kategori"
        countUnitLabel="Produk"
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onAdd={handleAddCategory}
        onUpdate={handleUpdateCategory}
        onDelete={handleDeleteCategory}
        onReorder={handleReorderCategories}
        droppableId="product-categories-list"
      />
    </ConfigSection>
  );
}
