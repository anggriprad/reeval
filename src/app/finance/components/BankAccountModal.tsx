'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { bankAccountService } from '@/services/bank-account.service';
import { resolveAuthorName, type BankAccount } from '@/lib/types';
import { AlertTriangle, UserCheck } from 'lucide-react';

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount: BankAccount | null;
  onSaved: () => Promise<void> | void;
}

function getApiErrorMessage(err: any, fallback: string): string {
  const validationErrors = err?.response?.data?.errors;
  if (
    Array.isArray(validationErrors) &&
    validationErrors.length > 0 &&
    validationErrors[0]?.message
  ) {
    return validationErrors[0].message;
  }
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export function BankAccountModal({
  isOpen,
  onClose,
  editingAccount,
  onSaved,
}: BankAccountModalProps) {
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = Boolean(editingAccount);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');

    if (editingAccount) {
      setName(editingAccount.name || '');
      setAccountNumber(editingAccount.accountNumber || '');
      setInitialBalance('');
    } else {
      setName('');
      setAccountNumber('');
      setInitialBalance('');
    }
  }, [isOpen, editingAccount]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama rekening wajib diisi.');
      return;
    }

    if (!isEditMode && (initialBalance === '' || Number(initialBalance) < 0)) {
      setErrorMsg('Saldo awal wajib diisi dan tidak boleh negatif.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (isEditMode && editingAccount) {
        await bankAccountService.updateAccount(editingAccount.id, {
          name: trimmedName,
          account_number: accountNumber.trim(),
        });
        toast.success(
          'Rekening Diperbarui',
          `Rekening "${trimmedName}" berhasil diperbarui.`
        );
      } else {
        await bankAccountService.createAccount({
          name: trimmedName,
          account_number: accountNumber.trim() || undefined,
          initial_balance: Number(initialBalance),
        });
        toast.success(
          'Rekening Ditambahkan',
          `Rekening "${trimmedName}" berhasil dibuat.`
        );
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Gagal menyimpan rekening bank.');
      setErrorMsg(msg);
      toast.error('Gagal Menyimpan Rekening', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorName = editingAccount ? resolveAuthorName(editingAccount) : '-';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={isEditMode ? 'Edit Rekening' : 'Tambah Rekening Baru'}
      size="md"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            form="bank-account-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form
        id="bank-account-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40 text-xs text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Input
          label="Nama Rekening / Kas"
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />

        <Input
          label="Nomor Rekening"
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          disabled={isSubmitting}
        />

        {!isEditMode && (
          <div>
            <CurrencyInput
              label="Saldo Awal"
              required
              value={initialBalance}
              onChange={(val) =>
                setInitialBalance(val === '' ? '' : String(val))
              }
              placeholder="0"
              disabled={isSubmitting}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Saldo awal akan otomatis dicatat sebagai &apos;Modal Disetor&apos;.
            </p>
          </div>
        )}

       
      </form>
    </Modal>
  );
}
