'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToast } from '@/context/ToastContext';
import {
  procurementService,
  PurchaseOrderResponse,
} from '@/services/procurement.service';
import { AlertTriangle, PackageCheck } from 'lucide-react';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrderResponse | null;
  onSuccess: () => void;
}

export function ReceiveGoodsModal({
  isOpen,
  onClose,
  po,
  onSuccess,
}: ReceiveGoodsModalProps) {
  const { toast } = useToast();
  const [receiveSelections, setReceiveSelections] = useState<
    Record<number, { checked: boolean; receivedQty: number | '' }>
  >({});
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && po) {
      setErrorMsg('');
      const initial: Record<number, { checked: boolean; receivedQty: number | '' }> = {};
      po.items.forEach((item) => {
        const remaining = Math.max(0, item.remaining_qty ?? item.qty - (item.received_qty || 0));
        initial[item.material_id] = {
          checked: false,
          receivedQty: remaining,
        };
      });
      setReceiveSelections(initial);
    }
  }, [isOpen, po]);

  if (!po) return null;

  const remainingItems = po.items.filter(
    (i) => Math.max(0, i.remaining_qty ?? i.qty - (i.received_qty || 0)) > 0
  );
  const allChecked =
    remainingItems.length > 0 &&
    remainingItems.every((i) => receiveSelections[i.material_id]?.checked);
  const someChecked = remainingItems.some(
    (i) => receiveSelections[i.material_id]?.checked
  );

  const handleSubmit = async () => {
    setErrorMsg('');
    const checkedEntries = Object.entries(receiveSelections).filter(
      ([_, val]) => val.checked
    );

    if (checkedEntries.length === 0) {
      setErrorMsg('Pilih minimal satu barang yang diterima.');
      return;
    }

    const itemsToReceive: { material_id: number; qty: number }[] = [];
    for (const [matIdStr, val] of checkedEntries) {
      const matId = Number(matIdStr);
      const poItem = po.items.find((i) => i.material_id === matId);
      const remaining = poItem
        ? Math.max(0, poItem.remaining_qty ?? poItem.qty - (poItem.received_qty || 0))
        : 0;
      const qtyNum =
        typeof val.receivedQty === 'number'
          ? val.receivedQty
          : parseFloat(String(val.receivedQty || 0));

      if (isNaN(qtyNum) || qtyNum <= 0) {
        setErrorMsg(
          `Kuantitas untuk item "${poItem?.material_name}" harus lebih besar dari 0.`
        );
        return;
      }
      if (qtyNum > remaining) {
        setErrorMsg(
          `Kuantitas untuk "${poItem?.material_name}" (${qtyNum}) melebihi sisa yang belum diterima (${remaining}).`
        );
        return;
      }
      itemsToReceive.push({ material_id: matId, qty: qtyNum });
    }

    setIsSubmitting(true);
    try {
      const res = await procurementService.receivePO(po.id, {
        received_items: itemsToReceive,
      });

      if (res.data) {
        const isPartial = res.data.status === 'PARTIALLY_RECEIVED';
        if (isPartial) {
          toast.success(
            'Diterima Sebagian',
            `Penerimaan barang PO ${po.po_number} berhasil dicatat.`
          );
        } else {
          toast.success(
            'Penerimaan Selesai',
            `Seluruh barang PO ${po.po_number} telah lengkap diterima di gudang.`
          );
        }
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to receive goods:', err);
      setErrorMsg(
        err?.response?.data?.message || err?.message || 'Gagal mencatat penerimaan barang.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Terima Barang - PO #${po.po_number}`}
      size="lg"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <PackageCheck className="h-4 w-4 mr-1.5" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Penerimaan'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <span className="text-slate-400">Vendor:</span>{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">
              {po.supplier}
            </strong>
          </div>
          <div className="text-slate-500">
            Centang item yang diterima, lalu masukkan kuantitas barang masuk.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs">
                <th className="pb-3 pr-3 text-left w-10">
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={(checked) => {
                      setReceiveSelections((prev) => {
                        const next = { ...prev };
                        remainingItems.forEach((i) => {
                          const rem = Math.max(
                            0,
                            i.remaining_qty ?? i.qty - (i.received_qty || 0)
                          );
                          next[i.material_id] = {
                            checked,
                            receivedQty: rem,
                          };
                        });
                        return next;
                      });
                    }}
                  />
                </th>
                <th className="pb-3 pr-3 text-left font-medium text-slate-500">Nama Barang</th>
                <th className="pb-3 pr-3 text-center font-medium text-slate-500">Total PO</th>
                <th className="pb-3 pr-3 text-center font-medium text-slate-500">Sisa Belum Diterima</th>
                <th className="pb-3 text-right font-medium text-slate-500 w-48">Kuantitas Diterima</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => {
                const remaining = Math.max(
                  0,
                  item.remaining_qty ?? item.qty - (item.received_qty || 0)
                );
                const isCompleted = remaining <= 0;
                const sel = receiveSelections[item.material_id] || {
                  checked: false,
                  receivedQty: remaining,
                };

                return (
                  <tr
                    key={item.material_id}
                    className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <td className="py-3 pr-3">
                      <Checkbox
                        disabled={isCompleted}
                        checked={sel.checked}
                        onChange={(checked) => {
                          setReceiveSelections((prev) => ({
                            ...prev,
                            [item.material_id]: {
                              checked,
                              receivedQty: remaining,
                            },
                          }));
                        }}
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.material_name}
                      </div>
                      {item.received_qty && item.received_qty > 0 ? (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Sudah diterima:{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.received_qty} {item.unit}
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 text-center font-mono text-xs">
                      {item.qty} {item.unit}
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span
                        className={`font-mono text-xs font-semibold ${
                          remaining === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {remaining} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {isCompleted ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Lengkap
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <div className="w-32">
                            <Input
                              inputSize="sm"
                              type="number"
                              step="any"
                              min={0.01}
                              max={remaining}
                              value={sel.receivedQty}
                              onChange={(e) => {
                                const val =
                                  e.target.value === ''
                                    ? ''
                                    : Math.min(
                                        remaining,
                                        Math.max(0, parseFloat(e.target.value))
                                      );
                                setReceiveSelections((prev) => ({
                                  ...prev,
                                  [item.material_id]: {
                                    ...prev[item.material_id],
                                    receivedQty: val,
                                  },
                                }));
                              }}
                              placeholder={String(remaining)}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Maks: {remaining} {item.unit}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
