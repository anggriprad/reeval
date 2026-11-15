'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import { coaService, type ChartOfAccountOptionDTO } from '@/services/coa.service';
import { journalService } from '@/services/journal.service';
import { Loader2, Trash2 } from 'lucide-react';

interface ManualJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

interface ManualJournalLineDraft {
  keyId: string;
  accountId: string;
  debit: number | '';
  credit: number | '';
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

export function ManualJournalModal(props: ManualJournalModalProps) {
  if (!props.isOpen) return null;
  return <ManualJournalModalContent {...props} />;
}

function ManualJournalModalContent({
  isOpen,
  onClose,
  bankAccounts,
  onSuccess,
}: ManualJournalModalProps) {
  const { toast } = useToast();

  const nextLineSeqRef = useRef(3);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<ManualJournalLineDraft[]>([
    { keyId: 'line-1', accountId: '', debit: '', credit: '' },
    { keyId: 'line-2', accountId: '', debit: '', credit: '' },
  ]);
  const [error, setError] = useState('');
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

  const bankLinkedCoaIds = useMemo(() => {
    const ids = new Set<number>();
    bankAccounts.forEach((b) => {
      if (b.coaAccountId) ids.add(Number(b.coaAccountId));
    });
    return ids;
  }, [bankAccounts]);

  const nonCashSelectOptions = useMemo(
    () =>
      coaOptions
        .filter(
          (acc) =>
            !acc.is_header &&
            acc.code !== '1-1100' &&
            !bankLinkedCoaIds.has(acc.id)
        )
        .map((acc) => ({
          value: String(acc.id),
          label: `${acc.code} — ${acc.name}`,
        })),
    [coaOptions, bankLinkedCoaIds]
  );

  const totalDebit = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0),
    [lines]
  );
  const totalCredit = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0),
    [lines]
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!description.trim() || description.trim().length < 3) {
      setError('Keterangan / memo jurnal minimal 3 karakter.');
      return;
    }
    if (lines.length < 2) {
      setError('Jurnal manual minimal memiliki 2 baris akun.');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const d = Number(l.debit) || 0;
      const c = Number(l.credit) || 0;
      if (!l.accountId) {
        setError(`Baris ${i + 1}: pilih akun COA.`);
        return;
      }
      if ((d <= 0 && c <= 0) || (d > 0 && c > 0)) {
        setError(`Baris ${i + 1}: isi salah satu nilai Debit atau Kredit > 0.`);
        return;
      }
    }

    if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) >= 0.01) {
      setError('Jurnal tidak seimbang: Total Debit harus sama dengan Total Kredit.');
      return;
    }

    setIsSubmitting(true);
    try {
      await journalService.createManualJournal({
        date: getTodayDateString(),
        description: description.trim(),
        lines: lines.map((l) => ({
          account_id: Number(l.accountId),
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      });
      toast.success(
        'Jurnal Manual Disimpan',
        'Jurnal penyesuaian telah dicatat ke buku besar.'
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(extractApiError(err, 'Gagal menyimpan jurnal manual.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Jurnal Manual"
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
            Simpan Jurnal
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Keterangan / Memo Jurnal"
          required
          inputSize="sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contoh: Penyesuaian beban sewa bulan ini"
        />

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex justify-between items-center">
            <span>Baris Jurnal</span>
            <button
              type="button"
              onClick={() => {
                const keyId = `line-${nextLineSeqRef.current}`;
                nextLineSeqRef.current += 1;
                setLines([...lines, { keyId, accountId: '', debit: '', credit: '' }]);
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] cursor-pointer"
            >
              + Tambah Baris
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={line.keyId} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                <div className="flex-1 min-w-0">
                  <Select
                    searchable
                    inputSize="sm"
                    placeholder={loadingCoa ? 'Memuat...' : 'Pilih Akun...'}
                    value={line.accountId}
                    onValueChange={(val) => {
                      const next = [...lines];
                      next[idx] = { ...next[idx], accountId: val };
                      setLines(next);
                    }}
                    options={nonCashSelectOptions}
                    disabled={loadingCoa}
                  />
                </div>
                <div className="w-full sm:w-28">
                  <CurrencyInput
                    inputSize="sm"
                    placeholder="Debit"
                    value={line.debit}
                    onChange={(val) => {
                      const next = [...lines];
                      next[idx] = {
                        ...next[idx],
                        debit: val,
                        credit: val !== '' && Number(val) > 0 ? '' : next[idx].credit,
                      };
                      setLines(next);
                    }}
                  />
                </div>
                <div className="w-full sm:w-28">
                  <CurrencyInput
                    inputSize="sm"
                    placeholder="Kredit"
                    value={line.credit}
                    onChange={(val) => {
                      const next = [...lines];
                      next[idx] = {
                        ...next[idx],
                        credit: val,
                        debit: val !== '' && Number(val) > 0 ? '' : next[idx].debit,
                      };
                      setLines(next);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (lines.length <= 2) return;
                    setLines(lines.filter((_, i) => i !== idx));
                  }}
                  disabled={lines.length <= 2}
                  className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-40 self-end sm:self-center cursor-pointer"
                  aria-label="Hapus baris jurnal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono px-1 pt-1">
            <span>
              Total Debit:{' '}
              <span
                className={
                  totalDebit !== totalCredit
                    ? 'text-red-500 font-bold'
                    : 'text-slate-600 dark:text-slate-300 font-semibold'
                }
              >
                {formatCurrency(totalDebit)}
              </span>
            </span>
            <span>
              Total Kredit:{' '}
              <span
                className={
                  totalDebit !== totalCredit
                    ? 'text-red-500 font-bold'
                    : 'text-slate-600 dark:text-slate-300 font-semibold'
                }
              >
                {formatCurrency(totalCredit)}
              </span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
