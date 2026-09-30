import React, { useState, useEffect, FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { RoleEnum, UserRead } from '../types';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { Lock, Home, AlertCircle, LogIn } from 'lucide-react';

interface LocationState {
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
}

function getDefaultRouteForRole(role: RoleEnum): string {
  switch (role) {
    case RoleEnum.agent:
      return '/agent';
    case RoleEnum.admin:
      return '/admin';
    default:
      return '/';
  }
}

/**
 * Resolves a safe internal redirect path after authentication.
 * - Prevents open redirects by requiring a single leading '/' and rejecting '//' or '/\'.
 * - Prevents cross-role bounces (e.g. redirecting an admin to /agent or an agent to /admin).
 * - Preserves pathname, search, and hash when valid.
 */
function resolveRedirectTarget(user: UserRead, from?: LocationState['from']): string {
  const fallback = getDefaultRouteForRole(user.role);

  if (!from || typeof from.pathname !== 'string') {
    return fallback;
  }

  const { pathname, search = '', hash = '' } = from;

  // Enforce strict internal path invariant (no protocol-relative or external URLs)
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.startsWith('/\\')) {
    return fallback;
  }

  // Avoid redirecting back to auth/error screens
  if (pathname === '/login' || pathname === '/unauthorized') {
    return fallback;
  }

  // Enforce role compatibility for protected dashboard routes
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (user.role !== RoleEnum.admin) {
      return fallback;
    }
  }

  if (pathname === '/agent' || pathname.startsWith('/agent/')) {
    if (user.role !== RoleEnum.agent) {
      return fallback;
    }
  }

  return `${pathname}${search}${hash}`;
}

export const LoginPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = location.state as LocationState | null;

  // Redirect once authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const target = resolveRedirectTarget(user, state?.from);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate, state]);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await login(trimmedEmail, password);
    } catch (err: unknown) {
      setPassword('');
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          setError('Invalid email or password.');
        } else if (status === 429) {
          setError('Too many sign-in attempts. Please wait a few minutes and try again.');
        } else if (status === 422) {
          setError('Please enter a valid email address and password.');
        } else {
          setError('Unable to sign in right now. Please check your connection and try again.');
        }
      } else {
        setError('Unable to sign in right now. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-[#0A0A0A] focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400';
  const labelClass = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 text-left';

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 sm:py-20 px-4 bg-[#F8F6F1]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#0A0A0A] text-[#C9A84C] flex items-center justify-center shadow-xs">
            <Lock size={26} />
          </div>

          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#C9A84C] mb-1">
            Trust Estate Portal
          </span>
          <h1 className="text-2xl font-black text-[#0A0A0A] tracking-tight">
            Sign In to Your Account
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Access your verified agent or administrator workspace.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-5 bg-red-50 border border-red-100 text-red-600 p-3.5 rounded-xl text-sm flex items-start gap-2.5"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="login-email" className={labelClass}>
              Email Address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={submitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@trustestate.ng"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="login-password" className={labelClass}>
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={submitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={inputClass}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#C9A84C] hover:bg-[#b8963e] text-black font-black py-3.5 px-6 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={17} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0A0A0A] transition-colors"
          >
            <Home size={14} />
            <span>Back to Property Listings</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

