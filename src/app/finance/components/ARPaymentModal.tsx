'use client';

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import { invoiceService, type InvoiceViewModel } from '@/services/invoice.service';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface ARPaymentModalProps {
  invoice: InvoiceViewModel | null;
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

export function ARPaymentModal(props: ARPaymentModalProps) {
  if (!props.invoice) return null;
  return <ARPaymentModalContent key={props.invoice.id} {...props} invoice={props.invoice} />;
}

function ARPaymentModalContent({
  invoice,
  onClose,
  bankAccounts,
  onSuccess,
}: Omit<ARPaymentModalProps, 'invoice'> & { invoice: InvoiceViewModel }) {
  const { toast } = useToast();

  const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const [amount, setAmount] = useState<number | ''>(remaining);
  const [bankAccountId, setBankAccountId] = useState<string>(bankAccounts[0]?.id || '');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const bankOptions = useMemo(
    () => [
      { value: '', label: '-- Pilih Rekening Kas / Bank --' },
      ...bankAccounts.map((ba) => ({
        value: ba.id,
        label: `${ba.name}${ba.accountNumber ? ` (${ba.accountNumber})` : ''} - Saldo: ${formatCurrency(ba.balance)}`,
      })),
    ],
    [bankAccounts]
  );

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Nominal pembayaran harus lebih besar dari 0.');
      return;
    }
    if (numAmount > remaining + 0.01) {
      setErrorMsg(`Nominal pembayaran melebihi sisa piutang (${formatCurrency(remaining)}).`);
      return;
    }
    if (!bankAccountId) {
      setErrorMsg('Silakan pilih rekening tujuan setoran.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await invoiceService.recordPayment(invoice.numericId, {
        amount: numAmount,
        bank_account_id: Number(bankAccountId),
        date: getTodayDateString(),
        note: note.trim() || undefined,
      });
      toast.success(`Pembayaran piutang ${invoice.invoiceNumber} berhasil dicatat.`);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = extractApiError(err, 'Gagal mencatat pembayaran piutang');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Penerimaan Pembayaran Piutang — ${invoice.invoiceNumber}`}
      size="md"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={submitting || !amount || Number(amount) <= 0 || !bankAccountId}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Simpan Pembayaran
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Pelanggan:</span>
            <strong className="text-slate-900 dark:text-white">{invoice.customerName}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Tagihan Invoice:</span>
            <strong className="text-slate-900 dark:text-white font-mono">
              {formatCurrency(invoice.totalAmount)}
            </strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Sudah Terbayar:</span>
            <span className="text-emerald-600 font-mono font-semibold">
              {formatCurrency(invoice.paidAmount)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 dark:border-slate-700">
            <span className="text-slate-500">Sisa Piutang:</span>
            <strong className="text-red-600 font-mono font-bold">
              {formatCurrency(remaining)}
            </strong>
          </div>
        </div>

        <div>
          <CurrencyInput
            label="Nominal Pembayaran Masuk (Rp)"
            required
            value={amount}
            onChange={(val) => {
              setErrorMsg('');
              setAmount(val);
            }}
            placeholder="Masukkan nominal"
          />
          <button
            type="button"
            onClick={() => setAmount(remaining)}
            className="mt-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
          >
            Set Pelunasan 100% ({formatCurrency(remaining)})
          </button>
        </div>

        <Select
          label="Setor ke Rekening Kas / Bank"
          required
          value={bankAccountId}
          onChange={(e) => {
            setErrorMsg('');
            setBankAccountId(e.target.value);
          }}
          options={bankOptions}
        />

        <Input
          label="Catatan / Memo Transaksi"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: Transfer via BCA / Mandiri"
        />
      </div>
    </Modal>
  );
}
