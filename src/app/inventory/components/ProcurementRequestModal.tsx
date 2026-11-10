'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { procurementService, CreateProcurementRequest } from '@/services/procurement.service';
import type { RawMaterial } from '@/lib/types';
import { AlertTriangle } from 'lucide-react';

interface ProcurementRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: RawMaterial | null;
  onSuccess: () => void;
}

const parseQty = (val: string | number): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const parsed = parseFloat(String(val).replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};

export function ProcurementRequestModal({
  isOpen,
  onClose,
  material,
  onSuccess,
}: ProcurementRequestModalProps) {
  const { toast } = useToast();
  const [qty, setQty] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQty('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setErrorMsg('');
    const numQty = parseQty(qty);

    if (!material) return;
    if (!qty.trim() || numQty <= 0) {
      setErrorMsg('Kuantitas harus lebih besar dari 0.');
      return;
    }

    const payload: CreateProcurementRequest = {
      supplier: '-',
      purchase_type: 'PO',
      additional_cost: 0,
      items: [
        {
          material_id: Number(material.id),
          qty: numQty,
          unit_cost: Number(material.unitCost || 0),
        },
      ],
    };

    setIsSubmitting(true);
    try {
      const res = await procurementService.createProcurement(payload);
      if (res.data) {
        toast.success(
          'Pengadaan Berhasil Diajukan',
          `Pengajuan pengadaan ${res.data.po_number} untuk ${material.name} berhasil disimpan.`
        );
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      console.error('Failed to submit procurement request:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(
        error.response?.data?.message || error.message || 'Gagal mengajukan pengadaan.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInvalid = isSubmitting || !qty.trim() || parseQty(qty) <= 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajukan Pengadaan"
      size="md"
      actions={
        <Button
          onClick={handleSubmit}
          disabled={isInvalid}
        >
          {isSubmitting ? 'Mengajukan...' : 'Ajukan Pengadaan'}
        </Button>
      }
    >
      <div className="space-y-3">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 py-1">
          <div
            className="text-sm text-slate-900 dark:text-white truncate border border-slate-200 dark:border-slate-700 rounded-md px-3.5 py-2 bg-white dark:bg-slate-800 w-full"
            title={material?.name}
          >
            {material?.name}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Input
              type="text"
              inputMode="decimal"
              placeholder='qty'
              value={qty}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.,]/g, '');
                setQty(val);
                if (errorMsg) setErrorMsg('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isInvalid) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="font-medium"
              containerClassName="w-36 shrink-0"
              autoFocus
              suffix={material?.unit || 'pcs'}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
