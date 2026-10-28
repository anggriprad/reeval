'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserForm, UserFormData } from '../components/UserForm';
import { roleService, RoleSummary, PermissionItem } from '@/services/role.service';
import { userService } from '@/services/user.service';
import { useToast } from '@/context/ToastContext';

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [roleOptions, setRoleOptions] = useState<RoleSummary[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMasterData = async () => {
      try {
        setLoadingData(true);
        const [rolesRes, permsRes] = await Promise.all([
          roleService.getRoleOptions(),
          roleService.getAllPermissions(),
        ]);

        if (isMounted) {
          if (rolesRes.success && rolesRes.data) {
            setRoleOptions(rolesRes.data);
          }
          if (permsRes.success && permsRes.data) {
            setAllPermissions(permsRes.data);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          toast.error('Gagal Memuat Data', 'Tidak dapat memuat daftar role atau katalog permission.');
        }
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    };

    loadMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (formData: UserFormData) => {
    try {
      setIsSubmitting(true);

      const createRes = await userService.createUser({
        email: formData.email,
        password: null,
        full_name: formData.full_name,
        phone: formData.phone,
        role_ids: formData.role_ids,
      });

      if (!createRes.success || !createRes.data) {
        toast.error('Gagal Membuat Pengguna', createRes.message || 'Terjadi kesalahan saat membuat pengguna.');
        return;
      }

      const newUserId = createRes.data.id;

      if (formData.overrides.length > 0) {
        const assignRes = await userService.assignRoles(newUserId, {
          role_ids: formData.role_ids,
          overrides: formData.overrides,
        });

        if (!assignRes.success) {
          toast.warning('Pengguna Dibuat dengan Catatan', 'Pengguna berhasil dibuat, namun konfigurasi override hak akses gagal disimpan.');
          router.push('/users');
          return;
        }
      }

      toast.success('Pengguna Berhasil Dibuat', `Akun untuk ${formData.full_name} siap digunakan.`);
      router.push('/users');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan pengguna baru.';
      toast.error('Gagal Menyimpan', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tambah Pengguna Baru"
        backHref="/users"
      />

      <UserForm
        roleOptions={roleOptions}
        allPermissions={allPermissions}
        loadingPermissions={loadingData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
