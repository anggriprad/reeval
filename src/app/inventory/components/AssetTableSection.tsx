'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import CustomTable, { Column } from '@/components/ui/CustomTable';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory } from '@/lib/roles';
import { formatCurrency } from '@/lib/utils';
import {
  companyAssetService,
  CompanyAssetItem,
} from '@/services/company-asset.service';
import {
  assetCategoryService,
  AssetCategoryOption,
} from '@/services/asset-category.service';
import { AssetModal } from './AssetModal';
import { AssetServiceModal } from './AssetServiceModal';
import { Edit2, Trash2, Wrench } from 'lucide-react';

export interface AssetFilters {
  ast_page: number;
  ast_per_page: number;
  ast_search: string;
  ast_category_id: string;
  ast_status: string;
}

interface AssetTableSectionProps {
  filters: AssetFilters;
  setFilter: (key: keyof AssetFilters, value: any) => void;
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  categoryOptions: AssetCategoryOption[];
}

export function AssetTableSection({
  filters,
  setFilter,
  isAddModalOpen,
  onCloseAddModal,
  categoryOptions,
}: AssetTableSectionProps) {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const { currentUser, bankAccounts = [] } = useApp();

  // UAC / PBAC Permissions
  const canUpdate =
    can(PERMISSIONS.INVENTORY.ASSET_UPDATE) || canManageInventory(currentUser.role);
  const canDelete =
    can(PERMISSIONS.INVENTORY.ASSET_DELETE) || canManageInventory(currentUser.role);
  const canManage = canUpdate || canDelete;

  const [assets, setAssets] = useState<CompanyAssetItem[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [editAsset, setEditAsset] = useState<CompanyAssetItem | null>(null);
  const [serviceAsset, setServiceAsset] = useState<CompanyAssetItem | null>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await companyAssetService.getAssets({
        page: filters.ast_page,
        per_page: filters.ast_per_page,
        search: filters.ast_search?.trim() || undefined,
        category_id: filters.ast_category_id ? Number(filters.ast_category_id) : undefined,
        status: filters.ast_status || undefined,
      });

      if (res.data) {
        setAssets(res.data);
        if (res.meta) {
          setTotalAssets(res.meta.total);
          setTotalPages(res.meta.total_pages || 1);
        } else {
          setTotalAssets(res.data.length);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Failed to load company assets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.ast_page,
    filters.ast_per_page,
    filters.ast_search,
    filters.ast_category_id,
    filters.ast_status,
  ]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleDeleteAsset = async (asset: CompanyAssetItem) => {
    if (!canDelete) {
      toast.error('Akses Ditolak', 'Anda tidak memiliki hak akses untuk menghapus aset.');
      return;
    }

    const confirmed = await confirm({
      title: 'Hapus Aset Perusahaan',
      message: `Apakah Anda yakin ingin menghapus aset "${asset.name}" (${asset.code})? Data yang sudah dihapus tidak dapat dikembalikan.`,
      variant: 'danger',
      confirmText: 'Hapus Aset',
    });

    if (confirmed) {
      try {
        const res = await companyAssetService.deleteAsset(asset.id);
        if (res.success) {
          toast.success('Aset Dihapus', `Aset "${asset.name}" berhasil dihapus.`);
          await fetchAssets();
        } else {
          toast.error('Gagal Menghapus', res.message || 'Aset tidak dapat dihapus.');
        }
      } catch (err: any) {
        toast.error(
          'Gagal Menghapus',
          err?.response?.data?.message || err?.message || 'Aset tidak dapat dihapus.'
        );
      }
    }
  };

  const columns: Column<CompanyAssetItem>[] = [
    {
      id: 'code',
      header: 'Kode',
      align: 'left',
      cell: ({ row: ast }) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {ast.code}
        </span>
      ),
    },
    {
      id: 'name',
      header: 'Nama Aset & Kategori',
      width: '280px',
      className: 'min-w-[260px]',
      cell: ({ row: ast }) => (
        <div className="flex flex-col gap-0.5 max-w-[280px]">
          <TruncatedText
            text={ast.name}
            className="font-semibold text-slate-900 dark:text-white"
            maxWidth="260px"
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {ast.category_name || ast.category}
          </span>
        </div>
      ),
    },
    {
      id: 'acquisition_type',
      header: 'Perolehan',
      align: 'center',
      cell: ({ row: ast }) =>
        ast.acquisition_type === 'NEW_PURCHASE' ? (
          <Badge variant="purple">Beli Baru</Badge>
        ) : (
          <Badge variant="default">Saldo Awal</Badge>
        ),
    },
    {
      id: 'purchase_cost',
      header: 'Harga Perolehan',
      align: 'right',
      cell: ({ row: ast }) => (
        <span className="font-mono font-medium text-slate-900 dark:text-white">
          {formatCurrency(ast.purchase_cost)}
        </span>
      ),
    },
    {
      id: 'current_book_value',
      header: 'Nilai Buku',
      align: 'right',
      cell: ({ row: ast }) => (
        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
          {formatCurrency(ast.current_book_value ?? ast.purchase_cost)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      cell: ({ row: ast }) => {
        const statusVariant: 'success' | 'warning' | 'danger' | 'default' =
          ast.status === 'ACTIVE' || ast.status === 'AKTIF'
            ? 'success'
            : ast.status === 'IN_MAINTENANCE' || ast.status === 'MAINTENANCE'
            ? 'warning'
            : ast.status === 'BROKEN' || ast.status === 'RUSAK'
            ? 'danger'
            : 'default';

        const statusLabel =
          ast.status === 'ACTIVE' || ast.status === 'AKTIF'
            ? 'Aktif'
            : ast.status === 'IN_MAINTENANCE' || ast.status === 'MAINTENANCE'
            ? 'Perawatan'
            : ast.status === 'BROKEN' || ast.status === 'RUSAK'
            ? 'Rusak'
            : ast.status === 'DISPOSED'
            ? 'Dijual'
            : 'Afkir / Scrap';

        return <Badge variant={statusVariant}>{statusLabel}</Badge>;
      },
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            header: 'Aksi',
            align: 'center' as const,
            cell: ({ row: ast }: { row: CompanyAssetItem; value: any }) => {
              const hasDependencies = (ast.accumulated_service_cost || 0) > 0;

              const menuItems: ActionMenuItem[] = [];

              if (canUpdate) {
                menuItems.push({
                  label: 'Edit',
                  icon: <Edit2 className="h-3.5 w-3.5" />,
                  onClick: () => setEditAsset(ast),
                });
                menuItems.push({
                  label: 'Catat Servis',
                  icon: <Wrench className="h-3.5 w-3.5" />,
                  onClick: () => setServiceAsset(ast),
                });
              }

              if (canDelete && !hasDependencies) {
                menuItems.push({
                  label: 'Hapus',
                  icon: <Trash2 className="h-3.5 w-3.5" />,
                  variant: 'danger',
                  onClick: () => handleDeleteAsset(ast),
                });
              }

              return (
                <div
                  className="flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionMenu menuWidth="w-max min-w-[120px]" items={menuItems} />
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <CustomTable<CompanyAssetItem>
        data={assets}
        columns={columns}
        loading={isLoading}
        pagination={true}
        currentPage={filters.ast_page}
        perPage={filters.ast_per_page}
        total={totalAssets}
        lastPage={totalPages}
        onPageChange={(p) => setFilter('ast_page', p)}
        onPerPageChange={(pp) => {
          setFilter('ast_per_page', pp);
          setFilter('ast_page', 1);
        }}
        onRowClick={(ast) => router.push(`/inventory/assets/${ast.id}`)}
        emptyTitle={
          filters.ast_search || filters.ast_category_id || filters.ast_status
            ? 'Tidak Ada Aset'
            : 'Belum Ada Aset Terdaftar'
        }
        emptyDescription={
          filters.ast_search || filters.ast_category_id || filters.ast_status
            ? 'Tidak ada aset yang cocok dengan pencarian atau filter.'
            : 'Register aset & alat kerja untuk mencatat biaya penyusutan dan servis.'
        }
      />

      {/* Modal Add & Edit Asset */}
      <AssetModal
        isOpen={isAddModalOpen || Boolean(editAsset)}
        onClose={() => {
          if (isAddModalOpen) onCloseAddModal();
          if (editAsset) setEditAsset(null);
        }}
        editAsset={editAsset}
        onSuccess={() => {
          fetchAssets();
        }}
        categoryOptions={categoryOptions}
        bankAccounts={bankAccounts.map((b) => ({
          id: b.id,
          name: b.name,
          balance: b.balance,
        }))}
      />

      {/* Modal Service History & Record Service */}
      <AssetServiceModal
        isOpen={Boolean(serviceAsset)}
        onClose={() => setServiceAsset(null)}
        asset={serviceAsset}
        onSuccess={() => {
          fetchAssets();
        }}
        canManage={canManage}
      />
    </>
  );
}
