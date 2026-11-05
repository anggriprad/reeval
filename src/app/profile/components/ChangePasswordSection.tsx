'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Lock, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

export function ChangePasswordSection() {
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    current_password?: string;
    new_password?: string;
    confirm_password?: string;
  }>({});

  const isMinLength = newPassword.length >= 8;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: {
      current_password?: string;
      new_password?: string;
      confirm_password?: string;
    } = {};

    if (!currentPassword) {
      newErrors.current_password = 'Password saat ini wajib diisi.';
    }

    if (!newPassword) {
      newErrors.new_password = 'Password baru wajib diisi.';
    } else if (newPassword.length < 8) {
      newErrors.new_password = 'Password baru minimal harus 8 karakter.';
    } else if (newPassword === currentPassword) {
      newErrors.new_password = 'Password baru tidak boleh sama dengan password saat ini.';
    }

    if (!confirmPassword) {
      newErrors.confirm_password = 'Konfirmasi password baru wajib diisi.';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm_password = 'Konfirmasi password baru tidak cocok.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (!res.success) {
        toast.error('Gagal Mengubah Password', res.message || 'Periksa kembali password saat ini.');
        return;
      }

      toast.success('Password Berhasil Diperbarui', 'Kata sandi baru Anda telah aktif.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat mengubah password.';
      toast.error('Gagal Mengubah Password', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Keamanan & Kata Sandi</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Perbarui password akun Anda secara berkala untuk menjaga keamanan akses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Password Saat Ini <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type={showCurrent ? 'text' : 'password'}
              placeholder="Password saat ini"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.current_password) setErrors((prev) => ({ ...prev, current_password: undefined }));
              }}
              className={cn('pl-9 pr-9 text-sm', errors.current_password && 'border-red-500')}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.current_password && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.current_password}
            </p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Password Baru <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type={showNew ? 'text' : 'password'}
              placeholder="Minimal 8 karakter"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.new_password) setErrors((prev) => ({ ...prev, new_password: undefined }));
              }}
              className={cn('pl-9 pr-9 text-sm', errors.new_password && 'border-red-500')}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.new_password && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.new_password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Konfirmasi Password Baru <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirm_password) setErrors((prev) => ({ ...prev, confirm_password: undefined }));
              }}
              className={cn('pl-9 pr-9 text-sm', errors.confirm_password && 'border-red-500')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.confirm_password}
            </p>
          )}
        </div>
      </div>

      {/* Password criteria indicators */}
      {newPassword.length > 0 && (
        <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
          <span
            className={cn(
              'flex items-center gap-1.5 font-medium',
              isMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
            )}
          >
            <CheckCircle2 className={cn('h-3.5 w-3.5', isMinLength ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600')} />
            Minimal 8 karakter
          </span>
          <span
            className={cn(
              'flex items-center gap-1.5 font-medium',
              isMatching ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
            )}
          >
            <CheckCircle2 className={cn('h-3.5 w-3.5', isMatching ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600')} />
            Konfirmasi password cocok
          </span>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="shadow-sm"
        >
          <KeyRound className="h-4 w-4 mr-1.5" />
          Perbarui Password
        </Button>
      </div>
    </form>
  );
}
