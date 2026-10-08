'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
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
import { formatCurrency } from '@/lib/utils';
import { canManageInventory } from '@/lib/roles';
import type { AssetStatus, CompanyAsset } from '@/lib/types';
import {
  Wrench,
  Edit2,
  Trash2,
  Plus,
  AlertTriangle,
  History,
} from 'lucide-react';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast, confirm } = useToast();

  const {
    assets,
    updateAsset,
    deleteAsset,
    canDeleteAsset,
    assetCategories,
    assetServiceLogs = [],
    recordAssetService,
    deleteAssetServiceLog,
    bankAccounts = [],
    assetDepreciations = [],
    currentUser,
  } = useApp();

  const asset = assets.find((a) => a.id === id);

  // Modal Edit Asset State
  const [showEditModal, setShowEditModal] = useState(false);
  const [astCode, setAstCode] = useState('');
  const [astName, setAstName] = useState('');
  const [astCategory, setAstCategory] = useState('');
  const [astPurchaseDate, setAstPurchaseDate] = useState('');
  const [astPurchaseCost, setAstPurchaseCost] = useState<number | ''>('');
  const [astUsefulLifeMonths, setAstUsefulLifeMonths] = useState<number | ''>(60);
  const [astSalvageValue, setAstSalvageValue] = useState<number | ''>(0);
  const [astStatus, setAstStatus] = useState<AssetStatus>('ACTIVE');
  const [editError, setEditError] = useState('');

  // Modal Record Service State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceCost, setServiceCost] = useState<number | ''>('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [serviceError, setServiceError] = useState('');

  if (!asset) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <PageHeader
          backHref="/inventory?tab=assets"
          title="Detail Aset"
        />
        <Card className="p-8">
          <EmptyState
            title="Aset Tidak Ditemukan"
            description={`Aset dengan ID "${id}" tidak ditemukan atau telah dihapus.`}
            action={
              <Button onClick={() => router.push('/inventory?tab=assets')}>
                Kembali ke Daftar Aset
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const serviceLogs = assetServiceLogs.filter((l) => l.assetId === asset.id);
  const depreciations = assetDepreciations.filter((d) => d.assetId === asset.id);
  const hasDependencies = serviceLogs.length > 0 || depreciations.length > 0;
  const usefulMonths = asset.usefulLifeMonths || asset.usefulLifeYears * 12;
  const cashAccount = bankAccounts.find((b) => b.id === asset.cashAccountId);

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
    setAstCategory(asset.category);
    setAstPurchaseDate(asset.purchaseDate);
    setAstPurchaseCost(asset.purchaseCost);
    setAstUsefulLifeMonths(usefulMonths);
    setAstSalvageValue(asset.salvageValue ?? 0);
    setAstStatus(asset.status);
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!astCode.trim() || !astName.trim()) {
      setEditError('Kode dan Nama Aset wajib diisi.');
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

    updateAsset(asset.id, {
      code: astCode.trim().toUpperCase(),
      name: astName.trim(),
      category: astCategory,
      purchaseDate: astPurchaseDate,
      purchaseCost: cost,
      usefulLifeMonths: months,
      usefulLifeYears: Math.round((months / 12) * 10) / 10,
      salvageValue: salvage,
      status: astStatus,
    });

    toast.success('Aset Diperbarui', `Data aset "${astName}" berhasil disimpan.`);
    setShowEditModal(false);
  };

  const handleDelete = async () => {
    const check = canDeleteAsset ? canDeleteAsset(asset.id) : { canDelete: true };
    if (!check.canDelete) {
      toast.error('Gagal Menghapus Aset', check.reason || 'Aset tidak dapat dihapus karena memiliki keterkaitan data.');
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Aset Perusahaan',
      message: `Apakah Anda yakin ingin menghapus aset "${asset.name}" (${asset.code}) dari sistem? Data master aset akan dihapus secara permanen.`,
      confirmText: 'Hapus Aset',
      variant: 'danger',
    });

    if (isOk) {
      const res = deleteAsset(asset.id);
      if (res && typeof res === 'object' && !res.success) {
        toast.error('Gagal Menghapus Aset', res.reason || 'Terjadi kesalahan saat menghapus aset.');
      } else {
        toast.success('Aset Dihapus', `Aset "${asset.name}" berhasil dihapus.`);
        router.push('/inventory?tab=assets');
      }
    }
  };

  const openAddService = () => {
    setServiceDate(new Date().toISOString().split('T')[0]);
    setServiceCost('');
    setServiceDesc('');
    setServiceProvider('');
    setServiceError('');
    setShowServiceModal(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(serviceCost) || 0;
    if (!serviceDesc.trim() || cost <= 0) {
      setServiceError('Deskripsi servis dan biaya (harus > 0) wajib diisi.');
      return;
    }

    recordAssetService({
      assetId: asset.id,
      assetCode: asset.code,
      assetName: asset.name,
      serviceDate: serviceDate || new Date().toISOString().split('T')[0],
      cost,
      description: serviceDesc.trim(),
      serviceProvider: serviceProvider.trim() || undefined,
    });

    toast.success('Servis Dicatat', 'Riwayat pemeliharaan aset berhasil ditambahkan.');
    setShowServiceModal(false);
  };

  const handleDeleteService = async (serviceId: string) => {
    const isOk = await confirm({
      title: 'Hapus Riwayat Servis',
      message: 'Apakah Anda yakin ingin menghapus catatan servis ini?',
      confirmText: 'Hapus',
      variant: 'danger',
    });
    if (isOk) {
      deleteAssetServiceLog(serviceId);
      toast.success('Catatan Dihapus', 'Riwayat servis berhasil dihapus.');
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
            {asset.acquisitionType === 'NEW_PURCHASE' ? (
              <Badge variant="purple">Beli Baru</Badge>
            ) : (
              <Badge variant="default">Saldo Awal</Badge>
            )}
          </div>
        }
      >
        {canManageInventory(currentUser.role) && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={openAddService}>
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Catat Servis
            </Button>
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            {hasDependencies ? (
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
                {formatCurrency(asset.currentBookValue ?? asset.purchaseCost)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Harga Perolehan</span>
              <p className="font-mono font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                {formatCurrency(asset.purchaseCost)}
              </p>
            </div>
          </div>

          {/* Kolom 2: Depresiasi & Masa Manfaat */}
          <div className="space-y-3 pt-4 md:pt-0 md:pl-5">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Penyusutan / Bulan</span>
              <p className="font-mono font-bold text-red-600 dark:text-red-400 text-base mt-0.5">
                {formatCurrency(asset.monthlyDepreciation)}
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
                {asset.purchaseDate}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Sumber Dana</span>
              <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                {asset.acquisitionType === 'NEW_PURCHASE' && cashAccount
                  ? cashAccount.name
                  : asset.acquisitionType === 'NEW_PURCHASE'
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
                {asset.category}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Total Biaya Servis</span>
              <p className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {formatCurrency(asset.accumulatedServiceCost)}
              </p>
            </div>
          </div>
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
          {canManageInventory(currentUser.role) && (
            <Button size="sm" variant="outline" onClick={openAddService}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Tambah Catatan
            </Button>
          )}
        </div>

        {serviceLogs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Belum ada riwayat servis"
              description="Aset ini belum pernah mencatat riwayat perbaikan atau pemeliharaan."
            />
          </div>
        ) : (
          <Table
            data={serviceLogs}
            keyExtractor={(log) => log.id}
            columns={[
              {
                key: 'serviceDate',
                header: 'Tanggal',
                cell: (log) => (
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    {log.serviceDate}
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
                    {log.serviceProvider && (
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        Vendor/Teknisi: {log.serviceProvider}
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
              ...(canManageInventory(currentUser.role)
                ? [
                    {
                      key: 'actions',
                      header: 'Aksi',
                      align: 'center' as const,
                      cell: (log: (typeof serviceLogs)[0]) => (
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
            <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>
              Batal
            </Button>
            <Button type="button" onClick={handleSaveEdit}>
              Simpan
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
              value={astCategory}
              onChange={(e) => setAstCategory(e.target.value)}
              options={assetCategories.map((c) => ({ value: c, label: c }))}
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
              onChange={(e) => setAstStatus(e.target.value as any)}
              options={[
                { value: 'ACTIVE', label: 'Aktif' },
                { value: 'IN_MAINTENANCE', label: 'Dalam Pemeliharaan' },
                { value: 'BROKEN', label: 'Rusak' },
                { value: 'DISPOSED', label: 'Dijual' },
                { value: 'SCRAPPED', label: 'Afkir / Scrap' },
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
              onChange={(e) => setAstUsefulLifeMonths(e.target.value === '' ? '' : Number(e.target.value))}
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
              checked={asset.acquisitionType === 'NEW_PURCHASE'}
              disabled
            />

            {asset.acquisitionType === 'NEW_PURCHASE' && (
              <Select
                label="Sumber Dana"
                value={asset.cashAccountId || ''}
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
            <Button type="button" variant="ghost" onClick={() => setShowServiceModal(false)}>
              Batal
            </Button>
            <Button type="button" onClick={handleSaveService}>
              Simpan
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
        </form>
      </Modal>
    </div>
  );
}
