'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/context/ToastContext';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { canViewFinance } from '@/lib/roles';
import type { BankAccount } from '@/lib/types';
import {
  bankAccountService,
  mapBankAccountOptionToBankAccount,
} from '@/services/bank-account.service';
import {
  procurementService,
  CreateProcurementRequest,
  ProcessPORequest,
  PurchaseOrderResponse,
} from '@/services/procurement.service';
import {
  materialService,
  MaterialOption,
} from '@/services/material.service';
import { AlertTriangle, Plus, Trash2, Check, X } from 'lucide-react';

interface ProcurementItemDraft {
  material_id: number;
  material_name: string;
  unit: string;
  unit_cost: number;
  qty: number | string;
}

interface ProcurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMaterialId?: string | number | null;
  draftPO?: PurchaseOrderResponse | null;
  onSuccess: () => void;
}

const parseQty = (qty: number | string | undefined): number => {
  if (typeof qty === 'number') return isNaN(qty) ? 0 : qty;
  if (!qty) return 0;
  const parsed = parseFloat(String(qty).replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};

const purchaseTypeOptions = [
  { key: 'PO' as const, label: 'Purchase Order (PO)' },
  { key: 'DIRECT' as const, label: 'Pembelian Langsung (Cash)' },
];

export function ProcurementModal({
  isOpen,
  onClose,
  preselectedMaterialId,
  draftPO = null,
  onSuccess,
}: ProcurementModalProps) {
  const { toast } = useToast();
  const { materials = [], currentUser } = useApp();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const canShowBankBalance = canViewFinance(currentUser.role);
  const isExecuteDraftMode = Boolean(draftPO);
  const isRequestOnlyMode = false;

  const [purchaseType, setPurchaseType] = useState<'PO' | 'DIRECT'>('PO');
  const [supplier, setSupplier] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [additionalCost, setAdditionalCost] = useState(0);
  const [items, setItems] = useState<ProcurementItemDraft[]>([]);

  // Picker item baru (Khusus mode Create)
  const [selectedMatId, setSelectedMatId] = useState<string>('');
  const [selectedQty, setSelectedQty] = useState<string>('');
  const [showAddItemRow, setShowAddItemRow] = useState(false);

  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMaterialOptions = useCallback(async () => {
    try {
      const res = await materialService.getMaterialOptions();
      if (res.data) {
        const filtered = res.data.filter((m) => !m.is_sub_assembly);
        setMaterialOptions(filtered);
        // Jika ada item pada draft yang unit_cost-nya masih 0, isi otomatis dari HPP master material
        setItems((prev) =>
          prev.map((item) => {
            if (item.unit_cost && item.unit_cost > 0) return item;
            const match = filtered.find((m) => String(m.id) === String(item.material_id));
            return match && match.unit_cost > 0
              ? { ...item, unit_cost: match.unit_cost, unit: item.unit || match.unit || 'unit' }
              : item;
          })
        );
      }
    } catch (err: unknown) {
      console.error('Failed to fetch material options:', err);
    }
  }, []);

  const fetchBankAccountOptions = useCallback(async () => {
    try {
      const res = await bankAccountService.getOptions();
      if (Array.isArray(res.data)) {
        const mapped = res.data.map(mapBankAccountOptionToBankAccount);
        setBankAccounts(mapped);
        setSelectedBankAccountId((prev) =>
          prev && mapped.some((b) => String(b.id) === prev)
            ? prev
            : mapped[0]?.id
              ? String(mapped[0].id)
              : ''
        );
      }
    } catch (err: unknown) {
      console.error('Failed to fetch bank account options:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMaterialOptions();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBankAccountOptions();
      setSelectedBankAccountId('');
      setSelectedMatId('');
      setSelectedQty('');
      setErrorMsg('');

      if (draftPO) {
        setPurchaseType((draftPO.purchase_type as 'PO' | 'DIRECT') || 'PO');
        setSupplier(draftPO.supplier && draftPO.supplier !== '-' ? draftPO.supplier : '');
        setAdditionalCost(draftPO.additional_cost || 0);
        setItems(
          (draftPO.items || []).map((it) => {
            const appMat = materials.find((m) => String(m.id) === String(it.material_id));
            const fallbackCost =
              it.unit_cost && it.unit_cost > 0 ? it.unit_cost : appMat?.unitCost || 0;
            return {
              material_id: it.material_id,
              material_name: it.material_name,
              unit: it.unit || appMat?.unit || 'unit',
              unit_cost: fallbackCost,
              qty: it.qty,
            };
          })
        );
        setShowAddItemRow(false);
      } else {
        setPurchaseType('PO');
        setSupplier('');
        setAdditionalCost(0);
        setItems([]);
        setShowAddItemRow(!preselectedMaterialId);
      }
    }
  }, [isOpen, fetchMaterialOptions, fetchBankAccountOptions, draftPO, preselectedMaterialId, materials]);

  // Pre-fill ketika preselectedMaterialId diberikan pada mode Create
  useEffect(() => {
    if (isOpen && !draftPO && preselectedMaterialId && materialOptions.length > 0) {
      const targetMat = materialOptions.find(
        (m) => String(m.id) === String(preselectedMaterialId)
      );
      if (targetMat) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems([
          {
            material_id: targetMat.id,
            material_name: targetMat.name,
            unit: targetMat.unit || 'unit',
            unit_cost: targetMat.unit_cost || 0,
            qty: '1',
          },
        ]);
        setShowAddItemRow(false);
      }
    }
  }, [isOpen, draftPO, preselectedMaterialId, materialOptions]);

  const handleAddItem = () => {
    const numQty = parseQty(selectedQty);
    if (!selectedMatId || numQty <= 0) return;
    const target = materialOptions.find((m) => String(m.id) === String(selectedMatId));
    if (!target) return;

    const existingIndex = items.findIndex((i) => i.material_id === target.id);
    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, qty: parseQty(item.qty) + numQty } : item
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          material_id: target.id,
          material_name: target.name,
          unit: target.unit || 'unit',
          unit_cost: target.unit_cost || 0,
          qty: selectedQty,
        },
      ]);
    }

    setSelectedMatId('');
    setSelectedQty('');
    setShowAddItemRow(false);
    setErrorMsg('');
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemQty = (index: number, rawVal: string) => {
    const sanitized = rawVal.replace(/[^0-9.,]/g, '');
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, qty: sanitized } : item))
    );
  };

  const handleUpdateItemCost = (index: number, newCost: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unit_cost: newCost } : item))
    );
  };

  const itemsTotal = useMemo(() => {
    return items.reduce((acc, i) => acc + (parseQty(i.qty) || 0) * (i.unit_cost || 0), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return itemsTotal + Number(additionalCost || 0);
  }, [itemsTotal, additionalCost]);

  const handleSubmit = async () => {
    setErrorMsg('');
    const supplierTrimmed = supplier.trim();

    if (!supplierTrimmed) {
      setErrorMsg('Nama Vendor / Toko wajib diisi.');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Daftar item pengadaan masih kosong. Silakan tambahkan minimal 1 item.');
      return;
    }

    if (items.some((i) => parseQty(i.qty) <= 0)) {
      setErrorMsg('Kuantitas setiap item pengadaan harus lebih besar dari 0.');
      return;
    }

    if (items.some((i) => Number(i.unit_cost || 0) <= 0)) {
      setErrorMsg('Harga satuan setiap item harus lebih besar dari 0.');
      return;
    }

    if (purchaseType === 'DIRECT' && !selectedBankAccountId) {
      setErrorMsg('Rekening Pembayaran wajib dipilih untuk Pembelian Langsung.');
      return;
    }

    const processPayload: ProcessPORequest = {
      supplier: supplierTrimmed,
      purchase_type: purchaseType,
      bank_account_id:
        purchaseType === 'DIRECT' && selectedBankAccountId
          ? Number(selectedBankAccountId)
          : undefined,
      additional_cost: Number(additionalCost || 0),
      items: items.map((i) => ({
        material_id: i.material_id,
        qty: parseQty(i.qty),
        unit_cost: Number(i.unit_cost || 0),
      })),
    };

    if (isExecuteDraftMode && draftPO) {
      setIsSubmitting(true);
      try {
        await procurementService.orderPO(draftPO.id, processPayload);
        toast.success(
          'Pengadaan Diproses',
          `Pengadaan ${draftPO.po_number} berhasil disetujui dan diproses.`
        );
        onSuccess();
        onClose();
      } catch (err: unknown) {
        console.error('Failed to process procurement:', err);
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        setErrorMsg(
          error.response?.data?.message || error.message || 'Gagal memproses pengadaan.'
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Mode Buat Pengadaan: langsung eksekusi ke order (bypass draft)
    setIsSubmitting(true);
    try {
      const res = await procurementService.createProcurement({
        supplier: supplierTrimmed,
        purchase_type: purchaseType,
        bank_account_id: processPayload.bank_account_id,
        additional_cost: processPayload.additional_cost,
        items: processPayload.items,
      });

      if (res.data) {
        if (res.data.status === 'DRAFT') {
          await procurementService.orderPO(res.data.id, processPayload);
        }
        toast.success(
          'Pengadaan Diproses',
          `Pengadaan ${res.data.po_number} berhasil dibuat dan dipesan.`
        );
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      console.error('Failed to create and process procurement:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(
        error.response?.data?.message || error.message || 'Gagal memproses pengadaan.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = isExecuteDraftMode ? 'Proses Pengadaan' : 'Buat Pengadaan';

  const submitLabel = isSubmitting
    ? 'Menyimpan...'
    : isExecuteDraftMode
      ? 'Setujui & Pesan'
      : 'Buat Pengadaan';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      actions={
        <div className='flex justify-between items-center w-full'>
          <div className='flex flex-col'>
            <span className='text-xs text-slate-600 dark:text-slate-400'>Total Pengadaan</span>
            <span className='font-semibold text-slate-800 dark:text-slate-200'>{formatCurrency(grandTotal)}</span>
          </div>
          <div className='flex gap-2'>
            {!isExecuteDraftMode && (
              <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
            >
              {isExecuteDraftMode && (
                <Check className="h-4 w-4 mr-1" />
              )}
              {submitLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isExecuteDraftMode ? (
          /* ============================================================ */
          /* MODAL PROSES PENGADAAN (Fase 2 Draft Execution)              */
          /* ============================================================ */
          <>
            <SegmentedControl<'PO' | 'DIRECT'>
              options={purchaseTypeOptions}
              value={purchaseType}
              onChange={setPurchaseType}
              fullWidth
            />

            <div className="space-y-3 pt-2">
              <label className="block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 md:mb-1.5">
                Daftar Item
              </label>
              <div className='border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700'>
                {items.map((item, idx) => (
                  <div
                    key={item.material_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0 flex-1 ">
                      <span className="text-sm text-slate-900 dark:text-white truncate block">
                        {item.material_name}
                      </span>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                      <div className="w-30 shrink-0">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={item.qty}
                          onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                          placeholder="qty"
                          suffix={item.unit}
                          className="font-medium"
                        />
                      </div>

                      <div className="w-36 shrink-0">
                        <CurrencyInput
                          value={item.unit_cost}
                          onChange={(val) =>
                            handleUpdateItemCost(
                              idx,
                              typeof val === 'number' ? val : 0
                            )
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2'>
              <Input
                label="Nama Vendor / Toko"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
              <CurrencyInput
                label='Biaya Tambahan'
                value={additionalCost}
                onChange={(val) => setAdditionalCost(typeof val === 'number' ? val : 0)}
                placeholder="0"
              />
            </div>
            {purchaseType === 'DIRECT' && (
              <div>
                <Select
                  required
                  label='Rekening Pembayaran'
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  options={bankAccounts.map((b) => ({
                    value: String(b.id),
                    label: canShowBankBalance
                      ? `${b.name} (${formatCurrency(b.balance)})`
                      : b.name,
                  }))}
                />
              </div>
            )}
          </>
        ) : (
          /* ============================================================ */
          /* MODAL BUAT PENGADAAN (Create Baru: Multi-Item)               */
          /* ============================================================ */
          <>
            <SegmentedControl<'PO' | 'DIRECT'>
              options={purchaseTypeOptions}
              value={purchaseType}
              onChange={setPurchaseType}
              fullWidth
            />
            <div className="space-y-3 py-2">
              <label className="block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
                Daftar Item
              </label>
              {items.length !== 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700">
                  {items.map((item, idx) => (
                    <div
                      key={item.material_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-slate-900 dark:text-white truncate block">
                          {item.material_name}
                        </span>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                        <div className="w-30 shrink-0">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.qty}
                            onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                            placeholder="qty"
                            suffix={item.unit}
                            className="font-medium"
                          />
                        </div>

                        {!isRequestOnlyMode && (
                          <div className="w-36 shrink-0">
                            <CurrencyInput
                              value={item.unit_cost}
                              onChange={(val) =>
                                handleUpdateItemCost(
                                  idx,
                                  typeof val === 'number' ? val : 0
                                )
                              }
                              placeholder="0"
                            />
                          </div>
                        )}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-500 shrink-0"
                          title="Hapus Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showAddItemRow ? (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      placeholder="Pilih Bahan Baku"
                      value={selectedMatId}
                      onChange={(e) => setSelectedMatId(e.target.value)}
                      options={materialOptions.map((m) => ({
                        value: String(m.id),
                        label: isRequestOnlyMode
                          ? `${m.name} (${m.unit})`
                          : `${m.name} (${formatCurrency(m.unit_cost)} / ${m.unit})`,
                      }))}
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Qty"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(e.target.value.replace(/[^0-9.,]/g, ''))}
                      className="font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="primary"
                      onClick={handleAddItem}
                      disabled={!selectedMatId || parseQty(selectedQty) <= 0}
                      className="shrink-0"
                      title="Tambah"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedMatId('');
                        setSelectedQty('');
                        if (items.length > 0) setShowAddItemRow(false);
                      }}
                      className="shrink-0"
                      title="Batal"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className='w-full'
                  onClick={() => setShowAddItemRow(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Tambah Item Lain
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nama Vendor / Toko"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />

              <div>
                <label className="block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 md:mb-1.5">
                  Biaya Tambahan
                </label>
                <CurrencyInput
                  value={additionalCost}
                  onChange={(val) => setAdditionalCost(typeof val === 'number' ? val : 0)}
                  placeholder="Rp 0"
                />
              </div>
            </div>

            {purchaseType === 'DIRECT' && (
              <div>
                <label className="block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 md:mb-1.5">
                  Rekening Pembayaran <span className="text-red-500 font-bold">*</span>
                </label>
                <Select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  options={bankAccounts.map((b) => ({
                    value: String(b.id),
                    label: canShowBankBalance
                      ? `${b.name} (${formatCurrency(b.balance)})`
                      : b.name,
                  }))}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
