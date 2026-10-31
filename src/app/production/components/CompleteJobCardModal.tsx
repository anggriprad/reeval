'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptionList } from '@/components/ui/OptionList';
import { useToast } from '@/context/ToastContext';
import { Search, Loader2 } from 'lucide-react';
import { workOrderService } from '@/services/work-order.service';
import { productionOperatorService, type ProductionOperatorOption } from '@/services/production-operator.service';
import type { JobCard, ProductionOperator } from '@/lib/types';

interface CompleteJobCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  target: { woId: string; jc: JobCard } | null;
  operators?: ProductionOperator[];
}

export function CompleteJobCardModal({
  isOpen,
  onClose,
  onSuccess,
  target,
  operators = [],
}: CompleteJobCardModalProps) {
  const { toast } = useToast();
  const [selectedOperatorName, setSelectedOperatorName] = useState('');
  const [operatorSearch, setOperatorSearch] = useState('');
  const [completeError, setCompleteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiOperators, setApiOperators] = useState<ProductionOperatorOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingOptions(true);
      productionOperatorService
        .getOperatorOptions()
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setApiOperators(res.data);
          }
        })
        .catch((err) => {
          console.warn('Gagal memuat opsi operator dari API:', err);
        })
        .finally(() => {
          setIsLoadingOptions(false);
        });
    }
  }, [isOpen]);

  const effectiveOperators = useMemo(() => {
    return apiOperators.map((o) => ({
      id: String(o.id),
      name: o.name,
    }));
  }, [apiOperators]);

  const filteredOperators = useMemo(() => {
    if (!operatorSearch.trim()) return effectiveOperators;
    const q = operatorSearch.toLowerCase();
    return effectiveOperators.filter((o) => o.name.toLowerCase().includes(q));
  }, [effectiveOperators, operatorSearch]);

  const handleClose = () => {
    setSelectedOperatorName('');
    setOperatorSearch('');
    setCompleteError('');
    onClose();
  };

  const handleConfirmComplete = async () => {
    if (!target) return;
    const picName = selectedOperatorName.trim();
    if (!picName) {
      setCompleteError('Pilih operator PIC terlebih dahulu.');
      return;
    }

    const foundOp = effectiveOperators.find((o) => o.name === picName);
    setIsSubmitting(true);
    try {
      const res = await workOrderService.completeJobCard(
        Number(target.woId),
        Number(target.jc.id),
        {
          operator_id: foundOp?.id ? Number(foundOp.id) : undefined,
          pic_name: picName,
          completed_qty: target.jc.targetQty,
        }
      );

      if (res.success) {
        toast.success(
          'Tahapan Selesai',
          `Operasi "${target.jc.operationName}" berhasil diselesaikan oleh ${picName}.`
        );
        handleClose();
        onSuccess();
      } else {
        setCompleteError(res.message || 'Gagal menyelesaikan operasi.');
      }
    } catch (err: any) {
      setCompleteError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !target) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Pilih Operator"
      size="sm"
      sheetHeight="auto"
      actions={
        target ? (
          <Button
            variant="primary"
            onClick={handleConfirmComplete}
            disabled={!selectedOperatorName || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Konfirmasi Selesai'
            )}
          </Button>
        ) : undefined
      }
    >
      {target && (
        <div className="space-y-3">
          <Input
            icon={Search}
            inputSize="md"
            placeholder="Cari nama operator..."
            value={operatorSearch}
            onChange={(e) => {
              setOperatorSearch(e.target.value);
              if (completeError) setCompleteError('');
            }}
          />

          {completeError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {completeError}
            </p>
          )}

          <OptionList
            options={filteredOperators.map((op) => ({
              value: op.name,
              label: op.name,
            }))}
            value={selectedOperatorName}
            onChange={(val) => {
              setSelectedOperatorName(String(val));
              if (completeError) setCompleteError('');
            }}
            emptyMessage="Tidak ada operator yang ditemukan."
          />
        </div>
      )}
    </Modal>
  );
}
