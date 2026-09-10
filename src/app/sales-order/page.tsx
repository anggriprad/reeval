'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesOrderRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/order');
  }, [router]);

  return null;
}
