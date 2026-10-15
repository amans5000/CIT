'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import {
  getActiveAssessmentApi,
  getCurrentAttemptApi,
  selectSlotApi,
  startAttemptApi,
  ActiveAssessmentInfo,
  AttemptInfo,
  SlotInfo,
} from '../../lib/api-client';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Award,
} from 'lucide-react';

export default function LobbyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [assessment, setAssessment] = useState<ActiveAssessmentInfo | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<AttemptInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingSlotId, setSelectingSlotId] = useState<string | null>(null);
  const [startingAttempt, setStartingAttempt] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);

  // Time ticker for countdown
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [assData, attemptData] = await Promise.all([
        getActiveAssessmentApi(),
        getCurrentAttemptApi().catch(() => null),
      ]);
      setAssessment(assData);
      setCurrentAttempt(attemptData);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load assessment details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  const handleSelectSlot = async (slotId: string) => {
    setSelectingSlotId(slotId);
    setErrorMsg(null);
    try {
      const updated = await selectSlotApi(slotId);
      if (updated) {
        setCurrentAttempt(updated);
      }
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to register for slot. Please try again.');
    } finally {
      setSelectingSlotId(null);
    }
  };

  const handleStartArena = async (roundId: string) => {
    if (!rulesAccepted && currentAttempt?.status === 'NOT_STARTED') {
      setErrorMsg('Please read and accept the assessment regulations and honor code before entering.');
      return;
    }
    setStartingAttempt(true);
    setErrorMsg(null);
    try {
      await startAttemptApi(roundId);
      router.push('/arena');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to enter arena. Ensure your slot is currently active.');
      setStartingAttempt(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-cit-dark flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const prelimRound = assessment?.rounds?.find((r) => r.roundType === 'PRELIMINARY') || assessment?.rounds?.[0];
  const userSlot = prelimRound?.slots?.find((s) => s.id === currentAttempt?.slotId);

  // Helper to format countdown
  const getSlotCountdown = (targetDateStr: string) => {
    const diff = new Date(targetDateStr).getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return `${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const isSlotActive = (slot: SlotInfo) => {
    const start = new Date(slot.startTime).getTime();
    const end = new Date(slot.endTime).getTime();
    const curr = now.getTime();
    return curr >= start && curr <= end;
  };

  const isSlotPast = (slot: SlotInfo) => {
    return now.getTime() > new Date(slot.endTime).getTime();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-cit-dark">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        {/* Profile Completion Warning */}
        {user && !user.profile?.isCompleted && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-200">Participant Profile Incomplete</p>
                <p className="text-xs text-amber-300/80">
                  You must complete your profile credentials before final round evaluation.
                </p>
              </div>
            </div>
            <Link
              href="/profile"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap"
            >
              Complete Now
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Assessment Hero Header */}
        <div className="glass-panel p-8 rounded-3xl mb-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono mb-3 border border-cyan-500/20">
                <Zap className="w-3.5 h-3.5" />
                ACTIVE COMPETITION ARENA
              </div>
              <h1 className="font-orbitron text-2xl sm:text-4xl font-extrabold text-white">
                {assessment?.title || 'Cognitive Intelligence Test 9.0'}
              </h1>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
                {assessment?.description ||
                  'National level engineering aptitude and computational reasoning contest organized by ISTE NIT Durgapur.'}
              </p>
            </div>

            {prelimRound && (
              <div className="flex flex-wrap md:flex-col gap-3 font-mono text-xs">
                <div className="px-3.5 py-2 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-pink-400" />
                  <span className="text-slate-300">Duration:</span>
                  <span className="text-white font-bold">{prelimRound.durationMinutes} Minutes</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Marking:</span>
                  <span className="text-emerald-400 font-bold">+{prelimRound.positiveScore}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-rose-400 font-bold">-{prelimRound.negativeScore}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* State Banner: If attempt is active / submitted */}
        {currentAttempt && (
          <div className="glass-panel p-6 rounded-3xl mb-10 border-pink-500/30 glow-magenta">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-pink-400 uppercase tracking-wider font-semibold">
                    Current Registration Status
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                      currentAttempt.status === 'IN_PROGRESS'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                        : currentAttempt.status === 'SUBMITTED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    }`}
                  >
                    {currentAttempt.status}
                  </span>
                </div>
                <h3 className="font-orbitron text-lg font-bold text-white mt-1">
                  Registered for Slot #{userSlot?.slotNumber || 1}
                </h3>
                {userSlot && (
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Window: {new Date(userSlot.startTime).toLocaleString()} —{' '}
                    {new Date(userSlot.endTime).toLocaleTimeString()}
                  </p>
                )}
              </div>

              <div>
                {currentAttempt.status === 'SUBMITTED' || currentAttempt.status === 'EXPIRED' ? (
                  <Link
                    href="/result"
                    className="px-6 py-3 rounded-xl font-semibold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2"
                  >
                    View Submission & Results
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : userSlot && isSlotActive(userSlot) ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => handleStartArena(prelimRound?.id || '')}
                      disabled={startingAttempt}
                      className="px-6 py-3 rounded-xl font-semibold text-xs uppercase tracking-wider bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/40 hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {currentAttempt.status === 'IN_PROGRESS' ? 'Resume Arena' : 'Enter Assessment Arena'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : userSlot && !isSlotPast(userSlot) ? (
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-mono block">Slot Opens In:</span>
                    <span className="font-orbitron text-lg font-bold text-cyan-400">
                      {getSlotCountdown(userSlot.startTime)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-rose-400 font-mono">Slot Window Closed</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Slot Selection Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-orbitron text-xl font-bold text-white tracking-wide">
                SELECT ASSESSMENT SLOT
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose your preferred examination window. Strict server deadline enforcement applies.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400">
              {prelimRound?.slots?.length || 0} Slots Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {prelimRound?.slots?.map((slot) => {
              const active = isSlotActive(slot);
              const past = isSlotPast(slot);
              const isSelected = currentAttempt?.slotId === slot.id;
              const countdown = getSlotCountdown(slot.startTime);

              return (
                <div
                  key={slot.id}
                  className={`glass-panel p-6 rounded-3xl transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-pink-500 shadow-lg shadow-pink-500/10'
                      : active
                      ? 'border-cyan-500/40 hover:border-cyan-400'
                      : 'hover:border-white/20'
                  }`}
                >
                  {/* Top Slot Header */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center font-orbitron font-bold text-white text-sm">
                          {slot.slotNumber}
                        </div>
                        <span className="font-orbitron font-bold text-white text-sm">
                          Slot {slot.slotNumber}
                        </span>
                      </div>

                      {isSelected ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-pink-500/20 text-pink-400 border border-pink-500/30 font-semibold">
                          SELECTED
                        </span>
                      ) : active ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          LIVE NOW
                        </span>
                      ) : past ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-slate-800 text-slate-500 border border-slate-700">
                          CLOSED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          UPCOMING
                        </span>
                      )}
                    </div>

                    {/* Timings */}
                    <div className="space-y-2 py-3 border-y border-white/5 font-mono text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Starts:</span>
                        <span>{new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Ends:</span>
                        <span>{new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Date:</span>
                        <span>{new Date(slot.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Countdown / Live Indicator */}
                    <div className="my-4 text-center">
                      {active ? (
                        <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 font-mono text-xs">
                          Active Contest Window Open
                        </div>
                      ) : countdown ? (
                        <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 font-mono text-xs">
                          Opens in {countdown}
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 font-mono text-xs">
                          Slot Expired
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4">
                    {isSelected ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl text-xs font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center justify-center gap-1.5 cursor-default"
                      >
                        <CheckCircle2 className="w-4 h-4 text-pink-400" />
                        Selected Slot
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectSlot(slot.id)}
                        disabled={past || selectingSlotId === slot.id || currentAttempt?.status === 'SUBMITTED'}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {selectingSlotId === slot.id ? 'Registering...' : past ? 'Closed' : 'Select Slot'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pre-Test Rules & Honor Code Checklist (luck.html) */}
        {currentAttempt && currentAttempt.status === 'NOT_STARTED' && userSlot && isSlotActive(userSlot) && (
          <div className="glass-panel p-8 rounded-3xl border-cyan-500/30 mb-12">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              <h3 className="font-orbitron text-lg font-bold text-white">
                EXAMINATION HONOR CODE & REGULATIONS
              </h3>
            </div>
            <ul className="text-sm text-slate-300 space-y-2.5 mb-6 list-disc list-inside">
              <li>Scoring scheme: +4 marks for correct, -1 mark for incorrect, 0 for unattempted.</li>
              <li>You may navigate between questions at any time before final submission.</li>
              <li>Timer is synchronized with the server; exam auto-submits when time expires.</li>
              <li>Tab-switching and unauthorized multi-session usage are audited and strictly penalized.</li>
            </ul>

            <label className="flex items-center gap-3 cursor-pointer select-none mb-6 p-3 rounded-xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 focus:ring-offset-0 bg-slate-800 border-white/20"
              />
              <span className="text-xs text-slate-200">
                I have read, understood, and agreed to abide by the official CIT 9.0 examination rules.
              </span>
            </label>

            <button
              onClick={() => handleStartArena(prelimRound?.id || '')}
              disabled={!rulesAccepted || startingAttempt}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xl shadow-pink-600/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {startingAttempt ? 'Launching Arena...' : 'Begin Assessment Now'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>

      <footer className="glass-nav px-6 py-4 text-center text-xs text-slate-500 font-mono">
        CIT 9.0 Assessment Portal • ISTE NIT Durgapur
      </footer>
    </div>
  );
}
