'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  companyAssetService,
  CompanyAssetItem,
  AssetServiceLogItem,
} from '@/services/company-asset.service';
import { Plus, Trash2, AlertTriangle, Wrench } from 'lucide-react';

interface AssetServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: CompanyAssetItem | null;
  onSuccess: () => void;
  canManage: boolean;
}

export function AssetServiceModal({
  isOpen,
  onClose,
  asset,
  onSuccess,
  canManage,
}: AssetServiceModalProps) {
  const { toast, confirm } = useToast();

  const [serviceLogs, setServiceLogs] = useState<AssetServiceLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Catat Servis Baru
  const [serviceDate, setServiceDate] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceCost, setServiceCost] = useState<number | ''>('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchServiceLogs = useCallback(async () => {
    if (!asset) return;
    setIsLoading(true);
    try {
      const res = await companyAssetService.getServiceLogs(asset.id);
      if (res.data) {
        setServiceLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load asset service logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [asset]);

  useEffect(() => {
    if (!isOpen || !asset) {
      setServiceLogs([]);
      setServiceDate('');
      setServiceDesc('');
      setServiceCost('');
      setServiceProvider('');
      setErrorMessage('');
      return;
    }

    setServiceDate(new Date().toISOString().split('T')[0]);
    setServiceDesc('');
    setServiceCost('');
    setServiceProvider('');
    setErrorMessage('');
    fetchServiceLogs();
  }, [isOpen, asset, fetchServiceLogs]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    if (!serviceDate) {
      setErrorMessage('Tanggal servis wajib diisi.');
      return;
    }
    if (!serviceDesc.trim()) {
      setErrorMessage('Deskripsi pemeliharaan wajib diisi.');
      return;
    }
    if (serviceCost === '' || Number(serviceCost) <= 0) {
      setErrorMessage('Biaya pemeliharaan harus lebih dari 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await companyAssetService.addServiceLog(asset.id, {
        service_date: serviceDate,
        description: serviceDesc.trim(),
        cost: Number(serviceCost),
        service_provider: serviceProvider.trim() || undefined,
      });

      if (res.success) {
        toast.success('Servis Dicatat', 'Riwayat pemeliharaan aset berhasil ditambahkan.');
        setServiceDesc('');
        setServiceCost('');
        setServiceProvider('');
        await fetchServiceLogs();
        onSuccess();
      } else {
        setErrorMessage(res.message || 'Gagal mencatat pemeliharaan aset.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem saat menyimpan servis.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!asset) return;

    const confirmed = await confirm({
      title: 'Hapus Catatan Servis',
      message: 'Apakah Anda yakin ingin menghapus catatan servis ini? Nilai akumulasi biaya akan disesuaikan otomatis.',
      variant: 'danger',
      confirmText: 'Hapus Catatan',
    });

    if (confirmed) {
      try {
        const res = await companyAssetService.deleteServiceLog(asset.id, serviceId);
        if (res.success) {
          toast.success('Catatan Dihapus', 'Riwayat servis aset berhasil dihapus.');
          await fetchServiceLogs();
          onSuccess();
        } else {
          toast.error('Gagal Menghapus', res.message || 'Riwayat servis tidak dapat dihapus.');
        }
      } catch (err: any) {
        toast.error(
          'Gagal Menghapus',
          err?.response?.data?.message || err?.message || 'Riwayat servis tidak dapat dihapus.'
        );
      }
    }
  };

  if (!asset) return null;

  const totalCost = serviceLogs.reduce((acc, log) => acc + (log.cost || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Riwayat Pemeliharaan & Servis: ${asset.name}`}
      size="lg"
      actions={
        <Button variant="ghost" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex flex-wrap gap-4 justify-between bg-slate-50 p-3 rounded-lg dark:bg-slate-800/40 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Kode Aset: </span>
            <strong className="font-semibold text-slate-800 dark:text-slate-200">{asset.code}</strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Kategori: </span>
            <strong className="font-semibold text-slate-800 dark:text-slate-200">{asset.category_name || asset.category}</strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Total Biaya Servis: </span>
            <strong className="font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(totalCost)}
            </strong>
          </div>
        </div>

        {/* Form to add a new service log */}
        {canManage && (
          <form
            onSubmit={handleAddService}
            className="border border-slate-200 p-3.5 rounded-lg dark:border-slate-700 bg-white dark:bg-slate-900/50"
          >
            <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
              Catat Pemeliharaan / Perbaikan Baru
            </h3>
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-400 mb-3">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tanggal Servis *
                </label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Deskripsi Pemeliharaan *
                </label>
                <input
                  type="text"
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="Misal: Ganti oli transmisi & filter"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Biaya (Rp) *
                </label>
                <input
                  type="number"
                  value={serviceCost || ''}
                  onChange={(e) => setServiceCost(Number(e.target.value) || '')}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button type="submit" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
                <Plus className="h-3 w-3 mr-1" />
                Simpan Catatan
              </Button>
            </div>
          </form>
        )}

        {/* List of service logs */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-500">Memuat riwayat servis...</div>
          ) : serviceLogs.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              Belum ada riwayat pemeliharaan yang dicatat untuk aset ini.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2 px-3 font-semibold">Tanggal</th>
                  <th className="py-2 px-3 font-semibold">Deskripsi</th>
                  <th className="py-2 px-3 font-semibold text-right">Biaya (Rp)</th>
                  {canManage && <th className="py-2 px-3 font-semibold text-center w-16">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {serviceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {log.service_date ? log.service_date.split('T')[0] : '-'}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {log.description}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(log.cost)}
                    </td>
                    {canManage && (
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteService(log.id)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Hapus Catatan Servis"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
