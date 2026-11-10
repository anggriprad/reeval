'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface RejectComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  rejectionReason: string;
  rejectionError: string;
  onChangeReason: (value: string) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function RejectComplaintModal({
  isOpen,
  onClose,
  rejectionReason,
  rejectionError,
  onChangeReason,
  onConfirm,
  isSubmitting = false,
}: RejectComplaintModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tolak Komplain"
      size="md"
      actions={
        <Button
          size="lg"
          variant="danger"
          className="w-full"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          Tolak Komplain
        </Button>
      }
    >
      <div className="space-y-4 text-[13.5px] md:text-xs">
        <Textarea
          label="Alasan Penolakan"
          required
          rows={3}
          value={rejectionReason}
          onChange={e => onChangeReason(e.target.value)}
          placeholder="Tuliskan alasan penolakan..."
          error={rejectionError}
        />
      </div>
    </Modal>
  );
}
