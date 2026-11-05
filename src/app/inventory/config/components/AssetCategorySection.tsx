'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import {
  assetCategoryService,
  AssetCategory,
} from '@/services/asset-category.service';
import { ConfigSection } from '@/components/ui/ConfigSection';
import { ReorderableList } from '@/components/ui/ReorderableList';
import { Wrench } from 'lucide-react';

export function AssetCategorySection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    assets,
    assetCategories: appAssetCategories,
    addAssetCategory,
    updateAssetCategory,
    deleteAssetCategory,
    reorderAssetCategories,
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await assetCategoryService.getCategories({ per_page: 100 });
      hasFetchedRef.current = true;

      if (response && Array.isArray(response.data)) {
        setCategories(response.data);
        const names = response.data.map((c) => c.name);
        reorderAssetCategories(names);
      }
    } catch (err: any) {
      console.warn('Gagal memuat kategori aset dari API, menggunakan data lokal AppContext:', err);
      hasFetchedRef.current = true;
      setCategories((prev) => {
        if (prev.length > 0) return prev;
        return appAssetCategories.map((name, index) => ({
          id: index + 1,
          company_id: 1,
          name,
          sort_order: index + 1,
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
  };

  const handleToggle = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (expanded && !hasFetchedRef.current) {
      loadCategories();
    }
  };

  const handleAddCategory = async (name: string) => {
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Kategori Sudah Ada', `Kategori "${name}" sudah terdaftar.`);
      return false;
    }

    try {
      const res = await assetCategoryService.createCategory({ name });
      const newCat: AssetCategory = res.data || {
        id: Date.now(),
        company_id: 1,
        name,
        sort_order: categories.length + 1,
        can_delete: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCategories((prev) => [...prev, newCat]);
      addAssetCategory(name);
      toast.success('Kategori Ditambahkan', `Kategori aset "${name}" berhasil ditambahkan.`);
      return true;
    } catch (err: any) {
      toast.error('Gagal Menambahkan Kategori', err?.message || 'Terjadi kesalahan pada server.');
      return false;
    }
  };

  const handleUpdateCategory = async (catId: string | number, newName: string, item: AssetCategory) => {
    const numericId = Number(catId);
    const isDuplicateOther = categories.some(
      (c) => c.id !== numericId && c.name.toLowerCase() === newName.toLowerCase()
    );
    if (isDuplicateOther) {
      toast.error('Kategori Sudah Ada', `Kategori "${newName}" sudah terdaftar.`);
      return false;
    }

    try {
      const res = await assetCategoryService.updateCategory(numericId, { name: newName });
      const updatedCat = res.data || {
        ...categories.find((c) => c.id === numericId)!,
        name: newName,
      };

      setCategories((prev) => prev.map((c) => (c.id === numericId ? updatedCat : c)));
      updateAssetCategory(item.name, newName);
      toast.success('Kategori Diperbarui', `Kategori "${item.name}" berhasil diubah menjadi "${newName}".`);
      return true;
    } catch (err: any) {
      toast.error('Gagal Memperbarui Kategori', err?.message || 'Terjadi kesalahan pada server.');
      return false;
    }
  };

  const handleDeleteCategory = async (cat: AssetCategory) => {
    const count =
      cat.asset_count !== undefined
        ? cat.asset_count
        : assets.filter(
          (a) => a.category.toLowerCase() === cat.name.toLowerCase()
        ).length;

    if (cat.can_delete === false || count > 0) {
      toast.error(
        'Gagal Menghapus Kategori',
        `Kategori "${cat.name}" sedang digunakan oleh ${count} aset.`
      );
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Kategori Aset',
      message: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`,
      confirmText: 'Hapus Kategori',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await assetCategoryService.deleteCategory(cat.id);
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        deleteAssetCategory(cat.name);
        toast.success('Kategori Dihapus', `Kategori "${cat.name}" berhasil dihapus.`);
      } catch (err: any) {
        toast.error('Gagal Menghapus Kategori', err?.message || 'Terjadi kesalahan pada server.');
      }
    }
  };

  const handleReorderCategories = async (updated: AssetCategory[]) => {
    setCategories(updated);
    reorderAssetCategories(updated.map((c) => c.name));

    try {
      const itemIds = updated.map((c) => c.id);
      await assetCategoryService.reorderCategories(itemIds);
    } catch (err: any) {
      toast.error('Gagal Menyimpan Urutan', 'Terjadi kesalahan saat menyimpan urutan kategori.');
    }
  };

  const canCreate = can(PERMISSIONS.INVENTORY.ASSET_CATEGORY_CREATE);
  const canUpdate = can(PERMISSIONS.INVENTORY.ASSET_CATEGORY_UPDATE);
  const canDelete = can(PERMISSIONS.INVENTORY.ASSET_CATEGORY_DELETE);

  const displayItems = categories.map((cat) => ({
    ...cat,
    count:
      cat.asset_count !== undefined
        ? cat.asset_count
        : assets.filter(
          (a) => a.category.toLowerCase() === cat.name.toLowerCase()
        ).length,
  }));

  return (
    <ConfigSection
      title="Kategori Aset & Alat Kerja"
      description="Kelola pengelompokan kategori aset perusahaan, mesin produksi, dan perlengkapan. Geser item untuk mengubah urutan."
      icon={Wrench}
      defaultExpanded={false}
      isExpanded={isExpanded}
      onToggle={handleToggle}
      isLoading={isLoading}
    >
      <ReorderableList
        items={displayItems}
        isLoading={isLoading}
        entityName="Kategori"
        countUnitLabel="Aset"
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onAdd={handleAddCategory}
        onUpdate={handleUpdateCategory}
        onDelete={handleDeleteCategory}
        onReorder={handleReorderCategories}
        droppableId="asset-categories-list"
      />
    </ConfigSection>
  );
}
