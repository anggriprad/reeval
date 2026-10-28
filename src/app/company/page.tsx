'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { companyService, CompanyDetail, UpdateCompanyPayload } from '@/services/company.service';
import { Building2, Save, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, Mail, Phone, MapPin, Hash, Lock } from 'lucide-react';

export default function CompanyProfilePage() {
  const { toast } = useToast();
  const { can, isSuperAdmin } = usePermission();
  const canUpdate = isSuperAdmin || can(PERMISSIONS.COMPANY.UPDATE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<UpdateCompanyPayload & { code?: string; id?: number }>({
    name: '',
    code: '',
    tax_number: '',
    email: '',
    phone: '',
    address: '',
    currency_code: 'IDR',
    is_active: true,
  });

  const loadCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await companyService.getCurrentCompany();
      if (res.success && res.data) {
        const d = res.data;
        setFormData({
          id: d.id,
          code: d.code,
          name: d.name || '',
          tax_number: d.tax_number || '',
          email: d.email || '',
          phone: d.phone || '',
          address: d.address || '',
          currency_code: d.currency_code || 'IDR',
          is_active: Boolean(d.is_active),
        });
      } else {
        setError(res.message || 'Gagal memuat profil perusahaan');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal terhubung ke server backend';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Validasi Gagal', 'Nama perusahaan tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      const payload: UpdateCompanyPayload = {
        name: formData.name.trim(),
        tax_number: formData.tax_number?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        currency_code: formData.currency_code?.trim() || 'IDR',
        is_active: formData.is_active,
      };

      const res = await companyService.updateCurrentCompany(payload);
      if (res.success) {
        toast.success('Berhasil', 'Informasi perusahaan berhasil diperbarui');
        if (res.data) {
          setFormData(prev => ({
            ...prev,
            ...res.data,
          }));
          if (typeof window !== 'undefined') {
            try {
              const currentComp = localStorage.getItem('company');
              const compObj = currentComp ? JSON.parse(currentComp) : {};
              localStorage.setItem('company', JSON.stringify({
                ...compObj,
                id: res.data.id || compObj.id,
                name: res.data.name || compObj.name,
                code: res.data.code || compObj.code,
              }));
            } catch { }
          }
        }
      } else {
        toast.error('Gagal Menyimpan', res.message || 'Terjadi kesalahan saat menyimpan');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal memperbarui profil perusahaan';
      toast.error('Kesalahan', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <span>Profil Perusahaan</span>
            {!canUpdate && (
              <Badge variant="default" className="text-xs font-medium text-slate-500">
                <Lock className="h-3 w-3 mr-1" />
                Mode Baca Saja
              </Badge>
            )}
          </div>
        }
        backHref="/settings"
      />

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Gagal memuat profil</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{error}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={loadCompany}
            className="shrink-0 text-xs gap-1 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Muat Ulang
          </Button>
        </div>
      )}

      {loading ? (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Memuat profil perusahaan...</p>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 md:p-8 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Input
                  label="Nama Perusahaan"
                  required
                  disabled={!canUpdate}
                  value={formData.name || ''}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="PT Manufaktur Maju Jaya"
                  icon={Building2}
                />
              </div>

              <div>
                <Input
                  label="NPWP / Nomor Pokok Wajib Pajak"
                  disabled={!canUpdate}
                  value={formData.tax_number || ''}
                  onChange={(e) => setFormData(p => ({ ...p, tax_number: e.target.value }))}
                  placeholder="01.234.567.8-901.000"
                  icon={ShieldCheck}
                />
              </div>

              <div>
                <Input
                  label="Email Resmi Perusahaan"
                  type="email"
                  disabled={!canUpdate}
                  value={formData.email || ''}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="contact@perusahaan.co.id"
                  icon={Mail}
                />
              </div>

              <div>
                <Input
                  label="Nomor Telepon Operasional"
                  disabled={!canUpdate}
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="021-5551234 / 08123456789"
                  icon={Phone}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mata Uang Dasar (*Currency)
                </label>
                <select
                  disabled={!canUpdate}
                  value={formData.currency_code || 'IDR'}
                  onChange={(e) => setFormData(p => ({ ...p, currency_code: e.target.value }))}
                  className="w-full rounded-lg md:rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  <option value="IDR">IDR — Rupiah Indonesia</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="SGD">SGD — Singapore Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Alamat Lengkap Perusahaan
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    disabled={!canUpdate}
                    value={formData.address || ''}
                    onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                    placeholder="Jl. Industri Raya No. 45, Kawasan Industri Jababeka, Cikarang"
                    className="w-full rounded-lg md:rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

            </div>

            {/* Bottom Form Actions (Opsi A: Hidden if user lacks company:update) */}
            {canUpdate && (
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  className="gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  Simpan Perubahan
                </Button>
              </div>
            )}
          </Card>
        </form>
      )}
    </div>
  );
}
