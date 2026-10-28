'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { roleService, PermissionItem } from '@/services/role.service';
import { useToast } from '@/context/ToastContext';
import { RoleForm, RoleFormData } from '../components/RoleForm';

export default function CreateRolePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchPermissions() {
      try {
        const res = await roleService.getAllPermissions();
        if (!active) return;
        if (res.success && res.data) {
          setPermissions(res.data);
        } else {
          toast.error('Gagal Memuat Hak Akses', res.message || 'Terjadi kesalahan sistem');
        }
      } catch (err: unknown) {
        if (!active) return;
        const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
        const msg = errorObj?.response?.data?.message || errorObj?.message || 'Gagal terhubung ke endpoint permissions';
        toast.error('Kesalahan', msg);
      } finally {
        if (active) setLoadingPerms(false);
      }
    }

    fetchPermissions();

    return () => {
      active = false;
    };
  }, [toast]);

  const handleCreate = async (formData: RoleFormData) => {
    setIsSubmitting(true);
    try {
      const res = await roleService.createRole({
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        permission_ids: formData.permission_ids,
      });

      if (res.success) {
        toast.success('Role Dibuat', `Role "${formData.name}" berhasil ditambahkan`);
        router.push('/roles');
      } else {
        toast.error('Gagal Membuat Role', res.message || 'Terjadi kesalahan saat membuat role');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj?.response?.data?.message || errorObj?.message || 'Terjadi kesalahan pada sistem';
      toast.error('Gagal Membuat Role', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Role Baru"
        backHref="/roles"
      />

      <RoleForm
        allPermissions={permissions}
        loadingPermissions={loadingPerms}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        onCancel={() => router.push('/roles')}
      />
    </div>
  );
}
