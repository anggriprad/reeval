'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import { coaService, type ChartOfAccountOptionDTO } from '@/services/coa.service';
import { cashTransactionService } from '@/services/cash-transaction.service';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface CashTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  canCashTxCreate: boolean;
  canTransferCreate: boolean;
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

export function CashTransactionModal(props: CashTransactionModalProps) {
  if (!props.isOpen) return null;
  return <CashTransactionModalContent {...props} />;
}

function CashTransactionModalContent({
  isOpen,
  onClose,
  bankAccounts,
  canCashTxCreate,
  canTransferCreate,
  onSuccess,
}: CashTransactionModalProps) {
  const { toast } = useToast();

  const [txType, setTxType] = useState<'outflow' | 'inflow' | 'transfer'>(() =>
    canCashTxCreate ? 'outflow' : 'transfer'
  );
  const [txCoaId, setTxCoaId] = useState('');
  const [txAmount, setTxAmount] = useState<number | ''>('');
  const [txBankIdOverride, setTxBankIdOverride] = useState<string | null>(null);
  const [txToBankIdOverride, setTxToBankIdOverride] = useState<string | null>(null);
  const [txNote, setTxNote] = useState('');
  const [txError, setTxError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [coaState, setCoaState] = useState<{
    loaded: boolean;
    options: ChartOfAccountOptionDTO[];
  }>({ loaded: false, options: [] });

  useEffect(() => {
    let active = true;
    coaService
      .getOptions({ is_header: false })
      .then((res) => {
        if (!active) return;
        setCoaState({
          loaded: true,
          options: Array.isArray(res.data) ? res.data : [],
        });
      })
      .catch(() => {
        if (!active) return;
        setCoaState({ loaded: true, options: [] });
      });

    return () => {
      active = false;
    };
  }, []);

  const loadingCoa = !coaState.loaded;
  const coaOptions = coaState.options;
  const txBankId = txBankIdOverride ?? (bankAccounts[0]?.id || '');
  const defaultToBankId =
    bankAccounts.find((ba) => String(ba.id) !== String(txBankId))?.id || '';
  const txToBankId =
    txToBankIdOverride !== null && String(txToBankIdOverride) !== String(txBankId)
      ? txToBankIdOverride
      : defaultToBankId;

  const bankLinkedCoaIds = useMemo(() => {
    const ids = new Set<number>();
    bankAccounts.forEach((b) => {
      if (b.coaAccountId) ids.add(Number(b.coaAccountId));
    });
    return ids;
  }, [bankAccounts]);

  const filteredCoaSelectOptions = useMemo(() => {
    return coaOptions
      .filter((acc) => {
        if (acc.is_header) return false;
        if (acc.code === '1-1100' || bankLinkedCoaIds.has(acc.id)) return false;
        const type = (acc.type || '').toUpperCase();
        if (txType === 'outflow') {
          return type === 'EXPENSE' || type === 'LIABILITY' || type === 'ASSET';
        }
        if (txType === 'inflow') {
          return type === 'REVENUE' || type === 'LIABILITY' || type === 'EQUITY';
        }
        return false;
      })
      .map((acc) => ({
        value: String(acc.id),
        label: `${acc.code} — ${acc.name}`,
      }));
  }, [coaOptions, bankLinkedCoaIds, txType]);

  const bankSelectOptions = useMemo(
    () =>
      bankAccounts.map((ba) => ({
        value: String(ba.id),
        label: `${ba.name} — Saldo: ${formatCurrency(ba.balance)}`,
      })),
    [bankAccounts]
  );

  const destinationBankOptions = useMemo(
    () =>
      bankAccounts.map((ba) => ({
        value: String(ba.id),
        label: `${ba.name} — Saldo: ${formatCurrency(ba.balance)}${
          String(ba.id) === String(txBankId) ? ' (Sama dengan asal)' : ''
        }`,
        disabled: String(ba.id) === String(txBankId),
      })),
    [bankAccounts, txBankId]
  );

  const handleTypeChange = (next: 'outflow' | 'inflow' | 'transfer') => {
    setTxType(next);
    setTxCoaId('');
    setTxError('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setTxError('');

    const amt = typeof txAmount === 'number' ? txAmount : Number(txAmount);
    if (!amt || amt <= 0) {
      setTxError('Nominal transaksi harus lebih besar dari 0.');
      return;
    }
    if (!txBankId) {
      setTxError('Harap pilih rekening kas/bank utama.');
      return;
    }

    const bank = bankAccounts.find((ba) => String(ba.id) === String(txBankId));

    if (txType === 'transfer') {
      if (!txToBankId) {
        setTxError('Harap pilih rekening tujuan.');
        return;
      }
      if (String(txBankId) === String(txToBankId)) {
        setTxError('Rekening asal dan tujuan tidak boleh sama.');
        return;
      }
      if (bank && bank.balance < amt) {
        setTxError(
          `Saldo ${bank.name} tidak mencukupi (Saldo: ${formatCurrency(bank.balance)}).`
        );
        return;
      }

      setIsSubmitting(true);
      try {
        await cashTransactionService.createTransfer({
          date: getTodayDateString(),
          from_bank_account_id: Number(txBankId),
          to_bank_account_id: Number(txToBankId),
          amount: amt,
          description: txNote.trim() || undefined,
        });
        toast.success('Transfer Berhasil', 'Transfer antar rekening berhasil dicatat.');
        onSuccess();
        onClose();
      } catch (err: unknown) {
        setTxError(
          extractApiError(err, 'Gagal mencatat transfer antar rekening.')
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!txCoaId) {
      setTxError(
        txType === 'outflow'
          ? 'Harap pilih kategori akun pengeluaran.'
          : 'Harap pilih kategori akun pemasukan.'
      );
      return;
    }
    if (txType === 'outflow' && bank && bank.balance < amt) {
      setTxError(
        `Saldo ${bank.name} tidak mencukupi (Saldo saat ini: ${formatCurrency(
          bank.balance
        )}).`
      );
      return;
    }
    if (!txNote.trim()) {
      setTxError('Keterangan / memo transaksi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await cashTransactionService.createTransaction({
        type: txType === 'outflow' ? 'OUTFLOW' : 'INFLOW',
        date: getTodayDateString(),
        bank_account_id: Number(txBankId),
        coa_account_id: Number(txCoaId),
        amount: amt,
        description: txNote.trim(),
      });
      toast.success(
        'Transaksi Dicatat',
        txType === 'outflow'
          ? 'Transaksi kas keluar & jurnal akuntansi berhasil disimpan.'
          : 'Transaksi kas masuk & jurnal akuntansi berhasil disimpan.'
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setTxError(extractApiError(err, 'Gagal menyimpan transaksi kas.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Transaksi Baru"
      size="md"
      actions={
        <>
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button size="sm" type="button" onClick={() => handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}{' '}
            Simpan Transaksi
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {txError && (
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40 text-xs text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{txError}</span>
          </div>
        )}

        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {([
            ...(canCashTxCreate ? (['outflow', 'inflow'] as const) : []),
            ...(canTransferCreate ? (['transfer'] as const) : []),
          ]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all cursor-pointer ${
                txType === type
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              {type === 'outflow'
                ? 'Pengeluaran'
                : type === 'inflow'
                  ? 'Pemasukan'
                  : 'Transfer'}
            </button>
          ))}
        </div>

        <div>
          {txType === 'transfer' ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kosong
              </label>
              <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                Transfer antar rekening tidak memerlukan klasifikasi akun pendapatan/beban.
              </div>
            </div>
          ) : (
            <Select
              label={
                txType === 'outflow'
                  ? 'Kategori Beban (CoA Terkait)'
                  : 'Kategori Pemasukan (CoA Terkait)'
              }
              required
              searchable
              inputSize="sm"
              placeholder={loadingCoa ? 'Memuat daftar akun...' : '-- Pilih Kategori --'}
              value={txCoaId}
              onValueChange={setTxCoaId}
              options={filteredCoaSelectOptions}
              disabled={loadingCoa}
            />
          )}
        </div>

        <CurrencyInput
          label="Nominal Transaksi (Rp)"
          required
          inputSize="sm"
          value={txAmount}
          onChange={setTxAmount}
          placeholder="Contoh: 500000"
        />

        <Select
          label={
            txType === 'outflow' || txType === 'transfer'
              ? 'Dari Rekening Kas / Bank'
              : 'Ke Rekening Kas / Bank (Penerima)'
          }
          required
          inputSize="sm"
          placeholder="-- Pilih Rekening Kas / Bank --"
          value={txBankId}
          onValueChange={setTxBankIdOverride}
          options={bankSelectOptions}
        />

        {txType === 'transfer' && (
          <Select
            label="Ke Rekening Tujuan"
            required
            inputSize="sm"
            placeholder="-- Pilih Rekening Tujuan --"
            value={txToBankId}
            onValueChange={setTxToBankIdOverride}
            options={destinationBankOptions}
          />
        )}

        <Input
          label="Keterangan / Memo"
          required={txType !== 'transfer'}
          inputSize="sm"
          value={txNote}
          onChange={(e) => setTxNote(e.target.value)}
          placeholder="Opsional, misal: Bayar listrik, pencairan pinjaman, dll"
        />
      </form>
    </Modal>
  );
}
