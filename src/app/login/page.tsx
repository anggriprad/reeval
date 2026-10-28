'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Factory } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { setCookie, deleteCookie } from 'cookies-next';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const { isLoggedIn } = useApp();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isLoggedIn) {
      const mustChange =
        typeof window !== 'undefined' &&
        localStorage.getItem('mustChangePassword') === '1';

      if (mustChange) {
        router.push('/change-password');
      } else {
        router.push('/');
      }
    }
  }, [isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authService.login({
        email: email.trim(),
        password: password,
      });

      if (res.success && res.data) {
        const { access_token, user, company, must_change_password } = res.data;
        const requiresPasswordChange = Boolean(
          must_change_password || user?.must_change_password
        );

        if (typeof window !== 'undefined') {
          localStorage.setItem('token', access_token);
          localStorage.setItem('user', JSON.stringify(user));
          if (company) {
            localStorage.setItem('company', JSON.stringify(company));
          }
        }

        const isSuper = Boolean(
          user.is_superadmin ||
          (Array.isArray(user.roles) && (user.roles.includes('SUPER_ADMIN') || user.roles.includes('SUPERADMIN')))
        );
        const rawRoles: string[] = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
        const primaryRole = isSuper ? 'SUPER_ADMIN' : (rawRoles[0] || 'ADMIN');
        const roleCookieValue = isSuper ? 'SUPER_ADMIN' : (rawRoles.length > 0 ? rawRoles.join(',') : primaryRole);

        setCookie('token', access_token, { maxAge: 60 * 60 * 24 * 7, path: '/' });
        setCookie('cookieKey', access_token, { maxAge: 60 * 60 * 24 * 7, path: '/' });
        setCookie('user', JSON.stringify(user), { maxAge: 60 * 60 * 24 * 7, path: '/' });
        setCookie('role', roleCookieValue, { maxAge: 60 * 60 * 24 * 7, path: '/' });
        setCookie('permissions', JSON.stringify(user.permissions || []), { maxAge: 60 * 60 * 24 * 7, path: '/' });
        if (company?.id) {
          setCookie('activeCompanyId', company.id.toString(), { maxAge: 60 * 60 * 24 * 7, path: '/' });
        }

        if (requiresPasswordChange) {
          setCookie('mustChangePassword', '1', { maxAge: 60 * 60 * 24 * 7, path: '/' });
          if (typeof window !== 'undefined') {
            localStorage.setItem('mustChangePassword', '1');
          }
          toast.info('Akun Anda memerlukan penggantian password baru sebelum melanjutkan.');
          window.location.href = '/change-password';
          return;
        }

        deleteCookie('mustChangePassword', { path: '/' });
        document.cookie = "mustChangePassword=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mustChangePassword');
        }

        toast.success(`Selamat datang, ${user.full_name || user.email}!`);
        const targetUrl = callbackUrl === '/login' || callbackUrl === '/change-password' ? '/' : callbackUrl;
        window.location.href = targetUrl;
      } else {
        setErrorMessage(res.message || 'Login gagal. Periksa kembali email dan password Anda.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal terhubung ke server. Pastikan backend aktif.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
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
              Reeval ERP
            </h1>
         
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-white">Masuk ke Akun</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Silakan masukkan email dan password akun Anda untuk melanjutkan.
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-red-950/60 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <div>{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@reeval.id"
                icon={Mail}
                inputSize="md"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  icon={Lock}
                  inputSize="md"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center mt-2 shadow-md shadow-indigo-600/20"
              isLoading={isLoading}
            >
              <span>Masuk</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

         
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400">
          Reeval ERP Enterprise Manufacturing System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Memuat...</div>}>
      <LoginForm />
    </Suspense>
  );
}
