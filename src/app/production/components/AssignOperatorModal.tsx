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

interface AssignOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  target: { woId: string; jc: JobCard } | null;
  operators?: ProductionOperator[];
}

export function AssignOperatorModal({
  isOpen,
  onClose,
  onSuccess,
  target,
  operators = [],
}: AssignOperatorModalProps) {
  const { toast } = useToast();
  const [editingOperatorName, setEditingOperatorName] = useState('');
  const [editOperatorSearch, setEditOperatorSearch] = useState('');
  const [editOperatorError, setEditOperatorError] = useState('');
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

  useEffect(() => {
    if (target?.jc.picName) {
      setEditingOperatorName(target.jc.picName);
    } else {
      setEditingOperatorName('');
    }
  }, [target]);

  const effectiveOperators = useMemo(() => {
    if (apiOperators.length > 0) {
      return apiOperators.map((o) => ({
        id: String(o.id),
        name: o.name,
      }));
    }
    return operators.filter((o) => o.status === 'ACTIVE').map((o) => ({
      id: String(o.id),
      name: o.name,
    }));
  }, [apiOperators, operators]);

  const filteredOperators = useMemo(() => {
    if (!editOperatorSearch.trim()) return effectiveOperators;
    const q = editOperatorSearch.toLowerCase();
    return effectiveOperators.filter((o) => o.name.toLowerCase().includes(q));
  }, [effectiveOperators, editOperatorSearch]);

  const handleClose = () => {
    setEditingOperatorName('');
    setEditOperatorSearch('');
    setEditOperatorError('');
    onClose();
  };

  const handleSaveOperator = async () => {
    if (!target) return;
    const picName = editingOperatorName.trim();
    if (!picName) {
      setEditOperatorError('Pilih operator PIC terlebih dahulu.');
      return;
    }

    const foundOp = effectiveOperators.find((o) => o.name === picName);
    const opId = foundOp?.id ? Number(foundOp.id) : undefined;
    setIsSubmitting(true);
    try {
      const res = await workOrderService.updateWorkOrder(
        Number(target.woId),
        {
          job_card_id: Number(target.jc.id),
          operator_id: opId,
          pic_name: picName,
          notes: 'Revisi operator dari Analisis Kinerja',
        }
      );

      if (res.success) {
        toast.success(
          'Operator Berhasil Direvisi',
          `Operator untuk tahapan "${target.jc.operationName}" berhasil diubah menjadi ${picName}.`
        );
        handleClose();
        onSuccess();
      } else {
        setEditOperatorError(res.message || 'Gagal mengubah operator.');
      }
    } catch (err: any) {
      setEditOperatorError(err.message || 'Terjadi kesalahan sistem.');
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
            onClick={handleSaveOperator}
            disabled={!editingOperatorName || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan'
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
            value={editOperatorSearch}
            onChange={(e) => {
              setEditOperatorSearch(e.target.value);
              if (editOperatorError) setEditOperatorError('');
            }}
          />

          {editOperatorError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {editOperatorError}
            </p>
          )}

          <OptionList
            options={filteredOperators.map((op) => ({
              value: op.name,
              label: op.name,
            }))}
            value={editingOperatorName}
            onChange={(val) => {
              setEditingOperatorName(String(val));
              if (editOperatorError) setEditOperatorError('');
            }}
            emptyMessage="Tidak ada operator yang ditemukan."
          />
        </div>
      )}
    </Modal>
  );
}
