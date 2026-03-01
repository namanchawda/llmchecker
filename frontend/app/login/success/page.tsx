'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

function LoginSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (!token) return;

    async function loadUser() {
      const res = await fetch('http://localhost:3001/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const user = await res.json();
      login(token as string, user);
      router.replace('/');
    }

    loadUser();
  }, []);

  return <></>;
}

export default function LoginSuccess() {
  return (
    <Suspense>
      <LoginSuccessInner />
    </Suspense>
  );
}