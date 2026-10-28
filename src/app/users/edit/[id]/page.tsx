'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditUserRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      router.replace(`/users/${id}/edit`);
    } else {
      router.replace('/users');
    }
  }, [params.id, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
    </div>
  );
}
