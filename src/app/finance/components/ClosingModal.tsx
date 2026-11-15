'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import type { ClosingPreview } from '@/lib/types';
import {
  journalService,
  mapClosingPreviewDTO,
} from '@/services/journal.service';
import { Loader2, Lock } from 'lucide-react';

interface ClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function ClosingModal(props: ClosingModalProps) {
  if (!props.isOpen) return null;
  return <ClosingModalContent {...props} />;
}

function ClosingModalContent({
  isOpen,
  onClose,
  onSuccess,
}: ClosingModalProps) {
  const { toast } = useToast();

  const [closingDate, setClosingDate] = useState(getTodayDateString);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [previewState, setPreviewState] = useState<{
    date: string | null;
    preview: ClosingPreview | null;
    fetchError: string;
  }>({
    date: null,
    preview: null,
    fetchError: '',
  });

  useEffect(() => {
    if (!closingDate) return;
    let active = true;

    journalService
      .getClosingPreview(closingDate)
      .then((previewRes) => {
        if (!active) return;
        setPreviewState({
          date: closingDate,
          preview: previewRes.data ? mapClosingPreviewDTO(previewRes.data) : null,
          fetchError: '',
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setPreviewState({
          date: closingDate,
          preview: null,
          fetchError: extractApiError(err, 'Gagal memuat pratinjau tutup buku.'),
        });
      });

    return () => {
      active = false;
    };
  }, [closingDate]);

  const loadingPreview = Boolean(closingDate) && previewState.date !== closingDate;
  const preview = previewState.date === closingDate ? previewState.preview : null;
  const error =
    submitError ||
    (previewState.date === closingDate ? previewState.fetchError : '');

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitError('');

    if (!closingDate) {
      setSubmitError('Tanggal penutupan buku wajib diisi.');
      return;
    }
    if (preview && !preview.canClose) {
      setSubmitError(preview.reason || 'Periode tidak dapat ditutup pada tanggal ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      await journalService.executeClosing({
        closing_date: closingDate,
      });
      toast.success(
        'Tutup Buku Berhasil',
        'Saldo akun Pendapatan, HPP, dan Beban telah dipindahkan ke Laba Ditahan (3-2000) dan periode dikunci.'
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setSubmitError(extractApiError(err, 'Gagal memproses tutup buku.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tutup Buku (Akhir Periode)"
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
            disabled={isSubmitting || loadingPreview || !preview || !preview.canClose}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Lock className="h-4 w-4 mr-1" />
            )}
            Proses Tutup Buku
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs rounded-lg border border-amber-200 dark:border-amber-800">
          <strong>Peringatan:</strong> Proses Tutup Buku akan memindahkan saldo akun nominal (Pendapatan, HPP, Beban) ke akun <strong>Laba Ditahan (3-2000)</strong>. Pastikan semua transaksi pada periode ini telah dicatat dengan benar sebelum melakukan proses ini.
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">
              Total Pendapatan
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {loadingPreview
                ? '...'
                : formatCurrency(preview?.totalRevenue ?? 0)}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">
              Total HPP & Beban
            </span>
            <span className="font-mono font-bold text-red-600 dark:text-red-400">
              {loadingPreview
                ? '...'
                : formatCurrency(
                    (preview?.totalCOGS ?? 0) + (preview?.totalExpense ?? 0)
                  )}
            </span>
          </div>
        </div>

        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center">
          <span className="text-xs text-indigo-600/80 dark:text-indigo-400 block mb-1 font-semibold uppercase tracking-widest">
            Laba Bersih yang Dipindahkan
          </span>
          <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono tracking-tight">
            {loadingPreview ? '...' : formatCurrency(preview?.netIncome ?? 0)}
          </span>
        </div>

        <Input
          label="Tanggal Penutupan Buku"
          required
          type="date"
          inputSize="sm"
          value={closingDate}
          onChange={(e) => {
            setClosingDate(e.target.value);
            setSubmitError('');
          }}
        />

        {(error || (preview && !preview.canClose && preview.reason)) && (
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
            {error || preview?.reason}
          </div>
        )}
      </form>
    </Modal>
  );
}
