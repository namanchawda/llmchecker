'use client';

import { useState } from 'react';
import { useAuth } from '../app/context/AuthContext';

export function ApiKeyPanel() {
  const auth = useAuth();

  // 🔐 HARD GUARD — TS now KNOWS user exists
  if (!auth.user || !auth.token) return null;

  const user = auth.user;
  const token = auth.token;
  const login = auth.login;

  const [loading, setLoading] = useState(false);

  async function buyApiKey() {
    if (loading) return;
    setLoading(true);

    const res = await fetch('http://localhost:3001/auth/api-key/buy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const updatedUser = await res.json();
    login(token, updatedUser);
    setLoading(false);
  }

  async function useApiKey() {
    if (loading || user.apiKeyQuota === 0) return;
    setLoading(true);

    const res = await fetch('http://localhost:3001/auth/api-key/use', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const updatedUser = await res.json();
    login(token, updatedUser);
    setLoading(false);
  }

  return (
    <div>
      {!user.apiKey ? (
        <button
          disabled={loading}
          onClick={buyApiKey}
          className="hidden sm:flex px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300"
        >
          {loading ? 'Processing…' : 'Generate Platform API Key'}
        </button>
      ) : (
        // <button
        //   disabled={loading || user.apiKeyQuota === 0}
        //   onClick={useApiKey}
        //   className="hidden sm:flex px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300"
        // >
        //   {user.apiKeyQuota > 0
        //     ? `Quota : ${user.apiKeyQuota} left`
        //     : 'Quota exhausted'}
        // </button>
        <></>
      )}
    </div>
  );
}