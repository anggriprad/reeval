'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
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
import { XCircle, Ban, PackageCheck, Trash2 } from 'lucide-react';

interface ProcurementSectionProps {
  filters: {
    page: number;
    per_page: number;
    search: string;
    status: string;
  };
  setFilter: (key: 'page' | 'per_page' | 'search' | 'status', value: any) => void;
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  preselectedMaterialId?: string | number | null;
  onClearPreselectedMaterial?: () => void;
}

export function ProcurementSection({
  filters,
  setFilter,
  isCreateModalOpen,
  onCloseCreateModal,
  preselectedMaterialId,
  onClearPreselectedMaterial,
}: ProcurementSectionProps) {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const { currentUser, purchaseOrders = [] } = useApp();

  // Fase 1 (Request), Fase 2 (Eksekusi Komersial), Fase 3 (Penerimaan Fisik) — Pure PBAC 1-to-1
  const canRequest = can(PERMISSIONS.PURCHASING.CREATE);
  const canExecuteCommercial = can(PERMISSIONS.PURCHASING.ORDER);
  const canReceivePhysical = can(PERMISSIONS.PURCHASING.RECEIVE);
  const canReject = can(PERMISSIONS.PURCHASING.REJECT);
  const canCancel = can(PERMISSIONS.PURCHASING.CANCEL);
  const canDelete = can(PERMISSIONS.PURCHASING.DELETE);
  const canShowCosts = can(PERMISSIONS.PURCHASING.READ);
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
  }, [filters.page, filters.per_page, filters.status, debouncedSearch, purchaseOrders, toast]);

  useEffect(() => {
    fetchProcurements();
  }, [fetchProcurements]);

  // Action: Batalkan Sisa PO
  const handleCancelRemainingPO = async (po: PurchaseOrderResponse) => {
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
  };

  // Action: Hapus PO Draft
  const handleDeletePO = async (po: PurchaseOrderResponse) => {
    const isOk = await confirm({
      title: 'Hapus Draft Pengadaan',
      message: `Apakah Anda yakin ingin menghapus draft pengadaan "${po.po_number}"? Data yang dihapus tidak dapat dipulihkan.`,
      confirmText: 'Hapus Draft',
      variant: 'danger',
    });
    if (isOk) {
      try {
        await procurementService.deletePO(po.id);
        toast.success('Draft Dihapus', `Draft PO ${po.po_number} berhasil dihapus.`);
        fetchProcurements();
      } catch (err: any) {
        toast.error('Gagal Menghapus Draft', err?.response?.data?.message || err?.message || 'Terjadi kesalahan.');
      }
    }
  };

  const columns: Column<PurchaseOrderResponse>[] = useMemo(() => {
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
        header: 'Item Material',
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
                className="text-sm font-medium text-slate-900 dark:text-white"
                maxWidth="240px"
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
        header: 'Kuantitas',
        cell: ({ row: po }) => {
          if (!po.items || po.items.length === 0) {
            return <span className="text-slate-400 text-xs">-</span>;
          }
          const firstItem = po.items[0];
          return (
            <span className="text-sm font-normal text-slate-700 dark:text-slate-300">
              {firstItem.qty} {firstItem.unit}
            </span>
          );
        },
      },
    ];

    if (canShowCosts) {
      cols.push({
        id: 'total_amount',
        header: 'Total Transaksi',
        align: 'right',
        cell: ({ row: po }) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {po.status === 'DRAFT' && (!po.supplier || po.supplier === '-')
              ? '-'
              : formatCurrency(po.total_amount)}
          </span>
        ),
      });
    }

    cols.push(
      {
        id: 'status',
        header: 'Status',
        align: 'left',
        cell: ({ row: po }) => (
          <Badge variant={getPOStatusVariant(po.status as any)}>
            {getPOStatusLabel(po.status as any)}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Aksi',
        align: 'center',
        width: '190px',
        className: 'w-[190px] whitespace-nowrap',
        cell: ({ row: po }) => {
          if (
            po.status === 'RECEIVED' ||
            po.status === 'REJECTED' ||
            po.status === 'CANCELED'
          ) {
            return (
              <div className="flex items-center justify-center text-slate-300 dark:text-slate-600 font-mono text-xs">
                -
              </div>
            );
          }

          let mainButton: React.ReactNode = null;
          const moreItems: ActionMenuItem[] = [];

          if (po.status === 'DRAFT') {
            if (canExecuteCommercial) {
              mainButton = (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setExecuteDraftPO(po)}
                  title="Verifikasi harga, vendor, dan proses pesanan"
                >
                  Proses & Pesan
                </Button>
              );
            }
            if (canReject) {
              moreItems.push({
                label: 'Tolak PO',
                icon: <XCircle className="h-3.5 w-3.5" />,
                variant: 'danger',
                onClick: () =>
                  setCancelModalState({ po, mode: 'REJECT' }),
              });
            }
            if (canCancel) {
              moreItems.push({
                label: 'Batalkan PO',
                icon: <Ban className="h-3.5 w-3.5" />,
                variant: 'danger',
                onClick: () =>
                  setCancelModalState({ po, mode: 'CANCEL_DRAFT' }),
              });
            }
            if (canDelete) {
              moreItems.push({
                label: 'Hapus Draft',
                icon: <Trash2 className="h-3.5 w-3.5" />,
                variant: 'danger',
                onClick: () => handleDeletePO(po),
              });
            }
          } else if (po.status === 'ORDERED') {
            if (canReceivePhysical) {
              mainButton = (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setReceiveModalPO(po)}
                  title="Terima barang masuk ke gudang"
                >
                  <PackageCheck className="h-3.5 w-3.5 mr-1" />
                  Terima Barang
                </Button>
              );
            }
            if (canCancel) {
              moreItems.push({
                label: 'Batalkan PO',
                icon: <Ban className="h-3.5 w-3.5" />,
                variant: 'danger',
                onClick: () =>
                  setCancelModalState({ po, mode: 'CANCEL_ORDERED' }),
              });
            }
          } else if (po.status === 'PARTIALLY_RECEIVED') {
            if (canReceivePhysical) {
              mainButton = (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setReceiveModalPO(po)}
                  title="Terima sisa barang pengadaan"
                >
                  <PackageCheck className="h-3.5 w-3.5 mr-1" />
                  Terima Barang
                </Button>
              );
            }
            if (canCancel) {
              moreItems.push({
                label: 'Batalkan Sisa PO',
                icon: <Ban className="h-3.5 w-3.5" />,
                variant: 'danger',
                onClick: () => handleCancelRemainingPO(po),
              });
            }
          }

          if (!mainButton && moreItems.length === 0) {
            return (
              <div className="flex items-center justify-center text-slate-300 dark:text-slate-600 font-mono text-xs">
                -
              </div>
            );
          }

          return (
            <div
              className="flex items-center justify-center gap-1.5 whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              {mainButton}
              {moreItems.length > 0 && (
                <ActionMenu
                  menuWidth="w-max min-w-[130px]"
                  items={moreItems}
                />
              )}
            </div>
          );
        },
      }
    );

    return cols;
  }, [canShowCosts, canExecuteCommercial, canReceivePhysical, canReject, canCancel, canRequest, canDelete]);

  return (
    <>
      <CustomTable<PurchaseOrderResponse>
        data={procurements}
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

      {/* Modal: Form Pengadaan Baru (Fase 1 Request Gudang / Fase 1+2 Buat Langsung) & Fase 2 Eksekusi Draft */}
      <ProcurementModal
        isOpen={isCreateModalOpen || Boolean(executeDraftPO)}
        onClose={() => {
          if (executeDraftPO) setExecuteDraftPO(null);
          if (isCreateModalOpen) {
            onCloseCreateModal();
            if (onClearPreselectedMaterial) onClearPreselectedMaterial();
          }
        }}
        preselectedMaterialId={preselectedMaterialId}
        draftPO={executeDraftPO}
        onSuccess={() => {
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
