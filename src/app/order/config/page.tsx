'use client';

import React, { useState, useEffect } from 'react';
import { useApp, initialOrderFormConfiguration } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { generateId } from '@/lib/utils';
import type { FormContainer, FormField, FormFieldType } from '@/lib/types';
import {
  FileText,
  Save,
  RotateCcw,
  Info,
  GripVertical,
  Plus,
  Trash2,
  Settings2,
  LayoutTemplate,
  Layers,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export default function OrderConfigPage() {
  const { toast, confirm } = useToast();
  const {
    orderFormConfiguration,
    updateOrderFormConfiguration,
    showAllOrdersTab,
    setShowAllOrdersTab,
    isCustomOrderFormEnabled,
    setIsCustomOrderFormEnabled,
    strictSOStockCheck,
    setStrictSOStockCheck,
  } = useApp();

  // Local state for the form builder schema
  const [containers, setContainers] = useState<FormContainer[]>([]);
  // Local state to track raw text input for field options (fixes space and comma typing bug)
  const [optionsTextMap, setOptionsTextMap] = useState<Record<string, string>>({});

  // Local state for Batas Waktu Pesanan UI feature
  const [isOrderDeadlineEnabled, setIsOrderDeadlineEnabled] = useState(false);
  const [deadlineProcessed, setDeadlineProcessed] = useState<{ days: string | number; hours: string | number; minutes: string | number }>({ days: 1, hours: 0, minutes: 0 });
  const [deadlineReady, setDeadlineReady] = useState<{ days: string | number; hours: string | number; minutes: string | number }>({ days: 2, hours: 0, minutes: 0 });
  const [deadlineShipped, setDeadlineShipped] = useState<{ days: string | number; hours: string | number; minutes: string | number }>({ days: 3, hours: 0, minutes: 0 });

  // Initialize local state from AppContext
  useEffect(() => {
    if (orderFormConfiguration && orderFormConfiguration.length > 0) {
      setContainers(orderFormConfiguration);
    }
  }, [orderFormConfiguration]);

  // Handle Drag and Drop
  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newContainers = Array.from(containers);

    // Reordering containers
    if (type === 'container') {
      const [removed] = newContainers.splice(source.index, 1);
      newContainers.splice(destination.index, 0, removed);

      // Update order property
      newContainers.forEach((container, idx) => {
        container.order = idx;
      });

      setContainers(newContainers);
      return;
    }

    // Reordering fields within the same container or between containers
    const sourceContainerIndex = newContainers.findIndex(c => c.id === source.droppableId);
    const destContainerIndex = newContainers.findIndex(c => c.id === destination.droppableId);

    if (sourceContainerIndex === -1 || destContainerIndex === -1) return;

    const sourceContainer = newContainers[sourceContainerIndex];
    const destContainer = newContainers[destContainerIndex];

    const sourceFields = Array.from(sourceContainer.fields);
    const [removedField] = sourceFields.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      // Same container
      sourceFields.splice(destination.index, 0, removedField);

      // Update order
      sourceFields.forEach((field, idx) => {
        field.order = idx;
      });

      newContainers[sourceContainerIndex] = {
        ...sourceContainer,
        fields: sourceFields
      };
    } else {
      // Different container
      const destFields = Array.from(destContainer.fields);
      destFields.splice(destination.index, 0, removedField);

      // Update orders
      sourceFields.forEach((field, idx) => field.order = idx);
      destFields.forEach((field, idx) => field.order = idx);

      newContainers[sourceContainerIndex] = { ...sourceContainer, fields: sourceFields };
      newContainers[destContainerIndex] = { ...destContainer, fields: destFields };
    }

    setContainers(newContainers);
  };

  // Add new container
  const handleAddContainer = () => {
    const newContainer: FormContainer = {
      id: `container-${generateId()}`,
      title: 'Kontainer Baru',
      order: containers.length,
      fields: []
    };
    setContainers([...containers, newContainer]);
  };

  // Delete container
  const handleDeleteContainer = (containerId: string) => {
    if (['container-products', 'container-customer'].includes(containerId)) return;
    setContainers(containers.filter(c => c.id !== containerId).map((c, idx) => ({ ...c, order: idx })));
  };

  // Update container title
  const handleUpdateContainerTitle = (containerId: string, newTitle: string) => {
    setContainers(containers.map(c => c.id === containerId ? { ...c, title: newTitle } : c));
  };

  // Add new field to a container
  const handleAddField = (containerId: string) => {
    if (containerId === 'container-products') return;
    setContainers(containers.map(c => {
      if (c.id === containerId) {
        const newField: FormField = {
          id: `field-${generateId()}`,
          label: 'Field Baru',
          type: 'text',
          isRequired: false,
          order: c.fields.length
        };
        return { ...c, fields: [...c.fields, newField] };
      }
      return c;
    }));
  };

  // Update field properties
  const handleUpdateField = (containerId: string, fieldId: string, updates: Partial<FormField>) => {
    if (fieldId === 'field-product-list') return;
    setContainers(containers.map(c => {
      if (c.id === containerId) {
        return {
          ...c,
          fields: c.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        };
      }
      return c;
    }));
  };

  // Delete field
  const handleDeleteField = (containerId: string, fieldId: string) => {
    if (fieldId === 'field-product-list' || fieldId === 'field-customer-name') return;
    setContainers(containers.map(c => {
      if (c.id === containerId) {
        const updatedFields = c.fields.filter(f => f.id !== fieldId).map((f, idx) => ({ ...f, order: idx }));
        return { ...c, fields: updatedFields };
      }
      return c;
    }));
  };

  const handleSaveFormCustomization = () => {
    updateOrderFormConfiguration(containers);
    setIsCustomOrderFormEnabled(true);
    toast.success('Konfigurasi Disimpan', 'Format pesanan custom berhasil diperbarui.');
  };

  const handleReset = async () => {
    const isConfirmed = await confirm({
      title: 'Reset Konfigurasi Form?',
      message: 'Apakah Anda yakin ingin mengembalikan semua pengaturan formulir pesanan ke standar bawaan sistem? Seluruh pengaturan kustom yang telah dibuat akan terhapus.',
      confirmText: 'Ya, Reset Form',
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    setContainers(initialOrderFormConfiguration);
    setOptionsTextMap({});
    setIsCustomOrderFormEnabled(false);
    setShowAllOrdersTab(false);
    updateOrderFormConfiguration(initialOrderFormConfiguration);
    toast.info('Konfigurasi Direset', 'Pengaturan dikembalikan ke default system.');
  };

  // Disable SSR for DragDropContext to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Konfigurasi Sales Order"
        backHref="/order"
      />

      {/* Deskripsi Singkat Modul Konfigurasi */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">

        {/* Item 1: Tampilkan Tab "Semua Pesanan" */}
        <div className="transition-colors">
          <div className="p-4 sm:p-5 flex items-center justify-between gap-8">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${showAllOrdersTab
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
              >
                <Layers className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Tampilkan Tab "Semua Pesanan"
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Menampilkan tab segmen "Semua" di sebelah kiri tab "Menunggu" pada halaman Sales Order.
                </p>
              </div>
            </div>

            {/* Switch Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <Toggle
                checked={showAllOrdersTab}
                onChange={(nextVal) => {
                  setShowAllOrdersTab(nextVal);
                  toast.success(
                    'Konfigurasi Diperbarui',
                    `Tab "Semua Pesanan" ${nextVal ? 'ditampilkan' : 'disembunyikan'}.`
                  );
                }}
                showStatusBadge
                color="indigo"
              />
            </div>
          </div>
        </div>

        {/* Item 2: Kustomisasi Form Pesanan */}
        <div className="transition-colors">
          {/* Header Bar: Icon, Info, Badge & Toggle Switch */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-8">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isCustomOrderFormEnabled
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
              >
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Kustomisasi Form Pesanan
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sesuaikan struktur form pembuatan Sales Order secara dinamis. Tambahkan grup input, atur input field, dan tentukan urutannya.
                </p>
              </div>
            </div>

            {/* Switch Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <Toggle
                checked={isCustomOrderFormEnabled}
                onChange={(nextVal) => {
                  setIsCustomOrderFormEnabled(nextVal);
                  if (!nextVal) {
                    toast.info('Kustomisasi Form Pesanan Dinonaktifkan');
                  } else {
                    toast.success('Kustomisasi Form Pesanan Diaktifkan');
                  }
                }}
                showStatusBadge
                color="indigo"
              />
            </div>
          </div>

          {/* Accordion Body: Form Builder */}
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isCustomOrderFormEnabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
          >
            <div className="overflow-hidden">
              <div className="px-5 pb-5 pt-1">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20 space-y-4">

                  {/* Drag and Drop Context */}
                  {isMounted && (
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="all-containers" type="container">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-4"
                          >
                            {containers.map((container, cIdx) => (
                              <Draggable key={container.id} draggableId={container.id} index={cIdx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`bg-white dark:bg-slate-900 border rounded-xl shadow-xs overflow-hidden transition-all ${snapshot.isDragging ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'
                                      }`}
                                  >
                                    {/* Container Header */}
                                    <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing shrink-0"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <Input
                                            value={container.title}
                                            onChange={(e) => handleUpdateContainerTitle(container.id, e.target.value)}
                                            placeholder={container.id === 'container-notes' ? 'Label kontainer kosong' : 'Judul Kontainer'}
                                            className="h-8 text-xs font-bold border-transparent hover:border-slate-200 focus:border-indigo-500 bg-transparent"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {(() => {
                                          const isProtected = ['container-products', 'container-customer'].includes(container.id);
                                          return (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              disabled={isProtected}
                                              onClick={() => handleDeleteContainer(container.id)}
                                              className={isProtected
                                                ? "h-8 w-8 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50"
                                                : "h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"}
                                              title={isProtected ? "Kontainer bawaan sistem (tidak dapat dihapus)" : "Hapus Kontainer"}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          );
                                        })()}
                                      </div>
                                    </div>

                                    {/* Fields List Droppable Area */}
                                    <Droppable droppableId={container.id} type="field">
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}
                                          className={`p-4 space-y-3 min-h-[60px] ${snapshot.isDraggingOver ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''
                                            }`}
                                        >
                                          {container.fields.length === 0 && (
                                            <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                              <p className="text-xs text-slate-400">Kontainer ini belum memiliki field input. Klik "+ Tambah Field" di bawah.</p>
                                            </div>
                                          )}

                                          {container.fields.map((field, fIdx) => (
                                            <Draggable key={field.id} draggableId={field.id} index={fIdx}>
                                              {(provided, snapshot) => (
                                                <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  className={`flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border ${snapshot.isDragging ? 'border-indigo-400 shadow-md ring-1 ring-indigo-400' : 'border-slate-200/60 dark:border-slate-800'
                                                    }`}
                                                >
                                                  <div
                                                    {...provided.dragHandleProps}
                                                    className="p-1 text-slate-400 hover:text-indigo-500 cursor-grab active:cursor-grabbing shrink-0"
                                                  >
                                                    <GripVertical className="h-4 w-4" />
                                                  </div>

                                                  {container.id === 'container-products' || field.type === 'product_list' || field.id === 'field-product-list' ? (
                                                    <div className="flex-1 flex items-center justify-between p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-md border border-slate-200/80 dark:border-slate-700 text-xs">
                                                      <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{field.label || 'Item Produk'}</span>
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500">(Tabel produk utama & kalkulasi otomatis)</span>
                                                      </div>
                                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 select-none">
                                                        Field Sistem (Tetap)
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <>
                                                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3 w-full">
                                                        <div className="sm:col-span-4">
                                                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Label Field</label>
                                                          <Input
                                                            value={field.label}
                                                            onChange={(e) => handleUpdateField(container.id, field.id, { label: e.target.value })}
                                                            placeholder="Contoh: Nama Pelanggan"
                                                            className="h-8 text-sm"
                                                          />
                                                        </div>
                                                        <div className="sm:col-span-3">
                                                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Tipe Data</label>
                                                          <Select
                                                            value={field.type}
                                                            onChange={(e) => handleUpdateField(container.id, field.id, { type: e.target.value as FormFieldType })}
                                                            className="h-8 text-sm"
                                                          >
                                                            <option value="text">Teks Singkat</option>
                                                            <option value="number">Angka / Telepon</option>
                                                            <option value="textarea">Teks Panjang</option>
                                                            <option value="date">Tanggal</option>
                                                            <option value="dropdown">Dropdown</option>
                                                            <option value="checkbox">Pilihan Ganda (Checkbox)</option>
                                                          </Select>
                                                        </div>
                                                        <div className="sm:col-span-3">
                                                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Placeholder (Opsional)</label>
                                                          <Input
                                                            value={field.placeholder || ''}
                                                            onChange={(e) => handleUpdateField(container.id, field.id, { placeholder: e.target.value })}
                                                            placeholder="Instruksi singkat..."
                                                            className="h-8 text-sm"
                                                          />
                                                        </div>
                                                        <div className="sm:col-span-2 flex items-end h-full pb-1">
                                                          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                                                            <input
                                                              type="checkbox"
                                                              checked={field.isRequired}
                                                              onChange={(e) => handleUpdateField(container.id, field.id, { isRequired: e.target.checked })}
                                                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                            />
                                                            Wajib Isi
                                                          </label>
                                                        </div>

                                                        {/* Options Manager for dropdown/checkbox */}
                                                        {['dropdown', 'checkbox'].includes(field.type) && (
                                                          <div className="sm:col-span-12 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Pilihan Opsi (Pisahkan dengan koma)</label>
                                                            <Input
                                                              value={optionsTextMap[field.id] !== undefined ? optionsTextMap[field.id] : (field.options || []).join(', ')}
                                                              onChange={(e) => {
                                                                const rawVal = e.target.value;
                                                                setOptionsTextMap(prev => ({ ...prev, [field.id]: rawVal }));
                                                                const opts = rawVal.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                                                handleUpdateField(container.id, field.id, { options: opts });
                                                              }}
                                                              placeholder="Contoh: Merah, Hijau, Biru"
                                                              className="h-8 text-sm"
                                                            />
                                                            <p className="text-[10px] text-slate-400 mt-1">Ketik pilihan lalu pisahkan dengan koma (,)</p>
                                                          </div>
                                                        )}
                                                      </div>

                                                      {(() => {
                                                        const isFieldProtected = field.id === 'field-customer-name' || field.id === 'field-product-list';
                                                        return (
                                                          <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            disabled={isFieldProtected}
                                                            onClick={() => handleDeleteField(container.id, field.id)}
                                                            className={isFieldProtected
                                                              ? "h-8 w-8 shrink-0 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50 sm:self-end sm:mb-0.5"
                                                              : "h-8 w-8 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 sm:self-end sm:mb-0.5"}
                                                            title={isFieldProtected ? "Field bawaan sistem (tidak dapat dihapus)" : "Hapus Field"}
                                                          >
                                                            <Trash2 className="h-4 w-4" />
                                                          </Button>
                                                        );
                                                      })()}
                                                    </>
                                                  )}
                                                </div>
                                              )}
                                            </Draggable>
                                          ))}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>

                                    {container.id !== 'container-products' && (
                                      <div className='px-4 pb-4'>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddField(container.id)}
                                          className="h-8 text-xs gap-1"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                          Tambah Field
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button size="sm" variant="outline" onClick={handleAddContainer}>
                      <Plus className="h-3.5 w-3.5" />
                      Tambah Grup Kontainer
                    </Button>

                    <Button size="sm" onClick={handleSaveFormCustomization}>
                      <Save className="h-3.5 w-3.5" />
                      Simpan Kustomisasi Form
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Item 3: Batas Waktu Pesanan */}
        <div className="transition-colors">
          <div className="p-4 sm:p-5 flex items-center justify-between gap-8">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isOrderDeadlineEnabled
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
              >
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Batas Waktu Pesanan
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Atur batas maksimal durasi waktu dari pesanan masuk hingga statusnya berubah (SLA pesanan).
                </p>
              </div>
            </div>

            {/* Switch Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <Toggle
                checked={isOrderDeadlineEnabled}
                onChange={(nextVal) => {
                  setIsOrderDeadlineEnabled(nextVal);
                  if (!nextVal) {
                    toast.info('Pengaturan Batas Waktu Pesanan Dinonaktifkan');
                  } else {
                    toast.success('Pengaturan Batas Waktu Pesanan Diaktifkan');
                  }
                }}
                showStatusBadge
                color="indigo"
              />
            </div>
          </div>

          {/* Accordion Body: Settings Fields */}
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isOrderDeadlineEnabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
          >
            <div className="overflow-hidden">
              <div className="px-5 pb-5 pt-1">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20 space-y-4">

                  {/* Field 1: Batas Waktu Pesanan Diproses */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div>
                      <h4 className="text-sm text-slate-900 dark:text-white">
                        Batas Waktu Pesanan Diproses
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Batas maksimal dari pesanan masuk hingga status <strong className="text-slate-700 dark:text-slate-300 font-semibold">Diproses (SPK Terbit)</strong>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-sm">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Hari</label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={deadlineProcessed.days}
                          onChange={(e) => setDeadlineProcessed(prev => ({ ...prev, days: e.target.value }))}
                          inputSize="sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Jam</label>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          placeholder="0"
                          value={deadlineProcessed.hours}
                          onChange={(e) => setDeadlineProcessed(prev => ({ ...prev, hours: e.target.value }))}
                          inputSize="sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Menit</label>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="0"
                          value={deadlineProcessed.minutes}
                          onChange={(e) => setDeadlineProcessed(prev => ({ ...prev, minutes: e.target.value }))}
                          inputSize="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field 2: Batas Waktu Pesanan Siap Kirim */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div>
                      <h4 className="text-sm text-slate-900 dark:text-white">
                        Batas Waktu Pesanan Siap Kirim
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Batas maksimal dari pesanan masuk hingga status <strong className="text-slate-700 dark:text-slate-300 font-semibold">Siap Kirim</strong>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-sm">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Hari</label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={deadlineReady.days}
                          onChange={(e) => setDeadlineReady(prev => ({ ...prev, days: e.target.value }))}
                          inputSize="sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Jam</label>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          placeholder="0"
                          value={deadlineReady.hours}
                          onChange={(e) => setDeadlineReady(prev => ({ ...prev, hours: e.target.value }))}
                          inputSize="sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Menit</label>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="0"
                          value={deadlineReady.minutes}
                          onChange={(e) => setDeadlineReady(prev => ({ ...prev, minutes: e.target.value }))}
                          inputSize="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field 3: Batas Waktu Pesanan Terkirim */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div>
                      <h4 className="text-sm text-slate-900 dark:text-white">
                        Batas Waktu Pesanan Terkirim
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Batas maksimal dari pesanan masuk hingga status <strong className="text-slate-700 dark:text-slate-300 font-semibold">Terkirim (Selesai)</strong>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-sm">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Hari</label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={deadlineShipped.days}
                          onChange={(e) => setDeadlineShipped(prev => ({ ...prev, days: e.target.value }))}
                          inputSize="sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Jam</label>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          placeholder="0"
                          value={deadlineShipped.hours}
                          onChange={(e) => setDeadlineShipped(prev => ({ ...prev, hours: e.target.value }))}
                          inputSize="sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Menit</label>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="0"
                          value={deadlineShipped.minutes}
                          onChange={(e) => setDeadlineShipped(prev => ({ ...prev, minutes: e.target.value }))}
                          inputSize="sm"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Item 4: Blokir Proses Pesanan saat stok kurang */}
        <div className="transition-colors">
          <div className="p-4 sm:p-5 flex items-center justify-between gap-8">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  strictSOStockCheck
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Blokir Proses Pesanan saat stok kurang
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Jika aktif, Sales Order tidak dapat diproses apabila stok bahan baku atau barang setengah jadi tidak mencukupi di gudang.
                </p>
              </div>
            </div>

            {/* Switch Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <Toggle
                checked={strictSOStockCheck}
                onChange={(nextVal) => {
                  setStrictSOStockCheck(nextVal);
                  toast.success(
                    'Konfigurasi Diperbarui',
                    nextVal
                      ? 'Proses pesanan akan diblokir jika stok kurang.'
                      : 'Pesanan dapat diproses secara dinamis.'
                  );
                }}
                showStatusBadge
                color="indigo"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Footer Action Area */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-100/50 dark:hover:bg-red-900/50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Ke Default
        </button>
      </div>
    </div>
  );
}
