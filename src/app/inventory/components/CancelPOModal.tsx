'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/context/ToastContext';
import { useApp } from '@/context/AppContext';
import {
  procurementService,
  PurchaseOrderResponse,
} from '@/services/procurement.service';

interface CancelPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrderResponse | null;
  mode: 'REJECT' | 'CANCEL_DRAFT' | 'CANCEL_ORDERED';
  onSuccess: () => void;
}

export function CancelPOModal({
  isOpen,
  onClose,
  po,
  mode,
  onSuccess,
}: CancelPOModalProps) {
  const { toast } = useToast();
  const { rejectPO, cancelPO } = useApp();
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!po) return null;

  const isReject = mode === 'REJECT';

  const handleSubmit = async () => {
    setErrorMsg('');
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 3) {
      setErrorMsg(
        isReject
          ? 'Alasan penolakan wajib diisi (minimal 3 karakter).'
          : 'Alasan pembatalan wajib diisi (minimal 3 karakter).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isReject) {
        await procurementService.rejectPO(po.id, { reason: trimmed });
        rejectPO?.(String(po.id), trimmed);
        toast.success('PO Ditolak', `Pengadaan ${po.po_number} berhasil ditolak.`);
      } else {
        await procurementService.cancelPO(po.id, { reason: trimmed });
        cancelPO?.(String(po.id), trimmed);
        toast.success('PO Dibatalkan', `Pengadaan ${po.po_number} berhasil dibatalkan.`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to reject/cancel PO:', err);
      setErrorMsg(
        err?.response?.data?.message || err?.message || 'Gagal memproses pembatalan pengadaan.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReject ? 'Tolak Pengadaan' : 'Batalkan Pengadaan'}
      size="md"
      actions={[
        <Button key="cancel" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Batal
        </Button>,
        <Button
          key="submit"
          variant="danger"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Memproses...' : isReject ? 'Tolak Pengadaan' : 'Batalkan Pengadaan'}
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <Textarea
          label={isReject ? 'Alasan Penolakan' : 'Alasan Pembatalan'}
          required
          rows={3}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (errorMsg) setErrorMsg('');
          }}
          error={errorMsg || undefined}
        />
      </div>
    </Modal>
  );
}
