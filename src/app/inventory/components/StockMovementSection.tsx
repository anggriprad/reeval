'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import CustomTable, { Column } from '@/components/ui/CustomTable';
import { useToast } from '@/context/ToastContext';
import { useApp } from '@/context/AppContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory } from '@/lib/roles';
import { formatDateTime } from '@/lib/utils';
import {
  stockMovementService,
  StockMovementItem,
} from '@/services/stock-movement.service';
import { StockMovementModal } from './StockMovementModal';
import {
  PackageCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';

interface StockMovementSectionProps {
  filters: {
    page: number;
    per_page: number;
    search: string;
    type: string;
    material_id?: string;
  };
  setFilter: (key: 'page' | 'per_page' | 'search' | 'type' | 'material_id', value: any) => void;
  isAdjustModalOpen: boolean;
  onCloseAdjustModal: () => void;
  onOpenAdjustModal: () => void;
}

export function StockMovementSection({
  filters,
  setFilter,
  isAdjustModalOpen,
  onCloseAdjustModal,
  onOpenAdjustModal,
}: StockMovementSectionProps) {
  const { toast } = useToast();
  const { can } = usePermission();
  const { currentUser, purchaseOrders = [] } = useApp();

  const canAdjust = can(PERMISSIONS.INVENTORY.ADJUST) || canManageInventory(currentUser.role);

  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Debounced search (600ms)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 600);
    return () => clearTimeout(handler);
  }, [filters.search]);

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await stockMovementService.getStockMovements({
        page: filters.page,
        per_page: filters.per_page,
        search: debouncedSearch?.trim() || undefined,
        type: filters.type || undefined,
        material_id: filters.material_id ? Number(filters.material_id) : undefined,
      });

      if (res.data) {
        setMovements(res.data);
        if (res.meta) {
          setTotalMovements(res.meta.total);
          setTotalPages(res.meta.total_pages || 1);
        } else {
          setTotalMovements(res.data.length);
          setTotalPages(1);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch stock movements:', err);
      toast.error('Gagal Memuat Mutasi Stok', err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  }, [filters.page, filters.per_page, filters.type, filters.material_id, debouncedSearch, toast]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const columns: Column<StockMovementItem>[] = useMemo(
    () => [
      {
        id: 'date',
        header: 'Waktu',
        cell: ({ row: mv }) => (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
            {formatDateTime(mv.date)}
          </span>
        ),
      },
      {
        id: 'type',
        header: 'Jenis',
        cell: ({ row: mv }) => {
          if (mv.reference_type === 'INITIAL' || mv.type === 'INIT') {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <PackageCheck className="h-3.5 w-3.5" />
                Inisiasi
              </span>
            );
          }
          if (mv.type === 'IN') {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowDownCircle className="h-3.5 w-3.5" />
                Masuk
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Keluar
            </span>
          );
        },
      },
      {
        id: 'material_name',
        header: 'Item / Material',
        width: '280px',
        className: 'min-w-[260px]',
        cell: ({ row: mv }) => (
          <div className="flex flex-col gap-0.5 max-w-[260px]">
            <TruncatedText
              text={mv.material_name}
              className="font-medium text-slate-800 dark:text-slate-200"
              maxWidth="260px"
            />
            {/* {mv.material_code && (
              <span className="text-[11px] font-mono text-slate-400">
                {mv.material_code}
              </span>
            )} */}
          </div>
        ),
      },
      {
        id: 'qty',
        header: 'Jumlah',
        align: 'right',
        cell: ({ row: mv }) => (
          <span className="font-semibold text-slate-900 dark:text-white font-mono">
            {mv.qty} {mv.unit || ''}
          </span>
        ),
      },
      {
        id: 'reference',
        header: 'Referensi',
        cell: ({ row: mv }) => {
          const matchedPO = purchaseOrders.find(
            (po) =>
              po.poNumber === mv.reference ||
              mv.reference.startsWith(`${po.poNumber} `) ||
              po.id === mv.reference
          );

          if (matchedPO) {
            return (
              <Link
                href={`/inventory/procurement/${matchedPO.id}`}
                className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1 group"
                title={`Lihat detail pengadaan ${matchedPO.poNumber}`}
              >
                <span>{mv.reference}</span>
              </Link>
            );
          }

          return (
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
              {mv.reference}
            </span>
          );
        },
      },
      // {
      //   id: 'reference_type',
      //   header: 'Sumber Mutasi',
      //   align: 'center',
      //   cell: ({ row: mv }) => {
      //     let variant: 'purple' | 'info' | 'warning' | 'default' | 'success' | 'danger' = 'default';
      //     let label = mv.reference_type || 'MANUAL';

      //     switch (mv.reference_type) {
      //       case 'INITIAL':
      //         variant = 'purple';
      //         label = 'Inisiasi Stok';
      //         break;
      //       case 'PO':
      //       case 'DIRECT':
      //         variant = 'info';
      //         label = 'Pengadaan PO';
      //         break;
      //       case 'WORK_ORDER':
      //         variant = 'warning';
      //         label = 'SPK Produksi';
      //         break;
      //       case 'ADJUSTMENT':
      //         variant = 'default';
      //         label = 'Penyesuaian';
      //         break;
      //       case 'RETURN':
      //         variant = 'danger';
      //         label = 'Retur';
      //         break;
      //     }

      //     return <Badge variant={variant}>{label}</Badge>;
      //   },
      // },
    ],
    [purchaseOrders]
  );

  return (
    <>
      <CustomTable<StockMovementItem>
        data={movements}
        columns={columns}
        loading={isLoading}
        pagination={true}
        currentPage={filters.page}
        perPage={filters.per_page}
        total={totalMovements}
        lastPage={totalPages}
        onPageChange={(p) => setFilter('page', p)}
        onPerPageChange={(pp) => {
          setFilter('per_page', pp);
          setFilter('page', 1);
        }}
        emptyTitle={
          filters.search || filters.type
            ? 'Tidak Ada Mutasi Stok'
            : 'Belum Ada Mutasi Stok'
        }
        emptyDescription={
          filters.search || filters.type
            ? 'Tidak ada mutasi stok yang cocok dengan pencarian atau filter.'
            : 'Mutasi stok otomatis dicatat saat inisiasi stok awal, penerimaan PO, atau penyesuaian stok.'
        }
      />

      {/* Modal: Catat Penyesuaian Stok */}
      <StockMovementModal
        isOpen={isAdjustModalOpen}
        onClose={onCloseAdjustModal}
        onSuccess={() => {
          fetchMovements();
        }}
      />
    </>
  );
}
