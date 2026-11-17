'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useUrlTab } from '@/lib/useUrlTab';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { companyService, CompanyDetail } from '@/services/company.service';
import { UserTableSection } from '../users/components/UserTableSection';
import {
  Building2,
  Users,
  Edit2,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

function SettingsContent() {
  const { can, isSuperAdmin } = usePermission();
  const [activeTab, setActiveTab] = useUrlTab(['profile', 'users'] as const, 'profile');

  const canReadCompany = isSuperAdmin || can(PERMISSIONS.COMPANY.READ);
  const canUpdateCompany = isSuperAdmin || can(PERMISSIONS.COMPANY.UPDATE);
  const canReadUsers = isSuperAdmin || can(PERMISSIONS.USER.READ);
  const canCreateUser = isSuperAdmin || can(PERMISSIONS.USER.CREATE);

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const loadCompanyData = useCallback(async () => {
    if (!canReadCompany) {
      setLoadingCompany(false);
      return;
    }
    setLoadingCompany(true);
    setCompanyError(null);
    try {
      const res = await companyService.getCurrentCompany();
      if (res.success && res.data) {
        setCompany(res.data);
      } else {
        setCompanyError(res.message || 'Gagal memuat profil perusahaan');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal terhubung ke endpoint perusahaan';
      setCompanyError(msg);
    } finally {
      setLoadingCompany(false);
    }
  }, [canReadCompany]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  const tabOptions = [
    ...(canReadCompany ? [{ key: 'profile' as const, label: 'Profil Perusahaan', icon: Building2 }] : []),
    ...(canReadUsers ? [{ key: 'users' as const, label: 'Akses Pengguna', icon: Users }] : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Pengaturan">
        {activeTab === 'users' && canCreateUser && (
          <Link href="/users/create">
            <Button type="button" variant="primary">
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah Pengguna
            </Button>
          </Link>
        )}
      </PageHeader>

      <SegmentedControl
        value={activeTab}
        onChange={(tab) => setActiveTab(tab as 'profile' | 'users')}
        options={tabOptions}
      />

      {activeTab === 'profile' ? (
        <div className="space-y-4">
          {companyError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">Gagal memuat profil perusahaan</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{companyError}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={loadCompanyData}
                className="shrink-0 text-xs gap-1 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Muat Ulang
              </Button>
            </div>
          )}

          {loadingCompany ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs">Memuat informasi perusahaan...</p>
              </div>
            </Card>
          ) : !canReadCompany ? (
            <Card className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Akses Terbatas
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Anda tidak memiliki izin untuk melihat profil perusahaan.
              </p>
            </Card>
          ) : company ? (
            <Card className="p-5 md:p-6 space-y-6">
              {/* Header Profil Perusahaan */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {company.name}
                      </h2>
                      <Badge variant={company.is_active ? 'success' : 'default'}>
                        {company.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="text-slate-700 dark:text-slate-300">{company.email || '-'}</span>
                    </p>
                  </div>
                </div>

                {canUpdateCompany && (
                  <Link href="/company">
                    <Button type="button" variant="outline" size="sm">
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                      Edit Data Perusahaan
                    </Button>
                  </Link>
                )}
              </div>

              {/* Rincian Lengkap Data Perusahaan */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                  Informasi Resmi & Legalitas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Nama Perusahaan
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {company.name || '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Kode Perusahaan (Tenant Code)
                    </p>
                    <p className="text-sm font-semibold font-mono text-slate-900 dark:text-white">
                      {company.code || '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      NPWP / Nomor Pokok Wajib Pajak
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {company.tax_number || 'Belum diisi'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Email Resmi Perusahaan
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {company.email || 'Belum diisi'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Nomor Telepon Operasional
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {company.phone || 'Belum diisi'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Mata Uang Dasar Pembukuan
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {company.currency_code ? `${company.currency_code} (Mata Uang Standar)` : 'IDR'}
                    </p>
                  </div>

                  <div className="space-y-1 md:col-span-2 lg:col-span-3">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Alamat Kantor / Pabrik
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {company.address || 'Belum diisi'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-slate-400">
              <p className="text-sm font-medium">Data perusahaan tidak ditemukan.</p>
            </Card>
          )}
        </div>
      ) : (
        <UserTableSection />
      )}
    </div>
  );
}

export default function SettingsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <PageHeader title="Pengaturan" />
          <Card className="p-12 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-xs">Memuat pengaturan...</p>
          </Card>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
