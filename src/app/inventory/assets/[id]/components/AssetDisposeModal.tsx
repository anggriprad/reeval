'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import {
  companyAssetService,
  type CompanyAssetDetail,
} from '@/services/company-asset.service';
import { useToast } from '@/context/ToastContext';

interface AssetDisposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: CompanyAssetDetail;
  bankAccounts: BankAccount[];
  onSuccess: () => Promise<void> | void;
}

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

export function AssetDisposeModal({
  isOpen,
  onClose,
  asset,
  bankAccounts,
  onSuccess,
}: AssetDisposeModalProps) {
  const { toast } = useToast();

  const [disposalType, setDisposalType] = useState<'SOLD' | 'SCRAPPED'>('SOLD');
  const [disposalDate, setDisposalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [disposalSaleAmount, setDisposalSaleAmount] = useState<number | ''>('');
  const [disposalBankAccountId, setDisposalBankAccountId] = useState(
    bankAccounts[0]?.id ? String(bankAccounts[0].id) : ''
  );
  const [disposalNotes, setDisposalNotes] = useState('');
  const [disposalError, setDisposalError] = useState('');
  const [isSubmittingDispose, setIsSubmittingDispose] = useState(false);

  const handleConfirmDispose = async (e: React.FormEvent) => {
    e.preventDefault();
    const saleAmount = disposalType === 'SOLD' ? Number(disposalSaleAmount) || 0 : 0;
    if (disposalType === 'SOLD' && saleAmount <= 0) {
      setDisposalError('Harga jual aset wajib lebih dari 0 untuk tipe Dijual.');
      return;
    }
    if (disposalType === 'SOLD' && !disposalBankAccountId) {
      setDisposalError('Rekening kas/bank tujuan wajib dipilih untuk penerimaan hasil penjualan aset.');
      return;
    }

    try {
      setIsSubmittingDispose(true);
      setDisposalError('');
      await companyAssetService.disposeAsset(asset.id, {
        disposal_type: disposalType,
        disposal_date: disposalDate || new Date().toISOString().split('T')[0],
        sale_amount: disposalType === 'SOLD' ? saleAmount : 0,
        bank_account_id:
          disposalType === 'SOLD' && disposalBankAccountId
            ? Number(disposalBankAccountId)
            : undefined,
        notes: disposalNotes.trim() || undefined,
      });

      toast.success(
        'Aset Dilepas',
        disposalType === 'SOLD'
          ? `Penjualan aset "${asset.name}" berhasil dicatat ke akuntansi.`
          : `Penghapusan/afkir aset "${asset.name}" berhasil dicatat ke akuntansi.`
      );
      onClose();
      await onSuccess();
    } catch (err: unknown) {
      setDisposalError(getErrorMessage(err, 'Gagal memproses pelepasan aset.'));
    } finally {
      setIsSubmittingDispose(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pelepasan Aset — ${asset.name}`}
      actions={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmittingDispose}
          >
            Batal
          </Button>
          <Button
            variant={disposalType === 'SCRAPPED' ? 'danger' : 'primary'}
            onClick={handleConfirmDispose}
            disabled={isSubmittingDispose}
          >
            {isSubmittingDispose
              ? 'Memproses...'
              : disposalType === 'SOLD'
                ? 'Konfirmasi Penjualan Aset'
                : 'Konfirmasi Afkir Aset'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleConfirmDispose} className="space-y-4">
        {disposalError && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {disposalError}
          </div>
        )}

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Harga Perolehan:</span>
            <span className="font-mono font-semibold">{formatCurrency(asset.purchase_cost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Nilai Buku Tersisa:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {formatCurrency(asset.current_book_value)}
            </span>
          </div>
          {disposalType === 'SOLD' && Number(disposalSaleAmount) > 0 && (
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Estimasi Laba / (Rugi):</span>
              <span
                className={`font-mono font-bold ${
                  Number(disposalSaleAmount) - asset.current_book_value >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatCurrency(Number(disposalSaleAmount) - asset.current_book_value)}
              </span>
            </div>
          )}
          {disposalType === 'SCRAPPED' && (
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Estimasi Kerugian Penghapusan:</span>
              <span className="font-mono font-bold text-red-600 dark:text-red-400">
                {formatCurrency(-asset.current_book_value)}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipe Pelepasan"
            required
            value={disposalType}
            onChange={(e) => setDisposalType(e.target.value as 'SOLD' | 'SCRAPPED')}
            options={[
              { value: 'SOLD', label: 'Dijual (SOLD)' },
              { value: 'SCRAPPED', label: 'Afkir / Dihapusbukukan (SCRAPPED)' },
            ]}
          />
          <Input
            type="date"
            label="Tanggal Pelepasan"
            required
            value={disposalDate}
            onChange={(e) => setDisposalDate(e.target.value)}
          />
        </div>

        {disposalType === 'SOLD' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Harga Jual Aset (Rp)"
              required
              value={disposalSaleAmount}
              onChange={(val) => setDisposalSaleAmount(val)}
            />
            <Select
              label="Rekening Kas/Bank Tujuan"
              required
              value={disposalBankAccountId}
              onChange={(e) => setDisposalBankAccountId(e.target.value)}
              options={[
                { value: '', label: 'Pilih Rekening Tujuan' },
                ...bankAccounts.map((b) => ({
                  value: b.id,
                  label: `${b.name}${b.balance !== undefined ? ` (${formatCurrency(b.balance)})` : ''}`,
                })),
              ]}
            />
          </div>
        )}

        <Input
          label="Catatan Pelepasan (Opsional)"
          placeholder="Contoh: Dijual ke pembeli unit bekas / rusak permanen"
          value={disposalNotes}
          onChange={(e) => setDisposalNotes(e.target.value)}
        />
      </form>
    </Modal>
  );
}
