'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory, canSeeCosts } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  productService,
  ProductListItem,
  resolveProductImageUrl,
} from '@/services/product.service';
import {
  productCategoryService,
  ProductCategoryOption,
} from '@/services/product-category.service';
import {
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Tag,
  Clock,
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

function combinationLabel(combination: Record<string, string>): string {
  if (!combination || typeof combination !== 'object') return 'Default';
  const values = Object.values(combination).filter(Boolean);
  return values.join(' / ') || 'Default';
}

interface ProductSectionProps {
  categoryFilter?: string;
  searchTerm?: string;
}

export function ProductSection({ categoryFilter, searchTerm }: ProductSectionProps) {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const { currentUser, masterModifierGroups, materials } = useApp();

  const isInventoryManager = canManageInventory(currentUser.role);
  const seeCosts = canSeeCosts(currentUser.role);
  const canCreate = isInventoryManager || can(PERMISSIONS.PRODUCT.CREATE);
  const canUpdate = isInventoryManager || can(PERMISSIONS.PRODUCT.UPDATE);
  const canDelete = isInventoryManager || can(PERMISSIONS.PRODUCT.DELETE);
  const canManage = isInventoryManager || canCreate || canUpdate || canDelete;

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  const { filters, setFilter } = useTableFilters({
    prod_search: searchTerm || '',
    prod_category_id: categoryFilter || '',
    prod_page: 1,
    prod_per_page: 20,
  });

  // Sync external search/filter props from parent SegmentedControl into table filters
  useEffect(() => {
    if (searchTerm !== undefined && searchTerm !== filters.prod_search) {
      setFilter('prod_search', searchTerm);
      setFilter('prod_page', 1);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (categoryFilter !== undefined && categoryFilter !== filters.prod_category_id) {
      setFilter('prod_category_id', categoryFilter);
      setFilter('prod_page', 1);
    }
  }, [categoryFilter]);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const page = Number(filters.prod_page) || 1;
      const perPage = Number(filters.prod_per_page) || 20;
      const search = filters.prod_search ? String(filters.prod_search).trim() : undefined;
      const categoryId = filters.prod_category_id ? Number(filters.prod_category_id) : undefined;

      const res = await productService.getProducts({
        page,
        per_page: perPage,
        search,
        category_id: categoryId && !isNaN(categoryId) ? categoryId : undefined,
      });

      if (res.success && res.data) {
        setProducts(res.data);
        const metaTotal = res.meta?.total ?? res.data.length;
        setTotal(metaTotal);
        setTotalPages(res.meta?.total_pages ?? Math.max(1, Math.ceil(metaTotal / perPage)));
      } else {
        setProducts([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error('Gagal Memuat Produk', err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem.');
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [filters.prod_search, filters.prod_category_id, filters.prod_page, filters.prod_per_page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = async (p: ProductListItem) => {
    if (!canDelete) {
      toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk menghapus produk.');
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Produk',
      message: `Apakah Anda yakin ingin menghapus produk "${p.name}"? Produk hanya dapat dihapus jika tidak memiliki sisa stok dan belum memiliki riwayat transaksi mutasi.`,
      confirmText: 'Hapus Produk',
      variant: 'danger',
    });

    if (isOk) {
      try {
        const res = await productService.deleteProduct(p.id);
        if (res.success) {
          toast.success('Produk Dihapus', `Produk "${p.name}" berhasil dihapus dari sistem.`);
          loadProducts();
        } else {
          toast.error('Gagal Menghapus', res.message || 'Produk tidak dapat dihapus.');
        }
      } catch (err: any) {
        toast.error('Gagal Menghapus', err?.response?.data?.message || 'Produk tidak dapat dihapus.');
      }
    }
  };

  const priceRange = (p: ProductListItem) => {
    const min = p.min_price || 0;
    const max = p.max_price || 0;
    if (min === 0 && max === 0) {
      return p.base_price > 0 ? formatCurrency(p.base_price) : '-';
    }
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilter('prod_page', newPage);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setFilter('prod_per_page', newPerPage);
    setFilter('prod_page', 1);
  };

  const currentPage = Number(filters.prod_page) || 1;
  const perPage = Number(filters.prod_per_page) || 20;

  if (products.length === 0) {
    return (
      <EmptyState
        title={searchTerm ? 'Tidak ada produk yang cocok.' : 'Belum ada produk terdaftar.'}
        icon={<Layers className="h-7 w-7 text-slate-400" />}
        description={
          searchTerm
            ? 'Coba gunakan kata kunci pencarian yang berbeda.'
            : 'Tambahkan produk baru untuk mulai mengelola katalog produk Anda.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <th className="px-4 py-3">Produk</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3 text-center">Varian Aktif</th>
              <th className="px-4 py-3 text-right">Rentang Harga</th>
              {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
                    <span className="text-xs">Memuat katalog produk...</span>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  {filters.prod_search ? 'Tidak ada produk yang cocok.' : 'Belum ada produk terdaftar.'}
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const IconComp = iconMap[p.image_icon] || BedDouble;
                const isExpanded = expandedProductId === p.id;
                const variantsList = p.variants || [];
                const activeVariants = variantsList.filter((v) => v.is_active);
                const activeVariantsCount = p.variant_count || activeVariants.length;

                let variantTypes: { name: string; values: string[] }[] = [];
                if (p.variant_types_json) {
                  try {
                    variantTypes = JSON.parse(p.variant_types_json);
                  } catch {}
                }

                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedProductId(isExpanded ? null : p.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={resolveProductImageUrl(p.image_url)}
                              alt={p.name}
                              className="h-9 w-9 shrink-0 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                              <IconComp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{p.description}</p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{p.category_name || '-'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                          {activeVariantsCount}
                          <span className="text-xs font-normal text-slate-400">SKU</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {priceRange(p)}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canUpdate && (
                              <Link
                                href={`/products/${p.id}/edit`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={canManage ? 5 : 4} className="px-4 py-0 bg-slate-50/50 dark:bg-slate-900/20">
                          <div className="py-3 space-y-2">
                            {variantTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {variantTypes.map((vt) => (
                                  <span
                                    key={vt.name}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                                  >
                                    <Tag className="h-2.5 w-2.5" /> {vt.name}: {(vt.values || []).join(', ')}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    <th className="px-3 py-2 text-left font-medium">SKU</th>
                                    <th className="px-3 py-2 text-left font-medium">Kombinasi Varian</th>
                                    {seeCosts && <th className="px-3 py-2 text-right font-medium">HPP Material</th>}
                                    <th className="px-3 py-2 text-right font-medium">Harga Jual</th>
                                    <th className="px-3 py-2 text-center font-medium">Est. Jam Kerja</th>
                                    {seeCosts && <th className="px-3 py-2 text-right font-medium">Margin</th>}
                                    <th className="px-3 py-2 text-center font-medium">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {variantsList.length === 0 ? (
                                    <tr>
                                      <td colSpan={seeCosts ? 7 : 5} className="py-3 text-center text-slate-400">
                                        Tidak ada detail varian.
                                      </td>
                                    </tr>
                                  ) : (
                                    variantsList.map((v) => {
                                      const bomCost = v.bom_cost || 0;
                                      const margin =
                                        v.price > 0
                                          ? (((v.price - bomCost) / v.price) * 100).toFixed(1)
                                          : '-';
                                      const hours = v.estimated_hours || p.default_estimated_hours || 0;

                                      return (
                                        <tr
                                          key={v.id}
                                          className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                                            !v.is_active ? 'opacity-50' : ''
                                          }`}
                                        >
                                          <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">
                                            {v.sku}
                                          </td>
                                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                                            {combinationLabel(v.combination)}
                                          </td>
                                          {seeCosts && (
                                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                                              {formatCurrency(bomCost)}
                                            </td>
                                          )}
                                          <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(v.price)}
                                          </td>
                                          <td className="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                                            <span className="inline-flex items-center gap-1">
                                              <Clock className="h-3 w-3 text-indigo-500" />
                                              {hours} Jam
                                            </span>
                                          </td>
                                          {seeCosts && (
                                            <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                              {margin}
                                              {margin !== '-' ? '%' : ''}
                                            </td>
                                          )}
                                          <td className="px-3 py-2 text-center">
                                            <Badge variant={v.is_active ? 'success' : 'default'}>
                                              {v.is_active ? 'Aktif' : 'Non-Aktif'}
                                            </Badge>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {(() => {
                              const prodModifierIds = (p.modifier_group_ids || []).map(String);
                              const prodModifiers = masterModifierGroups
                                ? masterModifierGroups.filter((g) => prodModifierIds.includes(String(g.id)))
                                : [];
                              if (prodModifiers.length === 0) return null;
                              return (
                                <div className="mt-3 space-y-2">
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                    Modifier (Pilihan Add-on):
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {prodModifiers.map((group) => (
                                      <div
                                        key={group.id}
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50/50 dark:bg-slate-800/10"
                                      >
                                        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1.5">
                                          {group.name} (
                                          {group.selectType === 'MULTI' ? 'Multi-select' : 'Single-select'})
                                        </p>
                                        <div className="space-y-1.5">
                                          {(group.options || []).map((opt) => {
                                            const bomCost = (opt.bom || []).reduce((sum, b) => {
                                              const mat = (materials || []).find((m) => m.id === b.materialId);
                                              return sum + (mat ? mat.unitCost * b.qty : 0);
                                            }, 0);
                                            return (
                                              <div
                                                key={opt.id}
                                                className="text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0"
                                              >
                                                <div className="flex justify-between font-medium">
                                                  <span>{opt.name}</span>
                                                  <span className="text-emerald-600 dark:text-emerald-400">
                                                    +{formatCurrency(opt.additionalPrice)}
                                                  </span>
                                                </div>
                                                {opt.bom && opt.bom.length > 0 && (
                                                  <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 pl-2 border-l border-slate-200 dark:border-slate-700">
                                                    <span>
                                                      BOM:{' '}
                                                      {opt.bom
                                                        .map((b) => {
                                                          const mat = (materials || []).find(
                                                            (m) => m.id === b.materialId
                                                          );
                                                          return `${mat?.name || b.materialId} (${b.qty} ${mat?.unit || 'unit'})`;
                                                        })
                                                        .join(', ')}
                                                    </span>
                                                    <span className="block text-[9px] font-semibold text-indigo-500 mt-0.5">
                                                      Est. HPP Material: {formatCurrency(bomCost)}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Server-side Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Menampilkan</span>
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>
            dari <strong className="text-slate-700 dark:text-slate-200">{total}</strong> produk
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            Halaman <strong className="text-slate-700 dark:text-slate-200">{currentPage}</strong> dari{' '}
            <strong className="text-slate-700 dark:text-slate-200">{totalPages || 1}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              aria-label="Previous Page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              aria-label="Next Page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
