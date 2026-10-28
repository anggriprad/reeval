'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { roleService, RoleDetail, PermissionItem } from '@/services/role.service';
import { useToast } from '@/context/ToastContext';
import { RoleForm, RoleFormData } from '../../components/RoleForm';
import { ShieldAlert, Lock } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditRolePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const roleId = Number(resolvedParams.id);
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = useState<RoleDetail | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loadingRole, setLoadingRole] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (isNaN(roleId)) {
        setLoadingRole(false);
        setLoadingPerms(false);
        return;
      }

      try {
        const [roleRes, permsRes] = await Promise.all([
          roleService.getRoleById(roleId),
          roleService.getAllPermissions(),
        ]);

        if (!active) return;

        if (roleRes.success && roleRes.data) {
          setRole(roleRes.data);
        } else {
          toast.error('Gagal Memuat Role', roleRes.message || 'Data role tidak tersedia');
        }

        if (permsRes.success && permsRes.data) {
          setPermissions(permsRes.data);
        }
      } catch (err: unknown) {
        if (!active) return;
        const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
        const msg = errorObj?.response?.data?.message || errorObj?.message || 'Gagal memuat rincian role';
        toast.error('Kesalahan', msg);
      } finally {
        if (active) {
          setLoadingRole(false);
          setLoadingPerms(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [roleId, toast]);

  const handleUpdate = async (formData: RoleFormData) => {
    if (!role) return;
    if (role.is_system) {
      toast.error('Operasi Ditolak', 'System role bawaan platform tidak dapat dimodifikasi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await roleService.updateRole(role.id, {
        name: formData.name,
        description: formData.description || undefined,
        permission_ids: formData.permission_ids,
      });

      if (res.success) {
        toast.success('Role Diperbarui', `Role "${formData.name}" berhasil disimpan`);
        router.push('/roles');
      } else {
        toast.error('Gagal Memperbarui Role', res.message || 'Terjadi kesalahan sistem');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj?.response?.data?.message || errorObj?.message || 'Gagal memperbarui konfigurasi role';
      toast.error('Kesalahan', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingRole) {
    return (
      <div className="space-y-6">
        <PageHeader title="Memuat Data Role..." backHref="/roles" />
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Mengambil data konfigurasi role...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="space-y-6">
        <PageHeader title="Role Tidak Ditemukan" backHref="/roles" />
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-8 text-center space-y-4">
          <ShieldAlert className="h-10 w-10 text-red-500 mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
              Data Role Tidak Ditemukan
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              Role dengan ID {roleId} tidak terdaftar pada sistem.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/roles')}
            className="text-xs"
          >
            Kembali ke Daftar Role
          </Button>
        </div>
      </div>
    );
  }

  if (role.is_system) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Edit Role: ${role.name}`} backHref="/roles" />
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-8 text-center space-y-4">
          <Lock className="h-10 w-10 text-amber-500 mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              System Role Dilindungi
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 max-w-md mx-auto">
              Role &quot;{role.name}&quot; ({role.code}) adalah role permanen bawaan platform dan tidak dapat diubah konfigurasinya.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/roles')}
              className="text-xs"
            >
              Kembali ke Daftar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => router.push(`/roles/${role.id}`)}
              className="text-xs"
            >
              Lihat Detail Hak Akses
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Role: ${role.name}`}
        backHref="/roles"
      />

      <RoleForm
        initialData={role}
        isReadOnly={false}
        allPermissions={permissions}
        loadingPermissions={loadingPerms}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
        onCancel={() => router.push('/roles')}
      />
    </div>
  );
}
