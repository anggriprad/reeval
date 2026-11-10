'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Table, type TableColumn } from '@/components/ui/Table';
import { useToast } from '@/context/ToastContext';
import { useApp } from '@/context/AppContext';
import {
  procurementService,
  PurchaseOrderResponse,
  PurchaseOrderItemResponse,
} from '@/services/procurement.service';
import { AlertTriangle, PackageCheck } from 'lucide-react';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrderResponse | null;
  onSuccess: (updatedStatus?: string) => void;
}

export function ReceiveGoodsModal({
  isOpen,
  onClose,
  po,
  onSuccess,
}: ReceiveGoodsModalProps) {
  const { toast } = useToast();
  const { receivePO } = useApp();
  const [receiveSelections, setReceiveSelections] = useState<
    Record<number, { checked: boolean; receivedQty: number | string }>
  >({});
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const poItems = po?.items || [];

  const remainingItems = useMemo(
    () =>
      poItems.filter(
        (i) => Math.max(0, i.remaining_qty ?? i.qty - (i.received_qty || 0)) > 0
      ),
    [poItems]
  );

  const allChecked =
    remainingItems.length > 0 &&
    remainingItems.every((i) => receiveSelections[i.material_id]?.checked);
  const someChecked = remainingItems.some(
    (i) => receiveSelections[i.material_id]?.checked
  );

  useEffect(() => {
    if (isOpen && po) {
      setErrorMsg('');
      const initial: Record<number, { checked: boolean; receivedQty: number | string }> = {};
      (po.items || []).forEach((item) => {
        const remaining = Math.max(0, item.remaining_qty ?? item.qty - (item.received_qty || 0));
        const hasQty = remaining > 0;
        initial[item.material_id] = {
          checked: hasQty,
          receivedQty: hasQty ? remaining : 0,
        };
      });
      setReceiveSelections(initial);
    }
  }, [isOpen, po]);

  const handleSubmit = async () => {
    if (!po) return;
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
      const poItem = (po.items || []).find((i) => i.material_id === matId);
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

      receivePO(
        String(po.id),
        itemsToReceive.map((i) => ({
          materialId: String(i.material_id),
          qty: i.qty,
        }))
      );

      const allFullyReceived = (po.items || []).every((item) => {
        const receivedNow = itemsToReceive.find((r) => r.material_id === item.material_id)?.qty || 0;
        const alreadyReceived = item.received_qty || 0;
        return alreadyReceived + receivedNow >= item.qty;
      });

      const updatedStatus = allFullyReceived
        ? 'RECEIVED'
        : (res?.data?.status || 'PARTIALLY_RECEIVED');

      const isPartial = updatedStatus === 'PARTIALLY_RECEIVED';

      if (isPartial) {
        toast.success(
          'Diterima Sebagian',
          'Penerimaan sebagian barang berhasil dicatat.'
        );
      } else {
        toast.success(
          'Diterima Penuh',
          'Seluruh barang pengadaan berhasil diterima.'
        );
      }

      onSuccess(updatedStatus);
      onClose();
    } catch (err: any) {
      console.error('Failed to receive goods:', err);
      setErrorMsg(
        err?.response?.data?.message || err?.message || 'Gagal mencatat penerimaan barang.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: TableColumn<PurchaseOrderItemResponse>[] = useMemo(
    () => [
      {
        key: 'select',
        width: '44px',
        align: 'left',
        header: (
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
                  const currentQty = prev[i.material_id]?.receivedQty;
                  const numQty =
                    typeof currentQty === 'number'
                      ? currentQty
                      : parseFloat(String(currentQty || 0));
                  next[i.material_id] = {
                    checked,
                    receivedQty: checked
                      ? (!isNaN(numQty) && numQty > 0 ? numQty : rem)
                      : 0,
                  };
                });
                return next;
              });
            }}
          />
        ),
        cell: (item) => {
          const remaining = Math.max(
            0,
            item.remaining_qty ?? item.qty - (item.received_qty || 0)
          );
          const isCompleted = remaining <= 0;
          const sel = receiveSelections[item.material_id] || {
            checked: false,
            receivedQty: 0,
          };

          return (
            <Checkbox
              disabled={isCompleted}
              checked={sel.checked}
              onChange={(checked) => {
                setReceiveSelections((prev) => {
                  const currentQty = prev[item.material_id]?.receivedQty;
                  const numQty =
                    typeof currentQty === 'number'
                      ? currentQty
                      : parseFloat(String(currentQty || 0));
                  return {
                    ...prev,
                    [item.material_id]: {
                      checked,
                      receivedQty: checked
                        ? (!isNaN(numQty) && numQty > 0 ? numQty : remaining)
                        : 0,
                    },
                  };
                });
              }}
            />
          );
        },
      },
      {
        key: 'name',
        header: 'Nama Barang',
        align: 'left',
        cell: (item) => (
          <span className="text-sm text-slate-900 dark:text-white block">
            {item.material_name}
          </span>
        ),
      },
      {
        key: 'qty',
        header: 'Qty',
        width: '160px',
        cell: (item) => (
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {item.qty} {item.unit}
          </span>
        ),
      },
      {
        key: 'remaining',
        header: 'Sisa',
        width: '160px',
        cell: (item) => {
          const remaining = Math.max(
            0,
            item.remaining_qty ?? item.qty - (item.received_qty || 0)
          );
          return (
            <span
              className={`text-sm ${remaining === 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
                }`}
            >
              {remaining} {item.unit}
            </span>
          );
        },
      },
      {
        key: 'receivedQty',
        header: 'Diterima',
        width: '160px',
        cell: (item) => {
          const remaining = Math.max(
            0,
            item.remaining_qty ?? item.qty - (item.received_qty || 0)
          );
          const isCompleted = remaining <= 0;
          const sel = receiveSelections[item.material_id] || {
            checked: false,
            receivedQty: 0,
          };

          if (isCompleted) {
            return (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">
                Lengkap
              </span>
            );
          }

          return (
            <div className="flex flex-col items-end">
              <div className="w-36">
                <Input
                  type="number"
                  step="any"
                  min={0}
                  max={remaining}
                  value={sel.receivedQty}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setReceiveSelections((prev) => ({
                        ...prev,
                        [item.material_id]: {
                          checked: false,
                          receivedQty: '',
                        },
                      }));
                      return;
                    }
                    const parsed = parseFloat(raw);
                    if (isNaN(parsed) || parsed === 0) {
                      setReceiveSelections((prev) => ({
                        ...prev,
                        [item.material_id]: {
                          checked: false,
                          receivedQty: raw === '0' ? 0 : raw,
                        },
                      }));
                      return;
                    }
                    const qty = Math.min(remaining, Math.max(0, parsed));
                    setReceiveSelections((prev) => ({
                      ...prev,
                      [item.material_id]: {
                        checked: qty > 0,
                        receivedQty: raw.endsWith('.') || raw.endsWith('.0') ? raw : qty,
                      },
                    }));
                  }}
                  placeholder={String(remaining)}
                  suffix={item.unit}
                />
              </div>
            </div>
          );
        },
      },
    ],
    [allChecked, someChecked, remainingItems, receiveSelections]
  );

  if (!po) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Terima Barang`}
      size="xl"
      actions={[
        <Button key="submit" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan...' : 'Simpan Penerimaan'}
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

        <Table
          dense
          columns={columns}
          data={poItems}
          keyExtractor={(item) => item.material_id}
        />
      </div>
    </Modal>
  );
}
