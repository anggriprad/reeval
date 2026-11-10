'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ManualResolveComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
  onChangeNotes: (value: string) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function ManualResolveComplaintModal({
  isOpen,
  onClose,
  notes,
  onChangeNotes,
  onConfirm,
  isSubmitting = false,
}: ManualResolveComplaintModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tandai Selesai Manual"
      size="md"
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isSubmitting}>
            Tandai Selesai
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-[13.5px] md:text-xs">
        <Input
          label="Catatan Penyelesaian (Opsional)"
          placeholder="Keterangan kesepakatan atau penyelesaian..."
          value={notes}
          onChange={e => onChangeNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
