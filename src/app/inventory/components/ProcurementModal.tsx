'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/context/ToastContext';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import {
  procurementService,
  CreateProcurementRequest,
} from '@/services/procurement.service';
import {
  materialService,
  MaterialOption,
} from '@/services/material.service';
import { AlertTriangle, Plus, Trash2, Check, X, ShoppingCart } from 'lucide-react';

interface ProcurementItemDraft {
  material_id: number;
  material_name: string;
  unit: string;
  unit_cost: number;
  qty: number;
}

interface ProcurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMaterialId?: string | number | null;
  onSuccess: () => void;
}

export function ProcurementModal({
  isOpen,
  onClose,
  preselectedMaterialId,
  onSuccess,
}: ProcurementModalProps) {
  const { toast } = useToast();
  const { bankAccounts = [] } = useApp();

  const [purchaseType, setPurchaseType] = useState<'PO' | 'DIRECT'>('PO');
  const [supplier, setSupplier] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [additionalCost, setAdditionalCost] = useState(0);
  const [items, setItems] = useState<ProcurementItemDraft[]>([]);

  // Picker item baru
  const [selectedMatId, setSelectedMatId] = useState<string>('');
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [showAddItemRow, setShowAddItemRow] = useState(false);

  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMaterialOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const res = await materialService.getMaterialOptions();
      if (res.data) {
        // Hanya bahan baku non sub-assembly
        setMaterialOptions(res.data.filter((m) => !m.is_sub_assembly));
      }
    } catch (err: any) {
      console.error('Failed to fetch material options:', err);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMaterialOptions();
      setPurchaseType('PO');
      setSupplier('');
      setSelectedBankAccountId(bankAccounts[0]?.id ? String(bankAccounts[0].id) : '');
      setAdditionalCost(0);
      setItems([]);
      setSelectedMatId('');
      setSelectedQty(1);
      setErrorMsg('');
      setShowAddItemRow(false);
    }
  }, [isOpen, fetchMaterialOptions, bankAccounts]);

  // Pre-fill ketika preselectedMaterialId diberikan
  useEffect(() => {
    if (isOpen && preselectedMaterialId && materialOptions.length > 0) {
      const targetMat = materialOptions.find(
        (m) => String(m.id) === String(preselectedMaterialId)
      );
      if (targetMat) {
        setItems([
          {
            material_id: targetMat.id,
            material_name: targetMat.name,
            unit: targetMat.unit || 'unit',
            unit_cost: targetMat.unit_cost || 0,
            qty: 1,
          },
        ]);
        setShowAddItemRow(false);
      }
    } else if (isOpen && !preselectedMaterialId) {
      setShowAddItemRow(true);
    }
  }, [isOpen, preselectedMaterialId, materialOptions]);

  const handleAddItem = () => {
    if (!selectedMatId || selectedQty <= 0) return;
    const target = materialOptions.find((m) => String(m.id) === String(selectedMatId));
    if (!target) return;

    // Check if already in items
    const existingIndex = items.findIndex((i) => i.material_id === target.id);
    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, qty: item.qty + selectedQty } : item
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
    setSelectedQty(1);
    setShowAddItemRow(false);
    setErrorMsg('');
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, qty: newQty } : item))
    );
  };

  const itemsTotal = useMemo(() => {
    return items.reduce((acc, i) => acc + (i.qty || 0) * (i.unit_cost || 0), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return itemsTotal + (purchaseType === 'DIRECT' ? Number(additionalCost || 0) : 0);
  }, [itemsTotal, purchaseType, additionalCost]);

  const handleSubmit = async () => {
    setErrorMsg('');
    const supplierTrimmed = supplier.trim();

    if (!supplierTrimmed) {
      setErrorMsg('Nama Vendor / Supplier wajib diisi.');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Daftar item pengadaan masih kosong. Silakan tambahkan minimal 1 item.');
      return;
    }

    if (items.some((i) => !i.qty || Number(i.qty) <= 0)) {
      setErrorMsg('Kuantitas setiap item pengadaan harus lebih besar dari 0.');
      return;
    }

    if (purchaseType === 'DIRECT' && !selectedBankAccountId) {
      setErrorMsg('Kas / Rekening Pembayaran wajib dipilih untuk Pembelian Langsung.');
      return;
    }

    const payload: CreateProcurementRequest = {
      supplier: supplierTrimmed,
      purchase_type: purchaseType,
      bank_account_id: purchaseType === 'DIRECT' ? Number(selectedBankAccountId) : undefined,
      additional_cost: purchaseType === 'DIRECT' ? Number(additionalCost || 0) : 0,
      items: items.map((i) => ({
        material_id: i.material_id,
        qty: Number(i.qty),
        unit_cost: Number(i.unit_cost || 0),
      })),
    };

    setIsSubmitting(true);
    try {
      const res = await procurementService.createProcurement(payload);
      if (res.data) {
        toast.success(
          purchaseType === 'DIRECT' ? 'Pembelian Langsung Berhasil Dibuat' : 'Pengadaan Berhasil Diajukan',
          `Dokumen ${res.data.po_number} telah berhasil diterbitkan.`
        );
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to create procurement:', err);
      setErrorMsg(err?.response?.data?.message || err?.message || 'Gagal menyimpan pengadaan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Form Pengadaan Bahan Baku"
      size="lg"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
          >
            <Plus className="h-4 w-4 mr-1" />
            {isSubmitting ? 'Menyimpan...' : 'Buat Pengadaan'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tipe Pembelian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setPurchaseType('PO')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
              purchaseType === 'PO'
                ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 ring-1 ring-indigo-600/30'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                name="purchaseTypeOption"
                value="PO"
                checked={purchaseType === 'PO'}
                onChange={() => setPurchaseType('PO')}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Purchase Order (PO)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
              Alur pemesanan standar dengan persetujuan dan penerimaan barang di gudang.
            </p>
          </div>

          <div
            onClick={() => setPurchaseType('DIRECT')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
              purchaseType === 'DIRECT'
                ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 ring-1 ring-indigo-600/30'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                name="purchaseTypeOption"
                value="DIRECT"
                checked={purchaseType === 'DIRECT'}
                onChange={() => setPurchaseType('DIRECT')}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Pembelian Langsung (Tunai)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
              Bayar kas/bank langsung & kuantitas stok otomatis bertambah seketika.
            </p>
          </div>
        </div>

        {/* Form Inputs */}
        <Input
          label="Nama Vendor / Toko"
          required
          placeholder="Contoh: CV Sumber Kayu / PT Multi Perkasa"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
        />

        {purchaseType === 'DIRECT' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kas / Rekening Pembayaran <span className="text-red-500 font-bold">*</span>
              </label>
              <Select
                value={selectedBankAccountId}
                onChange={(e) => setSelectedBankAccountId(e.target.value)}
                options={bankAccounts.map((b) => ({
                  value: String(b.id),
                  label: `${b.name} (${formatCurrency(b.balance)})`,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Biaya Ekspedisi / Ongkir Tambahan (Opsional)
              </label>
              <CurrencyInput
                value={additionalCost}
                onChange={(val) => setAdditionalCost(typeof val === 'number' ? val : 0)}
                placeholder="Rp 0"
              />
            </div>
          </div>
        )}

        {/* Item List */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Daftar Item Bahan Baku <span className="text-red-500 font-bold">*</span>
          </label>

          {items.length === 0 ? (
            <EmptyState
              title="Daftar Item Masih Kosong"
              description="Belum ada bahan baku yang ditambahkan ke daftar pengadaan."
              variant="plain"
            />
          ) : (
            <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              {items.map((item, idx) => (
                <div key={item.material_id} className="flex items-center justify-between gap-3 pt-2 first:pt-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {item.material_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatCurrency(item.unit_cost)} / {item.unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleUpdateItemQty(idx, val);
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-10 truncate">{item.unit}</span>
                    <div className="font-mono text-xs font-semibold text-right min-w-[90px] text-slate-900 dark:text-white">
                      {formatCurrency(item.qty * item.unit_cost)}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-400 hover:text-red-500 p-1 h-8 w-8"
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
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2">
              <div className="flex-1 min-w-[200px]">
                <Select
                  placeholder="Pilih Bahan Baku..."
                  value={selectedMatId}
                  onChange={(e) => setSelectedMatId(e.target.value)}
                  options={materialOptions.map((m) => ({
                    value: String(m.id),
                    label: `${m.name} (${formatCurrency(m.unit_cost)} / ${m.unit})`,
                  }))}
                />
              </div>
              <div className="w-24 shrink-0">
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={selectedQty || ''}
                  onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleAddItem}
                  disabled={!selectedMatId || selectedQty <= 0}
                  className="h-9 w-9 p-0"
                  title="Tambah"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedMatId('');
                    setSelectedQty(1);
                    if (items.length > 0) setShowAddItemRow(false);
                  }}
                  className="h-9 w-9 p-0"
                  title="Batal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2 flex justify-between items-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAddItemRow(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Item Lain
              </Button>
              <div className="text-right text-xs">
                <span className="text-slate-500 mr-2">Total Estimasi:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
