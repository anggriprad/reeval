'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { Loader2 } from 'lucide-react';
import { formatVariantLabel } from '@/lib/utils';
import { workOrderService } from '@/services/work-order.service';
import type { WorkOrder } from '@/lib/types';

interface CancelSpkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetWO: WorkOrder | null;
}

export function CancelSpkModal({
  isOpen,
  onClose,
  onSuccess,
  targetWO,
}: CancelSpkModalProps) {
  const { toast } = useToast();
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setCancelReason('');
    onClose();
  };

  const handleConfirmCancel = async () => {
    if (!targetWO) return;
    setIsSubmitting(true);
    try {
      const res = await workOrderService.cancelWorkOrder(Number(targetWO.id), {
        reason: cancelReason.trim() || 'Dibatalkan oleh pengguna',
      });

      if (res.success) {
        toast.success(`SPK ${targetWO.spkNumber} berhasil dibatalkan.`);
        handleClose();
        onSuccess();
      } else {
        toast.error(res.message || 'Gagal membatalkan SPK.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem saat membatalkan SPK.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Batalkan SPK ${targetWO?.spkNumber || ''}`}
      description="Apakah Anda yakin ingin membatalkan SPK ini? Tindakan ini tidak dapat dibatalkan."
      size="md"
      actions={
        targetWO ? (
          <>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Membatalkan...
                </>
              ) : (
                'Batalkan SPK'
              )}
            </Button>
          </>
        ) : undefined
      }
    >
      {targetWO && (
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Nomor SPK:</span>
              <strong className="font-mono text-slate-900 dark:text-white">{targetWO.spkNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Produk:</span>
              <strong className="text-slate-900 dark:text-white">{targetWO.productName}</strong>
            </div>
            {targetWO.variantName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Varian:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {formatVariantLabel(targetWO.variantName)}
                </span>
              </div>
            )}
            {targetWO.salesOrderNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Referensi Order:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  {targetWO.salesOrderNumber}
                </span>
              </div>
            )}
          </div>

          <Input
            label="Alasan Pembatalan (Opsional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Contoh: Perubahan rencana produksi / dibatalkan"
          />
        </div>
      )}
    </Modal>
  );
}
