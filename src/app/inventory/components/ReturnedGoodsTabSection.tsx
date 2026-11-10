'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import CustomTable, { Column } from '@/components/ui/CustomTable';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { formatVariantLabel } from '@/lib/utils';
import { ReturnedGood } from '@/lib/types';
import {
  returnedGoodService,
  mapReturnedGoodResponseToReturnedGood,
} from '@/services/returned-good.service';
import { resolveProductImageUrl } from '@/services/product.service';
import { ProcessReturnedGoodModal } from './ProcessReturnedGoodModal';
import {
  BedDouble,
  Layers,
  Box,
  Armchair,
  Sofa,
  Package,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Wrench,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  BedDouble,
  Layers,
  Box,
  Armchair,
  Sofa,
  Package,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Wrench,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
};

export interface ReturnedGoodsFilters {
  ret_page: number;
  ret_per_page: number;
  ret_search: string;
  ret_status: string;
}

interface ReturnedGoodsTabSectionProps {
  filters: ReturnedGoodsFilters;
  setFilter: (key: keyof ReturnedGoodsFilters, value: any) => void;
  onCountsUpdated?: () => void;
}

export function ReturnedGoodsTabSection({
  filters,
  setFilter,
  onCountsUpdated,
}: ReturnedGoodsTabSectionProps) {
  const { can } = usePermission();
  const { toast } = useToast();
  const {
    products,
    salesOrders = [],
  } = useApp();

  const [returnedGoods, setReturnedGoods] = useState<ReturnedGood[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReturnItem, setSelectedReturnItem] = useState<ReturnedGood | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const canReceive = can(PERMISSIONS.RETURNED_GOOD.RECEIVE);
  const canAction = can(PERMISSIONS.RETURNED_GOOD.ACTION);

  const fetchReturnedGoods = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await returnedGoodService.getReturnedGoods({
        page: filters.ret_page,
        per_page: filters.ret_per_page,
        search: filters.ret_search?.trim() || undefined,
        status: filters.ret_status || undefined,
      });

      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map(mapReturnedGoodResponseToReturnedGood);
        setReturnedGoods(mapped);
        if (res.meta) {
          setTotalItems(res.meta.total);
          setTotalPages(res.meta.total_pages || 1);
        } else {
          setTotalItems(mapped.length);
          setTotalPages(1);
        }
      } else {
        setReturnedGoods([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch returned goods:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters.ret_page, filters.ret_per_page, filters.ret_search, filters.ret_status]);

  useEffect(() => {
    fetchReturnedGoods();
  }, [fetchReturnedGoods]);

  const handleReceive = async (rg: ReturnedGood) => {
    try {
      const res = await returnedGoodService.receiveReturnedGood(rg.id);
      if (res.success) {
        toast.success('Barang Diterima', 'Fisik barang retur telah dikonfirmasi tiba di gudang.');
        await fetchReturnedGoods();
        onCountsUpdated?.();
        return;
      }
      toast.error('Gagal Menerima Barang', res.message || 'Gagal mengonfirmasi penerimaan barang retur.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal mengonfirmasi penerimaan barang retur.';
      toast.error('Gagal Menerima Barang', msg);
    }
  };

  const handleCancelReturn = async (rg: ReturnedGood) => {
    try {
      const res = await returnedGoodService.processReturnedGoodAction(rg.id, {
        action: 'CANCEL',
        notes: 'Dibatalkan / tidak ditarik',
      });
      if (res.success) {
        toast.info('Retur Dibatalkan', 'Barang retur ditandai batal/tidak ditarik.');
        await fetchReturnedGoods();
        onCountsUpdated?.();
        return;
      }
      toast.error('Gagal Membatalkan Retur', res.message || 'Gagal membatalkan barang retur.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal membatalkan barang retur.';
      toast.error('Gagal Membatalkan Retur', msg);
    }
  };

  const handleConfirmModalAction = async (
    action: 'RESTOCK' | 'DISASSEMBLE' | 'SCRAP' | 'CANCEL',
    notes: string
  ) => {
    if (!selectedReturnItem) return;
    setIsSubmittingAction(true);
    try {
      const res = await returnedGoodService.processReturnedGoodAction(selectedReturnItem.id, {
        action,
        notes: notes || undefined,
      });
      if (res.success) {
        toast.success('Tindakan Berhasil Diproses', 'Barang retur telah diproses.');
        setSelectedReturnItem(null);
        await fetchReturnedGoods();
        onCountsUpdated?.();
        return;
      }
      toast.error('Gagal Memproses Tindakan', res.message || 'Gagal memproses tindakan barang retur.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal memproses tindakan barang retur.';
      toast.error('Gagal Memproses Tindakan', msg);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const columns: Column<ReturnedGood>[] = [
    {
      id: 'product',
      header: 'Produk',
      align: 'left',
      width: '320px',
      cell: ({ row: rg }) => {
        const prod = products.find(p => p.id === rg.productId || p.name === rg.productName);
        const imageUrl = rg.productImageUrl
          ? resolveProductImageUrl(rg.productImageUrl)
          : prod?.image;
        const IconComp = iconMap[rg.productImageIcon || prod?.imageIcon || 'BedDouble'] || BedDouble;
        const soItem = salesOrders
          .find(so => so.id === rg.salesOrderId || so.orderNumber === rg.salesOrderNumber)
          ?.items.find(i => i.productId === rg.productId && (!rg.variantId || i.variantId === rg.variantId));
        const orderItemNotes = rg.customNotes || soItem?.customNotes;

        return (
          <div className="flex items-start gap-3 max-w-[320px]">
            {imageUrl ? (
              <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                <img src={imageUrl} alt={rg.productName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                <IconComp className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex flex-col gap-0.5">
              <TruncatedText
                text={rg.productName}
                className="font-semibold text-xs text-slate-900 dark:text-white"
                maxWidth="240px"
              />
              {rg.variantLabel && (
                <TruncatedText
                  text={formatVariantLabel(rg.variantLabel)}
                  className="text-[11px] text-slate-500 dark:text-slate-400"
                  maxWidth="240px"
                />
              )}
              {orderItemNotes && (
                <TruncatedText
                  text={`Catatan: ${orderItemNotes}`}
                  className="text-[11px] text-slate-500 dark:text-slate-400 italic"
                  maxWidth="240px"
                />
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'reference',
      header: 'Referensi',
      align: 'left',
      width: '160px',
      cell: ({ row: rg }) => {
        const displayComplaintRef = rg.complaintNumber || `Komplain #${rg.complaintId}`;
        return (
          <div>
            {rg.complaintId ? (
              <Link
                href={`/order/complaint/${rg.complaintId}`}
                className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline block"
              >
                {displayComplaintRef.startsWith('CMP-') ? displayComplaintRef : `Komplain #${rg.complaintId}`}
              </Link>
            ) : (
              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {rg.returnNumber || `#${rg.id}`}
              </span>
            )}
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {rg.salesOrderNumber}
            </span>
          </div>
        );
      },
    },
    {
      id: 'qty',
      header: 'Qty',
      align: 'right',
      cell: ({ row: rg }) => (
        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
          {rg.qty} unit
        </span>
      ),
    },
    {
      id: 'reason',
      header: 'Alasan Retur',
      align: 'left',
      width: '260px',
      cell: ({ row: rg }) => (
        <TruncatedText
          text={rg.conditionReason}
          className="text-xs text-slate-600 dark:text-slate-400"
          maxWidth="240px"
        />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      cell: ({ row: rg }) => {
        const statusConfig: Record<
          string,
          { label: string; variant: 'warning' | 'success' | 'purple' | 'default' | 'danger' }
        > = {
          AWAITING_RECEIVAL: { label: 'Menunggu Fisik', variant: 'warning' },
          PENDING: { label: 'Menunggu Fisik', variant: 'warning' },
          RECEIVED: { label: 'Diterima di Gudang', variant: 'purple' },
          RESTOCKED: { label: 'Masuk Barang Jadi', variant: 'success' },
          REPAIR: { label: 'Diperbaiki', variant: 'purple' },
          DISASSEMBLED: { label: 'Dibongkar', variant: 'default' },
          SCRAPPED: { label: 'Afkir / Sampah', variant: 'danger' },
          CANCELED: { label: 'Dibatalkan', variant: 'default' },
        };
        const cfg = statusConfig[rg.status] || { label: rg.status, variant: 'default' };
        return (
          <Badge variant={cfg.variant} className="text-[11px]">
            {cfg.label}
          </Badge>
        );
      },
    },
    ...(canReceive || canAction
      ? [
          {
            id: 'action',
            header: 'Aksi',
            align: 'center' as const,
            width: '160px',
            cell: ({ row: rg }: { row: ReturnedGood; value: any }) => {
              const order = salesOrders.find(
                so => so.id === rg.salesOrderId || so.orderNumber === rg.salesOrderNumber
              );
              const complaint = order?.complaints?.find(c => c.id === rg.complaintId);
              const isComplaintPending =
                rg.complaintStatus === 'MENUNGGU' ||
                rg.complaintStatus === 'DIAJUKAN' ||
                (complaint && (complaint.status === 'MENUNGGU' || complaint.status === 'DIAJUKAN'));

              if (isComplaintPending) {
                return (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                    Menunggu Resolusi CS
                  </span>
                );
              }

              if (rg.status === 'AWAITING_RECEIVAL' || (rg.status === 'PENDING' && !rg.receivedAt)) {
                return (
                  <div className="flex items-center justify-center gap-1.5">
                    {canReceive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReceive(rg)}
                      >
                        Terima Fisik
                      </Button>
                    )}
                    {canAction && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelReturn(rg)}
                      >
                        Batal
                      </Button>
                    )}
                  </div>
                );
              }

              if ((rg.status === 'RECEIVED' || rg.status === 'PENDING') && canAction) {
                return (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedReturnItem(rg)}
                  >
                    Tindak Lanjuti
                  </Button>
                );
              }
              return <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">-</span>;
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <CustomTable<ReturnedGood>
        data={returnedGoods}
        columns={columns}
        loading={isLoading}
        pagination={true}
        currentPage={filters.ret_page}
        perPage={filters.ret_per_page}
        total={totalItems}
        lastPage={totalPages}
        onPageChange={(p) => setFilter('ret_page', p)}
        onPerPageChange={(pp) => {
          setFilter('ret_per_page', pp);
          setFilter('ret_page', 1);
        }}
        emptyTitle="Tidak Ada Barang Retur"
        emptyDescription={
          filters.ret_search || filters.ret_status
            ? 'Tidak ada data barang retur yang cocok dengan pencarian atau filter.'
            : 'Barang retur dari komplain yang telah disetujui (refund, penggantian, atau perbaikan) akan otomatis tercatat di sini.'
        }
      />

      <ProcessReturnedGoodModal
        isOpen={Boolean(selectedReturnItem)}
        onClose={() => setSelectedReturnItem(null)}
        item={selectedReturnItem}
        products={products}
        onConfirm={handleConfirmModalAction}
        isSubmitting={isSubmittingAction}
      />
    </>
  );
}
