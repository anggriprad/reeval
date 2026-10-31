'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { UserTableSection } from './components/UserTableSection';
import { Plus } from 'lucide-react';

function UsersPageContent() {
  const router = useRouter();
  const { can, isSuperAdmin } = usePermission();
  const canCreate = isSuperAdmin || can(PERMISSIONS.USER.CREATE);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Manajemen Pengguna"
        backHref="/settings"
      >
        {canCreate && (
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push('/users/create')}
            className="gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Tambah Pengguna
          </Button>
        )}
      </PageHeader>

      <UserTableSection />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader title="Manajemen Pengguna" backHref="/settings" />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Memuat halaman pengguna...</p>
          </div>
        </div>
      }
    >
      <UsersPageContent />
    </Suspense>
  );
}
