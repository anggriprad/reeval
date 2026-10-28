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
import { canManageInventory, canCreatePO, canRequestPO } from '@/lib/roles';
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
import { XCircle, Ban, PackageCheck, Trash2, Plus } from 'lucide-react';

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
  const { currentUser } = useApp();

  // UAC / PBAC Permissions
  const canRead = can(PERMISSIONS.PURCHASING.READ);
  const canCreate = can(PERMISSIONS.PURCHASING.CREATE) || canRequestPO(currentUser.role);
  const canUpdate = can(PERMISSIONS.PURCHASING.UPDATE) || canManageInventory(currentUser.role) || canCreatePO(currentUser.role);
  const canDelete = can(PERMISSIONS.PURCHASING.DELETE) || canCreatePO(currentUser.role);

  const [procurements, setProcurements] = useState<PurchaseOrderResponse[]>([]);
  const [totalPOs, setTotalPOs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
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
        setProcurements(res.data);
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
  }, [filters.page, filters.per_page, filters.status, debouncedSearch, toast]);

  useEffect(() => {
    fetchProcurements();
  }, [fetchProcurements]);

  // Action: Setujui & Pesan
  const handleOrderPO = async (po: PurchaseOrderResponse) => {
    const isOk = await confirm({
      title: 'Pesan Pengadaan',
      message: `Setujui pengadaan "${po.po_number}" dan kirimkan pesanan ke vendor "${po.supplier}"?`,
      confirmText: 'Pesan Sekarang',
    });
    if (isOk) {
      try {
        await procurementService.orderPO(po.id);
        toast.success('Pengadaan Disetujui', `PO ${po.po_number} telah disetujui dan berstatus Dipesan.`);
        fetchProcurements();
      } catch (err: any) {
        toast.error('Gagal Memesan PO', err?.response?.data?.message || err?.message || 'Gagal mengubah status.');
      }
    }
  };

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

  const columns: Column<PurchaseOrderResponse>[] = useMemo(
    () => [
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
            {po.purchase_type === 'DIRECT' ? (
              <Badge variant="purple">Cash</Badge>
            ) : (
              <Badge variant="info">PO</Badge>
            )}
          </div>
        ),
      },
      {
        id: 'supplier',
        header: 'Vendor',
        width: '220px',
        className: 'min-w-[200px]',
        cell: ({ row: po }) => (
          <TruncatedText
            text={po.supplier}
            className="text-sm font-normal text-slate-700 dark:text-slate-300"
            maxWidth="200px"
          />
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
      {
        id: 'total_amount',
        header: 'Total Transaksi',
        align: 'right',
        cell: ({ row: po }) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {formatCurrency(po.total_amount)}
          </span>
        ),
      },
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
            if (canUpdate) {
              mainButton = (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOrderPO(po)}
                  title="Setujui pengadaan ini"
                >
                  Setujui & Pesan
                </Button>
              );
              moreItems.push({
                label: 'Tolak PO',
                icon: <XCircle className="h-3.5 w-3.5" />,
                variant: 'danger',
                onClick: () =>
                  setCancelModalState({ po, mode: 'REJECT' }),
              });
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
            if (canUpdate) {
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
              moreItems.push({
                label: 'Batalkan PO',
                icon: <Ban className="h-3.5 w-3.5" />,
                variant: 'danger',
                onClick: () =>
                  setCancelModalState({ po, mode: 'CANCEL_ORDERED' }),
              });
            }
          } else if (po.status === 'PARTIALLY_RECEIVED') {
            if (canUpdate) {
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
      },
    ],
    [canUpdate, canDelete]
  );

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
            : 'Buat pengadaan baru untuk memesan bahan baku ke vendor.'
        }
      />

      {/* Modal: Form Pengadaan Baru (PO & Pembelian Langsung) */}
      <ProcurementModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          onCloseCreateModal();
          if (onClearPreselectedMaterial) onClearPreselectedMaterial();
        }}
        preselectedMaterialId={preselectedMaterialId}
        onSuccess={() => {
          fetchProcurements();
        }}
      />

      {/* Modal: Terima Barang */}
      <ReceiveGoodsModal
        isOpen={Boolean(receiveModalPO)}
        onClose={() => setReceiveModalPO(null)}
        po={receiveModalPO}
        onSuccess={() => {
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
