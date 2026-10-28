'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { roleService, RoleDetail, PermissionItem } from '@/services/role.service';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { RoleForm } from '../components/RoleForm';
import { Edit2, ShieldAlert } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RoleDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const roleId = Number(resolvedParams.id);
  const router = useRouter();
  const { toast } = useToast();
  const { can, isSuperAdmin } = usePermission();
  const canUpdate = isSuperAdmin || can(PERMISSIONS.ROLE.UPDATE);

  const [role, setRole] = useState<RoleDetail | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loadingRole, setLoadingRole] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(true);

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
          toast.error('Role Tidak Ditemukan', roleRes.message || 'Data role tidak tersedia');
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

  if (loadingRole) {
    return (
      <div className="space-y-6">
        <PageHeader title="Memuat Detail Role..." backHref="/roles" />
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
              Role dengan ID {roleId} tidak terdaftar pada perusahaan aktif Anda.
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Detail Role: ${role.name}`}
        backHref="/roles"
      >
        {!role.is_system && canUpdate && (
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push(`/roles/${role.id}/edit`)}
            className="gap-2 shadow-xs"
          >
            <Edit2 className="h-4 w-4" />
            Edit Konfigurasi
          </Button>
        )}
      </PageHeader>

      <RoleForm
        initialData={role}
        isReadOnly={true}
        allPermissions={permissions}
        loadingPermissions={loadingPerms}
        onCancel={() => router.push('/roles')}
      />
    </div>
  );
}
