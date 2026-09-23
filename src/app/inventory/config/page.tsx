'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Warehouse,
  Wrench,
  Plus,
  Trash2,
  Edit2,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  GripVertical,
} from 'lucide-react';

function ConfigSection({
  title,
  description,
  icon: Icon,
  iconWrapperClass,
  children,
  defaultExpanded = false,
}: {
  title: string;
  description: string;
  icon: any;
  iconWrapperClass: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      <div
        className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconWrapperClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <div className="text-slate-400">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}

export default function InventoryConfigPage() {
  const { toast, confirm } = useToast();
  const {
    categories,
    assetCategories,
    materials,
    assets,
    addMaterialCategory,
    updateMaterialCategory,
    deleteMaterialCategory,
    reorderMaterialCategories,
    addAssetCategory,
    updateAssetCategory,
    deleteAssetCategory,
    reorderAssetCategories,
  } = useApp();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ----- Material Category State -----
  const [showAddMaterialCat, setShowAddMaterialCat] = useState(false);
  const [newMaterialCat, setNewMaterialCat] = useState('');
  const [editingMaterialCat, setEditingMaterialCat] = useState<string | null>(null);
  const [editMaterialCatValue, setEditMaterialCatValue] = useState('');

  // ----- Asset Category State -----
  const [showAddAssetCat, setShowAddAssetCat] = useState(false);
  const [newAssetCat, setNewAssetCat] = useState('');
  const [editingAssetCat, setEditingAssetCat] = useState<string | null>(null);
  const [editAssetCatValue, setEditAssetCatValue] = useState('');

  // ----- Handlers for Material Categories -----
  const handleAddMaterialCategory = () => {
    const trimmed = newMaterialCat.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Kategori Sudah Ada', `Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }
    addMaterialCategory(trimmed);
    toast.success('Kategori Ditambahkan', `Kategori bahan baku "${trimmed}" berhasil ditambahkan.`);
    setNewMaterialCat('');
    setShowAddMaterialCat(false);
  };

  const handleUpdateMaterialCategory = (oldCat: string) => {
    const trimmed = editMaterialCatValue.trim();
    if (!trimmed) return;
    const isDuplicateOther = categories.some(
      c => c.toLowerCase() !== oldCat.toLowerCase() && c.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicateOther) {
      toast.error('Kategori Sudah Ada', `Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }
    updateMaterialCategory(oldCat, trimmed);
    toast.success('Kategori Diperbarui', `Kategori "${oldCat}" berhasil diubah menjadi "${trimmed}".`);
    setEditingMaterialCat(null);
    setEditMaterialCatValue('');
  };

  const handleDeleteMaterialCategory = async (cat: string) => {
    const count = materials.filter(m => m.category.toLowerCase() === cat.toLowerCase()).length;
    if (count > 0) {
      toast.error(
        'Gagal Menghapus Kategori',
        `Kategori "${cat}" sedang digunakan oleh ${count} bahan baku.`
      );
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Kategori Bahan Baku',
      message: `Apakah Anda yakin ingin menghapus kategori "${cat}"?`,
      confirmText: 'Hapus Kategori',
      variant: 'danger',
    });

    if (isOk) {
      const success = deleteMaterialCategory(cat);
      if (success) {
        toast.success('Kategori Dihapus', `Kategori "${cat}" berhasil dihapus.`);
      } else {
        toast.error('Gagal Menghapus Kategori', `Kategori "${cat}" sedang digunakan oleh bahan baku.`);
      }
    }
  };

  const handleDragEndMaterial = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const updated = Array.from(categories);
    const [removed] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, removed);
    reorderMaterialCategories(updated);
  };

  // ----- Handlers for Asset Categories -----
  const handleAddAssetCategory = () => {
    const trimmed = newAssetCat.trim();
    if (!trimmed) return;
    if (assetCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Kategori Sudah Ada', `Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }
    addAssetCategory(trimmed);
    toast.success('Kategori Ditambahkan', `Kategori aset "${trimmed}" berhasil ditambahkan.`);
    setNewAssetCat('');
    setShowAddAssetCat(false);
  };

  const handleUpdateAssetCategory = (oldCat: string) => {
    const trimmed = editAssetCatValue.trim();
    if (!trimmed) return;
    const isDuplicateOther = assetCategories.some(
      c => c.toLowerCase() !== oldCat.toLowerCase() && c.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicateOther) {
      toast.error('Kategori Sudah Ada', `Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }
    updateAssetCategory(oldCat, trimmed);
    toast.success('Kategori Diperbarui', `Kategori "${oldCat}" berhasil diubah menjadi "${trimmed}".`);
    setEditingAssetCat(null);
    setEditAssetCatValue('');
  };

  const handleDeleteAssetCategory = async (cat: string) => {
    const count = assets.filter(a => a.category.toLowerCase() === cat.toLowerCase()).length;
    if (count > 0) {
      toast.error(
        'Gagal Menghapus Kategori',
        `Kategori "${cat}" sedang digunakan oleh ${count} aset.`
      );
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Kategori Aset',
      message: `Apakah Anda yakin ingin menghapus kategori "${cat}"?`,
      confirmText: 'Hapus Kategori',
      variant: 'danger',
    });

    if (isOk) {
      const success = deleteAssetCategory(cat);
      if (success) {
        toast.success('Kategori Dihapus', `Kategori "${cat}" berhasil dihapus.`);
      } else {
        toast.error('Gagal Menghapus Kategori', `Kategori "${cat}" sedang digunakan oleh aset.`);
      }
    }
  };

  const handleDragEndAsset = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const updated = Array.from(assetCategories);
    const [removed] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, removed);
    reorderAssetCategories(updated);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      <PageHeader
        title="Konfigurasi Inventaris & Aset"
        backHref="/inventory"
      />

      <div className="space-y-3">
        {/* ============================================================== */}
        {/* RAW MATERIAL CATEGORY CONFIGURATION */}
        {/* ============================================================== */}
        <ConfigSection
          title="Kategori Bahan Baku"
          description="Kelola pengelompokan kategori master bahan baku & material gudang. Geser item untuk mengubah urutan."
          icon={Warehouse}
          iconWrapperClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
          defaultExpanded={false}
        >
          <div className="pt-2.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {categories.length} Kategori Terdaftar
              </span>
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
                  <Droppable droppableId="material-categories-list">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${
                          snapshot.isDraggingOver ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                        }`}
                      >
                        {categories.map((cat, idx) => {
                          const materialCount = materials.filter(m => m.category.toLowerCase() === cat.toLowerCase()).length;
                          const isEditing = editingMaterialCat === cat;

                          return (
                            <Draggable key={cat} draggableId={`mat-${cat}`} index={idx} isDragDisabled={isEditing}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center justify-between px-3.5 py-2 bg-white dark:bg-slate-900 ${
                                    snapshot.isDragging
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
                                        onChange={e => setEditMaterialCatValue(e.target.value)}
                                        inputSize="sm"
                                      />
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Button size="sm" variant="success" onClick={() => handleUpdateMaterialCategory(cat)}>
                                          <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingMaterialCat(null)}>
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="w-8 px-1 text-center shrink-0">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing inline-block shrink-0"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>
                                      </div>
                                      <div className="flex-1 px-1 text-xs font-medium text-slate-900 dark:text-slate-200 truncate">
                                        {cat}
                                      </div>
                                      <div className="w-36 px-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                        {materialCount} Material
                                      </div>
                                      <div className="w-24 px-1 text-right shrink-0">
                                        <div className="flex items-center justify-end gap-0.5">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingMaterialCat(cat);
                                              setEditMaterialCatValue(cat);
                                              setShowAddMaterialCat(false);
                                            }}
                                            disabled={showAddMaterialCat}
                                            title="Edit Kategori"
                                            className="h-7 w-7 p-0"
                                          >
                                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteMaterialCategory(cat)}
                                            disabled={showAddMaterialCat}
                                            title="Hapus Kategori"
                                            className="h-7 w-7 p-0"
                                          >
                                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                          </Button>
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
                      onChange={e => setNewMaterialCat(e.target.value)}
                      inputSize="sm"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="success" onClick={handleAddMaterialCategory} disabled={!newMaterialCat.trim()}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddMaterialCat(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {categories.length === 0 && !showAddMaterialCat && (
                <div className="py-4 text-center text-xs text-slate-500">
                  Belum ada kategori bahan baku terdaftar.
                </div>
              )}
            </div>
          </div>
        </ConfigSection>

        {/* ============================================================== */}
        {/* ASSET CATEGORY CONFIGURATION */}
        {/* ============================================================== */}
        <ConfigSection
          title="Kategori Aset & Alat Kerja"
          description="Kelola pengelompokan kategori aset perusahaan, mesin produksi, dan perlengkapan. Geser item untuk mengubah urutan."
          icon={Wrench}
          iconWrapperClass="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          defaultExpanded={false}
        >
          <div className="pt-2.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {assetCategories.length} Kategori Terdaftar
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setShowAddAssetCat(true);
                  setEditingAssetCat(null);
                  setNewAssetCat('');
                }}
                disabled={showAddAssetCat || !!editingAssetCat}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Kategori Aset
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {/* Header List */}
              <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
                <div className="w-8 px-2 py-2 text-center shrink-0"></div>
                <div className="flex-1 px-3.5 py-2">Nama Kategori Aset</div>
                <div className="w-36 px-3.5 py-2 text-center shrink-0">Jumlah Aset</div>
                <div className="w-24 px-3.5 py-2 text-right shrink-0">Aksi</div>
              </div>

              {/* Droppable Body */}
              {isMounted && (
                <DragDropContext onDragEnd={handleDragEndAsset}>
                  <Droppable droppableId="asset-categories-list">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${
                          snapshot.isDraggingOver ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                        }`}
                      >
                        {assetCategories.map((cat, idx) => {
                          const assetCount = assets.filter(a => a.category.toLowerCase() === cat.toLowerCase()).length;
                          const isEditing = editingAssetCat === cat;

                          return (
                            <Draggable key={cat} draggableId={`asset-${cat}`} index={idx} isDragDisabled={isEditing}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center justify-between px-3.5 py-2 bg-white dark:bg-slate-900 ${
                                    snapshot.isDragging
                                      ? 'shadow-md border-y border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 z-50'
                                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                  }`}
                                >
                                  {isEditing ? (
                                    <div className="flex items-center gap-2 w-full py-0.5">
                                      <Input
                                        autoFocus
                                        placeholder="Nama Kategori Aset"
                                        value={editAssetCatValue}
                                        onChange={e => setEditAssetCatValue(e.target.value)}
                                        inputSize="sm"
                                      />
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Button size="sm" variant="success" onClick={() => handleUpdateAssetCategory(cat)}>
                                          <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingAssetCat(null)}>
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="w-8 px-1 text-center shrink-0">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing inline-block shrink-0"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>
                                      </div>
                                      <div className="flex-1 px-1 text-xs font-medium text-slate-900 dark:text-slate-200 truncate">
                                        {cat}
                                      </div>
                                      <div className="w-36 px-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                        {assetCount} Aset
                                      </div>
                                      <div className="w-24 px-1 text-right shrink-0">
                                        <div className="flex items-center justify-end gap-0.5">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingAssetCat(cat);
                                              setEditAssetCatValue(cat);
                                              setShowAddAssetCat(false);
                                            }}
                                            disabled={showAddAssetCat}
                                            title="Edit Kategori"
                                            className="h-7 w-7 p-0"
                                          >
                                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteAssetCategory(cat)}
                                            disabled={showAddAssetCat}
                                            title="Hapus Kategori"
                                            className="h-7 w-7 p-0"
                                          >
                                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                          </Button>
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

              {showAddAssetCat && (
                <div className="p-2 px-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      placeholder="Nama Kategori Aset Baru..."
                      value={newAssetCat}
                      onChange={e => setNewAssetCat(e.target.value)}
                      inputSize="sm"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="success" onClick={handleAddAssetCategory} disabled={!newAssetCat.trim()}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddAssetCat(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {assetCategories.length === 0 && !showAddAssetCat && (
                <div className="py-4 text-center text-xs text-slate-500">
                  Belum ada kategori aset terdaftar.
                </div>
              )}
            </div>
          </div>
        </ConfigSection>
      </div>
    </div>
  );
}


