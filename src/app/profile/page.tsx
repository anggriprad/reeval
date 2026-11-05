'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProfileInfoSection } from './components/ProfileInfoSection';
import { ChangePasswordSection } from './components/ChangePasswordSection';
import { authService, UserSummary } from '@/services/auth.service';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isLoggedIn, refreshProfile } = useApp();

  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authService.getProfile();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        toast.error('Gagal Memuat Profil', res.message || 'Tidak dapat memuat rincian profil pengguna.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal terhubung ke server.';
      toast.error('Gagal Memuat Profil', msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const handleProfileUpdated = () => {
    loadUserProfile();
    refreshProfile();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <PageHeader title="Profil Pengguna" />

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Memuat profil pengguna...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <ProfileInfoSection user={user} onProfileUpdated={handleProfileUpdated} />
          <ChangePasswordSection />
        </div>
      )}
    </div>
  );
}
