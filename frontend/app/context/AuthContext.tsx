'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { setAuthToken } from '../../lib/api';

type User = {
  id: string;
  name: string;
  email: string;
  apiKey: string | null;
  apiKeyQuota: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed.user);
      setToken(parsed.token);
      setAuthToken(parsed.token);
    }
  }, []);

  

function login(token: string, user: User) {
  setUser(user);
  setToken(token);
  setAuthToken(token); // 🔥 CRITICAL
  localStorage.setItem('auth', JSON.stringify({ token, user }));
}

  function logout() {
  setUser(null);
  setToken(null);
  setAuthToken(null); // 🔥 CRITICAL
  localStorage.removeItem('auth');
}

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}