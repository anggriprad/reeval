'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export function ForgotPasswordModal({ isOpen, onClose, onSuccess }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Alamat email wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.forgotPassword({
        email: email.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.message || 'Akun tidak ditemukan. Periksa kembali email Anda.');
        return;
      }

      setResetToken(res.data?.reset_token || '');
      setStep(2);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal memproses permintaan reset password.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetToken.trim()) {
      setErrorMessage('Kode verifikasi 6 digit wajib diisi.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password baru minimal harus 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.resetPassword({
        email: email.trim(),
        token: resetToken.trim(),
        new_password: newPassword,
      });

      if (!res.success) {
        setErrorMessage(res.message || 'Gagal mereset password.');
        return;
      }

      toast.success('Password Berhasil Direset', {
        description: 'Silakan masuk dengan password baru Anda.',
      });
      onSuccess(email.trim());
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal mereset kata sandi.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    onClose();
  };

  const isMinLength = newPassword.length >= 8;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {step === 1 ? 'Lupa Password' : 'Buat Password Baru'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {step === 1
                  ? 'Masukkan email akun terdaftar Anda untuk verifikasi.'
                  : 'Masukkan kata sandi baru untuk akun Anda.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <div>{errorMessage}</div>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Alamat Email Terdaftar <span className="text-red-400">*</span>
              </label>
              <Input
                type="email"
                placeholder="nama@reeval.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                inputSize="md"
                required
              />
              <p className="text-[11px] text-slate-500">
                Kode verifikasi reset password akan dikirimkan ke alamat email ini.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="md" onClick={handleClose}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
                <span>Kirim Kode</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Kode Verifikasi (6 Digit) <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                placeholder="Contoh: 123456"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value.trim())}
                icon={KeyRound}
                inputSize="md"
                maxLength={6}
                required
              />
              <p className="text-[11px] text-slate-500">
                Masukkan kode verifikasi 6 digit yang dikirimkan ke email <span className="text-slate-300 font-medium">{email}</span>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Password Baru <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  icon={Lock}
                  inputSize="md"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Konfirmasi Password Baru <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={Lock}
                  inputSize="md"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {newPassword.length > 0 && (
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                <span
                  className={cn(
                    'flex items-center gap-1.5 font-medium',
                    isMinLength ? 'text-emerald-400' : 'text-slate-500'
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Minimal 8 karakter
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1.5 font-medium',
                    isMatching ? 'text-emerald-400' : 'text-slate-500'
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi password cocok
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="md" onClick={() => setStep(1)}>
                Kembali
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
                <span>Reset Password</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
