'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { BankAccount } from '@/lib/types';
import { PERMISSIONS } from '@/lib/permissions';
import {
  bankAccountService,
  mapBankAccountOptionToBankAccount,
} from '@/services/bank-account.service';
import {
  companyAssetService,
  CompanyAssetDetail,
} from '@/services/company-asset.service';
import {
  assetCategoryService,
  AssetCategoryOption,
} from '@/services/asset-category.service';
import { AssetSummaryCard } from './components/AssetSummaryCard';
import { AssetServiceHistoryCard } from './components/AssetServiceHistoryCard';
import { AssetEditModal } from './components/AssetEditModal';
import { AssetRecordServiceModal } from './components/AssetRecordServiceModal';
import { AssetDisposeModal } from './components/AssetDisposeModal';
import {
  Wrench,
  Edit2,
  Trash2,
  Loader2,
  Archive,
} from 'lucide-react';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can } = usePermission();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const canUpdate = can(PERMISSIONS.INVENTORY.ASSET_UPDATE);
  const canService = can(PERMISSIONS.INVENTORY.ASSET_SERVICE);
  const canDelete = can(PERMISSIONS.INVENTORY.ASSET_DELETE);
  const canManage = canUpdate || canService || canDelete;

  const [asset, setAsset] = useState<CompanyAssetDetail | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<AssetCategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDisposeModal, setShowDisposeModal] = useState(false);

  const fetchBankOptions = useCallback(async () => {
    try {
      const res = await bankAccountService.getOptions();
      if (Array.isArray(res.data)) {
        setBankAccounts(res.data.map(mapBankAccountOptionToBankAccount));
      }
    } catch {
      // Ignore offline fallback
    }
  }, []);

  const fetchAsset = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await companyAssetService.getAssetById(id);
      if (res.data) {
        setAsset(res.data);
      } else {
        setAsset(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load asset detail:', err);
      setAsset(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    companyAssetService
      .getAssetById(id)
      .then((res) => {
        if (!isMounted) return;
        setAsset(res.data ?? null);
      })
      .catch((err: unknown) => {
        console.error('Failed to load asset detail:', err);
        if (isMounted) setAsset(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    assetCategoryService
      .getCategoryOptions()
      .then((res) => {
        if (res.data) {
          setCategoryOptions(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load asset categories:', err);
      });

    let isMounted = true;
    bankAccountService
      .getOptions()
      .then((res) => {
        if (!isMounted || !Array.isArray(res.data)) return;
        setBankAccounts(res.data.map(mapBankAccountOptionToBankAccount));
      })
      .catch(() => {
        // Ignore offline fallback
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-2" />
        <p className="text-sm text-slate-500">Memuat detail aset...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <PageHeader
          backHref="/inventory?tab=assets"
          title="Detail Aset"
        />
        <EmptyState
          title="Aset Tidak Ditemukan"
          description={`Aset dengan ID "${id}" tidak ditemukan atau telah dihapus.`}
          action={
            <Button onClick={() => router.push('/inventory?tab=assets')}>
              Kembali ke Daftar Aset
            </Button>
          }
        />
      </div>
    );
  }

  const serviceLogs = asset.service_logs || [];
  const depreciations = asset.depreciations || [];
  const hasDependencies = serviceLogs.length > 0 || depreciations.length > 0;
  const isDisposed = asset.status === 'DISPOSED' || asset.status === 'SCRAPPED';
  const usefulMonths = asset.useful_life_months || (asset.useful_life_years ? asset.useful_life_years * 12 : 60);
  const cashAccount = bankAccounts.find((b) => b.id === asset.cash_account_id);

  const statusVariant: 'success' | 'warning' | 'danger' | 'default' =
    asset.status === 'ACTIVE' || asset.status === 'AKTIF'
      ? 'success'
      : asset.status === 'IN_MAINTENANCE' || asset.status === 'MAINTENANCE'
        ? 'warning'
        : asset.status === 'BROKEN' || asset.status === 'RUSAK'
          ? 'danger'
          : 'default';

  const statusLabel =
    asset.status === 'ACTIVE' || asset.status === 'AKTIF'
      ? 'Aktif'
      : asset.status === 'IN_MAINTENANCE' || asset.status === 'MAINTENANCE'
        ? 'Perawatan'
        : asset.status === 'BROKEN' || asset.status === 'RUSAK'
          ? 'Rusak'
          : asset.status === 'DISPOSED'
            ? 'Dijual'
            : 'Afkir / Scrap';

  const handleDelete = async () => {
    if (hasDependencies) {
      toast.error(
        'Gagal Menghapus Aset',
        'Aset tidak dapat dihapus karena memiliki riwayat pemeliharaan atau depresiasi.'
      );
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Aset Perusahaan',
      message: `Apakah Anda yakin ingin menghapus aset "${asset.name}" (${asset.code}) dari sistem? Data master aset akan dihapus secara permanen.`,
      confirmText: 'Hapus Aset',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await companyAssetService.deleteAsset(asset.id);
        toast.success('Aset Dihapus', `Aset "${asset.name}" berhasil dihapus.`);
        router.push('/inventory?tab=assets');
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error(
          'Gagal Menghapus Aset',
          e?.response?.data?.message || e?.message || 'Terjadi kesalahan saat menghapus aset.'
        );
      }
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    const isOk = await confirm({
      title: 'Hapus Riwayat Servis',
      message: 'Apakah Anda yakin ingin menghapus catatan servis ini?',
      confirmText: 'Hapus',
      variant: 'danger',
    });
    if (isOk) {
      try {
        await companyAssetService.deleteServiceLog(asset.id, serviceId);
        toast.success('Catatan Dihapus', 'Riwayat servis berhasil dihapus.');
        await Promise.all([fetchAsset(), fetchBankOptions()]);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error(
          'Gagal Menghapus Servis',
          e?.response?.data?.message || e?.message || 'Gagal menghapus catatan servis.'
        );
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        backHref="/inventory?tab=assets"
        title={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {asset.code}
            </span>
            <span className="text-slate-900 dark:text-white font-bold">{asset.name}</span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            {asset.acquisition_type === 'NEW_PURCHASE' ? (
              <Badge variant="purple">Beli Baru</Badge>
            ) : (
              <Badge variant="default">Saldo Awal</Badge>
            )}
          </div>
        }
      >
        {canManage && (
          <div className="flex items-center gap-2">
            {canService && !isDisposed && (
              <Button size="sm" variant="outline" onClick={() => { fetchBankOptions(); setShowServiceModal(true); }}>
                <Wrench className="h-3.5 w-3.5 mr-1.5" />
                Catat Servis
              </Button>
            )}
            {canUpdate && !isDisposed && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => { fetchBankOptions(); setShowDisposeModal(true); }} className="text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/30">
                  <Archive className="h-3.5 w-3.5 mr-1.5" />
                  Pelepasan Aset
                </Button>
              </>
            )}
            {canDelete && (
              hasDependencies ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled
                  title="Aset tidak dapat dihapus karena memiliki riwayat operasional"
                  className="text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Hapus
                </Button>
              ) : (
                <Button size="sm" variant="danger" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Hapus
                </Button>
              )
            )}
          </div>
        )}
      </PageHeader>

      <AssetSummaryCard
        asset={asset}
        usefulMonths={usefulMonths}
        cashAccount={cashAccount}
        isDisposed={isDisposed}
      />

      <AssetServiceHistoryCard
        serviceLogs={serviceLogs}
        canService={canService}
        canDelete={canDelete}
        isDisposed={isDisposed}
        onAddService={() => { fetchBankOptions(); setShowServiceModal(true); }}
        onDeleteService={handleDeleteService}
      />

      {showEditModal && (
        <AssetEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          asset={asset}
          usefulMonths={usefulMonths}
          categoryOptions={categoryOptions}
          bankAccounts={bankAccounts}
          onSuccess={fetchAsset}
        />
      )}

      {showServiceModal && (
        <AssetRecordServiceModal
          isOpen={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          assetId={asset.id}
          bankAccounts={bankAccounts}
          onSuccess={async () => {
            await Promise.all([fetchAsset(), fetchBankOptions()]);
          }}
        />
      )}

      {showDisposeModal && (
        <AssetDisposeModal
          isOpen={showDisposeModal}
          onClose={() => setShowDisposeModal(false)}
          asset={asset}
          bankAccounts={bankAccounts}
          onSuccess={async () => {
            await Promise.all([fetchAsset(), fetchBankOptions()]);
          }}
        />
      )}
    </div>
  );
}
