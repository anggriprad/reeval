'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { ActionMenu } from '@/components/ui/ActionMenu';
import {
  formatCurrency,
  formatDateTime,
  getPOStatusLabel,
  getPOStatusVariant,
} from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import {
  procurementService,
  PurchaseOrderResponse,
  PurchaseOrderStatusHistoryResponse,
} from '@/services/procurement.service';
import { ProcurementModal, ReceiveGoodsModal, CancelPOModal } from '../../components';
import type { PurchaseOrder, POStatus, BankAccount } from '@/lib/types';
import {
  bankAccountService,
  mapBankAccountOptionToBankAccount,
} from '@/services/bank-account.service';
import {
  Check,
  XCircle,
  Ban,
  PackageCheck,
  X,
} from 'lucide-react';

export default function ProcurementDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can, isSuperAdmin, canSeePurchasingCosts } = usePermission();

  const {
    currentUser,
    purchaseOrders,
    materials,
    orderPO,
    rejectPO,
    cancelPO,
    cancelRemainingPO,
    receivePO,
  } = useApp();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    let isMounted = true;
    bankAccountService
      .getOptions()
      .then((res) => {
        if (!isMounted || !Array.isArray(res.data)) return;
        setBankAccounts(res.data.map(mapBankAccountOptionToBankAccount));
      })
      .catch(() => {
        // Fallback to context bankAccounts when offline
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const canExecuteCommercial = can(PERMISSIONS.PURCHASING.ORDER);
  const canReceivePhysical = can(PERMISSIONS.PURCHASING.RECEIVE);
  const canReject = can(PERMISSIONS.PURCHASING.REJECT);
  const canCancel = can(PERMISSIONS.PURCHASING.CANCEL);
  const canShowCosts = canSeePurchasingCosts;

  const initialPo = purchaseOrders.find((p) => p.id === id || p.poNumber === id);
  const [fetchedPO, setFetchedPO] = useState<PurchaseOrder | null>(null);
  const [rawPOResponse, setRawPOResponse] = useState<PurchaseOrderResponse | null>(null);
  const [histories, setHistories] = useState<PurchaseOrderStatusHistoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(!initialPo);

  const fetchPO = useCallback(async () => {
    try {
      const res = await procurementService.getProcurementById(id);
      if (res.data) {
        const p = res.data;
        setRawPOResponse(p);
        if (p.histories && Array.isArray(p.histories) && p.histories.length > 0) {
          setHistories(p.histories);
        }
        const mapped: PurchaseOrder = {
          id: String(p.id),
          poNumber: p.po_number,
          supplier: p.supplier,
          createdBy: p.created_by_user?.full_name || p.created_by || "-",
          orderedBy: p.ordered_by,
          orderedAt: p.ordered_at,
          purchaseType: p.purchase_type as 'PO' | 'DIRECT',
          status: p.status as POStatus,
          paymentStatus: (p.payment_status || 'UNPAID') as 'UNPAID' | 'PAID',
          totalAmount: p.total_amount,
          additionalCost: p.additional_cost,
          bankAccountId: p.bank_account_id ? String(p.bank_account_id) : undefined,
          receivedAt: p.received_at || undefined,
          paidAt: p.paid_at || undefined,
          cancelReason: p.cancel_reason,
          cancelledBy: p.cancelled_by,
          cancelledAt: p.cancelled_at || undefined,
          rejectionReason: p.rejection_reason,
          rejectedBy: p.rejected_by,
          rejectedAt: p.rejected_at || undefined,
          createdAt: p.created_at,
          items: (p.items || []).map((it) => ({
            materialId: String(it.material_id),
            materialName: it.material_name,
            qty: it.qty,
            unitCost: it.unit_cost,
            unit: it.unit,
            receivedQty: it.received_qty,
          })),
        };
        setFetchedPO(mapped);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch PO from API:', err);
    } finally {
      setIsLoading(false);
    }

    try {
      const hRes = await procurementService.getHistories(id);
      if (hRes.data && Array.isArray(hRes.data) && hRes.data.length > 0) {
        setHistories(hRes.data);
      }
    } catch {
      // Endpoint histories optional jika sudah termasuk di getProcurementById
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPO();
  }, [fetchPO]);

  const po = fetchedPO || initialPo;

  // Adaptasi PurchaseOrder ke PurchaseOrderResponse untuk ReceiveGoodsModal
  const receiveModalPO: PurchaseOrderResponse | null = useMemo(() => {
    if (rawPOResponse) return rawPOResponse;
    if (!po) return null;
    return {
      id: Number(po.id) || 0,
      po_number: po.poNumber,
      supplier: po.supplier || '-',
      created_by: po.createdBy || '',
      purchase_type: po.purchaseType || 'PO',
      status: po.status,
      payment_status: po.paymentStatus || 'UNPAID',
      total_amount: po.totalAmount || 0,
      additional_cost: po.additionalCost || 0,
      bank_account_id: po.bankAccountId ? Number(po.bankAccountId) : null,
      received_at: po.receivedAt || null,
      paid_at: po.paidAt || null,
      created_at: po.createdAt || new Date().toISOString(),
      updated_at: po.createdAt || new Date().toISOString(),
      items: (po.items || []).map((it, idx) => ({
        id: idx + 1,
        material_id: Number(it.materialId) || idx + 1,
        material_name: it.materialName,
        unit: it.unit || 'unit',
        qty: it.qty,
        received_qty: it.receivedQty || 0,
        remaining_qty: Math.max(0, it.qty - (it.receivedQty || 0)),
        unit_cost: it.unitCost || 0,
        subtotal: it.qty * (it.unitCost || 0),
      })),
    };
  }, [rawPOResponse, po]);

  // State Modal Fase 2 (Proses Pengadaan Draft)
  const [showExecuteDraftModal, setShowExecuteDraftModal] = useState(false);

  // State Modal Terima Barang
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // State Modal Tolak / Batalkan Pengadaan
  const [cancelModalMode, setCancelModalMode] = useState<'REJECT' | 'CANCEL_DRAFT' | 'CANCEL_ORDERED' | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <PageHeader
          backHref="/inventory?tab=procurement"
          title="Memuat Pengadaan..."
        />
        <Card className="p-8 text-center text-slate-500 text-sm">
          Memuat data pengadaan dari server...
        </Card>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <PageHeader
          backHref="/inventory?tab=procurement"
          title="Detail Pengadaan"
        />
        <EmptyState
          title="Pengadaan Tidak Ditemukan"
          description={`Data pengadaan dengan referensi "${id}" tidak ditemukan atau telah dihapus.`}
          action={
            <Button onClick={() => router.push('/inventory?tab=procurement')}>
              Kembali ke Daftar Pengadaan
            </Button>
          }
        />
      </div>
    );
  }

  const isDraft = po.status === 'DRAFT';
  const isOrdered = po.status === 'ORDERED';
  const isPartiallyReceived = po.status === 'PARTIALLY_RECEIVED';
  const isRejected = po.status === 'REJECTED';
  const isCanceled = po.status === 'CANCELED';
  const isDirect = po.purchaseType === 'DIRECT';

  const isOwner = Boolean(
    (currentUser?.id && rawPOResponse?.created_by_id && String(rawPOResponse.created_by_id) === String(currentUser.id).trim()) ||
    (currentUser?.id && rawPOResponse?.created_by_user?.id && String(rawPOResponse.created_by_user.id) === String(currentUser.id).trim()) ||
    (currentUser?.email && rawPOResponse?.created_by_user?.email && rawPOResponse.created_by_user.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
    ((po.createdBy || rawPOResponse?.created_by) && (
      (currentUser?.name && String(po.createdBy || rawPOResponse?.created_by).toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
      (currentUser?.id && String(po.createdBy || rawPOResponse?.created_by).trim() === String(currentUser.id).trim()) ||
      (currentUser?.email && String(po.createdBy || rawPOResponse?.created_by).toLowerCase().trim() === currentUser.email.toLowerCase().trim())
    ))
  );
  const canCancelDraft = canCancel && (isOwner || isSuperAdmin);
  const canCancelCommercial = canCancel && (canExecuteCommercial || isSuperAdmin);

  const bankAccount = po.bankAccountId
    ? bankAccounts.find((b) => b.id === po.bankAccountId)
    : undefined;

  // Derivasi data persetujuan & riwayat transaksi
  const orderHistory =
    rawPOResponse?.histories?.find((h) => h.action === 'ORDER' || h.to_status === 'ORDERED') ||
    histories.find((h) => h.action === 'ORDER' || h.to_status === 'ORDERED');

  const rejectHistory =
    rawPOResponse?.histories?.find((h) => h.action === 'REJECT' || h.to_status === 'REJECTED') ||
    histories.find((h) => h.action === 'REJECT' || h.to_status === 'REJECTED');

  const cancelHistory =
    rawPOResponse?.histories?.find((h) => h.action === 'CANCEL' || h.to_status === 'CANCELED') ||
    histories.find((h) => h.action === 'CANCEL' || h.to_status === 'CANCELED');

  const approvedBy = orderHistory?.actor_name || po.orderedBy || null;
  const approvedAt = orderHistory?.created_at || po.orderedAt || null;

  const rejectedBy = po.rejectedBy || rejectHistory?.actor_name || null;
  const rejectedAt = po.rejectedAt || rejectHistory?.created_at || null;

  const cancelledBy = po.cancelledBy || cancelHistory?.actor_name || null;
  const cancelledAt = po.cancelledAt || cancelHistory?.created_at || null;

  // Derivasi data persetujuan & keputusan
  let decisionPersonLabel = 'Disetujui oleh';
  let decisionPersonValue = approvedBy || '-';
  let decisionDateLabel = 'Disetujui pada';
  let decisionDateValue = approvedAt ? formatDateTime(approvedAt) : '-';
  let decisionReasonLabel = '';
  let decisionReason = '';

  if (isRejected) {
    decisionPersonLabel = 'Ditolak oleh';
    decisionPersonValue = rejectedBy || '-';
    decisionDateLabel = 'Ditolak pada';
    decisionDateValue = rejectedAt ? formatDateTime(rejectedAt) : '-';
    decisionReasonLabel = 'Alasan penolakan';
    decisionReason = po.rejectionReason || rejectHistory?.notes || '';
  } else if (isCanceled) {
    decisionPersonLabel = 'Dibatalkan oleh';
    decisionPersonValue = cancelledBy || '-';
    decisionDateLabel = 'Dibatalkan pada';
    decisionDateValue = cancelledAt ? formatDateTime(cancelledAt) : '-';
    decisionReasonLabel = 'Alasan pembatalan';
    decisionReason = po.cancelReason || cancelHistory?.notes || '';
  } else if (isDraft) {
    decisionPersonLabel = 'Disetujui oleh';
    decisionPersonValue = '-';
    decisionDateLabel = 'Disetujui pada';
    decisionDateValue = '-';
  }

  const vendorDisplay = isDraft || !po.supplier || po.supplier === '-' ? '-' : po.supplier;
  const purchaseTypeDisplay = isDraft
    ? '-'
    : isDirect
      ? 'Pembelian Langsung (Tunai)'
      : 'Purchase Order (PO)';

  const hasDecisionDate = Boolean(decisionDateValue && decisionDateValue !== '-');
  const hasDecisionPerson = Boolean(decisionPersonValue && decisionPersonValue !== '-');
  const hasPurchaseType = Boolean(purchaseTypeDisplay && purchaseTypeDisplay !== '-');
  const hasVendor = Boolean(vendorDisplay && vendorDisplay !== '-');
  const hasBankAccount = Boolean(!isDraft && canShowCosts && bankAccount?.name);
  const hasDecisionReason = Boolean(decisionReason && decisionReason.trim());

  const hasSecondaryInfo =
    hasDecisionDate ||
    hasDecisionPerson ||
    hasPurchaseType ||
    hasVendor ||
    hasBankAccount ||
    hasDecisionReason;

  interface TimelineEvent {
    id: string;
    title: string;
    actor?: string;
    timestamp?: string;
    notes?: string;
    status: 'completed' | 'current' | 'pending' | 'danger';
  }

  const timelineEvents: TimelineEvent[] = (() => {
    if (histories.length > 0) {
      const sorted = [...histories].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return sorted.map((h, idx) => {
        const isLast = idx === sorted.length - 1;
        let title = 'Perubahan Status';
        let status: TimelineEvent['status'] = 'completed';

        if (h.action === 'CREATE' || h.to_status === 'DRAFT') {
          title = 'Pengadaan Dibuat';
        } else if (h.action === 'ORDER' || h.to_status === 'ORDERED') {
          title = 'Pengadaan Disetujui';
        } else if (h.action === 'RECEIVE' || h.to_status === 'PARTIALLY_RECEIVED') {
          title = 'Barang Diterima Sebagian';
        } else if (h.action === 'RECEIVE' || h.to_status === 'RECEIVED') {
          title = 'Seluruh Barang Diterima';
        } else if (h.action === 'REJECT' || h.to_status === 'REJECTED') {
          title = 'Pengadaan Ditolak';
          status = 'danger';
        } else if (h.action === 'CANCEL' || h.to_status === 'CANCELED') {
          title = 'Pengadaan Dibatalkan';
          status = 'danger';
        } else if (h.action === 'CANCEL_REMAINING') {
          title = 'Sisa Pesanan Dibatalkan';
          status = 'danger';
        }

        if (isLast && status !== 'danger' && po.status !== 'RECEIVED') {
          status = 'current';
        }

        return {
          id: `history-${h.id || idx}`,
          title,
          actor: h.actor_name,
          timestamp: h.created_at,
          notes: h.notes,
          status,
        };
      });
    }

    // Fallback: derive actual lifecycle events from po state if histories API is not available
    const events: TimelineEvent[] = [];

    // 1. Pengadaan Dibuat
    events.push({
      id: 'step-created',
      title: 'Pengadaan Dibuat',
      actor: po.createdBy || '-',
      timestamp: po.createdAt,
      status: isDraft ? 'current' : 'completed',
    });

    // 2. Persetujuan / Penolakan / Pembatalan
    if (isRejected) {
      events.push({
        id: 'step-rejected',
        title: 'Pengadaan Ditolak',
        actor: rejectedBy || '-',
        timestamp: rejectedAt || undefined,
        notes: po.rejectionReason,
        status: 'danger',
      });
    } else if (isCanceled) {
      events.push({
        id: 'step-canceled',
        title: 'Pengadaan Dibatalkan',
        actor: cancelledBy || '-',
        timestamp: cancelledAt || undefined,
        notes: po.cancelReason,
        status: 'danger',
      });
    } else if (isDraft) {
      events.push({
        id: 'step-pending-order',
        title: 'Menunggu Persetujuan',
        status: 'pending',
      });
    } else {
      // ORDERED, PARTIALLY_RECEIVED, RECEIVED
      events.push({
        id: 'step-ordered',
        title: 'Pengadaan Disetujui',
        actor: approvedBy || '-',
        timestamp: approvedAt || undefined,
        status: isOrdered ? 'current' : 'completed',
      });

      // 3. Penerimaan Fisik
      if (isPartiallyReceived) {
        events.push({
          id: 'step-partial-receive',
          title: 'Barang Diterima Sebagian',
          timestamp: po.receivedAt,
          status: 'current',
        });
      } else if (po.status === 'RECEIVED') {
        events.push({
          id: 'step-received',
          title: 'Seluruh Barang Diterima',
          timestamp: po.receivedAt,
          status: 'completed',
        });
      } else {
        events.push({
          id: 'step-pending-receive',
          title: 'Menunggu Penerimaan Barang',
          status: 'pending',
        });
      }
    }

    return events;
  })();

  const draftPOForModal: PurchaseOrderResponse = rawPOResponse || {
    id: Number(po.id) || 0,
    po_number: po.poNumber,
    supplier: po.supplier && po.supplier !== '-' ? po.supplier : '',
    created_by: po.createdBy || '',
    purchase_type: po.purchaseType || 'PO',
    status: po.status,
    payment_status: po.paymentStatus || 'UNPAID',
    total_amount: po.totalAmount,
    additional_cost: po.additionalCost || 0,
    created_at: po.createdAt,
    updated_at: po.createdAt,
    items: po.items.map((it, idx) => ({
      id: idx + 1,
      material_id: Number(it.materialId),
      material_name: it.materialName,
      unit: it.unit || 'unit',
      qty: it.qty,
      received_qty: it.receivedQty || 0,
      remaining_qty: Math.max(0, it.qty - (it.receivedQty || 0)),
      unit_cost: it.unitCost,
      subtotal: it.qty * it.unitCost,
    })),
  };

  // Handler: Buka Modal Terima Barang
  const openReceiveModal = () => {
    setShowReceiveModal(true);
  };

  // Handler: Batalkan Sisa PO
  const handleCancelRemaining = async () => {
    const ok = await confirm({
      title: 'Batalkan Sisa PO',
      message: `Apakah Anda yakin ingin membatalkan sisa barang yang belum tiba untuk pengadaan "${po.poNumber}"? Sisa barang tidak akan dapat diterima lagi.`,
      confirmText: 'Batalkan Sisa PO',
      variant: 'danger',
    });
    if (ok) {
      try {
        await procurementService.cancelRemainingPO(po.id, { reason: 'Sisa pesanan dibatalkan' });
        cancelRemainingPO(po.id);
        fetchPO();
        toast.success('Sisa PO Dibatalkan', `Sisa barang pengadaan ${po.poNumber} berhasil dibatalkan.`);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error('Gagal Membatalkan Sisa PO', error.response?.data?.message || error.message || 'Terjadi kesalahan.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        backHref="/inventory?tab=procurement"
        title={
          <div className="flex items-center gap-3">
            <span>{po.poNumber}</span>
            <Badge variant={getPOStatusVariant(po.status)}>
              {getPOStatusLabel(po.status)}
            </Badge>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          {isDraft && (
            <div className="flex items-center gap-2">
              {canExecuteCommercial && (
                <Button
                  variant="primary"
                  onClick={() => setShowExecuteDraftModal(true)}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Proses & Pesan
                </Button>
              )}
              {(canReject || canCancelDraft) && (
                <ActionMenu
                  triggerSize="md"
                  menuWidth="w-max min-w-[130px]"
                  items={[
                    ...(canReject
                      ? [
                        {
                          label: 'Tolak PO',
                          icon: <Ban className="h-3.5 w-3.5" />,
                          variant: 'danger' as const,
                          onClick: () => setCancelModalMode('REJECT'),
                        },
                      ]
                      : []),
                    ...(canCancelDraft
                      ? [
                        {
                          label: 'Batalkan PO',
                          icon: <XCircle className="h-3.5 w-3.5" />,
                          variant: 'danger' as const,
                          onClick: () => setCancelModalMode('CANCEL_DRAFT'),
                        },
                      ]
                      : []),
                  ]}
                />
              )}
            </div>
          )}

          {(isOrdered || isPartiallyReceived) && (
            <div className="flex items-center gap-2">
              {canReceivePhysical && (
                <Button
                  variant="primary"
                  onClick={openReceiveModal}
                >
                  <PackageCheck className="h-4 w-4 mr-1.5" />
                  Terima Barang
                </Button>
              )}
              {canCancelCommercial && (
                <ActionMenu
                  triggerSize="md"
                  menuWidth="w-max min-w-[130px]"
                  items={[
                    isOrdered
                      ? {
                        label: 'Batalkan PO',
                        icon: <XCircle className="h-3.5 w-3.5" />,
                        variant: 'danger',
                        onClick: () => setCancelModalMode('CANCEL_ORDERED'),
                      }
                      : {
                        label: 'Batalkan Sisa PO',
                        icon: <Ban className="h-3.5 w-3.5" />,
                        variant: 'danger',
                        onClick: handleCancelRemaining,
                      },
                  ]}
                />
              )}
            </div>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="space-y-3">
            <Card className="p-0 overflow-hidden">
              <Table
                data={po.items}
                keyExtractor={(item) => item.materialId}
                columns={[
                  {
                    key: 'materialName',
                    header: 'Nama Item',
                    cell: (item: PurchaseOrder['items'][number]) => {
                      const mat = materials.find((m) => m.id === item.materialId);
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-900 dark:text-white">
                            {item.materialName}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'qty',
                    header: 'Qty',
                    align: 'right' as const,
                    cell: (item: PurchaseOrder['items'][number]) => {
                      const mat = materials.find((m) => m.id === item.materialId);
                      const unit = item.unit || mat?.unit || 'unit';
                      return (
                        <span className="text-slate-600 dark:text-slate-400">
                          {item.qty} {unit}
                        </span>
                      );
                    },
                  },
                  ...(!isDraft
                    ? [
                      {
                        key: 'receivedQty',
                        header: 'Diterima',
                        align: 'right' as const,
                        cell: (item: PurchaseOrder['items'][number]) => {
                          const mat = materials.find((m) => m.id === item.materialId);
                          const unit = item.unit || mat?.unit || 'unit';
                          const received = item.receivedQty || 0;
                          const isComplete = received >= item.qty;

                          return (
                            <span
                              className={`${isComplete
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : received > 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                              {received} {unit}
                            </span>
                          );
                        },
                      },
                    ]
                    : []),
                  ...(canShowCosts
                    ? [
                      {
                        key: 'unitCost',
                        header: 'Harga Satuan',
                        align: 'right' as const,
                        cell: (item: PurchaseOrder['items'][number]) => {
                          const mat = materials.find((m) => m.id === item.materialId);
                          const effectiveCost =
                            item.unitCost > 0 ? item.unitCost : mat?.unitCost || 0;
                          return (
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {effectiveCost > 0 ? formatCurrency(effectiveCost) : '-'}
                            </span>
                          );
                        },
                      },
                      {
                        key: 'subtotal',
                        header: 'Subtotal',
                        align: 'right' as const,
                        cell: (item: PurchaseOrder['items'][number]) => {
                          const mat = materials.find((m) => m.id === item.materialId);
                          const effectiveCost =
                            item.unitCost > 0 ? item.unitCost : mat?.unitCost || 0;
                          return (
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {effectiveCost > 0
                                ? formatCurrency(item.qty * effectiveCost)
                                : '-'}
                            </span>
                          );
                        },
                      },
                    ]
                    : []),
                ]}
              />
            </Card>
          </div>

          {canShowCosts && (() => {
            const computedItemsSubtotal = po.items.reduce((sum, it) => {
              const mat = materials.find((m) => m.id === it.materialId);
              const effectiveCost = it.unitCost > 0 ? it.unitCost : mat?.unitCost || 0;
              return sum + it.qty * effectiveCost;
            }, 0);
            const subtotalAmount =
              po.totalAmount > 0
                ? po.totalAmount - (po.additionalCost || 0)
                : computedItemsSubtotal;
            const finalTotalAmount =
              po.totalAmount > 0
                ? po.totalAmount
                : computedItemsSubtotal + (po.additionalCost || 0);

            if (finalTotalAmount <= 0) return null;

            return (
              <Card className="p-4 sm:p-5 space-y-2">
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                  <span>Subtotal Item</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {formatCurrency(subtotalAmount)}
                  </span>
                </div>
                {po.additionalCost && po.additionalCost > 0 ? (
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Biaya Tambahan</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {formatCurrency(po.additionalCost)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
                  <span>{isDraft ? 'Total Estimasi' : 'Total Akhir'}</span>
                  <span className="font-mono text-base">{formatCurrency(finalTotalAmount)}</span>
                </div>
              </Card>
            );
          })()}
        </div>

        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Informasi Pengadaan
            </h3>
            <div className="space-y-3 pt-3">
              <div className="flex justify-between items-start gap-3">
                <span className="text-[13px] md:text-xs text-slate-500 dark:text-slate-400">Dibuat pada</span>
                <span className="text-[13px] md:text-xs text-slate-700 dark:text-slate-300 text-right">
                  {po.createdAt ? formatDateTime(po.createdAt) : '-'}
                </span>
              </div>
              <div className="flex justify-between items-start gap-3">
                <span className="text-[13px] md:text-xs text-slate-500 dark:text-slate-400">Dibuat oleh</span>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[13px] md:text-xs text-slate-800 dark:text-slate-200">
                    {rawPOResponse?.created_by_user?.full_name || po.createdBy || '-'}
                  </span>
                  {rawPOResponse?.created_by_user?.email && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {rawPOResponse.created_by_user.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-start gap-3">
                <span className="text-[13px] md:text-xs text-slate-500 dark:text-slate-400">Nomor PO</span>
                <span className="text-[13px] md:text-xs text-slate-800 dark:text-slate-200 text-right">
                  {po.poNumber}
                </span>
              </div>
            </div>

            {hasSecondaryInfo && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 space-y-3">
                {hasDecisionDate && (
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[13px] md:text-xs text-slate-500 dark:text-slate-400">{decisionDateLabel}</span>
                    <span className="text-[13px] md:text-xs text-slate-700 dark:text-slate-300 text-right">
                      {decisionDateValue}
                    </span>
                  </div>
                )}
                {hasDecisionPerson && (
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[13px] md:text-xs text-slate-500 dark:text-slate-400">{decisionPersonLabel}</span>
                    <span className="text-[13px] md:text-xs text-slate-800 dark:text-slate-200 text-right">
                      {decisionPersonValue}
                    </span>
                  </div>
                )}
                {hasPurchaseType && (
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[13px] md:text-xs text-slate-500 dark:text-slate-400">Tipe pengadaan</span>
                    <span className="text-[13px] md:text-xs text-slate-800 dark:text-slate-200 text-right">
                      {purchaseTypeDisplay}
                    </span>
                  </div>
                )}
                {hasVendor && (
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[13px] md:text-xs text-slate-500 dark:text-slate-400">Nama Vendor</span>
                    <span className="text-[13px] md:text-xs text-slate-800 dark:text-slate-200 text-right">
                      {vendorDisplay}
                    </span>
                  </div>
                )}
                {hasBankAccount && bankAccount && (
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[13px] md:text-xs text-slate-500 dark:text-slate-400">Rekening Kas</span>
                    <span className="text-[13px] md:text-xs text-slate-800 dark:text-slate-200 text-right">
                      {bankAccount.name}
                    </span>
                  </div>
                )}
                {hasDecisionReason && (
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[13px] md:text-xs text-rose-600 dark:text-rose-400 ">
                      {decisionReasonLabel}
                    </span>
                    <p className="text-[13px] md:text-xs italic text-slate-600 dark:text-slate-400 bg-rose-50/60 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/40">
                      &quot;{decisionReason}&quot;
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Riwayat Aktivitas
            </h3>
            <div className="pt-3 space-y-0">
              {timelineEvents.map((evt, idx) => {
                const isLast = idx === timelineEvents.length - 1;
                return (
                  <div key={evt.id || idx} className="flex gap-3 text-xs sm:text-sm">
                    {/* Indicator & Connector */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="flex items-center justify-center mt-0.5">
                        {evt.status === 'danger' ? (
                          <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        ) : evt.status === 'completed' ? (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                        ) : evt.status === 'current' ? (
                          <div className="w-4 h-4 rounded-full border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 shrink-0" />
                        )}
                      </div>
                      {!isLast && (
                        <div className="w-0.5 grow min-h-[22px] bg-slate-200 dark:bg-slate-700/80 my-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`space-y-0.5 min-w-0 flex-1 ${!isLast ? 'pb-3.5' : ''}`}>
                      <div
                        className={`text-xs md:text-sm ${evt.status === 'danger'
                          ? 'text-rose-600 dark:text-rose-400 font-semibold'
                          : evt.status === 'completed'
                            ? 'text-slate-800 dark:text-slate-200'
                            : evt.status === 'current'
                              ? 'text-slate-900 dark:text-white font-medium'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                      >
                        {evt.title}
                      </div>
                      {(evt.timestamp || (evt.actor && evt.actor !== '-')) && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
                          {evt.timestamp && <span>{formatDateTime(evt.timestamp)}</span>}
                          {evt.actor && evt.actor !== '-' && (
                            <>
                              {evt.timestamp && <span>·</span>}
                              <span>
                                Oleh:{' '}
                                <strong className="font-medium text-slate-600 dark:text-slate-400">
                                  {evt.actor}
                                </strong>
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      {evt.notes && (
                        <p className="text-[11px] italic text-slate-500 dark:text-slate-400 pt-0.5">
                          &quot;{evt.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Fase 2: Proses Pengadaan Draft */}
      <ProcurementModal
        isOpen={showExecuteDraftModal}
        onClose={() => setShowExecuteDraftModal(false)}
        draftPO={draftPOForModal}
        onSuccess={() => {
          orderPO(po.id);
          fetchPO();
        }}
      />

      {/* Modal Tolak / Batalkan PO */}
      <CancelPOModal
        isOpen={Boolean(cancelModalMode)}
        onClose={() => setCancelModalMode(null)}
        po={draftPOForModal}
        mode={cancelModalMode || 'CANCEL_DRAFT'}
        onSuccess={() => {
          fetchPO();
        }}
      />

      {/* Modal Terima Barang */}
      <ReceiveGoodsModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        po={receiveModalPO}
        onSuccess={() => {
          fetchPO();
          setShowReceiveModal(false);
        }}
      />
    </div>
  );
}
