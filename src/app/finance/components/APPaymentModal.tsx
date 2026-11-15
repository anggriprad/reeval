'use client';

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import {
  invoiceService,
  type APPurchaseOrderViewModel,
} from '@/services/invoice.service';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface APPaymentModalProps {
  po: APPurchaseOrderViewModel | null;
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

export function APPaymentModal(props: APPaymentModalProps) {
  if (!props.po) return null;
  return <APPaymentModalContent key={props.po.id} {...props} po={props.po} />;
}

function APPaymentModalContent({
  po,
  onClose,
  bankAccounts,
  onSuccess,
}: Omit<APPaymentModalProps, 'po'> & { po: APPurchaseOrderViewModel }) {
  const { toast } = useToast();

  const remaining = Math.max(0, po.totalAmount - po.paidAmount);
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const bankOptions = useMemo(
    () => [
      { value: '', label: '-- Pilih Rekening Asal --' },
      ...bankAccounts.map((ba) => {
        const insufficient = ba.balance < remaining;
        return {
          value: ba.id,
          disabled: insufficient,
          label: `${ba.name} — Saldo: ${formatCurrency(ba.balance)}${insufficient ? ' (Saldo Kurang)' : ''}`,
        };
      }),
    ],
    [bankAccounts, remaining]
  );

  const handleSubmit = async () => {
    if (!bankAccountId) {
      setErrorMsg('Silakan pilih rekening asal pembayaran.');
      return;
    }
    const selectedBank = bankAccounts.find((b) => b.id === bankAccountId);
    if (selectedBank && selectedBank.balance < remaining) {
      setErrorMsg(`Saldo rekening ${selectedBank.name} tidak mencukupi untuk pembayaran ini.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await invoiceService.recordPOPayment(po.numericId, {
        amount: remaining,
        bank_account_id: Number(bankAccountId),
        date: getTodayDateString(),
      });
      toast.success(`Pembayaran hutang ${po.poNumber} berhasil dicatat.`);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = extractApiError(err, 'Gagal mencatat pembayaran hutang supplier');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Pelunasan Tagihan Supplier — ${po.poNumber}`}
      size="md"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={submitting || !bankAccountId}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Bayar Sekarang
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
            <span className="text-slate-500">Supplier:</span>
            <strong className="text-slate-900 dark:text-white">{po.supplier}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Tagihan PO:</span>
            <strong className="text-slate-900 dark:text-white font-mono">
              {formatCurrency(po.totalAmount)}
            </strong>
          </div>
          {po.paidAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Sisa Hutang PO:</span>
              <strong className="text-red-600 font-mono">
                {formatCurrency(remaining)}
              </strong>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Metode:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Pelunasan Tunai 100%
            </span>
          </div>
        </div>

        <Select
          label="Bayar Menggunakan Rekening Asal"
          required
          value={bankAccountId}
          onChange={(e) => {
            const val = e.target.value;
            const bank = bankAccounts.find((b) => b.id === val);
            if (bank && bank.balance < remaining) {
              setErrorMsg(`Saldo ${bank.name} tidak mencukupi.`);
              return;
            }
            setErrorMsg('');
            setBankAccountId(val);
          }}
          options={bankOptions}
        />
      </div>
    </Modal>
  );
}
