'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { ArrowRight, LogOut, Shield, Trophy, LayoutDashboard } from 'lucide-react';
import { UserRole } from '@cit9/types';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 glass-nav px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-700 flex items-center justify-center font-orbitron font-extrabold text-white text-lg shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/40 transition-all">
            CIT
          </div>
          <div>
            <span className="font-orbitron font-bold tracking-wider text-lg text-white block group-hover:text-pink-400 transition-colors">
              CIT
            </span>
            <span className="text-xs text-slate-400 font-mono">ISTE NIT DURGAPUR</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300 font-medium">
          <Link href="/#about" className="hover:text-pink-400 transition-colors">
            About
          </Link>
          <Link href="/#rules" className="hover:text-pink-400 transition-colors">
            Rules
          </Link>
          <Link href="/#schedule" className="hover:text-pink-400 transition-colors">
            Schedule
          </Link>
          <Link href="/leaderboard" className="hover:text-pink-400 transition-colors flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            Leaderboard
          </Link>
          {user && (
            <Link href="/lobby" className="hover:text-pink-400 transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
              Lobby
            </Link>
          )}
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.ORGANIZER) && (
            <Link href="/admin" className="text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1 font-semibold">
              <Shield className="w-4 h-4" />
              {user.role === UserRole.ADMIN ? 'Admin' : 'Staff'}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel hover:border-pink-500/40 transition-all text-xs font-medium text-slate-200"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.profile?.displayName ? user.profile.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline font-mono">
                  {user.profile?.displayName || user.email.split('@')[0]}
                </span>
                {user.role === UserRole.ADMIN && (
                  <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 text-[10px] font-mono">
                    ADMIN
                  </span>
                )}
                {user.role === UserRole.ORGANIZER && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-mono">
                    ORGANIZER
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-[1.02] transition-all flex items-center gap-1.5"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
