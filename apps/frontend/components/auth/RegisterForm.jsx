'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import GoogleOAuthButton from './GoogleOAuthButton';

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  const barColor = ['bg-stone-200 dark:bg-stone-700', 'bg-red-400', 'bg-amber-400', 'bg-olive-400', 'bg-olive-500'];
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="mt-1.5">
      <div className="grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-colors duration-200 ${
              i < score ? barColor[score] : 'bg-stone-200 dark:bg-stone-700'
            }`}
          />
        ))}
      </div>
      {password && (
        <p className="text-xs mt-1 text-stone-400">{label[score]}</p>
      )}
    </div>
  );
}

export default function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await register(name, email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <GoogleOAuthButton label="Sign up with Google" />

      <div className="flex items-center gap-3">
        <div className="h-px bg-stone-200 dark:bg-stone-700 flex-1" />
        <span className="text-xs text-stone-400">or</span>
        <div className="h-px bg-stone-200 dark:bg-stone-700 flex-1" />
      </div>

      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="reg-name" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Full name</label>
        <input id="reg-name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Smith" className="input" />
        {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
        <input id="reg-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" />
        {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Password</label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="input pr-10"
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
            <svg aria-hidden="true" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={showPassword ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} />
            </svg>
          </button>
        </div>
        <PasswordStrength password={password} />
        {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
      </div>

      {/* Confirm password */}
      <div>
        <label htmlFor="reg-confirm" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Confirm password</label>
        <input id="reg-confirm" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input" />
        {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
        {loading ? (
          <><span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />Creating account…</>
        ) : 'Create account'}
      </button>

      <p className="text-center text-sm text-stone-500 dark:text-stone-400">
        {'Already have an account? '}
        <Link href="/login" className="text-olive-600 dark:text-olive-400 font-medium hover:underline">Log in</Link>
      </p>
    </form>
  );
}
