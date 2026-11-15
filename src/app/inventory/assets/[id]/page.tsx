'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Checkbox } from '@/components/ui/Checkbox';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { resolveAuthorName, type BankAccount } from '@/lib/types';
import { PERMISSIONS } from '@/lib/permissions';
import { canManageInventory } from '@/lib/roles';
import {
  bankAccountService,
  mapBankAccountOptionToBankAccount,
} from '@/services/bank-account.service';
import {
  companyAssetService,
  CompanyAssetDetail,
  AssetServiceLogItem,
} from '@/services/company-asset.service';
import {
  assetCategoryService,
  AssetCategoryOption,
} from '@/services/asset-category.service';
import {
  Wrench,
  Edit2,
  Trash2,
  Plus,
  AlertTriangle,
  History,
  Loader2,
  Archive,
} from 'lucide-react';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can } = usePermission();

  const {
    currentUser,
  } = useApp();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const canUpdate = can(PERMISSIONS.INVENTORY.ASSET_UPDATE);
  const canService = can(PERMISSIONS.INVENTORY.ASSET_SERVICE);
  const canDelete = can(PERMISSIONS.INVENTORY.ASSET_DELETE);
  const canManage = canUpdate || canService || canDelete;

  const [asset, setAsset] = useState<CompanyAssetDetail | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<AssetCategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Edit Asset State
  const [showEditModal, setShowEditModal] = useState(false);
  const [astCode, setAstCode] = useState('');
  const [astName, setAstName] = useState('');
  const [astCategoryId, setAstCategoryId] = useState<string>('');
  const [astCategoryName, setAstCategoryName] = useState('');
  const [astPurchaseDate, setAstPurchaseDate] = useState('');
  const [astPurchaseCost, setAstPurchaseCost] = useState<number | ''>('');
  const [astUsefulLifeMonths, setAstUsefulLifeMonths] = useState<number | ''>(60);
  const [astSalvageValue, setAstSalvageValue] = useState<number | ''>(0);
  const [astStatus, setAstStatus] = useState<string>('ACTIVE');
  const [editError, setEditError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Modal Record Service State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceCost, setServiceCost] = useState<number | ''>('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [serviceBankAccountId, setServiceBankAccountId] = useState('AP');
  const [serviceError, setServiceError] = useState('');
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  // Modal Disposal State
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [disposalType, setDisposalType] = useState<'SOLD' | 'SCRAPPED'>('SOLD');
  const [disposalDate, setDisposalDate] = useState('');
  const [disposalSaleAmount, setDisposalSaleAmount] = useState<number | ''>('');
  const [disposalBankAccountId, setDisposalBankAccountId] = useState('');
  const [disposalNotes, setDisposalNotes] = useState('');
  const [disposalError, setDisposalError] = useState('');
  const [isSubmittingDispose, setIsSubmittingDispose] = useState(false);

  const fetchBankOptions = useCallback(async () => {
    try {
      const res = await bankAccountService.getOptions();
      if (Array.isArray(res.data)) {
        setBankAccounts(res.data.map(mapBankAccountOptionToBankAccount));
      }
    } catch {
      // Abaikan jika offline
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
    } catch (err) {
      console.error('Failed to load asset detail:', err);
      setAsset(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

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
        // Abaikan jika offline
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

  const openEdit = () => {
    setAstCode(asset.code);
    setAstName(asset.name);
    setAstCategoryId(asset.category_id ? String(asset.category_id) : '');
    setAstCategoryName(asset.category_name || asset.category || '');
    setAstPurchaseDate(asset.purchase_date ? asset.purchase_date.split('T')[0] : '');
    setAstPurchaseCost(asset.purchase_cost);
    setAstUsefulLifeMonths(usefulMonths);
    setAstSalvageValue(asset.salvage_value ?? 0);
    setAstStatus(asset.status || 'ACTIVE');
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!astName.trim()) {
      setEditError('Nama Aset wajib diisi.');
      return;
    }
    const cost = Number(astPurchaseCost) || 0;
    const months = Number(astUsefulLifeMonths) || 0;
    if (cost <= 0) {
      setEditError('Harga perolehan harus lebih besar dari 0.');
      return;
    }
    if (months <= 0) {
      setEditError('Masa manfaat harus lebih besar dari 0 bulan.');
      return;
    }
    const salvage = Number(astSalvageValue) || 0;
    if (salvage < 0) {
      setEditError('Nilai sisa tidak boleh bernilai negatif.');
      return;
    }
    if (salvage >= cost) {
      setEditError('Nilai sisa tidak boleh melebihi atau sama dengan harga perolehan.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditError('');

      const matchedCat = categoryOptions.find(
        (c) => String(c.id) === String(astCategoryId) || c.name === astCategoryName
      );

      await companyAssetService.updateAsset(asset.id, {
        name: astName.trim(),
        category_id: matchedCat ? matchedCat.id : (astCategoryId ? Number(astCategoryId) : undefined),
        category: matchedCat ? matchedCat.name : astCategoryName,
        purchase_date: astPurchaseDate,
        purchase_cost: cost,
        useful_life_months: months,
        useful_life_years: Math.round((months / 12) * 10) / 10,
        salvage_value: salvage,
        status: astStatus,
      });

      toast.success('Aset Diperbarui', `Data aset "${astName}" berhasil disimpan.`);
      setShowEditModal(false);
      fetchAsset();
    } catch (err: any) {
      setEditError(
        err?.response?.data?.message || err?.message || 'Gagal menyimpan perubahan aset.'
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

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
      } catch (err: any) {
        toast.error(
          'Gagal Menghapus Aset',
          err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat menghapus aset.'
        );
      }
    }
  };

  const openAddService = () => {
    setServiceDate(new Date().toISOString().split('T')[0]);
    setServiceCost('');
    setServiceDesc('');
    setServiceProvider('');
    setServiceBankAccountId('AP');
    setServiceError('');
    fetchBankOptions();
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(serviceCost) || 0;
    if (!serviceDesc.trim() || cost <= 0) {
      setServiceError('Deskripsi servis dan biaya (harus > 0) wajib diisi.');
      return;
    }

    try {
      setIsSubmittingService(true);
      setServiceError('');

      await companyAssetService.addServiceLog(asset.id, {
        service_date: serviceDate || new Date().toISOString().split('T')[0],
        cost,
        description: serviceDesc.trim(),
        service_provider: serviceProvider.trim() || undefined,
        bank_account_id:
          serviceBankAccountId && serviceBankAccountId !== 'AP'
            ? Number(serviceBankAccountId)
            : undefined,
      });

      toast.success('Servis Dicatat', 'Riwayat pemeliharaan aset berhasil ditambahkan.');
      setShowServiceModal(false);
      await Promise.all([fetchAsset(), fetchBankOptions()]);
    } catch (err: any) {
      setServiceError(
        err?.response?.data?.message || err?.message || 'Gagal menyimpan catatan servis.'
      );
    } finally {
      setIsSubmittingService(false);
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
      } catch (err: any) {
        toast.error(
          'Gagal Menghapus Servis',
          err?.response?.data?.message || err?.message || 'Gagal menghapus catatan servis.'
        );
      }
    }
  };

  const openDisposeModal = () => {
    setDisposalType('SOLD');
    setDisposalDate(new Date().toISOString().split('T')[0]);
    setDisposalSaleAmount('');
    setDisposalBankAccountId(bankAccounts[0]?.id ? String(bankAccounts[0].id) : '');
    setDisposalNotes('');
    setDisposalError('');
    fetchBankOptions();
    setShowDisposeModal(true);
  };

  const handleConfirmDispose = async (e: React.FormEvent) => {
    e.preventDefault();
    const saleAmount = disposalType === 'SOLD' ? Number(disposalSaleAmount) || 0 : 0;
    if (disposalType === 'SOLD' && saleAmount <= 0) {
      setDisposalError('Harga jual aset wajib lebih dari 0 untuk tipe Dijual.');
      return;
    }
    if (disposalType === 'SOLD' && !disposalBankAccountId) {
      setDisposalError('Rekening kas/bank tujuan wajib dipilih untuk penerimaan hasil penjualan aset.');
      return;
    }

    try {
      setIsSubmittingDispose(true);
      setDisposalError('');
      await companyAssetService.disposeAsset(asset.id, {
        disposal_type: disposalType,
        disposal_date: disposalDate || new Date().toISOString().split('T')[0],
        sale_amount: disposalType === 'SOLD' ? saleAmount : 0,
        bank_account_id:
          disposalType === 'SOLD' && disposalBankAccountId
            ? Number(disposalBankAccountId)
            : undefined,
        notes: disposalNotes.trim() || undefined,
      });

      toast.success(
        'Aset Dilepas',
        disposalType === 'SOLD'
          ? `Penjualan aset "${asset.name}" berhasil dicatat ke akuntansi.`
          : `Penghapusan/afkir aset "${asset.name}" berhasil dicatat ke akuntansi.`
      );
      setShowDisposeModal(false);
      await Promise.all([fetchAsset(), fetchBankOptions()]);
    } catch (err: any) {
      setDisposalError(
        err?.response?.data?.message || err?.message || 'Gagal memproses pelepasan aset.'
      );
    } finally {
      setIsSubmittingDispose(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header Standar Reeval ERP */}
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
              <Button size="sm" variant="outline" onClick={openAddService}>
                <Wrench className="h-3.5 w-3.5 mr-1.5" />
                Catat Servis
              </Button>
            )}
            {canUpdate && !isDisposed && (
              <>
                <Button size="sm" variant="outline" onClick={openEdit}>
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={openDisposeModal} className="text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/30">
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

      {/* Ringkasan Parameter Aset */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Kolom 1: Nilai Finansial */}
          <div className="space-y-3">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Nilai Buku Saat Ini</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white text-base mt-0.5">
                {formatCurrency(asset.current_book_value ?? asset.purchase_cost)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Harga Perolehan</span>
              <p className="font-mono font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                {formatCurrency(asset.purchase_cost)}
              </p>
            </div>
          </div>

          {/* Kolom 2: Depresiasi & Masa Manfaat */}
          <div className="space-y-3 pt-4 md:pt-0 md:pl-5">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Penyusutan / Bulan</span>
              <p className="font-mono font-bold text-red-600 dark:text-red-400 text-base mt-0.5">
                {formatCurrency(asset.monthly_depreciation)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Masa Manfaat</span>
              <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                {usefulMonths} Bulan ({Math.round((usefulMonths / 12) * 10) / 10} Tahun)
              </p>
            </div>
          </div>

          {/* Kolom 3: Perolehan & Sumber Kas */}
          <div className="space-y-3 pt-4 md:pt-0 md:pl-5">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Tanggal Perolehan</span>
              <p className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5">
                {asset.purchase_date ? formatDate(asset.purchase_date) : '-'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Sumber Dana</span>
              <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                {asset.acquisition_type === 'NEW_PURCHASE' && cashAccount
                  ? cashAccount.name
                  : asset.acquisition_type === 'NEW_PURCHASE'
                    ? 'Kas Keluar'
                    : 'Saldo Awal (Tanpa Kas)'}
              </p>
            </div>
          </div>

          {/* Kolom 4: Kategori & Pemeliharaan */}
          <div className="space-y-3 pt-4 md:pt-0 md:pl-5">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Kategori</span>
              <p className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5">
                {asset.category_name || asset.category || '-'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Total Biaya Servis</span>
              <p className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {formatCurrency(asset.accumulated_service_cost)}
              </p>
            </div>
          </div>
        </div>
        {isDisposed && (
          <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold">
                Aset telah {asset.status === 'DISPOSED' ? 'Dijual / Dilepas' : 'Diafkir (Scrap)'}
              </span>
              {asset.disposal_date && (
                <span className="ml-2 text-amber-700 dark:text-amber-300">
                  per {formatDate(asset.disposal_date)}
                </span>
              )}
              {asset.notes && <p className="mt-0.5 text-[11px] opacity-85">{asset.notes}</p>}
            </div>
            {asset.status === 'DISPOSED' && (
              <div className="font-mono font-semibold">
                Hasil Penjualan: {formatCurrency(asset.disposal_proceeds || 0)}
              </div>
            )}
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
          Dibuat oleh: {resolveAuthorName(asset)}
        </div>
      </div>

      {/* Riwayat Pemeliharaan & Servis */}
      <Card>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Riwayat Pemeliharaan & Servis
            </h2>
          </div>
          {canService && !isDisposed && (
            <Button size="sm" variant="outline" onClick={openAddService}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Tambah Catatan
            </Button>
          )}
        </div>

        {serviceLogs.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat servis"
            description="Aset ini belum pernah mencatat riwayat perbaikan atau pemeliharaan."
            variant="plain"
          />
        ) : (
          <Table
            data={serviceLogs}
            keyExtractor={(log) => String(log.id)}
            columns={[
              {
                key: 'service_date',
                header: 'Tanggal',
                cell: (log) => (
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    {formatDate(log.service_date)}
                  </span>
                ),
              },
              {
                key: 'description',
                header: 'Deskripsi Pemeliharaan',
                cell: (log) => (
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {log.description}
                    </span>
                    {log.service_provider && (
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        Vendor/Teknisi: {log.service_provider}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'cost',
                header: 'Biaya Servis',
                align: 'right',
                cell: (log) => (
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(log.cost)}
                  </span>
                ),
              },
              {
                key: 'created_by',
                header: 'Dibuat Oleh',
                cell: (log) => (
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {resolveAuthorName(log)}
                  </span>
                ),
              },
              ...(canDelete
                ? [
                  {
                    key: 'actions',
                    header: 'Aksi',
                    align: 'center' as const,
                    cell: (log: AssetServiceLogItem) => (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteService(log.id)}
                        title="Hapus Catatan"
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ),
                  },
                ]
                : []),
            ]}
          />
        )}
      </Card>

      {/* Modal: Edit Asset */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Aset"
        size="lg"
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowEditModal(false)}
              disabled={isSubmittingEdit}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSubmittingEdit}
            >
              {isSubmittingEdit ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 pb-2">
          {editError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kode Aset"
              required
              value={astCode}
              onChange={(e) => setAstCode(e.target.value)}
              disabled
            />
            <Select
              label="Kategori"
              required
              value={astCategoryId || astCategoryName}
              onChange={(e) => {
                const val = e.target.value;
                setAstCategoryId(val);
                const opt = categoryOptions.find((c) => String(c.id) === val);
                if (opt) setAstCategoryName(opt.name);
              }}
              options={categoryOptions.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
            />
          </div>

          <div>
            <Input
              label="Nama Aset"
              required
              value={astName}
              onChange={(e) => setAstName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Tanggal Perolehan"
              required
              value={astPurchaseDate}
              onChange={(e) => setAstPurchaseDate(e.target.value)}
            />
            <Select
              label="Status"
              required
              value={astStatus}
              onChange={(e) => setAstStatus(e.target.value)}
              options={[
                { value: 'ACTIVE', label: 'Aktif' },
                { value: 'IN_MAINTENANCE', label: 'Dalam Pemeliharaan' },
                { value: 'BROKEN', label: 'Rusak' },
              ]}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <CurrencyInput
              label="Harga Perolehan (Rp)"
              required
              value={astPurchaseCost}
              onChange={(val) => setAstPurchaseCost(val)}
            />
            <Input
              type="number"
              label="Masa Manfaat (Bulan)"
              required
              value={astUsefulLifeMonths}
              onChange={(e) =>
                setAstUsefulLifeMonths(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
            <CurrencyInput
              label="Nilai Sisa / Residu (Rp)"
              value={astSalvageValue}
              onChange={(val) => setAstSalvageValue(val)}
            />
          </div>

          {/* Mode Perolehan Info di Paling Bawah */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <Checkbox
              id="checkbox-edit-new-purchase"
              label="Pembelian Baru"
              checked={asset.acquisition_type === 'NEW_PURCHASE'}
              disabled
            />

            {asset.acquisition_type === 'NEW_PURCHASE' && (
              <Select
                label="Sumber Dana"
                value={asset.cash_account_id || ''}
                options={bankAccounts.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${formatCurrency(b.balance)})`,
                }))}
                disabled
              />
            )}
          </div>
        </form>
      </Modal>

      {/* Modal: Record Service */}
      <Modal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title="Catat Servis Aset"
        size="md"
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowServiceModal(false)}
              disabled={isSubmittingService}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveService}
              disabled={isSubmittingService}
            >
              {isSubmittingService ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveService} className="space-y-4 pb-2">
          {serviceError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{serviceError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Tanggal Servis"
              required
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
            <CurrencyInput
              label="Biaya Servis (Rp)"
              required
              value={serviceCost}
              onChange={(val) => setServiceCost(val)}
            />
          </div>

          <div>
            <Input
              label="Deskripsi Pemeliharaan"
              required
              placeholder="Contoh: Penggantian oli & kalibrasi sensor"
              value={serviceDesc}
              onChange={(e) => setServiceDesc(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Teknisi / Vendor (Opsional)"
              placeholder="Contoh: PT Servis Mesin Presisi"
              value={serviceProvider}
              onChange={(e) => setServiceProvider(e.target.value)}
            />
          </div>

          <Select
            label="Sumber Pembayaran (Kas/Bank)"
            value={serviceBankAccountId}
            onChange={(e) => setServiceBankAccountId(e.target.value)}
            options={[
              { value: 'AP', label: 'Catat sebagai Hutang Usaha (AP)' },
              ...bankAccounts.map((b) => ({
                value: b.id,
                label: `${b.name}${b.balance !== undefined ? ` (${formatCurrency(b.balance)})` : ''}`,
              })),
            ]}
          />
        </form>
      </Modal>

      {/* Modal Pelepasan / Disposal Aset */}
      <Modal
        isOpen={showDisposeModal}
        onClose={() => setShowDisposeModal(false)}
        title={`Pelepasan Aset — ${asset.name}`}
        actions={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDisposeModal(false)}
              disabled={isSubmittingDispose}
            >
              Batal
            </Button>
            <Button
              variant={disposalType === 'SCRAPPED' ? 'danger' : 'primary'}
              onClick={handleConfirmDispose}
              disabled={isSubmittingDispose}
            >
              {isSubmittingDispose
                ? 'Memproses...'
                : disposalType === 'SOLD'
                  ? 'Konfirmasi Penjualan Aset'
                  : 'Konfirmasi Afkir Aset'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleConfirmDispose} className="space-y-4">
          {disposalError && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {disposalError}
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Harga Perolehan:</span>
              <span className="font-mono font-semibold">{formatCurrency(asset.purchase_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nilai Buku Tersisa:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(asset.current_book_value)}
              </span>
            </div>
            {disposalType === 'SOLD' && Number(disposalSaleAmount) > 0 && (
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Estimasi Laba / (Rugi):</span>
                <span
                  className={`font-mono font-bold ${
                    Number(disposalSaleAmount) - asset.current_book_value >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(Number(disposalSaleAmount) - asset.current_book_value)}
                </span>
              </div>
            )}
            {disposalType === 'SCRAPPED' && (
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Estimasi Kerugian Penghapusan:</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(-asset.current_book_value)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipe Pelepasan"
              required
              value={disposalType}
              onChange={(e) => setDisposalType(e.target.value as 'SOLD' | 'SCRAPPED')}
              options={[
                { value: 'SOLD', label: 'Dijual (SOLD)' },
                { value: 'SCRAPPED', label: 'Afkir / Dihapusbukukan (SCRAPPED)' },
              ]}
            />
            <Input
              type="date"
              label="Tanggal Pelepasan"
              required
              value={disposalDate}
              onChange={(e) => setDisposalDate(e.target.value)}
            />
          </div>

          {disposalType === 'SOLD' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyInput
                label="Harga Jual Aset (Rp)"
                required
                value={disposalSaleAmount}
                onChange={(val) => setDisposalSaleAmount(val)}
              />
              <Select
                label="Rekening Kas/Bank Tujuan"
                required
                value={disposalBankAccountId}
                onChange={(e) => setDisposalBankAccountId(e.target.value)}
                options={[
                  { value: '', label: 'Pilih Rekening Tujuan' },
                  ...bankAccounts.map((b) => ({
                    value: b.id,
                    label: `${b.name}${b.balance !== undefined ? ` (${formatCurrency(b.balance)})` : ''}`,
                  })),
                ]}
              />
            </div>
          )}

          <Input
            label="Catatan Pelepasan (Opsional)"
            placeholder="Contoh: Dijual ke pembeli unit bekas / rusak permanen"
            value={disposalNotes}
            onChange={(e) => setDisposalNotes(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}
