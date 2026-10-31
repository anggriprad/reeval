'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserDetail, PermissionOverride } from '@/services/user.service';
import { RoleSummary, PermissionItem } from '@/services/role.service';
import { UserRoleOverrideMatrix } from './UserRoleOverrideMatrix';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  User,
  Mail,
  Lock,
  Phone,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserFormData {
  email: string;
  password?: string | null;
  full_name: string;
  phone?: string;
  is_active?: boolean;
  is_ready?: boolean;
  role_ids: number[];
  overrides: PermissionOverride[];
}

export interface UserFormProps {
  initialData?: UserDetail | null;
  isReadOnly?: boolean;
  roleOptions: RoleSummary[];
  allPermissions: PermissionItem[];
  loadingPermissions?: boolean;
  onSubmit?: (data: UserFormData) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function UserForm({
  initialData,
  isReadOnly = false,
  roleOptions,
  allPermissions,
  loadingPermissions = false,
  onSubmit,
  isSubmitting = false,
  onCancel,
}: UserFormProps) {
  const router = useRouter();

  const isEditing = Boolean(initialData);

  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [isActive, setIsActive] = useState(initialData ? initialData.is_active : true);
  const [isReady, setIsReady] = useState(initialData ? initialData.is_ready : true);
  const [showPassword, setShowPassword] = useState(false);

  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(() => {
    if (initialData?.roles && initialData.roles.length > 0) {
      return initialData.roles.map(r => (typeof r === 'number' ? r : (r as any).id));
    }
    if ((initialData as any)?.role_id) {
      return [(initialData as any).role_id];
    }
    return [];
  });

  const [overrides, setOverrides] = useState<PermissionOverride[]>(
    initialData?.overrides || []
  );

  const [errors, setErrors] = useState<{
    full_name?: string;
    email?: string;
    password?: string;
    role?: string;
  }>({});

  const handleRoleChange = (newRoleIds: number[]) => {
    setSelectedRoleIds(newRoleIds);
    if (errors.role && newRoleIds.length > 0) {
      setErrors(prev => ({ ...prev, role: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !onSubmit) return;

    const newErrors: { full_name?: string; email?: string; password?: string; role?: string } = {};

    if (!fullName.trim()) {
      newErrors.full_name = 'Nama lengkap wajib diisi.';
    }

    if (!isEditing) {
      if (!email.trim()) {
        newErrors.email = 'Email wajib diisi.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        newErrors.email = 'Format email tidak valid.';
      }
    }

    if (selectedRoleIds.length === 0) {
      newErrors.role = 'Silakan pilih minimal satu peran untuk akun ini.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    await onSubmit({
      email: email.trim(),
      password: null,
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      is_active: isActive,
      is_ready: isReady,
      role_ids: selectedRoleIds,
      overrides: overrides,
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/users');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Section 1: User Identity Information */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Data Identitas Pengguna
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Informasi profil utama dan kontak operasional akun pengguna.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="cth. Hendra Wijaya"
              value={fullName}
              disabled={isReadOnly}
              onChange={e => {
                setFullName(e.target.value);
                if (errors.full_name) setErrors(prev => ({ ...prev, full_name: undefined }));
              }}
              className={cn('text-sm', errors.full_name && 'border-red-500 dark:border-red-500')}
            />
            {errors.full_name && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.full_name}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alamat Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="email"
                placeholder="hendra@perusahaan.com"
                value={email}
                disabled={isReadOnly || isEditing}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                className={cn('pl-9 text-sm', errors.email && 'border-red-500 dark:border-red-500')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.email}
              </p>
            )}
            {isEditing && (
              <p className="text-[11px] text-slate-400">Email identitas login tidak dapat diubah.</p>
            )}
          </div>


          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nomor WhatsApp / Telepon
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="tel"
                placeholder="cth. 08123456789"
                value={phone}
                disabled={isReadOnly}
                onChange={e => setPhone(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Operational Status Toggles (Active & Ready) on Edit */}
        {isEditing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Active Status */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Status Akun Aktif</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Akun non-aktif tidak dapat masuk ke sistem.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={isReadOnly}
                  onChange={e => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Ready Status */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Status Siap Kerja (Ready)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Staf tersedia untuk penugasan SPK produksi & trip pengiriman.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReady}
                  disabled={isReadOnly}
                  onChange={e => setIsReady(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Role validation error banner if user attempts to submit without a role */}
      {errors.role && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{errors.role}</span>
        </div>
      )}

      {/* Section 2: Role Assignment & Optional Overrides Matrix */}
      <UserRoleOverrideMatrix
        roleOptions={roleOptions}
        selectedRoleIds={selectedRoleIds}
        onRoleChange={handleRoleChange}
        allPermissions={allPermissions}
        overrides={overrides}
        onOverridesChange={setOverrides}
        readOnly={isReadOnly}
        loadingPermissions={loadingPermissions}
      />

      {/* Action Footer */}
      {!isReadOnly && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isEditing ? 'Simpan Perubahan' : 'Buat Pengguna'}
          </Button>
        </div>
      )}
    </form>
  );
}
