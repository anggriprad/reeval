'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function DeliveryLegacyRoute() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/delivery/trip/${id}`);
    }
  }, [id, router]);

  return null;
}
