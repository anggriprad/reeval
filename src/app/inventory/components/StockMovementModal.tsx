'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/context/ToastContext';
import {
  stockMovementService,
  CreateStockMovementPayload,
} from '@/services/stock-movement.service';
import {
  materialService,
  MaterialOption,
} from '@/services/material.service';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedMaterialId?: number | string | null;
}

export function StockMovementModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedMaterialId,
}: StockMovementModalProps) {
  const { toast } = useToast();

  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [selectedMatId, setSelectedMatId] = useState<string>('');
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [qty, setQty] = useState<string>('1');
  const [reference, setReference] = useState<string>('');
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const res = await materialService.getMaterialOptions();
      if (res.data) {
        setMaterials(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch material options:', err);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
      setSelectedMatId(preselectedMaterialId ? String(preselectedMaterialId) : '');
      setType('IN');
      setQty('1');
      setReference('');
      setErrorMsg('');
    }
  }, [isOpen, fetchOptions, preselectedMaterialId]);

  const selectedMaterial = materials.find((m) => String(m.id) === String(selectedMatId));

  const handleSubmit = async () => {
    setErrorMsg('');

    if (!selectedMatId) {
      setErrorMsg('Pilih bahan baku yang akan disesuaikan.');
      return;
    }

    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg('Kuantitas penyesuaian harus lebih besar dari 0.');
      return;
    }

    const payload: CreateStockMovementPayload = {
      material_id: Number(selectedMatId),
      type,
      qty: qtyNum,
      reference: reference.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const res = await stockMovementService.recordStockMovement(payload);
      if (res.data) {
        toast.success(
          'Mutasi Stok Berhasil Dicatat',
          `Penyesuaian stok untuk ${selectedMaterial?.name || 'bahan baku'} berhasil disimpan.`
        );
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to record stock movement:', err);
      setErrorMsg(
        err?.response?.data?.message || err?.message || 'Gagal mencatat mutasi stok.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Penyesuaian Stok"
      size="md"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedMatId}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
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

        {/* Jenis Penyesuaian */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Jenis Penyesuaian Stok <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setType('IN')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                type === 'IN'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-emerald-600/30'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 hover:border-slate-300'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Masuk (Penambahan)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Koreksi lebih / retur fisik
                </div>
              </div>
            </div>

            <div
              onClick={() => setType('OUT')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                type === 'OUT'
                  ? 'border-red-600 bg-red-50/50 dark:border-red-500 dark:bg-red-950/30 ring-1 ring-red-600/30'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 hover:border-slate-300'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Keluar (Pengurangan)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Koreksi kurang / rusak / susut
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pilih Material */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Bahan Baku <span className="text-red-500 font-bold">*</span>
          </label>
          <Select
            placeholder={isLoadingOptions ? 'Memuat bahan...' : 'Pilih Bahan Baku...'}
            value={selectedMatId}
            onChange={(e) => setSelectedMatId(e.target.value)}
            options={materials.map((m) => ({
              value: String(m.id),
              label: `${m.code ? `[${m.code}] ` : ''}${m.name} (${m.unit || 'unit'})`,
            }))}
          />
        </div>

        {/* Kuantitas */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Kuantitas Mutasi <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="any"
              min={0.01}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="1"
            />
            {selectedMaterial?.unit && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-[40px]">
                {selectedMaterial.unit}
              </span>
            )}
          </div>
        </div>

        {/* Keterangan / Referensi */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Keterangan / Alasan Mutasi (Opsional)
          </label>
          <Input
            placeholder="Contoh: Koreksi stok opname rak A / Penyesuaian susut kayu"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Nomor referensi akan digenerate otomatis jika dikosongkan.
          </span>
        </div>
      </div>
    </Modal>
  );
}
