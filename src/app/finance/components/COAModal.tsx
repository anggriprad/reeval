'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import {
  coaService,
  type ChartOfAccountOptionDTO,
} from '@/services/coa.service';
import {
  resolveAuthorName,
  type AccountCode,
  type AccountNormalBalance,
  type AccountType,
} from '@/lib/types';
import { UserCheck } from 'lucide-react';

interface COAModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount: AccountCode | null;
  parentOptions: ChartOfAccountOptionDTO[];
  onSaved: () => Promise<void> | void;
}

function defaultNormalBalanceForType(type: AccountType): AccountNormalBalance {
  return type === 'ASSET' || type === 'COGS' || type === 'EXPENSE'
    ? 'DEBIT'
    : 'CREDIT';
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

export function COAModal({
  isOpen,
  onClose,
  editingAccount,
  parentOptions,
  onSaved,
}: COAModalProps) {
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ASSET');
  const [normalBalance, setNormalBalance] =
    useState<AccountNormalBalance>('DEBIT');
  const [parentId, setParentId] = useState('');
  const [isHeader, setIsHeader] = useState(true);
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = Boolean(editingAccount);
  const isSystemAccount = Boolean(editingAccount?.isSystem);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');

    if (editingAccount) {
      setCode(editingAccount.code);
      setName(editingAccount.name);
      setType(editingAccount.type);
      setNormalBalance(editingAccount.normalBalance);
      setParentId(editingAccount.parentId || '');
      setIsHeader(Boolean(editingAccount.isHeader));
      setDescription(editingAccount.description || '');
    } else {
      setCode('');
      setName('');
      setType('ASSET');
      setNormalBalance('DEBIT');
      setParentId('');
      setIsHeader(true);
      setDescription('');
    }
  }, [isOpen, editingAccount]);

  const selectableParents = useMemo(() => {
    return parentOptions.filter(
      (opt) => !editingAccount || String(opt.id) !== editingAccount.id
    );
  }, [parentOptions, editingAccount]);

  const handleParentChange = (nextParentId: string) => {
    setParentId(nextParentId);
    if (!nextParentId) {
      if (!isEditMode) {
        setIsHeader(true);
      }
      return;
    }
    if (!isEditMode) {
      setIsHeader(false);
    }
    const parent = parentOptions.find((opt) => String(opt.id) === nextParentId);
    if (parent) {
      setType(parent.type);
      setNormalBalance(parent.normal_balance);
    }
  };

  const handleTypeChange = (nextType: string) => {
    const casted = nextType as AccountType;
    setType(casted);
    setNormalBalance(defaultNormalBalanceForType(casted));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama akun wajib diisi.');
      return;
    }
    if (trimmedName.length < 2) {
      setErrorMsg('Nama akun minimal 2 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAccount) {
        if (isSystemAccount) {
          await coaService.updateAccount(editingAccount.id, {
            name: trimmedName,
            description: description.trim(),
          });
        } else {
          await coaService.updateAccount(editingAccount.id, {
            name: trimmedName,
            code: code.trim() || undefined,
            type,
            normal_balance: normalBalance,
            parent_id: parentId ? Number(parentId) : null,
            is_header: isHeader,
            description: description.trim(),
          });
        }
        toast.success(
          'Akun Diperbarui',
          `Akun ${editingAccount.code} - ${trimmedName} berhasil disimpan.`
        );
      } else {
        const res = await coaService.createAccount({
          name: trimmedName,
          type,
          normal_balance: normalBalance,
          parent_id: parentId ? Number(parentId) : null,
          is_header: isHeader,
          description: description.trim(),
        });
        const createdCode = res.data?.code || '';
        toast.success(
          'Akun Baru Ditambahkan',
          createdCode
            ? `Akun ${createdCode} - ${trimmedName} berhasil dibuat.`
            : `Akun ${trimmedName} berhasil dibuat.`
        );
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Gagal menyimpan akun COA.');
      setErrorMsg(msg);
      toast.error('Gagal Menyimpan Akun', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorName = editingAccount ? resolveAuthorName(editingAccount) : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={isEditMode ? 'Edit Akun' : 'Tambah Akun Baru'}
      size="md"
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
            {isSubmitting
              ? 'Menyimpan...'
              : isEditMode
                ? 'Simpan Perubahan'
                : 'Tambah Akun'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            1. Pilih Induk / Sub-Akun Dari
          </label>
          <select
            value={parentId}
            onChange={(e) => handleParentChange(e.target.value)}
            disabled={isSystemAccount || isSubmitting}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/80"
          >
            <option value="">-- Tidak Ada (Akun Utama / Root) --</option>
            {selectableParents.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.level === 1 ? '📁 ' : h.level === 2 ? '  ↳ ' : '    • '}
                {h.code} - {h.name}
              </option>
            ))}
          </select>
        </div>

        {isEditMode ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                2. Kode Akun *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Contoh: 1-1110"
                disabled={isSystemAccount || isSubmitting}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-600 dark:text-indigo-400 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/80"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                3. Nama Akun *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Kas Kecil Operasional"
                disabled={isSubmitting}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              2. Nama Akun *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kas Kecil Operasional"
              disabled={isSubmitting}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              Kategori Akun
              <span className="text-[10px] font-normal text-indigo-500">
                (Otomatis Terisi)
              </span>
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              disabled={Boolean(parentId) || isSystemAccount || isSubmitting}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 font-semibold"
            >
              <option value="ASSET">Aset (Harta)</option>
              <option value="LIABILITY">Kewajiban (Hutang)</option>
              <option value="EQUITY">Ekuitas (Modal)</option>
              <option value="REVENUE">Pendapatan Usaha</option>
              <option value="COGS">Harga Pokok Penjualan (HPP)</option>
              <option value="EXPENSE">Beban Operasional</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              Saldo Normal
              <span className="text-[10px] font-normal text-indigo-500">
                (Otomatis Sesuai Aturan)
              </span>
            </label>
            <select
              value={normalBalance}
              onChange={(e) =>
                setNormalBalance(e.target.value as AccountNormalBalance)
              }
              disabled={Boolean(parentId) || isSystemAccount || isSubmitting}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 font-semibold"
            >
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Kredit</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2.5 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
          💡 <strong>Sistem Otomatis:</strong> Kategori dan Saldo Normal (
          {normalBalance}) disesuaikan secara akurat berdasarkan standar
          akuntansi. Pengguna tidak perlu membingungkan debit atau kredit.
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Deskripsi (Opsional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Catatan tambahan fungsi akun..."
            disabled={isSubmitting}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

       

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100 dark:bg-red-900/20 dark:border-red-900/30">
            {errorMsg}
          </div>
        )}
      </form>
    </Modal>
  );
}
