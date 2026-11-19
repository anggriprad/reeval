'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Checkbox } from '@/components/ui/Checkbox';
import { formatCurrency } from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import {
  companyAssetService,
  type CompanyAssetDetail,
} from '@/services/company-asset.service';
import type { AssetCategoryOption } from '@/services/asset-category.service';
import { useToast } from '@/context/ToastContext';
import { AlertTriangle } from 'lucide-react';

interface AssetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: CompanyAssetDetail;
  usefulMonths: number;
  categoryOptions: AssetCategoryOption[];
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

export function AssetEditModal({
  isOpen,
  onClose,
  asset,
  usefulMonths,
  categoryOptions,
  bankAccounts,
  onSuccess,
}: AssetEditModalProps) {
  const { toast } = useToast();

  const initialCatName = asset.category_name || asset.category || '';
  const initialMatchedCat = asset.category_id
    ? categoryOptions.find((c) => c.id === asset.category_id)
    : categoryOptions.find((c) => c.name.toLowerCase() === initialCatName.toLowerCase());

  const [astName, setAstName] = useState(asset.name || '');
  const [astCategoryId, setAstCategoryId] = useState<string>(
    asset.category_id
      ? String(asset.category_id)
      : initialMatchedCat
        ? String(initialMatchedCat.id)
        : ''
  );
  const [astCategoryName, setAstCategoryName] = useState(initialCatName);
  const [astPurchaseDate, setAstPurchaseDate] = useState(
    asset.purchase_date ? asset.purchase_date.split('T')[0] : ''
  );
  const [astPurchaseCost, setAstPurchaseCost] = useState<number | ''>(asset.purchase_cost);
  const [astUsefulLifeMonths, setAstUsefulLifeMonths] = useState<number | ''>(usefulMonths);
  const [astStatus, setAstStatus] = useState<string>(asset.status || 'ACTIVE');
  const [editError, setEditError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!astName.trim()) {
      setEditError('Nama Aset wajib diisi.');
      return;
    }
    const cost = Number(astPurchaseCost) || 0;
    const months = Number(astUsefulLifeMonths) || 0;
    if (cost <= 0) {
      setEditError('Harga perolehan harus lebih besar dari 0.');
      return;
    }
    if (months <= 0) {
      setEditError('Masa manfaat harus lebih besar dari 0 bulan.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditError('');

      const matchedCat = categoryOptions.find(
        (c) => String(c.id) === String(astCategoryId) || c.name === astCategoryName
      );

      await companyAssetService.updateAsset(asset.id, {
        name: astName.trim(),
        category_id: matchedCat ? matchedCat.id : (astCategoryId ? Number(astCategoryId) : undefined),
        category: matchedCat ? matchedCat.name : astCategoryName,
        purchase_date: astPurchaseDate,
        purchase_cost: cost,
        useful_life_months: months,
        useful_life_years: Math.max(1, Math.round(months / 12)),
        status: astStatus,
      });

      toast.success('Aset Diperbarui', `Data aset "${astName}" berhasil disimpan.`);
      onClose();
      onSuccess();
    } catch (err: unknown) {
      setEditError(getErrorMessage(err, 'Gagal menyimpan perubahan aset.'));
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Aset"
      size="lg"
      actions={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmittingEdit}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSaveEdit}
            disabled={isSubmittingEdit}
          >
            {isSubmittingEdit ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSaveEdit} className="space-y-4 pb-2">
        {editError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kode Aset"
            required
            value={asset.code}
            disabled
          />
          <Select
            label="Kategori"
            required
            value={astCategoryId || astCategoryName}
            onChange={(e) => {
              const val = e.target.value;
              setAstCategoryId(val);
              const opt = categoryOptions.find((c) => String(c.id) === val);
              if (opt) setAstCategoryName(opt.name);
            }}
            options={categoryOptions.map((c) => ({
              value: String(c.id),
              label: c.name,
            }))}
          />
        </div>

        <div>
          <Input
            label="Nama Aset"
            required
            value={astName}
            onChange={(e) => setAstName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Tanggal Perolehan"
            required
            value={astPurchaseDate}
            onChange={(e) => setAstPurchaseDate(e.target.value)}
          />
          <Select
            label="Status"
            required
            value={astStatus}
            onChange={(e) => setAstStatus(e.target.value)}
            options={[
              { value: 'ACTIVE', label: 'Aktif' },
              { value: 'IN_MAINTENANCE', label: 'Dalam Pemeliharaan' },
              { value: 'BROKEN', label: 'Rusak' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput
            label="Harga Perolehan (Rp)"
            required
            value={astPurchaseCost}
            onChange={(val) => setAstPurchaseCost(val)}
          />
          <Input
            type="number"
            label="Masa Manfaat (Bulan)"
            required
            value={astUsefulLifeMonths}
            onChange={(e) =>
              setAstUsefulLifeMonths(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        </div>

        {/* Mode Perolehan Info di Paling Bawah */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <Checkbox
            id="checkbox-edit-new-purchase"
            label="Pembelian Baru"
            checked={asset.acquisition_type === 'NEW_PURCHASE'}
            disabled
          />

          {asset.acquisition_type === 'NEW_PURCHASE' && (
            <Select
              label="Sumber Dana"
              value={asset.cash_account_id || ''}
              options={bankAccounts.map((b) => ({
                value: b.id,
                label: `${b.name} (${formatCurrency(b.balance)})`,
              }))}
              disabled
            />
          )}
        </div>
      </form>
    </Modal>
  );
}
