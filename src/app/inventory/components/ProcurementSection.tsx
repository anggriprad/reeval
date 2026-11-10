'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { TableRowActions, type TableActionItem } from '@/components/ui/TableRowActions';
import CustomTable, { Column } from '@/components/ui/CustomTable';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import {
  canCreatePO,
  canManageInventory,
  canReceivePO,
  canRequestPO,
  canSeeCosts,
} from '@/lib/roles';
import {
  formatCurrency,
  getPOStatusLabel,
  getPOStatusVariant,
} from '@/lib/utils';
import {
  procurementService,
  PurchaseOrderResponse,
} from '@/services/procurement.service';
import { ProcurementModal } from './ProcurementModal';
import { ReceiveGoodsModal } from './ReceiveGoodsModal';
import { CancelPOModal } from './CancelPOModal';
import { XCircle, Ban, PackageCheck } from 'lucide-react';

interface ProcurementSectionProps {
  filters: {
    page: number;
    per_page: number;
    search: string;
    status: string;
    created_by_id?: string | number;
  };
  setFilter: (key: 'page' | 'per_page' | 'search' | 'status' | 'created_by_id', value: any) => void;
  refreshKey?: number;
}

export function ProcurementSection({
  filters,
  setFilter,
  refreshKey,
}: ProcurementSectionProps) {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can, isSuperAdmin, canSeePurchasingCosts } = usePermission();
  const { currentUser, purchaseOrders = [], materials = [] } = useApp();

  // Fase 1 (Request), Fase 2 (Eksekusi Komersial), Fase 3 (Penerimaan Fisik) — Pure PBAC 1-to-1
  const canRequest = can(PERMISSIONS.PURCHASING.CREATE);
  const canExecuteCommercial = can(PERMISSIONS.PURCHASING.ORDER);
  const canReceivePhysical = can(PERMISSIONS.PURCHASING.RECEIVE);
  const canReject = can(PERMISSIONS.PURCHASING.REJECT);
  const canCancel = can(PERMISSIONS.PURCHASING.CANCEL);
  const canShowCosts = canSeePurchasingCosts;
  // Pembatalan fase komersial (ORDERED atau PARTIALLY_RECEIVED) hanya untuk Purchasing & Super Admin
  const canCancelCommercial = canCancel && (canExecuteCommercial || isSuperAdmin);
  const [procurements, setProcurements] = useState<PurchaseOrderResponse[]>([]);
  const [totalPOs, setTotalPOs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [executeDraftPO, setExecuteDraftPO] = useState<PurchaseOrderResponse | null>(null);
  const [receiveModalPO, setReceiveModalPO] = useState<PurchaseOrderResponse | null>(null);
  const [cancelModalState, setCancelModalState] = useState<{
    po: PurchaseOrderResponse;
    mode: 'REJECT' | 'CANCEL_DRAFT' | 'CANCEL_ORDERED';
  } | null>(null);

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(handler);
  }, [filters.search]);

  const fetchProcurements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await procurementService.getProcurements({
        page: filters.page,
        per_page: filters.per_page,
        search: debouncedSearch?.trim() || undefined,
        status: filters.status || undefined,
        created_by_id: filters.created_by_id ? String(filters.created_by_id) : undefined,
      });

      if (res.data) {
        const synced = res.data.map((p) => {
          const appPO = purchaseOrders.find(
            (ap) => ap.id === String(p.id) || ap.poNumber === p.po_number
          );
          if (appPO && appPO.status === 'PARTIALLY_RECEIVED') {
            return { ...p, status: 'PARTIALLY_RECEIVED' };
          }
          return p;
        });
        setProcurements(synced);
        if (res.meta) {
          setTotalPOs(res.meta.total);
          setTotalPages(res.meta.total_pages || 1);
        } else {
          setTotalPOs(res.data.length);
          setTotalPages(1);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch procurements:', err);
      toast.error('Gagal Memuat Pengadaan', err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  }, [filters.page, filters.per_page, filters.status, filters.created_by_id, debouncedSearch, purchaseOrders, toast]);

  useEffect(() => {
    fetchProcurements();
  }, [fetchProcurements, refreshKey]);

  // Action: Batalkan Sisa PO
  const handleCancelRemainingPO = useCallback(async (po: PurchaseOrderResponse) => {
    const isOk = await confirm({
      title: 'Batalkan Sisa PO',
      message: `Apakah Anda yakin ingin membatalkan sisa barang yang belum diterima pada PO ${po.po_number}? Status PO akan diselesaikan.`,
      confirmText: 'Batalkan Sisa PO',
      variant: 'danger',
    });
    if (isOk) {
      try {
        await procurementService.cancelRemainingPO(po.id, { reason: 'Sisa pesanan dibatalkan oleh pengguna' });
        toast.success('Sisa PO Dibatalkan', `Sisa pesanan dihapus. Status PO ${po.po_number} kini Diterima.`);
        fetchProcurements();
      } catch (err: any) {
        toast.error('Gagal Membatalkan Sisa PO', err?.response?.data?.message || err?.message || 'Terjadi kesalahan.');
      }
    }
  }, [confirm, fetchProcurements, toast]);

  const getRowActions = useCallback((po: PurchaseOrderResponse): TableActionItem[] => {
    const actions: (TableActionItem | false)[] = [];

    if (po.status === 'DRAFT') {
      const isOwner = Boolean(
        (currentUser?.id && po.created_by_id && String(po.created_by_id) === String(currentUser.id).trim()) ||
        (currentUser?.id && po.created_by_user?.id && String(po.created_by_user.id) === String(currentUser.id).trim()) ||
        (currentUser?.email && po.created_by_user?.email && po.created_by_user.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
        (po.created_by && (
          (currentUser?.name && String(po.created_by).toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
          (currentUser?.id && String(po.created_by).trim() === String(currentUser.id).trim()) ||
          (currentUser?.email && String(po.created_by).toLowerCase().trim() === currentUser.email.toLowerCase().trim())
        ))
      );

      actions.push(
        canExecuteCommercial && {
          label: 'Proses & Pesan',
          buttonVariant: 'primary',
          icon: <PackageCheck className="h-3.5 w-3.5" />,
          title: 'Verifikasi harga, vendor, dan proses pesanan',
          onClick: () => setExecuteDraftPO(po),
        },
        canReject && {
          label: 'Tolak PO',
          buttonVariant: 'outline-danger',
          menuVariant: 'danger',
          icon: <Ban className="h-3.5 w-3.5" />,
          title: 'Tolak pengadaan',
          onClick: () => setCancelModalState({ po, mode: 'REJECT' }),
        },
        canCancel && isOwner && {
          label: 'Batalkan PO',
          buttonVariant: 'outline-danger',
          menuVariant: 'danger',
          icon: <XCircle className="h-3.5 w-3.5" />,
          title: 'Batalkan pengadaan',
          onClick: () => setCancelModalState({ po, mode: 'CANCEL_DRAFT' }),
        }
      );
    } else if (po.status === 'ORDERED') {
      actions.push(
        canReceivePhysical && {
          label: 'Terima Barang',
          buttonVariant: 'primary',
          icon: <PackageCheck className="h-3.5 w-3.5" />,
          title: 'Terima barang',
          onClick: () => setReceiveModalPO(po),
        },
        canCancelCommercial && {
          label: 'Batalkan PO',
          buttonVariant: 'outline-danger',
          menuVariant: 'danger',
          icon: <XCircle className="h-3.5 w-3.5" />,
          title: 'Batalkan pengadaan',
          onClick: () => setCancelModalState({ po, mode: 'CANCEL_ORDERED' }),
        }
      );
    } else if (po.status === 'PARTIALLY_RECEIVED') {
      actions.push(
        canReceivePhysical && {
          label: 'Terima Barang',
          buttonVariant: 'primary',
          icon: <PackageCheck className="h-3.5 w-3.5" />,
          title: 'Terima sisa barang pengadaan',
          onClick: () => setReceiveModalPO(po),
        },
        canCancelCommercial && {
          label: 'Batalkan Sisa PO',
          buttonVariant: 'outline-danger',
          menuVariant: 'danger',
          icon: <Ban className="h-3.5 w-3.5" />,
          title: 'Batalkan sisa barang yang belum diterima',
          onClick: () => handleCancelRemainingPO(po),
        }
      );
    }

    return actions.filter((a): a is TableActionItem => Boolean(a));
  }, [canExecuteCommercial, canReject, canCancel, canReceivePhysical, canCancelCommercial, currentUser, handleCancelRemainingPO]);

  const columns: Column<PurchaseOrderResponse>[] = useMemo(() => {
    const rowActionCounts = procurements.map((po) => getRowActions(po).length);
    const hasAnyActions = rowActionCounts.some((count) => count > 0);
    const hasOverflowActions = rowActionCounts.some((count) => count > 1);

    const cols: Column<PurchaseOrderResponse>[] = [
      {
        id: 'po_number',
        header: 'No. Pengadaan',
        cell: ({ row: po }) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/inventory/procurement/${po.id}`}
              className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {po.po_number}
            </Link>
            {po.status !== 'DRAFT' && (
              po.purchase_type === 'DIRECT' ? (
                <Badge variant="purple">Cash</Badge>
              ) : (
                <Badge variant="info">PO</Badge>
              )
            )}
          </div>
        ),
      },
      {
        id: 'items_summary',
        header: 'Nama Item',
        width: '280px',
        className: 'min-w-[250px]',
        cell: ({ row: po }) => {
          if (!po.items || po.items.length === 0) {
            return <span className="text-slate-400 text-xs">-</span>;
          }
          const firstItem = po.items[0];
          const extraCount = po.items.length - 1;
          return (
            <div className="flex flex-col gap-0.5 max-w-[280px]">
              <TruncatedText
                text={firstItem.material_name}
                className="text-sm text-slate-900 dark:text-white"
              />
              {extraCount > 0 && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                  +{extraCount} lainnya
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'quantity_summary',
        header: 'Qty',
        cell: ({ row: po }) => {
          if (!po.items || po.items.length === 0) {
            return <span className="text-slate-400 text-xs">-</span>;
          }
          const firstItem = po.items[0];
          return (
            <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
              {firstItem.qty} {firstItem.unit}
            </span>
          );
        },
      },
      {
        id: 'created_by',
        header: 'Dibuat Oleh',
        cell: ({ row: po }) => {
          const creatorName = po.created_by_user?.full_name || po.created_by || '-';
          const creatorEmail = po.created_by_user?.email;
          return (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {creatorName}
              </span>
              {creatorEmail && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                  {creatorEmail}
                </span>
              )}
            </div>
          );
        },
      },
    ];

    if (canShowCosts) {
      cols.push({
        id: 'total_amount',
        header: 'Total Transaksi',
        align: 'right',
        cell: ({ row: po }) => {
          const fallbackTotal =
            po.total_amount > 0
              ? po.total_amount
              : (po.items || []).reduce((sum, it) => {
                const mat = materials.find(
                  (m) => String(m.id) === String(it.material_id)
                );
                const cost =
                  it.unit_cost > 0 ? it.unit_cost : mat?.unitCost || 0;
                return sum + it.qty * cost;
              }, 0) + (po.additional_cost || 0);

          return (
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {fallbackTotal > 0 ? formatCurrency(fallbackTotal) : '-'}
            </span>
          );
        },
      });
    }

    cols.push({
      id: 'status',
      header: 'Status',
      align: 'left',
      cell: ({ row: po }) => (
        <Badge variant={getPOStatusVariant(po.status as any)}>
          {getPOStatusLabel(po.status as any)}
        </Badge>
      ),
    });

    if (hasAnyActions) {
      cols.push({
        id: 'actions',
        header: 'Aksi',
        align: 'center',
        className: 'w-px whitespace-nowrap',
        cell: ({ row: po }) => (
          <TableRowActions
            actions={getRowActions(po)}
            reserveOverflowSlot={hasOverflowActions}
          />
        ),
      });
    }

    return cols;
  }, [procurements, getRowActions, canShowCosts, materials]);

  const sortedProcurements = useMemo(() => {
    const statusPriority: Record<string, number> = {
      DRAFT: 1,
      ORDERED: 2,
      PARTIALLY_RECEIVED: 3,
      RECEIVED: 4,
      REJECTED: 5,
      CANCELED: 6,
      CANCELLED: 6,
    };

    return [...procurements].sort((a, b) => {
      const aHasAction = getRowActions(a).length > 0 ? 0 : 1;
      const bHasAction = getRowActions(b).length > 0 ? 0 : 1;
      if (aHasAction !== bHasAction) return aHasAction - bHasAction;

      const aPriority = statusPriority[a.status] ?? 99;
      const bPriority = statusPriority[b.status] ?? 99;
      if (aPriority !== bPriority) return aPriority - bPriority;

      return (b.id || 0) - (a.id || 0);
    });
  }, [procurements, getRowActions]);

  return (
    <>
      <CustomTable<PurchaseOrderResponse>
        data={sortedProcurements}
        columns={columns}
        loading={isLoading}
        pagination={true}
        currentPage={filters.page}
        perPage={filters.per_page}
        total={totalPOs}
        lastPage={totalPages}
        onPageChange={(p) => setFilter('page', p)}
        onPerPageChange={(pp) => {
          setFilter('per_page', pp);
          setFilter('page', 1);
        }}
        onRowClick={(po) => router.push(`/inventory/procurement/${po.id}`)}
        emptyTitle={
          filters.search || filters.status
            ? 'Tidak Ada Pengadaan'
            : 'Belum Ada Pengadaan'
        }
        emptyDescription={
          filters.search || filters.status
            ? 'Tidak ada data pengadaan yang sesuai dengan pencarian atau filter.'
            : 'Ajukan atau buat pengadaan baru untuk memenuhi kebutuhan bahan baku.'
        }
      />

      {/* Modal: Form Eksekusi Draft PO (Fase 2) */}
      <ProcurementModal
        isOpen={Boolean(executeDraftPO)}
        onClose={() => setExecuteDraftPO(null)}
        draftPO={executeDraftPO}
        onSuccess={() => {
          setExecuteDraftPO(null);
          fetchProcurements();
        }}
      />

      {/* Modal: Terima Barang (Fase 3) */}
      <ReceiveGoodsModal
        isOpen={Boolean(receiveModalPO)}
        onClose={() => setReceiveModalPO(null)}
        po={receiveModalPO}
        onSuccess={(updatedStatus) => {
          if (receiveModalPO && updatedStatus) {
            setProcurements((prev) =>
              prev.map((p) =>
                p.id === receiveModalPO.id ? { ...p, status: updatedStatus } : p
              )
            );
          }
          fetchProcurements();
        }}
      />

      {/* Modal: Tolak / Batalkan PO */}
      <CancelPOModal
        isOpen={Boolean(cancelModalState)}
        onClose={() => setCancelModalState(null)}
        po={cancelModalState?.po || null}
        mode={cancelModalState?.mode || 'CANCEL_DRAFT'}
        onSuccess={() => {
          fetchProcurements();
        }}
      />
    </>
  );
}
