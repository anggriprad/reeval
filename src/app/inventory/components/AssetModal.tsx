'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Checkbox } from '@/components/ui/Checkbox';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  companyAssetService,
  CompanyAssetItem,
  CreateCompanyAssetPayload,
  UpdateCompanyAssetPayload,
} from '@/services/company-asset.service';
import { AssetCategoryOption } from '@/services/asset-category.service';

interface BankAccountOption {
  id: string;
  name: string;
  balance?: number;
}

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editAsset: CompanyAssetItem | null;
  onSuccess: () => void;
  categoryOptions: AssetCategoryOption[];
  bankAccounts?: BankAccountOption[];
}

export function AssetModal({
  isOpen,
  onClose,
  editAsset,
  onSuccess,
  categoryOptions,
  bankAccounts = [],
}: AssetModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState<number | ''>('');
  const [usefulLifeMonths, setUsefulLifeMonths] = useState<number | ''>(60);
  const [salvageValue, setSalvageValue] = useState<number | ''>(0);
  const [status, setStatus] = useState<string>('ACTIVE');
  const [acquisitionType, setAcquisitionType] = useState<'EXISTING' | 'NEW_PURCHASE'>('EXISTING');
  const [cashAccountId, setCashAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [accumulatedServiceCost, setAccumulatedServiceCost] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      setIsSubmitting(false);
      return;
    }

    if (editAsset) {
      setName(editAsset.name || '');
      setCode(editAsset.code || '');
      setCategoryId(editAsset.category_id ? String(editAsset.category_id) : '');
      setPurchaseDate(editAsset.purchase_date ? editAsset.purchase_date.split('T')[0] : '');
      setPurchaseCost(editAsset.purchase_cost ?? '');
      setUsefulLifeMonths(editAsset.useful_life_months || (editAsset.useful_life_years ? editAsset.useful_life_years * 12 : 60));
      setSalvageValue(editAsset.salvage_value ?? 0);
      setStatus(editAsset.status || 'ACTIVE');
      setAcquisitionType(editAsset.acquisition_type === 'NEW_PURCHASE' ? 'NEW_PURCHASE' : 'EXISTING');
      setCashAccountId(editAsset.cash_account_id || '');
      setNotes(editAsset.notes || '');
      setAccumulatedServiceCost(editAsset.accumulated_service_cost || 0);
    } else {
      setName('');
      setCode('');
      setCategoryId(categoryOptions[0] ? String(categoryOptions[0].id) : '');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchaseCost('');
      setUsefulLifeMonths(60);
      setSalvageValue(0);
      setStatus('ACTIVE');
      setAcquisitionType('EXISTING');
      setCashAccountId(bankAccounts[0]?.id || '');
      setNotes('');
      setAccumulatedServiceCost(0);
    }
  }, [isOpen, editAsset, categoryOptions, bankAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Nama aset wajib diisi.');
      return;
    }
    if (!categoryId) {
      setErrorMessage('Pilih kategori aset.');
      return;
    }
    if (purchaseCost === '' || Number(purchaseCost) < 0) {
      setErrorMessage('Harga perolehan harus diisi dengan benar.');
      return;
    }
    if (salvageValue !== '' && Number(salvageValue) >= Number(purchaseCost)) {
      setErrorMessage('Nilai residu tidak boleh lebih besar atau sama dengan harga perolehan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const selectedCat = categoryOptions.find((c) => String(c.id) === categoryId);

      if (editAsset) {
        const payload: UpdateCompanyAssetPayload = {
          name: name.trim(),
          category_id: Number(categoryId),
          category: selectedCat?.name,
          purchase_date: purchaseDate || undefined,
          purchase_cost: Number(purchaseCost),
          useful_life_months: Number(usefulLifeMonths) || 12,
          useful_life_years: Math.max(1, Math.round((Number(usefulLifeMonths) || 12) / 12)),
          salvage_value: Number(salvageValue) || 0,
          status,
          notes: notes.trim() || undefined,
        };

        const res = await companyAssetService.updateAsset(editAsset.id, payload);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.message || 'Gagal memperbarui aset.');
        }
      } else {
        const payload: CreateCompanyAssetPayload = {
          name: name.trim(),
          category_id: Number(categoryId),
          category: selectedCat?.name,
          purchase_date: purchaseDate || undefined,
          purchase_cost: Number(purchaseCost),
          useful_life_months: Number(usefulLifeMonths) || 12,
          useful_life_years: Math.max(1, Math.round((Number(usefulLifeMonths) || 12) / 12)),
          salvage_value: Number(salvageValue) || 0,
          status,
          acquisition_type: acquisitionType,
          cash_account_id: acquisitionType === 'NEW_PURCHASE' ? cashAccountId : undefined,
          notes: notes.trim() || undefined,
        };

        const res = await companyAssetService.createAsset(payload);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.message || 'Gagal mendaftarkan aset baru.');
        }
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem saat menyimpan aset.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editAsset ? 'Edit Aset Perusahaan' : 'Register Aset Baru'}
      size="lg"
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
            Simpan
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-2">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {/* Kode Aset: Manual input dihilangkan saat create baru karena sistem auto-code */}


          <Select
            label="Kategori"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoryOptions.map((cat) => ({
              value: String(cat.id),
              label: cat.name,
            }))}
            placeholder="Pilih Kategori Aset"
          />
        </div>

        <div>
          <Input
            label="Nama Aset"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Mesin Cutting CNC Wood Router"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Tanggal Perolehan"
            required
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
          <Select
            label="Status"
            required
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'ACTIVE', label: 'Aktif' },
              { value: 'IN_MAINTENANCE', label: 'Dalam Pemeliharaan' },
              { value: 'BROKEN', label: 'Rusak' },
              { value: 'DISPOSED', label: 'Dijual' },
              { value: 'SCRAPPED', label: 'Afkir / Scrap' },
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <CurrencyInput
            label="Harga Perolehan (Rp)"
            required
            value={purchaseCost === '' ? 0 : purchaseCost}
            onChange={(val) => setPurchaseCost(val)}
          />
          <Input
            type="number"
            label="Masa Manfaat (Bulan)"
            required
            value={usefulLifeMonths}
            onChange={(e) =>
              setUsefulLifeMonths(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="60"
          />
          <CurrencyInput
            label="Nilai Sisa / Residu (Rp)"
            value={salvageValue === '' ? 0 : salvageValue}
            onChange={(val) => setSalvageValue(val)}
          />
        </div>

        {editAsset && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Total Biaya Servis (Rp)
            </label>
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {formatCurrency(accumulatedServiceCost)}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Nilai dihitung otomatis dari Riwayat Pemeliharaan & Servis aset.
            </p>
          </div>
        )}

        {/* Mode Perolehan: Checkbox Pembelian Baru & Sumber Dana */}
        <div className="space-y-3 border-t border-slate-100 pt-2 dark:border-slate-800">
          <Checkbox
            id="checkbox-new-purchase-modal"
            label="Pembelian Baru"
            checked={acquisitionType === 'NEW_PURCHASE'}
            disabled={Boolean(editAsset)}
            onChange={(checked) => {
              setAcquisitionType(checked ? 'NEW_PURCHASE' : 'EXISTING');
              if (checked && !cashAccountId && bankAccounts.length > 0) {
                setCashAccountId(bankAccounts[0].id);
              }
            }}
          />
          {acquisitionType === 'NEW_PURCHASE' && (
            <Select
              label="Sumber Dana"
              required
              value={cashAccountId}
              onChange={(e) => setCashAccountId(e.target.value)}
              options={bankAccounts.map((b) => ({
                value: b.id,
                label: `${b.name}${b.balance !== undefined ? ` (${formatCurrency(b.balance)})` : ''}`,
              }))}
              placeholder="Pilih Sumber Dana"
            />
          )}
        </div>
      </form>
    </Modal>
  );
}
