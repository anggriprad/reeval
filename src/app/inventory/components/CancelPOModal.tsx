'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import {
  procurementService,
  PurchaseOrderResponse,
} from '@/services/procurement.service';
import { AlertTriangle } from 'lucide-react';

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
      setErrorMsg('Alasan wajib diisi (minimal 3 karakter).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isReject) {
        await procurementService.rejectPO(po.id, { reason: trimmed });
        toast.success('PO Ditolak', `Pengadaan ${po.po_number} berhasil ditolak.`);
      } else {
        await procurementService.cancelPO(po.id, { reason: trimmed });
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
      title={isReject ? `Tolak PO #${po.po_number}` : `Batalkan PO #${po.po_number}`}
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
          {isSubmitting ? 'Memproses...' : isReject ? 'Tolak PO' : 'Batalkan PO'}
        </Button>,
      ]}
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isReject ? 'Alasan Penolakan PO' : 'Alasan Pembatalan PO'}
            <span className="text-red-500 font-bold ml-1">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder={
              isReject
                ? 'Contoh: Stok di gudang masih mencukupi / harga vendor terlalu tinggi...'
                : 'Contoh: Vendor tidak dapat memenuhi jadwal pengiriman / spesifikasi berubah...'
            }
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>
    </Modal>
  );
}
