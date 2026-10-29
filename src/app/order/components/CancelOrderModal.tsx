'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber?: string;
  reason: string;
  onReasonChange: (value: string) => void;
  error?: string;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function CancelOrderModal({
  isOpen,
  onClose,
  orderNumber = '',
  reason,
  onReasonChange,
  error = '',
  onConfirm,
  isSubmitting = false,
}: CancelOrderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Batalkan Sales Order — ${orderNumber}`}
      size="md"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Membatalkan...' : 'Konfirmasi Pembatalan'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Mohon masukkan alasan pembatalan untuk pesanan ini. Catatan pembatalan ini akan tersimpan pada riwayat pesanan.
        </p>

        <Textarea
          label="Alasan Pembatalan"
          required
          rows={3}
          placeholder="Contoh: Pelanggan membatalkan pesanan karena perubahan spesifikasi proyek..."
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          error={error}
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  );
}
