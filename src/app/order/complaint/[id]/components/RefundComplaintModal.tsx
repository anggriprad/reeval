'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';

interface BankAccountOption {
  id: string;
  name: string;
  balance: number;
}

interface RefundComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  refundAmount: number;
  currentPaid: number;
  cashToReturn: number;
  newRemainingUnpaid: number;
  bankAccounts: BankAccountOption[];
  refundBankAccountId: string;
  onChangeBankAccountId: (value: string) => void;
  isReturnRequested: boolean;
  onChangeReturnRequested: (checked: boolean) => void;
  refundNotes: string;
  onChangeRefundNotes: (value: string) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function RefundComplaintModal({
  isOpen,
  onClose,
  refundAmount,
  currentPaid,
  cashToReturn,
  newRemainingUnpaid,
  bankAccounts,
  refundBankAccountId,
  onChangeBankAccountId,
  isReturnRequested,
  onChangeReturnRequested,
  refundNotes,
  onChangeRefundNotes,
  onConfirm,
  isSubmitting = false,
}: RefundComplaintModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batalkan Pesanan (Refund)"
      size="md"
      actions={
        <Button
          size="lg"
          variant="danger"
          className="w-full"
          onClick={onConfirm}
          disabled={isSubmitting || (cashToReturn > 0 && bankAccounts.length > 0 && !refundBankAccountId)}
        >
          Batalkan & Refund
        </Button>
      }
    >
      <div className="space-y-4 text-[13.5px] md:text-xs">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span>Nilai Komplain</span>
            <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(refundAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span>Sudah Dibayar</span>
            <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(currentPaid)}</span>
          </div>
          {cashToReturn > 0 ? (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex justify-between items-center font-bold">
              <span className="text-slate-900 dark:text-white">Dana Dikembalikan</span>
              <span className="text-sm md:text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(cashToReturn)}</span>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex justify-between items-center font-bold">
              <span className="text-slate-900 dark:text-white">Sisa Tagihan Baru</span>
              <span className="text-sm md:text-xs text-slate-900 dark:text-white">{formatCurrency(newRemainingUnpaid)}</span>
            </div>
          )}
        </div>

        {cashToReturn > 0 && bankAccounts.length > 0 && (
          <Select
            label="Rekening Pengeluaran Kas"
            required
            value={refundBankAccountId}
            onChange={e => onChangeBankAccountId(e.target.value)}
            options={bankAccounts.map(ba => ({
              value: ba.id,
              label: `${ba.name} (Saldo: ${formatCurrency(ba.balance)})`,
            }))}
          />
        )}

        <label className="flex items-center gap-2.5 cursor-pointer select-none py-0.5">
          <Checkbox
            checked={isReturnRequested}
            onChange={checked => onChangeReturnRequested(checked)}
          />
          <span className="font-medium text-[13.5px] md:text-xs text-slate-800 dark:text-slate-200">
            Tarik barang dari pelanggan
          </span>
        </label>

        <Input
          label="Catatan (Opsional)"
          placeholder="Tambahkan catatan jika ada..."
          value={refundNotes}
          onChange={e => onChangeRefundNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
