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
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import {
  formatCurrency,
  formatDateTime,
  getPOStatusLabel,
  getPOStatusVariant,
} from '@/lib/utils';
import { canCreatePO, canManageInventory } from '@/lib/roles';
import {
  Check,
  X,
  XCircle,
  Ban,
  AlertTriangle,
  PackageCheck,
  Building2,
  Calendar,
  CreditCard,
  User,
  RotateCcw,
} from 'lucide-react';

export default function ProcurementDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast, confirm } = useToast();

  const {
    purchaseOrders,
    materials,
    currentUser,
    orderPO,
    rejectPO,
    cancelPO,
    cancelRemainingPO,
    receivePO,
    bankAccounts = [],
  } = useApp();

  const po = purchaseOrders.find((p) => p.id === id || p.poNumber === id);

  // State Modal Terima Barang
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  // State Modal Tolak Pengadaan
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // State Modal Batalkan Pengadaan
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  if (!po) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <PageHeader
          backHref="/inventory?tab=procurement"
          title="Detail Pengadaan"
        />
        <Card className="p-8">
          <EmptyState
            title="Pengadaan Tidak Ditemukan"
            description={`Data pengadaan dengan referensi "${id}" tidak ditemukan atau telah dihapus.`}
            action={
              <Button onClick={() => router.push('/inventory?tab=procurement')}>
                Kembali ke Daftar Pengadaan
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const isDraft = po.status === 'DRAFT';
  const isOrdered = po.status === 'ORDERED';
  const isPartiallyReceived = po.status === 'PARTIALLY_RECEIVED';
  const isReceived = po.status === 'RECEIVED';
  const isRejected = po.status === 'REJECTED';
  const isCanceled = po.status === 'CANCELED';
  const isDirect = po.purchaseType === 'DIRECT';

  const bankAccount = po.bankAccountId
    ? bankAccounts.find((b) => b.id === po.bankAccountId)
    : undefined;

  // Handler: Setujui & Pesan
  const handleApproveAndOrder = async () => {
    const ok = await confirm({
      title: 'Pesan Pengadaan',
      message: `Setujui pengadaan "${po.poNumber}" dan kirimkan pesanan ke vendor "${po.supplier}"?`,
      confirmText: 'Pesan Sekarang',
    });
    if (ok) {
      orderPO(po.id);
      toast.success('Pengadaan Dipesan', `Pengadaan ${po.poNumber} berhasil disetujui.`);
    }
  };

  // Handler: Buka Modal Tolak
  const openRejectModal = () => {
    setRejectReason('');
    setRejectError('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setRejectError('Alasan penolakan wajib diisi.');
      return;
    }
    const res = rejectPO(po.id, rejectReason.trim());
    if (!res.success) {
      setRejectError(res.error || 'Terjadi kesalahan.');
    } else {
      setShowRejectModal(false);
      toast.success('PO Ditolak', `PO ${po.poNumber} telah ditolak.`);
    }
  };

  // Handler: Buka Modal Terima Barang
  const openReceiveModal = () => {
    const initialQtys: Record<string, number> = {};
    po.items.forEach((item) => {
      const remaining = Math.max(0, item.qty - (item.receivedQty || 0));
      initialQtys[item.materialId] = remaining;
    });
    setReceiveQtys(initialQtys);
    setShowReceiveModal(true);
  };

  const handleConfirmReceive = () => {
    const itemsToReceive = po.items
      .map((item) => ({
        materialId: item.materialId,
        qty: Number(receiveQtys[item.materialId]) || 0,
      }))
      .filter((i) => i.qty > 0);

    if (itemsToReceive.length === 0) {
      toast.error('Kuantitas Kosong', 'Masukkan minimal satu kuantitas barang yang diterima.');
      return;
    }

    const res = receivePO(po.id, itemsToReceive);
    if (!res.success) {
      toast.error('Gagal Menerima', res.error || 'Terjadi kesalahan saat menerima barang.');
    } else {
      setShowReceiveModal(false);
      if (res.isPartial) {
        toast.success('Diterima Sebagian', 'Penerimaan sebagian barang berhasil dicatat.');
      } else {
        toast.success('Diterima Penuh', 'Seluruh barang pengadaan berhasil diterima.');
      }
    }
  };

  // Handler: Batalkan Sisa PO
  const handleCancelRemaining = async () => {
    const ok = await confirm({
      title: 'Batalkan Sisa PO',
      message: `Apakah Anda yakin ingin membatalkan sisa barang yang belum tiba untuk pengadaan "${po.poNumber}"? Sisa barang tidak akan dapat diterima lagi.`,
      confirmText: 'Batalkan Sisa PO',
      variant: 'danger',
    });
    if (ok) {
      const res = cancelRemainingPO(po.id);
      if (!res.success) {
        toast.error('Gagal Membatalkan', res.error || 'Terjadi kesalahan.');
      } else {
        toast.success('Sisa PO Dibatalkan', 'Sisa barang pengadaan berhasil dibatalkan.');
      }
    }
  };

  // Handler: Buka Modal Batalkan PO
  const openCancelModal = () => {
    setCancelReason('');
    setCancelError('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('Alasan pembatalan wajib diisi.');
      return;
    }
    const res = cancelPO(po.id, cancelReason.trim());
    if (!res.success) {
      setCancelError(res.error || 'Terjadi kesalahan.');
    } else {
      setShowCancelModal(false);
      toast.success('PO Dibatalkan', `Pengadaan ${po.poNumber} berhasil dibatalkan.`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        backHref="/inventory?tab=procurement"
        title={
          <div className="flex items-center gap-3">
            <span>Pengadaan #{po.poNumber}</span>
            <Badge variant={getPOStatusVariant(po.status)}>
              {getPOStatusLabel(po.status)}
            </Badge>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          {/* Action Buttons for DRAFT */}
          {isDraft && (
            <div className="flex items-center gap-2">
              {canCreatePO(currentUser.role) && (
                <Button
                  variant="primary"
                  onClick={handleApproveAndOrder}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Setujui & Pesan
                </Button>
              )}
              <ActionMenu
                triggerSize="md"
                menuWidth="w-max min-w-[130px]"
                items={[
                  ...(canCreatePO(currentUser.role)
                    ? [
                        {
                          label: 'Tolak PO',
                          icon: <XCircle className="h-3.5 w-3.5" />,
                          variant: 'danger' as const,
                          onClick: openRejectModal,
                        },
                      ]
                    : []),
                  ...(canCreatePO(currentUser.role) || po.createdBy === currentUser.name
                    ? [
                        {
                          label: 'Batalkan PO',
                          icon: <Ban className="h-3.5 w-3.5" />,
                          variant: 'danger' as const,
                          onClick: openCancelModal,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          )}

          {/* Action Buttons for ORDERED or PARTIALLY_RECEIVED */}
          {(isOrdered || isPartiallyReceived) && (
            <div className="flex items-center gap-2">
              {(canManageInventory(currentUser.role) || canCreatePO(currentUser.role)) && (
                <Button
                  variant="primary"
                  onClick={openReceiveModal}
                >
                  <PackageCheck className="h-4 w-4 mr-1.5" />
                  Terima Barang
                </Button>
              )}
              {(canCreatePO(currentUser.role) || po.createdBy === currentUser.name) && (
                <ActionMenu
                  triggerSize="md"
                  menuWidth="w-max min-w-[130px]"
                  items={[
                    isOrdered
                      ? {
                          label: 'Batalkan PO',
                          icon: <Ban className="h-3.5 w-3.5" />,
                          variant: 'danger',
                          onClick: openCancelModal,
                        }
                      : {
                          label: 'Batalkan Sisa PO',
                          icon: <Ban className="h-3.5 w-3.5" />,
                          variant: 'danger',
                          onClick: handleCancelRemaining,
                        },
                  ]}
                />
              )}
            </div>
          )}
        </div>
      </PageHeader>

      {/* Banner Informasi Penolakan / Pembatalan */}
      {(isRejected || isCanceled) && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-xs dark:border-red-900/50 dark:bg-red-950/30 space-y-1.5">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {isRejected ? 'Pengadaan Ditolak' : 'Pengadaan Dibatalkan'}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Oleh{' '}
            <strong className="font-semibold">
              {po.cancelledBy || po.rejectedBy || 'Admin'}
            </strong>{' '}
            pada{' '}
            <strong className="font-semibold">
              {po.cancelledAt || po.rejectedAt
                ? formatDateTime(po.cancelledAt || po.rejectedAt!)
                : '-'}
            </strong>
          </p>
          {(po.cancelReason || po.rejectionReason) && (
            <p className="text-slate-700 dark:text-slate-200 font-medium italic pt-1 border-t border-red-200/60 dark:border-red-900/40">
              &quot;{po.cancelReason || po.rejectionReason}&quot;
            </p>
          )}
        </div>
      )}

      {/* Grid Informasi Pokok */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Tanggal */}
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>Tanggal</span>
          </div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">
            {formatDateTime(po.createdAt)}
          </p>
        </Card>

        {/* 2. Dibuat Oleh */}
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <User className="h-3.5 w-3.5" />
            <span>Dibuat Oleh</span>
          </div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">
            {po.createdBy || 'Staff'}
          </p>
        </Card>

        {/* 3. Nama Vendor */}
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Building2 className="h-3.5 w-3.5" />
            <span>Nama Vendor</span>
          </div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm truncate" title={po.supplier}>
            {po.supplier}
          </p>
        </Card>

        {/* 4. Tipe Pengadaan */}
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Tipe Pengadaan</span>
          </div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">
            {isDirect ? 'Pembelian Langsung (Cash)' : 'Purchase Order (PO)'}
          </p>
          {bankAccount && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
              Kas: {bankAccount.name}
            </span>
          )}
        </Card>
      </div>

      {/* Tabel Item Bahan Baku (Edge-to-Edge inside Card) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Daftar Item Bahan Baku
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {po.items.length} item
          </span>
        </div>

        <Card>
          <Table
            data={po.items}
            keyExtractor={(item) => item.materialId}
            columns={[
              {
                key: 'materialName',
                header: 'Nama Bahan Baku',
                cell: (item) => {
                  const mat = materials.find((m) => m.id === item.materialId);
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.materialName}
                      </span>
                      {mat?.code && (
                        <span className="font-mono text-[11px] text-slate-400">
                          {mat.code}
                        </span>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'qty',
                header: 'Kuantitas Dipesan',
                align: 'right',
                cell: (item) => {
                  const mat = materials.find((m) => m.id === item.materialId);
                  const unit = item.unit || mat?.unit || 'unit';
                  return (
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {item.qty} {unit}
                    </span>
                  );
                },
              },
              {
                key: 'receivedQty',
                header: 'Kuantitas Diterima',
                align: 'right',
                cell: (item) => {
                  const mat = materials.find((m) => m.id === item.materialId);
                  const unit = item.unit || mat?.unit || 'unit';
                  const received = item.receivedQty || 0;
                  const isComplete = received >= item.qty;

                  return (
                    <span
                      className={`font-mono font-semibold ${
                        isComplete
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : received > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {received} / {item.qty} {unit}
                    </span>
                  );
                },
              },
              {
                key: 'unitCost',
                header: 'Harga Satuan',
                align: 'right',
                cell: (item) => (
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {formatCurrency(item.unitCost)}
                  </span>
                ),
              },
              {
                key: 'subtotal',
                header: 'Subtotal',
                align: 'right',
                cell: (item) => (
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(item.qty * item.unitCost)}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* Ringkasan Total Biaya */}
      <div className="flex justify-end">
        <div className="w-full sm:w-72 space-y-1.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal Item</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {formatCurrency(po.totalAmount - (po.additionalCost || 0))}
            </span>
          </div>
          {po.additionalCost && po.additionalCost > 0 ? (
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Biaya Tambahan / Ongkir</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(po.additionalCost)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
            <span>Total Akhir</span>
            <span className="font-mono">{formatCurrency(po.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Modal Tolak PO */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={`Tolak PO #${po.poNumber}`}
        size="md"
        actions={[
          <Button
            key="cancel"
            variant="ghost"
            onClick={() => setShowRejectModal(false)}
          >
            Batal
          </Button>,
          <Button
            key="submit"
            variant="danger"
            onClick={handleConfirmReject}
          >
            Tolak PO
          </Button>,
        ]}
      >
        <div className="space-y-4">
          {rejectError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{rejectError}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Penolakan PO <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError('');
              }}
              placeholder="Contoh: Stok di gudang masih mencukupi, revisi kuantitas..."
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      {/* Modal Batalkan PO */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={`Batalkan PO #${po.poNumber}`}
        size="md"
        actions={[
          <Button
            key="cancel"
            variant="ghost"
            onClick={() => setShowCancelModal(false)}
          >
            Batal
          </Button>,
          <Button
            key="submit"
            variant="danger"
            onClick={handleConfirmCancel}
          >
            Batalkan PO
          </Button>,
        ]}
      >
        <div className="space-y-4">
          {cancelError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{cancelError}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Pembatalan PO <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                if (cancelError) setCancelError('');
              }}
              placeholder="Contoh: Vendor tidak dapat memenuhi jadwal pengiriman, pesanan salah..."
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      {/* Modal Terima Barang */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Penerimaan Barang Pengadaan"
        size="lg"
        actions={[
          <Button
            key="cancel"
            variant="ghost"
            onClick={() => setShowReceiveModal(false)}
          >
            Batal
          </Button>,
          <Button
            key="submit"
            variant="primary"
            onClick={handleConfirmReceive}
          >
            Konfirmasi Terima Barang
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Tentukan jumlah kuantitas fisik bahan baku yang telah diterima dan diperiksa di gudang:
          </p>
          <div className="space-y-3">
            {po.items.map((item) => {
              const mat = materials.find((m) => m.id === item.materialId);
              const unit = item.unit || mat?.unit || 'unit';
              const remaining = Math.max(0, item.qty - (item.receivedQty || 0));

              return (
                <div
                  key={item.materialId}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs text-slate-900 dark:text-white">
                      {item.materialName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Dipesan: {item.qty} {unit} | Sudah Diterima: {item.receivedQty || 0} {unit} (Sisa: {remaining} {unit})
                    </p>
                  </div>
                  <div className="w-full sm:w-36">
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      value={receiveQtys[item.materialId] ?? ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setReceiveQtys((prev) => ({
                          ...prev,
                          [item.materialId]: val,
                        }));
                      }}
                      placeholder={`Maks ${remaining}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
