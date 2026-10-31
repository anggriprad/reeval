'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { companyService, CompanyDetail } from '@/services/company.service';
import { useApp } from '@/context/AppContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import {
  Building2,
  Users,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Hash,
} from 'lucide-react';

export default function SettingsHubPage() {
  const { currentUser } = useApp();
  const { can, isSuperAdmin } = usePermission();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canReadCompany = isSuperAdmin || can(PERMISSIONS.COMPANY.READ);
  const canReadUsers = isSuperAdmin || can(PERMISSIONS.USER.READ);
  const canReadRoles = isSuperAdmin || can(PERMISSIONS.ROLE.READ);

  const loadCompanyData = useCallback(async () => {
    if (!canReadCompany) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await companyService.getCurrentCompany();
      if (res.success && res.data) {
        setCompany(res.data);
      } else {
        setError(res.message || 'Gagal memuat ringkasan perusahaan');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal terhubung ke endpoint perusahaan';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [canReadCompany]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  const allSettingsCards = [
    {
      id: 'company',
      href: '/company',
      title: 'Profil Perusahaan',
      description: 'Identitas legalitas tenant, NPWP/Tax Number, kontak resmi, alamat pabrik/kantor, dan mata uang buku.',
      icon: Building2,
      badgeText: company?.code ? `Kode: ${company.code}` : 'Identitas Tenant',
      statusText: company?.is_active ? 'Tenant Aktif' : 'Konfigurasi Profil',
      colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-900/40',
      actionLabel: 'Buka Profil Perusahaan',
      permission: PERMISSIONS.COMPANY.READ,
    },
    {
      id: 'users',
      href: '/users',
      title: 'Pengguna & Akun',
      description: 'Kelola akun pengguna, aktivasi staf operasional dan peran penugasan.',
      icon: Users,
      badgeText: 'Manajemen Staf',
      statusText: 'Kesiapan Kerja (Ready)',
      colorClass: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/60 dark:text-violet-400 dark:border-violet-900/40',
      actionLabel: 'Kelola Pengguna',
      permission: PERMISSIONS.USER.READ,
    },
  ];

  // Action Guard: Filter cards according to user permissions (Opsi A: hidden if unauthorized)
  const settingsCards = allSettingsCards.filter(card => isSuperAdmin || can(card.permission));

  return (
    <div className="space-y-4">
      <div>
        <PageHeader title="Pengaturan Sistem" />
      </div>

      {/* System Overview / Tenant Status Banner (Only visible if user has company:read) */}
      {canReadCompany && (
        <Card className="p-5 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {company?.name || (loading ? 'Memuat Tenant Perusahaan...' : 'Profil Perusahaan')}
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="text-xs">
                <p className="font-semibold">Pemberitahuan</p>
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Tenant Information Grid */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Hash className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kode Tenant</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {company?.code || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">NPWP / Tax ID</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {company?.tax_number || 'Belum diisi'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Kontak</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {company?.email || 'Belum diisi'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">No. Telepon</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {company?.phone || 'Belum diisi'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 sm:col-span-2 lg:col-span-1">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Alamat Kantor</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {company?.address || 'Belum diisi'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Settings Categories Grid */}
      {settingsCards.length === 0 ? (
        <Card className="p-8 text-center border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Tidak ada modul pengaturan yang diizinkan untuk akun Anda.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Silakan hubungi administrator perusahaan jika Anda membutuhkan akses ke menu ini.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2S gap-5">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.id}
                className="p-5 sm:p-6 flex flex-col justify-between border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all duration-200 group shadow-xs hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.colorClass} group-hover:scale-105 transition-transform duration-200`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 mt-2">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link href={card.href} className="block w-full">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200 dark:group-hover:bg-indigo-950/40 dark:group-hover:text-indigo-300 dark:group-hover:border-indigo-800 text-xs font-semibold"
                    >
                      <span>{card.actionLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
