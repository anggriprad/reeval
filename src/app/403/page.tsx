'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldAlert,
  ArrowLeft,
  Home,
  LogOut,
  Mail,
  User,
  Shield,
  HelpCircle,
} from 'lucide-react';

function AccessDeniedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useApp();

  const targetPath = searchParams.get('from') || 'Halaman Sistem';

  const handleLogout = async () => {
    authService.logout();
    router.push('/login');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Header with Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 ring-8 ring-rose-50/50 dark:ring-rose-950/30">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <Badge className="bg-rose-600 text-white font-bold text-[11px] px-2.5 py-0.5">
                HTTP 403
              </Badge>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Akses Terbatas
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Akses Ditolak (Access Denied)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Akun Anda tidak memiliki wewenang atau hak akses operasional yang diizinkan untuk membuka tautan halaman ini.
            </p>
          </div>
        </div>

        {/* Audit Context Box */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" /> Halaman yang Dicoba:
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {targetPath}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Nama Pengguna:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {currentUser.name || 'Pengguna Aktif'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Alamat Email:
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {currentUser.email || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Peran Saat Ini:
            </span>
            <Badge variant="default" className="text-[11px] font-semibold">
              {currentUser.roleLabel || currentUser.role || 'Staf Operasional'}
            </Badge>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
          <p className="font-semibold mb-0.5">💡 Butuh Akses ke Modul Ini?</p>
          <p className="text-amber-700 dark:text-amber-400">
            Silakan hubungi Super Admin perusahaan Anda untuk menambahkan hak akses wewenang atau penugasan role melalui menu <strong>Roles & Permissions</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Halaman Sebelumnya
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Ganti Akun
            </Button>

            <Link href="/" className="w-full sm:w-auto">
              <Button
                type="button"
                className="w-full sm:w-auto text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <Home className="h-3.5 w-3.5 mr-1.5" />
                Dashboard Utama
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <AccessDeniedContent />
    </Suspense>
  );
}
