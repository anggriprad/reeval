'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import {
  materialCategoryService,
  MaterialCategory,
} from '@/services/material-category.service';
import { ConfigSection } from './ConfigSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Warehouse,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  GripVertical,
} from 'lucide-react';

export function MaterialCategorySection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    materials,
    categories: appCategories,
    addMaterialCategory,
    updateMaterialCategory,
    deleteMaterialCategory,
    reorderMaterialCategories,
  } = useApp();

  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Add state
  const [showAddMaterialCat, setShowAddMaterialCat] = useState(false);
  const [newMaterialCat, setNewMaterialCat] = useState('');
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  // Edit state
  const [editingMaterialCat, setEditingMaterialCat] = useState<number | null>(null);
  const [editMaterialCatValue, setEditMaterialCatValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadCategories = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await materialCategoryService.getCategories({ per_page: 100 });
      hasFetchedRef.current = true;

      if (response && Array.isArray(response.data)) {
        setCategories(response.data);
        const names = response.data.map((c) => c.name);
        reorderMaterialCategories(names);
      }
    } catch (err: any) {
      console.warn('Gagal memuat kategori dari API, menggunakan data lokal AppContext:', err);
      hasFetchedRef.current = true;
      setCategories((prev) => {
        if (prev.length > 0) return prev;
        return appCategories.map((name, index) => ({
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

  const handleAddMaterialCategory = async () => {
    const trimmed = newMaterialCat.trim();
    if (!trimmed) return;

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Kategori Sudah Ada', `Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }

    try {
      setIsSavingAdd(true);
      const res = await materialCategoryService.createCategory({ name: trimmed });
      const newCat: MaterialCategory = res.data || {
        id: Date.now(),
        company_id: 1,
        name: trimmed,
        sort_order: categories.length + 1,
        can_delete: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCategories((prev) => [...prev, newCat]);
      addMaterialCategory(trimmed);
      toast.success('Kategori Ditambahkan', `Kategori bahan baku "${trimmed}" berhasil ditambahkan.`);
      setNewMaterialCat('');
      setShowAddMaterialCat(false);
    } catch (err: any) {
      toast.error('Gagal Menambahkan Kategori', err?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setIsSavingAdd(false);
    }
  };

  const handleUpdateMaterialCategory = async (catId: number, oldName: string) => {
    const trimmed = editMaterialCatValue.trim();
    if (!trimmed) return;

    const isDuplicateOther = categories.some(
      (c) => c.id !== catId && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicateOther) {
      toast.error('Kategori Sudah Ada', `Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }

    try {
      setIsSavingEdit(true);
      const res = await materialCategoryService.updateCategory(catId, { name: trimmed });
      const updatedCat = res.data || {
        ...categories.find((c) => c.id === catId)!,
        name: trimmed,
      };

      setCategories((prev) => prev.map((c) => (c.id === catId ? updatedCat : c)));
      updateMaterialCategory(oldName, trimmed);
      toast.success('Kategori Diperbarui', `Kategori "${oldName}" berhasil diubah menjadi "${trimmed}".`);
      setEditingMaterialCat(null);
      setEditMaterialCatValue('');
    } catch (err: any) {
      toast.error('Gagal Memperbarui Kategori', err?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteMaterialCategory = async (cat: MaterialCategory) => {
    const count =
      cat.material_count !== undefined
        ? cat.material_count
        : materials.filter(
            (m) => m.category.toLowerCase() === cat.name.toLowerCase()
          ).length;

    if (cat.can_delete === false || count > 0) {
      toast.error(
        'Gagal Menghapus Kategori',
        `Kategori "${cat.name}" sedang digunakan oleh ${count} bahan baku.`
      );
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Kategori Bahan Baku',
      message: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`,
      confirmText: 'Hapus Kategori',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await materialCategoryService.deleteCategory(cat.id);
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        deleteMaterialCategory(cat.name);
        toast.success('Kategori Dihapus', `Kategori "${cat.name}" berhasil dihapus.`);
      } catch (err: any) {
        toast.error('Gagal Menghapus Kategori', err?.message || 'Terjadi kesalahan pada server.');
      }
    }
  };

  const handleDragEndMaterial = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const updated = Array.from(categories);
    const [removed] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, removed);

    setCategories(updated);
    reorderMaterialCategories(updated.map((c) => c.name));

    try {
      const itemIds = updated.map((c) => c.id);
      await materialCategoryService.reorderCategories(itemIds);
    } catch (err: any) {
      toast.error('Gagal Menyimpan Urutan', 'Terjadi kesalahan saat menyimpan urutan kategori.');
    }
  };

  const canCreate = can(PERMISSIONS.INVENTORY.CATEGORY_CREATE);
  const canUpdate = can(PERMISSIONS.INVENTORY.CATEGORY_UPDATE);
  const canDelete = can(PERMISSIONS.INVENTORY.CATEGORY_DELETE);

  return (
    <ConfigSection
      title="Kategori Bahan Baku"
      description="Kelola pengelompokan kategori master bahan baku & material gudang. Geser item untuk mengubah urutan."
      icon={Warehouse}
      iconWrapperClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
      defaultExpanded={false}
      isExpanded={isExpanded}
      onToggle={handleToggle}
    >
      <div className="pt-2.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            {categories.length} Kategori Terdaftar
          </span>
          {canCreate && (
            <Button
              size="sm"
              onClick={() => {
                setShowAddMaterialCat(true);
                setEditingMaterialCat(null);
                setNewMaterialCat('');
              }}
              disabled={showAddMaterialCat || !!editingMaterialCat}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Kategori Bahan
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* Header List */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
            <div className="w-8 px-2 py-2 text-center shrink-0"></div>
            <div className="flex-1 px-3.5 py-2">Nama Kategori</div>
            <div className="w-36 px-3.5 py-2 text-center shrink-0">Jumlah Material</div>
            <div className="w-24 px-3.5 py-2 text-right shrink-0">Aksi</div>
          </div>

          {/* Droppable Body */}
          {isMounted && (
            <DragDropContext onDragEnd={handleDragEndMaterial}>
              <Droppable droppableId="material-categories-list" isDropDisabled={!canUpdate}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${snapshot.isDraggingOver ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                      }`}
                  >
                    {categories.map((cat, idx) => {
                      const materialCount =
                        cat.material_count !== undefined
                          ? cat.material_count
                          : materials.filter(
                              (m) => m.category.toLowerCase() === cat.name.toLowerCase()
                            ).length;
                      const isEditing = editingMaterialCat === cat.id;

                      return (
                        <Draggable
                          key={String(cat.id)}
                          draggableId={`mat-${cat.id}`}
                          index={idx}
                          isDragDisabled={isEditing || !canUpdate}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center justify-between px-3.5 py-2 bg-white dark:bg-slate-900 ${snapshot.isDragging
                                ? 'shadow-md border-y border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 z-50'
                                : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                }`}
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-2 w-full py-0.5">
                                  <Input
                                    autoFocus
                                    placeholder="Nama Kategori"
                                    value={editMaterialCatValue}
                                    onChange={(e) => setEditMaterialCatValue(e.target.value)}
                                    inputSize="sm"
                                  />
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="success"
                                      onClick={() => handleUpdateMaterialCategory(cat.id, cat.name)}
                                      isLoading={isSavingEdit}
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingMaterialCat(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="w-8 px-1 text-center shrink-0">
                                    {canUpdate ? (
                                      <div
                                        {...provided.dragHandleProps}
                                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing inline-block shrink-0"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        {idx + 1}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 px-1 text-xs font-medium text-slate-900 dark:text-slate-200 truncate">
                                    {cat.name}
                                  </div>
                                  <div className="w-36 px-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                    {materialCount} Material
                                  </div>
                                  <div className="w-24 px-1 text-right shrink-0">
                                    <div className="flex items-center justify-end gap-0.5">
                                      {canUpdate && (
                                        <Button
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingMaterialCat(cat.id);
                                            setEditMaterialCatValue(cat.name);
                                            setShowAddMaterialCat(false);
                                          }}
                                          disabled={showAddMaterialCat}
                                          title="Edit Kategori"
                                          className="h-7 w-7 p-0"
                                        >
                                          <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                        </Button>
                                      )}
                                      {canDelete && (
                                        <Button
                                          variant="ghost"
                                          onClick={() => handleDeleteMaterialCategory(cat)}
                                          disabled={showAddMaterialCat}
                                          title="Hapus Kategori"
                                          className="h-7 w-7 p-0"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {showAddMaterialCat && (
            <div className="p-2 px-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  placeholder="Nama Kategori Bahan Baku Baru..."
                  value={newMaterialCat}
                  onChange={(e) => setNewMaterialCat(e.target.value)}
                  inputSize="sm"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={handleAddMaterialCategory}
                    disabled={!newMaterialCat.trim()}
                    isLoading={isSavingAdd}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddMaterialCat(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {categories.length === 0 && !showAddMaterialCat && !isLoading && (
            <EmptyState
              title="Belum Ada Kategori"
              description="Belum ada kategori bahan baku terdaftar."
              variant="plain"
            />
          )}
        </div>
      </div>
    </ConfigSection>
  );
}
