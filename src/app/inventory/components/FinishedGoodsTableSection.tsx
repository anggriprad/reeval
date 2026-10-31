'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { TruncatedText } from '@/components/ui/TruncatedText';
import CustomTable, { Column } from '@/components/ui/CustomTable';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory } from '@/lib/roles';
import { formatCurrency, formatVariantLabel } from '@/lib/utils';
import {
  finishedGoodService,
  FinishedGoodItem,
} from '@/services/finished-good.service';
import {
  resolveProductImageUrl,
} from '@/services/product.service';
import { ProductCategoryOption } from '@/services/product-category.service';
import { AllocateFinishedGoodModal } from './AllocateFinishedGoodModal';
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

export interface FinishedGoodsFilters {
  fg_page: number;
  fg_per_page: number;
  fg_search: string;
  fg_category_id: string;
  fg_show_empty: boolean | string;
}

interface FinishedGoodsTableSectionProps {
  filters: FinishedGoodsFilters;
  setFilter: (key: keyof FinishedGoodsFilters, value: any) => void;
  categoryOptions: ProductCategoryOption[];
}

export function FinishedGoodsTableSection({
  filters,
  setFilter,
}: FinishedGoodsTableSectionProps) {
  const { can } = usePermission();
  const { currentUser } = useApp();

  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Modal alokasi
  const [selectedFGForAllocation, setSelectedFGForAllocation] = useState<FinishedGoodItem | null>(null);

  // PBAC Permission check for Allocation
  const canAllocate =
    can(PERMISSIONS.INVENTORY.UPDATE) ||
    can(PERMISSIONS.PRODUCT.UPDATE) ||
    canManageInventory(currentUser.role);

  const fetchFinishedGoods = useCallback(async () => {
    setIsLoading(true);
    try {
      const showEmpty =
        typeof filters.fg_show_empty === 'boolean'
          ? filters.fg_show_empty
          : filters.fg_show_empty === 'true' || filters.fg_show_empty === '1';

      const res = await finishedGoodService.getFinishedGoods({
        page: filters.fg_page,
        per_page: filters.fg_per_page,
        search: filters.fg_search?.trim() || undefined,
        category_id: filters.fg_category_id ? Number(filters.fg_category_id) : undefined,
        show_empty: showEmpty,
      });

      if (res.data) {
        setFinishedGoods(res.data);
        if (res.meta) {
          setTotalItems(res.meta.total);
          setTotalPages(res.meta.total_pages || 1);
        } else {
          setTotalItems(res.data.length);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch finished goods:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.fg_page,
    filters.fg_per_page,
    filters.fg_search,
    filters.fg_category_id,
    filters.fg_show_empty,
  ]);

  useEffect(() => {
    fetchFinishedGoods();
  }, [fetchFinishedGoods]);

  const columns: Column<FinishedGoodItem>[] = [
    {
      id: 'visual',
      header: 'Visual',
      align: 'center',
      cell: ({ row: fg }) => {
        const IconComp = iconMap[fg.image_icon || 'BedDouble'] || BedDouble;
        return fg.image_url ? (
          <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 mx-auto">
            <img src={resolveProductImageUrl(fg.image_url)} alt={fg.product_name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60 mx-auto">
            <IconComp className="h-5 w-5" />
          </div>
        );
      },
    },
    {
      id: 'product_name',
      header: 'Nama Produk',
      width: '320px',
      cell: ({ row: fg }) => (
        <div className="flex flex-col gap-0.5 max-w-[320px]">
          <TruncatedText
            text={fg.product_name || 'Produk Tidak Ditemukan'}
            className="font-semibold text-slate-900 dark:text-white"
            maxWidth="300px"
          />
          {fg.variant_label && (
            <TruncatedText
              text={formatVariantLabel(fg.variant_label)}
              className="text-xs text-slate-500 dark:text-slate-400"
              maxWidth="300px"
            />
          )}
        </div>
      ),
    },
    {
      id: 'category_name',
      header: 'Kategori',
      cell: ({ row: fg }) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {fg.category_name || '-'}
        </span>
      ),
    },
    {
      id: 'stock',
      header: 'Stok Gudang',
      align: 'right',
      cell: ({ row: fg }) => (
        <span className="font-mono font-bold text-slate-900 dark:text-white">
          {fg.stock}
        </span>
      ),
    },
    {
      id: 'reserved_stock',
      header: 'Stok Ditahan',
      align: 'right',
      cell: ({ row: fg }) => (
        <span
          className={`font-mono ${
            fg.reserved_stock > 0
              ? 'text-amber-600 dark:text-amber-400 font-semibold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {fg.reserved_stock}
        </span>
      ),
    },
    {
      id: 'available_stock',
      header: 'Stok Bebas',
      align: 'right',
      cell: ({ row: fg }) => (
        <span
          className={`font-mono font-semibold ${
            fg.available_stock > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {fg.available_stock}
        </span>
      ),
    },
    {
      id: 'unit_hpp',
      header: 'HPP Satuan',
      align: 'right',
      cell: ({ row: fg }) => (
        <span className="font-mono text-slate-700 dark:text-slate-300">
          {formatCurrency(fg.unit_hpp)}
        </span>
      ),
    },
    {
      id: 'total_hpp',
      header: 'Total Nilai HPP',
      align: 'right',
      cell: ({ row: fg }) => (
        <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
          {formatCurrency(fg.total_hpp)}
        </span>
      ),
    },
    {
      id: 'potential_revenue',
      header: 'Potensi Omzet',
      align: 'right',
      cell: ({ row: fg }) => (
        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(fg.potential_revenue)}
        </span>
      ),
    },
    ...(canAllocate
      ? [
          {
            id: 'action',
            header: 'Aksi',
            align: 'center' as const,
            width: '120px',
            cell: ({ row: fg }: { row: FinishedGoodItem; value: any }) => (
              <Button
                size="sm"
                variant="secondary"
                disabled={fg.available_stock <= 0}
                onClick={() => setSelectedFGForAllocation(fg)}
              >
                Alokasikan
              </Button>
            ),
          },
        ]
      : []),
  ];

  const showEmpty =
    typeof filters.fg_show_empty === 'boolean'
      ? filters.fg_show_empty
      : filters.fg_show_empty === 'true' || filters.fg_show_empty === '1';

  return (
    <>
      <CustomTable<FinishedGoodItem>
        data={finishedGoods}
        columns={columns}
        loading={isLoading}
        pagination={true}
        currentPage={filters.fg_page}
        perPage={filters.fg_per_page}
        total={totalItems}
        lastPage={totalPages}
        onPageChange={(p) => setFilter('fg_page', p)}
        onPerPageChange={(pp) => {
          setFilter('fg_per_page', pp);
          setFilter('fg_page', 1);
        }}
        emptyTitle={
          filters.fg_search || filters.fg_category_id || !showEmpty
            ? 'Tidak Ada Barang Jadi'
            : 'Belum Ada Barang Jadi'
        }
        emptyDescription={
          filters.fg_search || filters.fg_category_id || !showEmpty
            ? !showEmpty
              ? 'Tidak ada barang jadi dengan stok tersedia. Aktifkan toggle "Tampilkan barang dengan stok kosong" untuk melihat semua item.'
              : 'Tidak ada barang jadi yang cocok dengan pencarian atau filter.'
            : 'Barang jadi hasil produksi yang telah selesai akan otomatis muncul di sini.'
        }
      />

      {/* Modal Alokasi Barang Jadi */}
      <AllocateFinishedGoodModal
        isOpen={Boolean(selectedFGForAllocation)}
        onClose={() => setSelectedFGForAllocation(null)}
        finishedGood={selectedFGForAllocation}
        onSuccess={() => {
          fetchFinishedGoods();
        }}
      />
    </>
  );
}
