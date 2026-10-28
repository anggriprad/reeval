'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { ActionMenu } from '@/components/ui/ActionMenu';
import CustomTable, { Column } from '@/components/ui/CustomTable';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory, canRequestPO, canManageProduction } from '@/lib/roles';
import {
  formatCurrency,
  getStockLevel,
  getStockLevelBadgeVariant,
  getStockLevelDescription,
} from '@/lib/utils';
import type { RawMaterial } from '@/lib/types';
import {
  materialService,
  MaterialItem,
  MaterialOption,
} from '@/services/material.service';
import {
  materialCategoryService,
  MaterialCategoryOption,
} from '@/services/material-category.service';
import {
  productionRoutingService,
  ProductionRoutingOption,
} from '@/services/production-routing.service';
import { RawMaterialModal } from './RawMaterialModal';
import { Edit2, Trash2 } from 'lucide-react';

interface RawMaterialSectionProps {
  filters: {
    page: number;
    per_page: number;
    search: string;
    category_id: string;
    status: string;
  };
  setFilter: (key: 'page' | 'per_page' | 'search' | 'category_id' | 'status', value: any) => void;
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  onOpenProcurement: (materialId: string) => void;
  onOpenCreateSaWorkOrder: (materialId: string) => void;
}

export function RawMaterialSection({
  filters,
  setFilter,
  isAddModalOpen,
  onCloseAddModal,
  onOpenProcurement,
  onOpenCreateSaWorkOrder,
}: RawMaterialSectionProps) {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    currentUser,
    workOrders = [],
    routings = [],
    operations = [],
    setMaterialsList,
  } = useApp();

  // UAC / PBAC Permissions (Granular Permission with Role fallback)
  const canUpdate = can(PERMISSIONS.INVENTORY.UPDATE) || canManageInventory(currentUser.role);
  const canDelete = can(PERMISSIONS.INVENTORY.DELETE) || canManageInventory(currentUser.role);
  const canProcure = can(PERMISSIONS.PURCHASING.CREATE) || canRequestPO(currentUser.role);
  const canProduce = can(PERMISSIONS.PRODUCTION.CREATE) || canManageProduction(currentUser.role);
  const canAnyAction = canUpdate || canDelete || canProcure || canProduce;

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editMaterial, setEditMaterial] = useState<RawMaterial | null>(null);

  // Options for select inputs
  const [categoryOptions, setCategoryOptions] = useState<MaterialCategoryOption[]>([]);
  const [routingOptions, setRoutingOptions] = useState<ProductionRoutingOption[]>([]);
  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await materialService.getMaterials({
        page: filters.page,
        per_page: filters.per_page,
        search: filters.search?.trim() || undefined,
        category_id: filters.category_id ? Number(filters.category_id) : undefined,
        status: filters.status || undefined,
      });

      if (res.data) {
        const mapped: RawMaterial[] = res.data.map((m: MaterialItem) => ({
          id: String(m.id),
          code: m.code,
          name: m.name,
          category: m.category,
          unit: m.unit,
          unitCost: m.unit_cost,
          stock: m.stock,
          minStock: m.min_stock,
          isSubAssembly: m.is_sub_assembly,
          routingId: m.routing_id ? String(m.routing_id) : undefined,
          childBom: m.child_bom?.map((cb) => ({
            materialId: String(cb.child_material_id),
            qty: cb.qty,
          })),
          isActive: m.is_active,
        }));
        setRawMaterials(mapped);
        setMaterialsList(mapped);

        if (res.meta) {
          setTotalMaterials(res.meta.total);
          setTotalPages(res.meta.total_pages || 1);
        } else {
          setTotalMaterials(mapped.length);
          setTotalPages(1);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch materials from API:', err);
      toast.error('Gagal Memuat Bahan Baku', err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  }, [filters.page, filters.per_page, filters.search, filters.category_id, filters.status, setMaterialsList, toast]);

  const fetchOptions = useCallback(async () => {
    try {
      const [catRes, rtRes, matOptRes] = await Promise.all([
        materialCategoryService.getCategoryOptions(),
        productionRoutingService.getRoutingOptions(),
        materialService.getMaterialOptions(),
      ]);
      if (catRes.data) setCategoryOptions(catRes.data);
      if (rtRes.data) setRoutingOptions(rtRes.data);
      if (matOptRes.data) setMaterialOptions(matOptRes.data);
    } catch (err) {
      console.error('Failed to fetch options for materials:', err);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Complete material list for child BOM dropdown in sub-assembly modal
  const allAvailableMaterials = useMemo<RawMaterial[]>(() => {
    return materialOptions.map((opt) => ({
      id: String(opt.id),
      code: opt.code,
      name: opt.name,
      category: '',
      unit: opt.unit,
      unitCost: opt.unit_cost,
      stock: 0,
      minStock: 0,
      isSubAssembly: opt.is_sub_assembly,
    }));
  }, [materialOptions]);

  // Map stok bahan baku yang ditahan oleh SPK aktif
  const reservedMaterialMap = useMemo(() => {
    const map = new Map<string, number>();
    (workOrders || [])
      .filter((w) => w.status !== 'COMPLETED' && w.status !== 'CANCELED')
      .forEach((w) => {
        (w.materialsConsumed || []).forEach((b) => {
          const current = map.get(b.materialId) || 0;
          map.set(b.materialId, current + b.qty);
        });
      });
    return map;
  }, [workOrders]);

  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!canDelete) {
      toast.error('Akses Ditolak', 'Anda tidak memiliki hak akses untuk menghapus bahan baku.');
      return;
    }
    const isOk = await confirm({
      title: 'Hapus Bahan Baku',
      message: `Apakah Anda yakin ingin menghapus bahan baku "${name}"? Bahan hanya dapat dihapus jika belum pernah memiliki transaksi operasional.`,
      confirmText: 'Hapus Material',
      variant: 'danger',
    });
    if (isOk) {
      try {
        const res = await materialService.deleteMaterial(Number(id));
        if (res.success) {
          toast.success('Bahan Baku Dihapus', `Bahan baku "${name}" berhasil dinonaktifkan.`);
          setRawMaterials((prev) => prev.filter((m) => m.id !== id));
          setTotalMaterials((prev) => Math.max(0, prev - 1));

          if (rawMaterials.length === 1 && (filters.page || 1) > 1) {
            setFilter('page', (filters.page || 1) - 1);
          }
          await fetchMaterials();
          await fetchOptions();
        } else {
          toast.error('Gagal Menghapus', res.message || 'Bahan baku tidak dapat dihapus.');
        }
      } catch (err: any) {
        toast.error(
          'Gagal Menghapus',
          err.response?.data?.message || err.message || 'Bahan baku tidak dapat dihapus.'
        );
      }
    }
  };

  const handleEditClick = (mat: RawMaterial) => {
    if (!canUpdate) {
      toast.error('Akses Ditolak', 'Anda tidak memiliki hak akses untuk mengedit bahan baku.');
      return;
    }
    setEditMaterial(mat);
  };

  const materialColumns: Column<RawMaterial>[] = [
    {
      id: 'code',
      header: 'Kode',
      align: 'left',
      cell: ({ row: mat }) => (
        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
          {mat.code}
        </span>
      ),
    },
    {
      id: 'name',
      header: 'Nama Bahan',
      align: 'left',
      width: '300px',
      className: 'min-w-[260px]',
      cell: ({ row: mat }) => (
        <div className="flex items-center gap-2 max-w-[320px]">
          <TruncatedText
            text={mat.name}
            className="font-semibold text-slate-900 dark:text-white"
            maxWidth="250px"
          />
          {mat.isSubAssembly && (
            <Badge variant="purple" className="shrink-0">
              WIP
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Kategori',
      align: 'left',
      cell: ({ row: mat }) => <Badge>{mat.category}</Badge>,
    },
    {
      id: 'stock',
      header: 'Stok',
      align: 'right',
      cell: ({ row: mat }) => (
        <span className="font-semibold text-slate-900 dark:text-white">
          {mat.stock}
        </span>
      ),
    },
    {
      id: 'reservedStock',
      header: 'Stok Ditahan',
      align: 'right',
      cell: ({ row: mat }) => {
        const reserved = reservedMaterialMap.get(mat.id) || 0;
        return (
          <span
            className={`font-mono ${
              reserved > 0
                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {reserved}
          </span>
        );
      },
    },
    {
      id: 'unit',
      header: 'Satuan',
      align: 'left',
      cell: ({ row: mat }) => (
        <span className="text-slate-500 dark:text-slate-400 text-xs">
          {mat.unit}
        </span>
      ),
    },
    {
      id: 'unitCost',
      header: 'HPP Satuan',
      align: 'right',
      cell: ({ row: mat }) => (
        <span className="font-mono text-slate-700 dark:text-slate-300">
          {formatCurrency(mat.unitCost)}
        </span>
      ),
    },
    {
      id: 'totalValue',
      header: 'Total Nilai',
      align: 'right',
      cell: ({ row: mat }) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400">
          {formatCurrency(mat.stock * mat.unitCost)}
        </span>
      ),
    },
    {
      id: 'minStock',
      header: 'Batas Min',
      align: 'center',
      cell: ({ row: mat }) => <span className="text-slate-500">{mat.minStock}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      cell: ({ row: mat }) => {
        const level = getStockLevel(mat.stock, mat.minStock);
        return (
          <Badge
            variant={getStockLevelBadgeVariant(level)}
            title={getStockLevelDescription(level)}
            className="cursor-default"
          >
            {level}
          </Badge>
        );
      },
    },
    ...(canAnyAction
      ? [
          {
            id: 'actions',
            header: 'Aksi',
            align: 'center' as const,
            width: '190px',
            className: 'w-[190px] whitespace-nowrap',
            cell: ({ row: mat }: { row: RawMaterial }) => (
              <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                {!mat.isSubAssembly ? (
                  canProcure && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProcurement(mat.id);
                      }}
                      title={`Buat pengadaan untuk ${mat.name}`}
                    >
                      Buat Pengadaan
                    </Button>
                  )
                ) : (
                  canProduce && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCreateSaWorkOrder(mat.id);
                      }}
                      title={`Buat SPK untuk ${mat.name}`}
                    >
                      Buat SPK
                    </Button>
                  )
                )}

                {(canUpdate || canDelete) && (
                  <ActionMenu
                    items={[
                      ...(canUpdate
                        ? [
                            {
                              label: 'Edit',
                              icon: <Edit2 className="h-3.5 w-3.5" />,
                              onClick: () => handleEditClick(mat),
                            },
                          ]
                        : []),
                      ...(canDelete
                        ? [
                            {
                              label: 'Delete',
                              icon: <Trash2 className="h-3.5 w-3.5" />,
                              variant: 'danger' as const,
                              onClick: () => handleDeleteMaterial(mat.id, mat.name),
                            },
                          ]
                        : []),
                    ]}
                  />
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <CustomTable<RawMaterial>
        data={rawMaterials}
        columns={materialColumns}
        loading={isLoading}
        pagination={true}
        currentPage={filters.page}
        perPage={filters.per_page}
        total={totalMaterials}
        lastPage={totalPages}
        onPageChange={(p) => setFilter('page', p)}
        onPerPageChange={(pp) => {
          setFilter('per_page', pp);
          setFilter('page', 1);
        }}
        emptyTitle={
          filters.search || filters.category_id || filters.status
            ? 'Tidak Ada Bahan Baku'
            : 'Belum Ada Bahan Baku'
        }
        emptyDescription={
          filters.search || filters.category_id || filters.status
            ? 'Tidak ada bahan baku yang cocok dengan pencarian atau filter.'
            : 'Register bahan baku baru untuk mulai mengelola stok inventaris gudang.'
        }
      />

      {/* Modal: Add & Edit Raw Material */}
      <RawMaterialModal
        isOpen={isAddModalOpen || Boolean(editMaterial)}
        onClose={() => {
          if (isAddModalOpen) onCloseAddModal();
          if (editMaterial) setEditMaterial(null);
        }}
        editMaterial={editMaterial}
        onSuccess={() => {
          fetchMaterials();
          fetchOptions();
        }}
        categoryOptions={categoryOptions}
        routingOptions={routingOptions}
        materialOptions={materialOptions}
        allMaterials={allAvailableMaterials}
        allRoutings={routings}
        allOperations={operations}
      />
    </>
  );
}
