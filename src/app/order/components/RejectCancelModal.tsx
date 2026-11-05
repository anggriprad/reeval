'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface RejectCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber?: string;
  reason: string;
  onReasonChange: (value: string) => void;
  error?: string;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function RejectCancelModal({
  isOpen,
  onClose,
  orderNumber = '',
  reason,
  onReasonChange,
  error = '',
  onConfirm,
  isSubmitting = false,
}: RejectCancelModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tolak Pembatalan Sales Order — ${orderNumber}`}
      size="md"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Kembali
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Memproses...' : 'Tolak Pembatalan'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
          Masukkan alasan penolakan pembatalan. Pesanan akan dikembalikan ke status aktif sebelumnya.
        </p>
        <Textarea
          label="Alasan Penolakan"
          required
          rows={3}
          placeholder="Contoh: Barang sudah selesai diproduksi dan siap dikirim"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          error={error}
        />
      </div>
    </Modal>
  );
}
