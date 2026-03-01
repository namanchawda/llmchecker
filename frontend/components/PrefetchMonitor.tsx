'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PrefetchMonitor() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/monitor');
  }, [router]);

  return null;
}