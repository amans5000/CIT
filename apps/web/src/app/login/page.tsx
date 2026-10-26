'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import Navbar from '../../components/Navbar';
import { UserRole } from '@cit9/types';
import { Shield, Sparkles, User, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { user, loginAsMock, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PARTICIPANT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to lobby
  useEffect(() => {
    if (!loading && user) {
      router.push('/lobby');
    }
  }, [user, loading, router]);

  const handleQuickLogin = async (presetEmail: string, presetRole: UserRole) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await loginAsMock(presetEmail, presetRole);
      router.push('/lobby');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Ensure API server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await loginAsMock(email.trim(), role);
      router.push('/lobby');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Ensure API server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-cit-dark">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-mono mb-3 border border-pink-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                CIT 9.0 ACCESS PORTAL
              </div>
              <h1 className="font-orbitron text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                AUTHENTICATE
              </h1>
              <p className="text-sm text-slate-400 mt-2 font-sans">
                Sign in to participate in the Cognitive Intelligence Test
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google OAuth (Primary Prod Method) */}
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/google`}
              className="w-full py-3 px-4 rounded-xl font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-white/20 hover:scale-[1.01] text-sm mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google OAuth
            </a>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink mx-4 text-xs font-mono text-slate-500 uppercase">
                Or Local Dev Mock Sign-In
              </span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            {/* Quick 1-Click Dev Logins */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                type="button"
                onClick={() => handleQuickLogin('student@cit.istenitdgp.com', UserRole.PARTICIPANT)}
                disabled={isSubmitting}
                className="p-2.5 rounded-xl glass-panel hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 mb-0.5">
                  <User className="w-3 h-3" />
                  STUDENT
                </div>
                <div className="text-[11px] text-slate-200 font-medium truncate">student@cit...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('organizer@cit.istenitdgp.com', UserRole.ORGANIZER)}
                disabled={isSubmitting}
                className="p-2.5 rounded-xl glass-panel hover:border-purple-500/50 hover:bg-purple-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-1 text-[11px] font-mono text-purple-400 mb-0.5">
                  <Sparkles className="w-3 h-3" />
                  ORGANIZER
                </div>
                <div className="text-[11px] text-slate-200 font-medium truncate">organizer@cit...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@cit.istenitdgp.com', UserRole.ADMIN)}
                disabled={isSubmitting}
                className="p-2.5 rounded-xl glass-panel hover:border-pink-500/50 hover:bg-pink-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-1 text-[11px] font-mono text-pink-400 mb-0.5">
                  <Shield className="w-3 h-3" />
                  ADMIN
                </div>
                <div className="text-[11px] text-slate-200 font-medium truncate">admin@cit...</div>
              </button>
            </div>

            {/* Custom Dev Mock Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Custom Test Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. participant@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Select Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.PARTICIPANT)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center ${
                      role === UserRole.PARTICIPANT
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Participant
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.ORGANIZER)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center ${
                      role === UserRole.ORGANIZER
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Organizer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.ADMIN)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center ${
                      role === UserRole.ADMIN
                        ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                        : 'border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In with Mock Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="glass-nav px-6 py-4 text-center text-xs text-slate-500 font-mono">
        CIT 9.0 Authentication Gateway • ISTE NIT Durgapur
      </footer>
    </div>
  );
}
