'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import { companyAssetService } from '@/services/company-asset.service';
import { useToast } from '@/context/ToastContext';
import { AlertTriangle } from 'lucide-react';

interface AssetRecordServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
  bankAccounts: BankAccount[];
  onSuccess: () => Promise<void> | void;
}

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

export function AssetRecordServiceModal({
  isOpen,
  onClose,
  assetId,
  bankAccounts,
  onSuccess,
}: AssetRecordServiceModalProps) {
  const { toast } = useToast();

  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [serviceCost, setServiceCost] = useState<number | ''>('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [serviceBankAccountId, setServiceBankAccountId] = useState('AP');
  const [serviceError, setServiceError] = useState('');
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(serviceCost) || 0;
    if (!serviceDesc.trim() || cost <= 0) {
      setServiceError('Deskripsi servis dan biaya (harus > 0) wajib diisi.');
      return;
    }

    try {
      setIsSubmittingService(true);
      setServiceError('');

      await companyAssetService.addServiceLog(assetId, {
        service_date: serviceDate || new Date().toISOString().split('T')[0],
        cost,
        description: serviceDesc.trim(),
        service_provider: serviceProvider.trim() || undefined,
        bank_account_id:
          serviceBankAccountId && serviceBankAccountId !== 'AP'
            ? Number(serviceBankAccountId)
            : undefined,
      });

      toast.success('Servis Dicatat', 'Riwayat pemeliharaan aset berhasil ditambahkan.');
      onClose();
      await onSuccess();
    } catch (err: unknown) {
      setServiceError(getErrorMessage(err, 'Gagal menyimpan catatan servis.'));
    } finally {
      setIsSubmittingService(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Servis Aset"
      size="md"
      actions={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmittingService}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSaveService}
            disabled={isSubmittingService}
          >
            {isSubmittingService ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSaveService} className="space-y-4 pb-2">
        {serviceError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{serviceError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Tanggal Servis"
            required
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
          />
          <CurrencyInput
            label="Biaya Servis (Rp)"
            required
            value={serviceCost}
            onChange={(val) => setServiceCost(val)}
          />
        </div>

        <div>
          <Input
            label="Deskripsi Pemeliharaan"
            required
            placeholder="Contoh: Penggantian oli & kalibrasi sensor"
            value={serviceDesc}
            onChange={(e) => setServiceDesc(e.target.value)}
          />
        </div>

        <div>
          <Input
            label="Teknisi / Vendor (Opsional)"
            placeholder="Contoh: PT Servis Mesin Presisi"
            value={serviceProvider}
            onChange={(e) => setServiceProvider(e.target.value)}
          />
        </div>

        <Select
          label="Sumber Pembayaran (Kas/Bank)"
          value={serviceBankAccountId}
          onChange={(e) => setServiceBankAccountId(e.target.value)}
          options={[
            { value: 'AP', label: 'Catat sebagai Hutang Usaha (AP)' },
            ...bankAccounts.map((b) => ({
              value: b.id,
              label: `${b.name}${b.balance !== undefined ? ` (${formatCurrency(b.balance)})` : ''}`,
            })),
          ]}
        />
      </form>
    </Modal>
  );
}
