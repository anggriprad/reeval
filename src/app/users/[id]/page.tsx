'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { roleService, RoleSummary, PermissionItem } from '@/services/role.service';
import { userService, UserDetail } from '@/services/user.service';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { formatPhoneDisplay } from '@/lib/utils';
import {
  Mail,
  Phone,
  Shield,
  Edit2,
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { can, isSuperAdmin } = usePermission();
  const canUpdate = isSuperAdmin || can(PERMISSIONS.USER.UPDATE);

  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [roleOptions, setRoleOptions] = useState<RoleSummary[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(userId)) {
      toast.error('ID Pengguna Tidak Valid', 'ID pengguna tidak dikenali.');
      router.push('/settings?tab=users');
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
            router.push('/settings?tab=users');
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
          router.push('/settings?tab=users');
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
  }, [userId, router, toast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Detail Pengguna" backHref="/settings?tab=users" />
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs">Memuat informasi rincian pengguna...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : 'U';

  // Process user roles into displayable objects
  const rawRoleIds = Array.isArray(user.roles)
    ? user.roles.map((r) => (typeof r === 'number' ? r : (r as any).id))
    : [];

  const userRoles = rawRoleIds.map((rid) => {
    const roleObj = Array.isArray(user.roles)
      ? (user.roles.find((r) => typeof r === 'object' && r !== null && (r as any).id === rid) as any)
      : null;
    const matched = roleOptions.find((ro) => ro.id === rid);
    return {
      id: rid,
      name: roleObj?.name || matched?.name || `Role #${rid}`,
      code: roleObj?.code || matched?.code,
    };
  });

  const overrides = user.overrides || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Detail Pengguna: ${user.full_name}`}
        backHref="/settings?tab=users"
      >
        {canUpdate && (
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push(`/users/${user.id}/edit`)}
          >
            <Edit2 className="h-4 w-4 mr-1.5" />
            Edit Pengguna
          </Button>
        )}
      </PageHeader>

      {/* Card 1: Profil & Identitas Pengguna */}
      <Card className="p-5 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 text-base font-bold border border-indigo-100 dark:border-indigo-900/40">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {user.full_name}
                </h2>
                {user.is_superadmin && (
                  <Badge variant="default" className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200">
                    Super Admin
                  </Badge>
                )}
                {user.is_active ? (
                  <Badge variant="success">Aktif</Badge>
                ) : (
                  <Badge variant="default">Non-aktif</Badge>
                )}
                {user.is_ready ? (
                  <Badge variant="info">Siap Kerja (Ready)</Badge>
                ) : (
                  <Badge variant="warning">Belum Siap</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ID Akun: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">#{user.id}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Informational Grid (Strictly Read-Only, No Inputs) */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
            Informasi Akun & Kontak
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Mail className="h-3.5 w-3.5" />
                <span>Email Akun</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {user.email || '-'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Phone className="h-3.5 w-3.5" />
                <span>No. Telepon / WhatsApp</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatPhoneDisplay(user.phone) || 'Belum diisi'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Status Akun</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user.is_active ? 'Aktif' : 'Non-aktif'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Shield className="h-3.5 w-3.5" />
                <span>Kesiapan Operasional</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user.is_ready ? 'Siap Kerja (Ready)' : 'Belum Siap'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Card 2: Peran yang Ditetapkan (Roles) */}
      <Card className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Peran Pengguna (Roles)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hak akses dasar akun ini diturunkan dari peran-peran berikut.
            </p>
          </div>
          <Badge variant="default" className="text-xs font-semibold">
            {userRoles.length} Peran Ditetapkan
          </Badge>
        </div>

        {userRoles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {userRoles.map((role) => (
              <div
                key={role.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {role.name}
                  </span>
                </div>
                {role.code && (
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Kode: {role.code}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 italic">
            Belum ada peran yang ditetapkan untuk akun ini.
          </div>
        )}
      </Card>

      {/* Card 3: Hak Akses Khusus (Permission Overrides) */}
      <Card className="p-5 md:p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Hak Akses Khusus (Permission Overrides)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Penyesuaian izin individual di luar wewenang peran standar.
          </p>
        </div>

        {overrides.length > 0 ? (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Pengguna ini memiliki <strong>{overrides.length}</strong> konfigurasi izin khusus:
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {overrides.map((ov) => {
                const perm = allPermissions.find((p) => p.id === ov.permission_id);
                return (
                  <div
                    key={ov.permission_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {perm?.code || `Permission #${ov.permission_id}`}
                        </span>
                        {perm?.module && (
                          <Badge variant="default" className="text-[10px] uppercase font-semibold">
                            {perm.module}
                          </Badge>
                        )}
                      </div>
                      {perm?.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {perm.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {ov.is_granted ? (
                        <Badge variant="success" className="gap-1 text-xs font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          Diizinkan Khusus (Grant)
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="gap-1 text-xs font-semibold">
                          <XCircle className="h-3 w-3" />
                          Dicabut Khusus (Deny)
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="leading-relaxed">
              Hak akses akun ini sepenuhnya mengikuti konfigurasi standar dari peran yang ditetapkan. Tidak ada penambahan (grant) maupun pembatasan (deny) izin khusus.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
