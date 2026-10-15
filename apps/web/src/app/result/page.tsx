'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import {
  getCurrentAttemptApi,
  checkMyQualificationApi,
  AttemptInfo,
} from '../../lib/api-client';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import {
  Trophy,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Award,
} from 'lucide-react';

export default function ResultPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [attempt, setAttempt] = useState<AttemptInfo | null>(null);
  const [qualData, setQualData] = useState<{
    isQualified: boolean;
    hasAttempt: boolean;
    status?: string;
    score?: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      Promise.all([
        getCurrentAttemptApi().catch(() => null),
        checkMyQualificationApi().catch(() => null),
      ])
        .then(([att, qual]) => {
          setAttempt(att);
          setQualData(qual || null);
        })
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-cit-dark flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const isQualified = qualData?.isQualified;
  const isSubmitted = attempt?.status === 'SUBMITTED' || attempt?.status === 'EXPIRED';

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-cit-dark">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full flex items-center justify-center">
        <div className="w-full">
          {/* Main Card */}
          <div className="glass-panel p-8 sm:p-12 rounded-3xl text-center relative overflow-hidden shadow-2xl border border-white/10">
            {/* Top Glow Ribbon */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 ${
                isQualified
                  ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500'
                  : 'bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500'
              }`}
            />

            {/* Status Icon */}
            <div className="inline-flex items-center justify-center mb-6">
              {isQualified ? (
                <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/20 animate-bounce">
                  <Trophy className="w-10 h-10" />
                </div>
              ) : isSubmitted ? (
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-xl shadow-cyan-500/20">
                  <Award className="w-10 h-10" />
                </div>
              )}
            </div>

            {/* Header Titles */}
            {isQualified ? (
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono mb-3 border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  QUALIFICATION ACCREDITED
                </div>
                <h1 className="font-orbitron text-3xl sm:text-5xl font-extrabold text-white tracking-wide">
                  CONGRATULATIONS!
                </h1>
                <p className="mt-4 text-base sm:text-lg text-slate-300 font-sans max-w-xl mx-auto leading-relaxed">
                  You have cleared the preliminary cutoff and officially qualified for the{' '}
                  <span className="text-amber-400 font-bold">CIT 9.0 Grand Finale</span>!
                </p>
              </div>
            ) : isSubmitted ? (
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono mb-3 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  SUBMISSION RECORDED
                </div>
                <h1 className="font-orbitron text-3xl sm:text-4xl font-extrabold text-white tracking-wide">
                  ASSESSMENT COMPLETED
                </h1>
                <p className="mt-4 text-sm sm:text-base text-slate-300 font-sans max-w-xl mx-auto leading-relaxed">
                  Your answers have been cryptographically sealed and evaluated in the audit ledger.
                </p>
              </div>
            ) : (
              <div>
                <h1 className="font-orbitron text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                  NO ACTIVE SUBMISSION FOUND
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  You have not submitted an assessment attempt yet.
                </p>
              </div>
            )}

            {/* Score / Cutoff Display Box */}
            <div className="mt-8 p-6 rounded-2xl bg-slate-900/60 border border-white/10 max-w-md mx-auto">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2">
                Preliminary Round Result
              </span>

              {attempt?.score !== undefined ? (
                <div>
                  <div className="font-orbitron text-4xl sm:text-5xl font-extrabold text-cyan-400 tracking-wider">
                    {attempt.score} <span className="text-sm text-slate-500 font-mono">PTS</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-2">
                    Score evaluated with standard (+4 / -1) negative marking scheme.
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  <span className="text-sm font-mono text-slate-300">
                    Scores will be published upon contest conclusion
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              <Link
                href="/leaderboard"
                className="px-8 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xl shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                View Live Leaderboard
              </Link>
              <Link
                href="/lobby"
                className="px-6 py-3.5 rounded-xl font-semibold text-sm glass-panel text-slate-200 hover:bg-slate-800/60 transition-all flex items-center gap-2"
              >
                Return to Lobby
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="glass-nav px-6 py-4 text-center text-xs text-slate-500 font-mono">
        CIT 9.0 Results & Qualification Engine • ISTE NIT Durgapur
      </footer>
    </div>
  );
}
