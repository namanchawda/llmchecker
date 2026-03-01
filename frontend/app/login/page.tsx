'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const API = 'http://localhost:3001';

type Step = 'auth' | 'otp' | 'forgot' | 'reset-otp' | 'new-password';
type Mode = 'login' | 'signup';

/* ── Password field with show/hide ── */
function PasswordInput({ value, onChange, placeholder, show, onToggle, required: req = true, minLength: min }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  show: boolean; onToggle: () => void; required?: boolean; minLength?: number;
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className="input pr-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={req}
        minLength={min}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('auth');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // show/hide toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Login failed');
        login(data.token, data.user);
        router.push('/');
      } else {
        const res = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Signup failed');
        setStep('otp');
        startResendCooldown();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to send reset code');
      setStep('reset-otp');
      startResendCooldown();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyResetOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit code'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Verification failed');
      setStep('new-password');
    } catch (err: any) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError(''); setLoading(true);
    try {
      const code = otp.join('');
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Password reset failed');
      setStep('auth'); setMode('login');
      setOtp(['', '', '', '', '', '']);
      setNewPassword(''); setConfirmPassword(''); setPassword(''); setError('');
      alert('Password reset successful! Please log in with your new password.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(idx: number, val: string) {
    if (val.length === 6 && /^\d{6}$/.test(val)) {
      const digits = val.split('');
      setOtp(digits);
      otpRefs.current[5]?.focus();
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit code'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Verification failed');
      login(data.token, data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    try {
      const endpoint = step === 'reset-otp' ? 'resend-reset-otp' : 'resend-otp';
      const res = await fetch(`${API}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to resend');
      startResendCooldown();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  }

  function handleGoogleLogin() { window.location.href = `${API}/auth/google`; }

  function resetToLogin() {
    setStep('auth'); setMode('login');
    setOtp(['', '', '', '', '', '']);
    setError(''); setNewPassword(''); setConfirmPassword('');
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-white/5 blur-[140px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-white/5 blur-[140px] rounded-full" />

      {/* Back to home */}
      

      <div className="w-[95%] max-w-[1100px] grid lg:grid-cols-2 rounded-3xl overflow-hidden border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl bg-white/[0.02]">
        {/* LEFT PANEL */}
        <div className="relative flex flex-col justify-between p-12 border-r border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.07),transparent_40%)]" />
          <button
        onClick={() => router.push('/')}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>
      <br/>
          <div className="relative z-10">
            <div className="text-xl font-semibold tracking-tight mb-10 text-slate-200">LLM Monitor</div>
            <div className="hero-title text-5xl font-semibold leading-[1.05] mb-6">
              Realtime<br />LLM Service Monitor
            </div>
            <p className="text-slate-400 text-lg max-w-sm">
              Live status, service drilldowns, and incident tracking for OpenAI, Anthropic, Gemini, and Grok.
            </p>
          </div>
          <div className="relative z-10 flex gap-4">
            <div className="card p-4 w-32">
              <div className="text-2xl font-semibold">4+</div>
              <div className="text-slate-400 text-xs">Providers</div>
            </div>
          </div>
        </div>

        {/* RIGHT — FORM */}
        <div className="flex items-center justify-center p-8">
          <div className="card w-full max-w-sm p-6 flex flex-col" style={{ minHeight: 540 }}>

            {/* ── SIGNUP OTP ── */}
            {step === 'otp' ? (
              <>
                <div className="mb-6">
                  <button onClick={() => { setStep('auth'); setOtp(['','','','','','']); setError(''); }}
                    className="text-slate-500 hover:text-slate-300 text-xs mb-4 flex items-center gap-1 transition-colors">
                    ← Back
                  </button>
                  <h2 className="text-2xl font-semibold mb-2">Check your email</h2>
                  <p className="text-slate-400 text-sm">We sent a 6-digit code to <span className="text-white font-medium">{email}</span>.</p>
                </div>
                <form onSubmit={handleVerifyOtp} className="flex-1 flex flex-col">
                  <div className="flex gap-2 justify-center mb-6">
                    {otp.map((digit, idx) => (
                      <input key={idx} ref={(el) => { otpRefs.current[idx] = el; }}
                        type="text" inputMode="numeric" maxLength={6} value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onFocus={(e) => e.target.select()}
                        className="w-11 h-14 text-center text-xl font-bold rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all" />
                    ))}
                  </div>
                  {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4">{error}</div>}
                  <button type="submit" disabled={loading || otp.join('').length < 6} className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? 'Verifying…' : 'Verify email'}
                  </button>
                  <div className="mt-4 text-center text-sm text-slate-500">
                    Didn't receive it?{' '}
                    <button type="button" onClick={handleResend} disabled={resendCooldown > 0} className="text-white disabled:text-slate-500 hover:underline transition-colors">
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-600">Code expires in 10 minutes</p>
                </form>
              </>

            ) : step === 'forgot' ? (
              /* ── FORGOT PASSWORD ── */
              <>
                <div className="mb-6">
                  <button onClick={resetToLogin} className="text-slate-500 hover:text-slate-300 text-xs mb-4 flex items-center gap-1 transition-colors">← Back to login</button>
                  <h2 className="text-2xl font-semibold mb-2">Reset your password</h2>
                  <p className="text-slate-400 text-sm">Enter your email and we'll send you a reset code.</p>
                </div>
                <form onSubmit={handleForgotPassword} className="flex-1 flex flex-col justify-center">
                  <input className="input mb-4" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg mb-4">{error}</div>}
                  <button className="btn-primary w-full" disabled={loading}>{loading ? 'Sending code…' : 'Send reset code'}</button>
                </form>
              </>

            ) : step === 'reset-otp' ? (
              /* ── RESET OTP ── */
              <>
                <div className="mb-6">
                  <button onClick={() => { setStep('forgot'); setOtp(['','','','','','']); setError(''); }}
                    className="text-slate-500 hover:text-slate-300 text-xs mb-4 flex items-center gap-1 transition-colors">← Back</button>
                  <h2 className="text-2xl font-semibold mb-2">Check your email</h2>
                  <p className="text-slate-400 text-sm">We sent a 6-digit code to <span className="text-white font-medium">{email}</span>.</p>
                </div>
                <form onSubmit={handleVerifyResetOtp} className="flex-1 flex flex-col">
                  <div className="flex gap-2 justify-center mb-6">
                    {otp.map((digit, idx) => (
                      <input key={idx} ref={(el) => { otpRefs.current[idx] = el; }}
                        type="text" inputMode="numeric" maxLength={6} value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onFocus={(e) => e.target.select()}
                        className="w-11 h-14 text-center text-xl font-bold rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all" />
                    ))}
                  </div>
                  {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4">{error}</div>}
                  <button type="submit" disabled={loading || otp.join('').length < 6} className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? 'Verifying…' : 'Verify code'}
                  </button>
                  <div className="mt-4 text-center text-sm text-slate-500">
                    Didn't receive it?{' '}
                    <button type="button" onClick={handleResend} disabled={resendCooldown > 0} className="text-white disabled:text-slate-500 hover:underline transition-colors">
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-600">Code expires in 10 minutes</p>
                </form>
              </>

            ) : step === 'new-password' ? (
              /* ── NEW PASSWORD ── */
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-2">Create new password</h2>
                  <p className="text-slate-400 text-sm">Enter your new password below.</p>
                </div>
                <form onSubmit={handleResetPassword} className="flex-1 flex flex-col justify-center space-y-4">
                  <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="New password"
                    show={showNewPassword} onToggle={() => setShowNewPassword(p => !p)} minLength={6} />
                  <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password"
                    show={showConfirmPassword} onToggle={() => setShowConfirmPassword(p => !p)} minLength={6} />
                  {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</div>}
                  <button className="btn-primary w-full" disabled={loading}>{loading ? 'Resetting password…' : 'Reset password'}</button>
                </form>
              </>

            ) : (
              /* ── LOGIN / SIGNUP ── */
              <>
                <h2 className="text-2xl font-semibold mb-2">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
                <p className="text-slate-400 mb-6 text-sm">
                  {mode === 'login' ? 'Enter your credentials to continue.' : 'A verification code will be sent to your email.'}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-center">
                  <div className={`transition-all duration-300 overflow-hidden ${mode === 'signup' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required={mode === 'signup'} />
                  </div>
                  <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <PasswordInput value={password} onChange={setPassword} placeholder="Password"
                    show={showPassword} onToggle={() => setShowPassword(p => !p)} />
                  {mode === 'login' && (
                    <div className="text-right">
                      <button type="button" onClick={() => { setStep('forgot'); setError(''); }}
                        className="text-sm text-slate-400 hover:text-white transition-colors">
                        Forgot password?
                      </button>
                    </div>
                  )}
                  {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</div>}
                  <button className="btn-primary w-full" disabled={loading}>
                    {loading ? (mode === 'login' ? 'Signing in…' : 'Sending code…') : (mode === 'login' ? 'Sign in' : 'Continue')}
                  </button>
                </form>

                <div className="flex items-center my-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="px-3 text-slate-400 text-sm">OR</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <button onClick={handleGoogleLogin} className="btn-secondary w-full">Continue with Google</button>

                <p className="text-slate-400 mt-6 text-sm text-center">
                  {mode === 'login' ? (
                    <>New here?{' '}<span onClick={() => { setMode('signup'); setError(''); }} className="text-white cursor-pointer hover:underline">Create account</span></>
                  ) : (
                    <>Already have an account?{' '}<span onClick={() => { setMode('login'); setError(''); }} className="text-white cursor-pointer hover:underline">Sign in</span></>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}