'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesOrderCreateRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/order/create');
  }, [router]);

  return null;
}
