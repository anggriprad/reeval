'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  User,
  Mail,
  Phone,
  Camera,
  Trash2,
  Save,
  AlertCircle,
  Building2,
  Shield,
  Loader2,
} from 'lucide-react';
import { authService, UserSummary } from '@/services/auth.service';
import { resolveProductImageUrl } from '@/services/product.service';
import { useToast } from '@/context/ToastContext';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface ProfileInfoSectionProps {
  user: UserSummary | null;
  onProfileUpdated: () => void;
}

export function ProfileInfoSection({ user, onProfileUpdated }: ProfileInfoSectionProps) {
  const { toast } = useToast();
  const { updateStoredUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ full_name?: string; email?: string; phone?: string }>({});

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      if (user.avatar_url) {
        setAvatarPreview(resolveProductImageUrl(user.avatar_url));
      } else {
        setAvatarPreview(null);
      }
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File Tidak Didukung', 'Silakan pilih file gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Terlalu Besar', 'Ukuran foto maksimal adalah 5MB.');
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleRemovePhoto = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isEmailChanged = Boolean(
    user?.email && email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { full_name?: string; email?: string; phone?: string } = {};

    if (!fullName.trim()) {
      newErrors.full_name = 'Nama lengkap wajib diisi.';
    }

    if (!email.trim()) {
      newErrors.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Format email tidak valid.';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Nomor telepon wajib diisi.';
    } else if (phone.trim().length < 8) {
      newErrors.phone = 'Nomor telepon minimal 8 digit.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await authService.updateProfile(
        {
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },
        avatarFile || undefined
      );

      if (!res.success) {
        toast.error('Gagal Menyimpan Profil', res.message || 'Terjadi kesalahan saat memperbarui profil.');
        return;
      }

      if (res.data?.email_changed) {
        toast.info(
          'Email Telah Diubah',
          'Alamat email akun Anda telah berhasil diperbarui. Sesi aktif Anda telah berakhir, silakan login kembali dengan email baru.'
        );
        setTimeout(() => {
          authService.logout();
        }, 1500);
        return;
      }

      if (res.data?.user) {
        updateStoredUser(res.data.user);
      }

      toast.success('Profil Diperbarui', 'Data profil Anda berhasil disimpan.');
      onProfileUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan perubahan profil.';
      toast.error('Gagal Menyimpan', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = fullName
    ? fullName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Informasi Profil Akun</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola data identitas diri, foto profil, dan informasi kontak akun Anda.
          </p>
        </div>
      </div>

      {/* Avatar Upload Card */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="relative group shrink-0">
          <div className="h-20 w-20 rounded-full border-2 border-indigo-600/30 overflow-hidden bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt={fullName || 'Avatar'}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-transform hover:scale-110 cursor-pointer"
            title="Ubah Foto Profil"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Foto Profil</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Format yang didukung: JPG, PNG, atau WebP. Maksimal 5MB.
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <Camera className="h-3.5 w-3.5 mr-1" />
              Pilih Foto
            </Button>
            {avatarPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Hapus
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Nama Lengkap"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.full_name) setErrors((prev) => ({ ...prev, full_name: undefined }));
              }}
              className={cn('pl-9 text-sm', errors.full_name && 'border-red-500')}
            />
          </div>
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
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="email"
              placeholder="nama@perusahaan.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={cn('pl-9 text-sm', errors.email && 'border-red-500')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.email}
            </p>
          )}
          {isEmailChanged && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Perhatian: Mengubah alamat email akan otomatis mengakhiri sesi aktif Anda dan meminta Anda login kembali.
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Nomor WhatsApp / Telepon <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="tel"
              placeholder="cth. 08123456789"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              className={cn('pl-9 text-sm', errors.phone && 'border-red-500')}
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.phone}
            </p>
          )}
        </div>

        {/* Roles & Permissions Info */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Peran & Hak Akses
          </label>
          <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            {user?.roles && user.roles.length > 0 ? (
              user.roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-xs font-semibold"
                >
                  <Shield className="h-3 w-3" />
                  {r}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">Pengguna Standar</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="shadow-sm"
        >
          <Save className="h-4 w-4 mr-1.5" />
          Simpan Profil
        </Button>
      </div>
    </form>
  );
}
