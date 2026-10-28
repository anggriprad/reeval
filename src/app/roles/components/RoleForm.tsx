'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleDetail, PermissionItem } from '@/services/role.service';
import { PermissionMatrix } from './PermissionMatrix';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, Save } from 'lucide-react';

export interface RoleFormData {
  code: string;
  name: string;
  description: string;
  permission_ids: number[];
}

export interface RoleFormProps {
  initialData?: RoleDetail | null;
  isReadOnly?: boolean;
  allPermissions: PermissionItem[];
  loadingPermissions?: boolean;
  onSubmit?: (data: RoleFormData) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function RoleForm({
  initialData,
  isReadOnly = false,
  allPermissions,
  loadingPermissions = false,
  onSubmit,
  isSubmitting = false,
  onCancel,
}: RoleFormProps) {
  const router = useRouter();

  const [code, setCode] = useState(initialData?.code || '');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [permissionIds, setPermissionIds] = useState<number[]>(
    initialData?.permissions ? initialData.permissions.map(p => p.id) : []
  );
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});

  const [prevId, setPrevId] = useState(initialData?.id);
  if (initialData && initialData.id !== prevId) {
    setPrevId(initialData.id);
    setCode(initialData.code);
    setName(initialData.name);
    setDescription(initialData.description || '');
    setPermissionIds(initialData.permissions ? initialData.permissions.map(p => p.id) : []);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !onSubmit) return;

    const newErrors: { code?: string; name?: string } = {};
    const sanitizedCode = code.trim().toUpperCase().replace(/\s+/g, '_');
    if (!initialData) {
      if (!sanitizedCode) {
        newErrors.code = 'Kode role wajib diisi';
      } else if (!/^[A-Z0-9_]+$/.test(sanitizedCode)) {
        newErrors.code = 'Kode role hanya boleh huruf kapital, angka, dan garis bawah (_)';
      }
    }
    if (!name.trim()) {
      newErrors.name = 'Nama role wajib diisi';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await onSubmit({
      code: sanitizedCode,
      name: name.trim(),
      description: description.trim(),
      permission_ids: permissionIds,
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/roles');
    }
  };

  const isEditMode = Boolean(initialData);
  const isSystemRole = Boolean(initialData?.is_system);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informasi Dasar Role */}
      <Card noRounded="mobile" className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Informasi Utama Role
            </h2>
          </div>
          {initialData && (
            <Badge variant={initialData.is_system ? 'purple' : 'info'}>
              {initialData.is_system ? 'System Role' : 'Custom Role'}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Kode Role"
              required={!isEditMode}
              value={code}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/\s+/g, '_');
                setCode(val);
                if (errors.code) setErrors(p => ({ ...p, code: undefined }));
              }}
              placeholder="Contoh: STAFF_GUDANG"
              disabled={isEditMode || isReadOnly}
              error={errors.code}
            />
            {isEditMode ? (
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Kode role bersifat permanen dan tidak dapat diubah setelah dibuat.
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Gunakan format huruf kapital tanpa spasi (misal: ADMIN_GUDANG).
              </p>
            )}
          </div>

          <div>
            <Input
              label="Nama Role"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(p => ({ ...p, name: undefined }));
              }}
              placeholder="Contoh: Staff Gudang & Logistik"
              disabled={isReadOnly}
              error={errors.name}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 md:mb-1.5 block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
            Deskripsi Ruang Lingkup
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isReadOnly}
            placeholder="Jelaskan tanggung jawab dan ruang lingkup tugas pemegang role ini..."
            className="w-full rounded-lg md:rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-3 text-[16px] md:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 transition-colors"
          />
        </div>
      </Card>

      {/* Matriks Hak Akses */}
      <Card noRounded="mobile" className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Cakupan Hak Akses Modul
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isReadOnly
                ? 'Daftar wewenang teknis yang aktif untuk role ini'
                : 'Pilih izin otorisasi yang dapat dijalankan oleh pengguna dengan role ini'}
            </p>
          </div>
          <Badge variant="default" className="text-xs font-mono">
            {permissionIds.length} Terpilih
          </Badge>
        </div>

        <PermissionMatrix
          permissions={allPermissions}
          selectedIds={permissionIds}
          onChange={setPermissionIds}
          readOnly={isReadOnly}
          loading={loadingPermissions}
        />
      </Card>

      {/* Form Action Controls */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          {isReadOnly ? 'Kembali ke Daftar' : 'Batal'}
        </Button>

        {!isReadOnly && !isSystemRole && (
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="gap-2 shadow-xs"
          >
            <Save className="h-4 w-4" />
            {isEditMode ? 'Simpan Perubahan' : 'Buat Role Baru'}
          </Button>
        )}
      </div>
    </form>
  );
}
