'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, signup } from '../../lib/auth';
import { saveAuth } from '../../lib/user-store';

export default function AuthPage() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const data = isSignup
        ? await signup(name, email, password)
        : await login(email, password);

      saveAuth(data.token, data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto' }}>
      <h2>{isSignup ? 'Sign up' : 'Sign in'}</h2>

      <form onSubmit={handleSubmit}>
        {isSignup && (
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}

        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit">
          {isSignup ? 'Create account' : 'Login'}
        </button>
      </form>

      <button
        style={{ marginTop: 12 }}
        onClick={() => setIsSignup(!isSignup)}
      >
        {isSignup
          ? 'Already have an account? Login'
          : 'New here? Sign up'}
      </button>
    </div>
  );
}
