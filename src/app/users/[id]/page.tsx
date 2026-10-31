'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserRoleOverrideMatrix } from '../components/UserRoleOverrideMatrix';
import { roleService, RoleSummary, PermissionItem } from '@/services/role.service';
import { userService, UserDetail } from '@/services/user.service';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  User,
  Mail,
  Phone,
  Shield,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
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

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Detail Pengguna" backHref="/users" />
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Memuat rincian data pengguna...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name
      .trim()
      .split(/\s+/)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : 'U';

  const selectedRoleIds = Array.isArray(user.roles)
    ? user.roles.map(r => (typeof r === 'number' ? r : (r as any).id))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={
            `Detail Pengguna: ${user.full_name}`
          }
          backHref="/users"
        />
        {canUpdate && (
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push(`/users/${user.id}/edit`)}
            className="gap-2 shadow-xs"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit Pengguna
          </Button>
        )}
      </div>

      {/* User Identity Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-md shadow-indigo-600/20">
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {user.full_name}
              </h2>
              {user.is_superadmin && (
                <Badge className="bg-purple-600 text-white font-bold text-[10px]">
                  Super Admin
                </Badge>
              )}
              {user.is_active ? (
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                  Aktif
                </Badge>
              ) : (
                <Badge variant="default" className="text-slate-400 border-slate-300 dark:border-slate-700 text-[10px]">
                  Non-aktif
                </Badge>
              )}
              {user.is_ready ? (
                <Badge className="bg-indigo-600 text-white font-bold text-[10px]">
                  Siap Kerja
                </Badge>
              ) : (
                <Badge variant="warning" className="text-amber-600 border-amber-300 dark:border-amber-800 text-[10px]">
                  Belum Siap
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Roles Pills */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Peran yang Ditetapkan:
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedRoleIds.length > 0 ? (
              selectedRoleIds.map(rid => {
                const roleObj = Array.isArray(user.roles)
                  ? (user.roles.find(r => typeof r === 'object' && r !== null && r.id === rid) as any)
                  : null;
                const matched = roleOptions.find(ro => ro.id === rid);
                const label = roleObj?.name || matched?.name || `Role #${rid}`;
                return (
                  <Badge key={rid} variant="default" className="text-xs font-medium px-3 py-1">
                    <Shield className="h-3 w-3 mr-1" />
                    {label}
                  </Badge>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 italic">Belum ada role yang ditetapkan.</span>
            )}
          </div>
        </div>
      </div>

      {/* Permissions & Overrides Matrix (Read-only) */}
      <UserRoleOverrideMatrix
        roleOptions={roleOptions}
        selectedRoleIds={selectedRoleIds}
        allPermissions={allPermissions}
        overrides={user.overrides || []}
        readOnly={true}
      />
    </div>
  );
}
