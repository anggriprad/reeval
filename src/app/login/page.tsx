'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Factory } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useApp();

  const [email, setEmail] = useState<string>('admin@reeval.id');
  const [password, setPassword] = useState<string>('123456');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = login(email, password);
      setIsLoading(false);
      if (result.success) {
        router.push('/');
      } else {
        setErrorMessage(result.error || 'Email atau password yang Anda masukkan salah.');
      }
    }, 400);
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
            <p className="text-xs text-slate-400 mt-1">
              Sistem Manajemen Operasional Pabrik &amp; Produksi
            </p>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isLoading || !email.trim() || !password}
              className="w-full mt-2 font-bold justify-center"
            >
              {isLoading ? 'Memproses...' : 'Masuk'}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          {/* Clean Demo Info Footer */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-300">Akun Demo (Password: 123456):</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[10px] text-slate-400">
              <div>&bull; Super Admin: <span className="text-indigo-400">admin@reeval.id</span></div>
              <div>&bull; Sales: <span className="text-indigo-400">sales@reeval.id</span></div>
              <div>&bull; Produksi: <span className="text-indigo-400">production@reeval.id</span></div>
              <div>&bull; Gudang: <span className="text-indigo-400">gudang@reeval.id</span></div>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500">
          Reeval ERP &bull; Enterprise Manufacturing System &copy; 2026
        </div>
      </div>
    </div>
  );
}
