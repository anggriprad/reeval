'use client';

import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { resolveAuthorName } from '@/lib/types';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  GripVertical,
} from 'lucide-react';

export interface ReorderableItem {
  id: string | number;
  name: string;
  count?: number;
  can_delete?: boolean;
  created_by?: string | null;
  created_by_user?: { full_name?: string | null } | null;
  createdBy?: string | null;
  createdByUser?: { full_name?: string | null } | null;
  [key: string]: any;
}

export interface ReorderableListProps<T extends ReorderableItem> {
  items: T[];
  isLoading?: boolean;
  entityName?: string;
  countUnitLabel?: string;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onReorder: (newItems: T[]) => Promise<void> | void;
  onAdd: (name: string) => Promise<boolean | void> | boolean | void;
  onUpdate: (id: string | number, newName: string, item: T) => Promise<boolean | void> | boolean | void;
  onDelete: (item: T) => void;
  showHeaderBar?: boolean;
  customTopBarAction?: React.ReactNode;
  droppableId?: string;
}

export function ReorderableList<T extends ReorderableItem>({
  items,
  isLoading = false,
  entityName = 'Kategori',
  countUnitLabel,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
  onReorder,
  onAdd,
  onUpdate,
  onDelete,
  showHeaderBar = true,
  customTopBarAction,
  droppableId = 'reorderable-list',
}: ReorderableListProps<T>) {
  const [isMounted, setIsMounted] = useState(false);

  // Add state
  const [showAdd, setShowAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAddSubmit = async () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    try {
      setIsSavingAdd(true);
      const res = await onAdd(trimmed);
      if (res !== false) {
        setNewItemName('');
        setShowAdd(false);
      }
    } finally {
      setIsSavingAdd(false);
    }
  };

  const handleUpdateSubmit = async (item: T) => {
    const trimmed = editItemName.trim();
    if (!trimmed) return;

    try {
      setIsSavingEdit(true);
      const res = await onUpdate(item.id, trimmed, item);
      if (res !== false) {
        setEditingId(null);
        setEditItemName('');
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const updated = Array.from(items);
    const [removed] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, removed);

    await onReorder(updated);
  };

  return (
    <div className="space-y-3">
      {showHeaderBar && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            {isLoading ? `Memuat ${entityName.toLowerCase()}...` : `${items.length} ${entityName} Terdaftar`}
          </span>
          <div className="flex items-center gap-2">
            {customTopBarAction}
            {canCreate && (
              <Button
                size="sm"
                onClick={() => {
                  setShowAdd(true);
                  setEditingId(null);
                  setNewItemName('');
                }}
                disabled={isLoading || showAdd || editingId !== null}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Tambah {entityName}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2.5">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Memuat {entityName.toLowerCase()}...
            </span>
          </div>
        ) : (
          <>
            {isMounted && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={droppableId} isDropDisabled={!canUpdate}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${snapshot.isDraggingOver ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                        }`}
                    >
                      {items.map((item, idx) => {
                        const isEditing = editingId === item.id;
                        return (
                          <Draggable
                            key={String(item.id)}
                            draggableId={`item-${item.id}`}
                            index={idx}
                            isDragDisabled={isEditing || !canUpdate}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center justify-between px-3.5 py-1.5 bg-white dark:bg-slate-900 ${snapshot.isDragging
                                  ? 'shadow-md border-y border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 z-50'
                                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                  }`}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-2 w-full">
                                    <Input
                                      autoFocus
                                      placeholder={`Nama ${entityName}`}
                                      value={editItemName}
                                      onChange={(e) => setEditItemName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateSubmit(item);
                                        else if (e.key === 'Escape') setEditingId(null);
                                      }}
                                      inputSize="md"
                                    />
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        size="sm"
                                        variant="success"
                                        onClick={() => handleUpdateSubmit(item)}
                                        isLoading={isSavingEdit}
                                      >
                                        <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setEditingId(null)}
                                        title="Batal"
                                      >
                                        <X className="h-4.5 w-4.5" />
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
                                        <span className="text-xs text-slate-400 font-mono">
                                          {idx + 1}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 px-1">
                                      <div className="text-xs md:text-sm text-slate-900 dark:text-slate-200 truncate">
                                        {item.name}
                                      </div>
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                        Dibuat oleh: {resolveAuthorName(item)}
                                      </div>
                                    </div>
                                    {countUnitLabel && (
                                      <div className="w-36 px-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                        {item.count ?? 0} {countUnitLabel}
                                      </div>
                                    )}
                                    <div className="w-28 px-1 text-right shrink-0">
                                      <div className="flex items-center justify-end gap-1">
                                        {canUpdate && (
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingId(item.id);
                                              setEditItemName(item.name);
                                              setShowAdd(false);
                                            }}
                                            disabled={showAdd}
                                            title={`Edit ${entityName}`}
                                            className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                          >
                                            <Edit2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                        {canDelete && (
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => onDelete(item)}
                                            disabled={showAdd}
                                            title={`Hapus ${entityName}`}
                                            className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
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

            {showAdd && (
              <div className="p-2 px-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    placeholder={`Nama ${entityName} Baru`}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubmit();
                      else if (e.key === 'Escape') setShowAdd(false);
                    }}
                    inputSize="md"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={handleAddSubmit}
                      disabled={!newItemName.trim()}
                      isLoading={isSavingAdd}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowAdd(false)}
                      title="Batal"
                    >
                      <X className="h-4.5 w-4.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {items.length === 0 && !showAdd && (
              <EmptyState
                title={`Belum Ada ${entityName}`}
                description={`Belum ada ${entityName.toLowerCase()} terdaftar.`}
                variant="plain"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
