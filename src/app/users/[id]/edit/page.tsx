'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserForm, UserFormData } from '../../components/UserForm';
import { roleService, RoleSummary, PermissionItem } from '@/services/role.service';
import { userService, UserDetail } from '@/services/user.service';
import { useToast } from '@/context/ToastContext';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [roleOptions, setRoleOptions] = useState<RoleSummary[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isNaN(userId)) {
      toast.error('ID Pengguna Tidak Valid', 'ID pengguna tidak dikenali.');
      router.push('/users');
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [userRes, rolesRes, permsRes] = await Promise.all([
          userService.getUserById(userId),
          roleService.getRoleOptions(),
          roleService.getAllPermissions(),
        ]);

        if (isMounted) {
          if (userRes.success && userRes.data) {
            setUser(userRes.data);
          } else {
            toast.error('Pengguna Tidak Ditemukan', userRes.message || 'Pengguna tidak ditemukan.');
            router.push('/users');
            return;
          }

          if (rolesRes.success && rolesRes.data) {
            setRoleOptions(rolesRes.data);
          }
          if (permsRes.success && permsRes.data) {
            setAllPermissions(permsRes.data);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          toast.error('Gagal Memuat Data', 'Tidak dapat memuat detail pengguna.');
          router.push('/users');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleSubmit = async (formData: UserFormData) => {
    if (isNaN(userId)) return;

    try {
      setIsSubmitting(true);

      const [updateRes, assignRes] = await Promise.all([
        userService.updateUser(userId, {
          full_name: formData.full_name,
          phone: formData.phone,
          is_active: formData.is_active,
          is_ready: formData.is_ready,
        }),
        userService.assignRoles(userId, {
          role_ids: formData.role_ids,
          overrides: formData.overrides,
        }),
      ]);

      if (!updateRes.success) {
        toast.error('Gagal Memperbarui Profil', updateRes.message || 'Gagal memperbarui profil pengguna.');
        return;
      }

      if (!assignRes.success) {
        toast.warning('Profil Diperbarui', 'Profil tersimpan, namun konfigurasi wewenang hak akses gagal.');
        router.push('/users');
        return;
      }

      toast.success('Pengguna Berhasil Diperbarui', `Perubahan untuk ${formData.full_name} berhasil disimpan.`);
      router.push('/users');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal memperbarui data pengguna.';
      toast.error('Gagal Menyimpan', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader title="Edit Pengguna" backHref="/users" />
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Memuat rincian data pengguna...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Edit Pengguna: {user?.full_name || ''}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Perbarui profil identitas, nomor kontak, peran operasional, serta matriks hak akses khusus (permission overrides).
            </p>
          </div>
        }
        backHref="/users"
      />

      <UserForm
        initialData={user}
        roleOptions={roleOptions}
        allPermissions={allPermissions}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
