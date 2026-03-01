'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export function AuthButtons() {
  const { data: session } = useSession();

  if (!session) {
    return <button onClick={() => signIn('google')}>Login</button>;
  }

  return (
    <div>
      <span>{session.user?.email}</span>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}
