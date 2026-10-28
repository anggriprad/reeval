'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Lock, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldAlert, LogOut } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { deleteCookie } from 'cookies-next';
import { toast } from 'sonner';

function ChangePasswordForm() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isMinLength = newPassword.length >= 8;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Password saat ini wajib diisi.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password baru minimal harus 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('Password baru tidak boleh sama dengan password saat ini.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.success) {
        deleteCookie('mustChangePassword', { path: '/' });
        document.cookie = "mustChangePassword=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mustChangePassword');
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              parsed.must_change_password = false;
              localStorage.setItem('user', JSON.stringify(parsed));
            } catch {
              // Ignore JSON parse error
            }
          }
        }

        toast.success('Password berhasil diperbarui! Selamat datang.');
        window.location.href = '/';
      } else {
        setErrorMessage(res.message || 'Gagal mengubah password. Periksa password saat ini.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Terjadi kesalahan saat mengubah password. Pastikan backend aktif.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelLogout = () => {
    authService.logout();
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-2xl font-black text-white shadow-lg shadow-indigo-600/30">
            R
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Ganti Password Wajib
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Untuk keamanan akun Anda, silakan ubah kata sandi sebelum mengakses sistem ERP.
            </p>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Perhatian Keamanan:</span> Akun Anda ditandai memerlukan perubahan kata sandi pertama kali atau reset berkala oleh administrator.
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-red-950/60 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <div>{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password Saat Ini</label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini..."
                  icon={Lock}
                  inputSize="md"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password Baru</label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter..."
                  icon={KeyRound}
                  inputSize="md"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Konfirmasi Password Baru</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  icon={KeyRound}
                  inputSize="md"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 ${isMinLength ? 'text-emerald-400' : 'text-slate-400'}`}>
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isMinLength ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>Panjang password minimal 8 karakter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatching ? 'text-emerald-400' : 'text-slate-400'}`}>
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isMatching ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>Konfirmasi password cocok dengan password baru</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center shadow-md shadow-indigo-600/20"
                isLoading={isLoading}
                disabled={!isMinLength || !isMatching}
              >
                Simpan &amp; Masuk Dashboard
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="md"
                className="w-full justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                onClick={handleCancelLogout}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                <span>Batal &amp; Keluar</span>
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          Reeval ERP Enterprise Manufacturing System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Memuat...</div>}>
      <ChangePasswordForm />
    </Suspense>
  );
}
