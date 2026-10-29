'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptionList } from '@/components/ui/OptionList';
import { useToast } from '@/context/ToastContext';
import { Search, Loader2 } from 'lucide-react';
import { workOrderService } from '@/services/work-order.service';
import type { JobCard, ProductionOperator } from '@/lib/types';

interface AssignOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  target: { woId: string; jc: JobCard } | null;
  operators: ProductionOperator[];
}

export function AssignOperatorModal({
  isOpen,
  onClose,
  onSuccess,
  target,
  operators,
}: AssignOperatorModalProps) {
  const { toast } = useToast();
  const [editingOperatorName, setEditingOperatorName] = useState('');
  const [editOperatorSearch, setEditOperatorSearch] = useState('');
  const [editOperatorError, setEditOperatorError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (target?.jc.picName) {
      setEditingOperatorName(target.jc.picName);
    } else {
      setEditingOperatorName('');
    }
  }, [target]);

  const activeOperators = useMemo(
    () => operators.filter((o) => o.status === 'ACTIVE'),
    [operators]
  );

  const filteredOperators = useMemo(() => {
    if (!editOperatorSearch.trim()) return activeOperators;
    const q = editOperatorSearch.toLowerCase();
    return activeOperators.filter((o) => o.name.toLowerCase().includes(q));
  }, [activeOperators, editOperatorSearch]);

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

    const foundOp = operators.find((o) => o.name === picName);
    setIsSubmitting(true);
    try {
      const res = await workOrderService.assignJobCardOperator(
        Number(target.woId),
        Number(target.jc.id),
        {
          operator_id: foundOp?.id ? Number(foundOp.id) : undefined,
          pic_name: picName,
        }
      );

      if (res.success) {
        toast.success(
          'Operator Diperbarui',
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
