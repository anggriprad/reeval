'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import type { BankAccount, DividendSummary } from '@/lib/types';
import {
  cashTransactionService,
  mapDividendSummaryDTO,
} from '@/services/cash-transaction.service';
import { Loader2 } from 'lucide-react';

interface DividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extractApiError(err: unknown, fallback: string): string {
  const resData = (err as {
    response?: {
      data?: {
        message?: string;
        error?: string;
        errors?: Array<{ message?: string }>;
      };
    };
  })?.response?.data;
  if (Array.isArray(resData?.errors) && resData.errors[0]?.message) {
    return resData.errors[0].message;
  }
  return resData?.message || resData?.error || (err instanceof Error ? err.message : fallback);
}

export function DividendModal(props: DividendModalProps) {
  if (!props.isOpen) return null;
  return <DividendModalContent {...props} />;
}

function DividendModalContent({
  isOpen,
  onClose,
  bankAccounts,
  onSuccess,
}: DividendModalProps) {
  const { toast } = useToast();

  const [dividendBankIdOverride, setDividendBankIdOverride] = useState<string | null>(null);
  const [dividendAmount, setDividendAmount] = useState<number | ''>('');
  const [dividendError, setDividendError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [summaryState, setSummaryState] = useState<{
    loaded: boolean;
    summary: DividendSummary | null;
  }>({ loaded: false, summary: null });

  useEffect(() => {
    let active = true;
    cashTransactionService
      .getDividendSummary()
      .then((res) => {
        if (!active) return;
        setSummaryState({
          loaded: true,
          summary: res.data ? mapDividendSummaryDTO(res.data) : null,
        });
      })
      .catch(() => {
        if (!active) return;
        setSummaryState({ loaded: true, summary: null });
      });

    return () => {
      active = false;
    };
  }, []);

  const summary = summaryState.summary;
  const dividendBankId = dividendBankIdOverride ?? (bankAccounts[0]?.id || '');

  const bankOptions = useMemo(
    () =>
      bankAccounts.map((b) => ({
        value: String(b.id),
        label: `${b.name} (Saldo: ${formatCurrency(b.balance)})`,
      })),
    [bankAccounts]
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setDividendError('');

    const amt =
      typeof dividendAmount === 'number'
        ? dividendAmount
        : Number(dividendAmount);
    if (!amt || amt <= 0) {
      setDividendError('Nominal dividen harus lebih dari 0.');
      return;
    }
    if (!dividendBankId) {
      setDividendError('Pilih rekening sumber pembayaran dividen.');
      return;
    }

    const bank = bankAccounts.find(
      (b) => String(b.id) === String(dividendBankId)
    );
    if (bank && bank.balance < amt) {
      setDividendError(`Saldo ${bank.name} tidak mencukupi.`);
      return;
    }
    if (summary && summary.retainedEarningsBalance < amt) {
      setDividendError(
        `Saldo Laba Ditahan (3-2000) tidak mencukupi (tersedia ${formatCurrency(
          summary.retainedEarningsBalance
        )}). Lakukan Tutup Buku terlebih dahulu jika laba periode berjalan belum dipindahkan.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await cashTransactionService.createDividend({
        date: getTodayDateString(),
        bank_account_id: Number(dividendBankId),
        amount: amt,
      });
      toast.success(
        'Dividen Dibagikan',
        `Dividen sebesar ${formatCurrency(amt)} berhasil didistribusikan.`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setDividendError(
        extractApiError(err, 'Gagal mencatat pembagian dividen.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembagian Dividen"
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit()}
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Bagikan Dividen
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-[11px] rounded-lg border border-blue-200 dark:border-blue-800">
          Pencatatan ini akan mengurangi saldo <strong>Laba Ditahan (3-2000)</strong> dan mengurangi saldo{' '}
          <strong>Kas & Bank</strong> yang dipilih.
        </div>

        <Select
          label="Rekening Sumber (Kas/Bank)"
          required
          inputSize="sm"
          placeholder="Pilih rekening sumber dana..."
          value={dividendBankId}
          onValueChange={setDividendBankIdOverride}
          options={bankOptions}
        />

        <CurrencyInput
          label="Nominal Dividen (Rp)"
          required
          inputSize="sm"
          value={dividendAmount}
          onChange={setDividendAmount}
          placeholder="0"
        />

        {dividendError && (
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
            {dividendError}
          </div>
        )}
      </form>
    </Modal>
  );
}
