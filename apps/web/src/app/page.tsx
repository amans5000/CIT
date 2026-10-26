'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../lib/auth-context';
import { getActiveAssessmentApi, ActiveAssessmentInfo } from '../lib/api-client';
import {
  ShieldCheck,
  Cpu,
  Terminal,
  Trophy,
  Clock,
  ArrowRight,
  HelpCircle,
  Calendar,
  Zap,
} from 'lucide-react';

export default function HomePage(): JSX.Element {
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<ActiveAssessmentInfo | null>(null);

  useEffect(() => {
    getActiveAssessmentApi()
      .then((data) => setAssessment(data))
      .catch(() => {});
  }, []);

  const prelimRound = assessment?.rounds?.find((r) => r.roundType === 'PRELIMINARY') || assessment?.rounds?.[0];

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-cit-dark">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />

      {/* Shared Navigation Bar */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs font-mono text-pink-400 mb-6 border-pink-500/30">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          COGNITIVE INTELLIGENCE TEST • SEASON 9
        </div>

        <h1 className="font-orbitron text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1]">
          THE ULTIMATE TEST OF{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400">
            ENGINEERING INTELLECT
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl font-normal leading-relaxed">
          Competitively timed preliminary slots, negative marking, instant qualification cutoffs, and
          high-concurrency real-time rankings. Engineered for precision and security.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href={user ? '/lobby' : '/login'}
            className="px-8 py-3.5 rounded-xl text-base font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xl shadow-pink-600/30 hover:shadow-pink-600/60 hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            {user ? 'Enter Assessment Lobby' : 'Register / Sign In'}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="http://localhost:4000/api/v1/health/readiness"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3.5 rounded-xl text-base font-medium glass-panel text-slate-200 hover:bg-slate-800/50 transition-all flex items-center gap-2"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Verify System Status
          </a>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-20 w-full text-left">
          <div className="glass-panel p-6 rounded-2xl hover:border-pink-500/40 transition-all">
            <Clock className="w-8 h-8 text-pink-400 mb-4" />
            <h3 className="font-orbitron text-lg font-bold text-white">Timed Slots</h3>
            <p className="text-sm text-slate-400 mt-2">
              Server-authoritative synchronization with millisecond deadline enforcement and zero client tampering.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-purple-500/40 transition-all">
            <Cpu className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="font-orbitron text-lg font-bold text-white">Negative Marking</h3>
            <p className="text-sm text-slate-400 mt-2">
              Standard competitive scoring: +4 points for correct answers, -1 for wrong choices, and 0 for skips.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-cyan-500/40 transition-all">
            <Trophy className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="font-orbitron text-lg font-bold text-white">Redis Leaderboards</h3>
            <p className="text-sm text-slate-400 mt-2">
              Sub-millisecond sorted-set rankings with automated score-masking during active contest windows.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-emerald-500/40 transition-all">
            <Terminal className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="font-orbitron text-lg font-bold text-white">Audit Trails</h3>
            <p className="text-sm text-slate-400 mt-2">
              Immutable attempt history, atomic transactions, and tamper-resistant administrative logs.
            </p>
          </div>
        </div>

        {/* ABOUT SECTION (#about) */}
        <section id="about" className="w-full mt-32 text-left">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono mb-4 border border-cyan-500/20">
              <Zap className="w-3.5 h-3.5" />
              ABOUT CIT & ISTE
            </div>
            <h2 className="font-orbitron text-3xl sm:text-4xl font-extrabold text-white mb-6">
              LEGACY OF TECHNICAL EXCELLENCE
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-300 text-sm leading-relaxed font-sans">
              <div>
                <p className="mb-4">
                  The <span className="text-pink-400 font-semibold">Cognitive Intelligence Test (CIT)</span> is the flagship national-level technical assessment hosted annually by the Indian Society for Technical Education (ISTE) Students&apos; Chapter at National Institute of Technology Durgapur.
                </p>
                <p>
                  CIT evaluates thousands of aspiring engineers and developers across computational thinking, algorithmic intuition, discrete mathematics, system architecture, and spatial reasoning.
                </p>
              </div>
              <div>
                <p className="mb-4">
                  Participants who excel in the high-intensity Preliminary round earn qualification to the Grand Finale, competing live for institutional trophies, cash endowments, and industry recognition.
                </p>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 font-mono text-xs text-slate-400">
                  <span className="text-cyan-400 font-bold block mb-1">ISTE NIT Durgapur Chapter</span>
                  Pioneering student-led technical education, hackathons, and intellectual assessments since 2008.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RULES SECTION (#rules) */}
        <section id="rules" className="w-full mt-24 text-left">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-mono mb-4 border border-purple-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              REGULATIONS & SCORING
            </div>
            <h2 className="font-orbitron text-3xl sm:text-4xl font-extrabold text-white mb-6">
              CONTEST RULES & MARKING POLICY
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 font-mono">
              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                <span className="text-xs text-emerald-400 uppercase font-bold block mb-1">CORRECT ANSWER</span>
                <span className="font-orbitron text-3xl font-extrabold text-emerald-400">+4 MARKS</span>
                <p className="text-xs text-slate-400 mt-2 font-sans">Full credit awarded for selected correct option.</p>
              </div>

              <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30">
                <span className="text-xs text-rose-400 uppercase font-bold block mb-1">WRONG ANSWER</span>
                <span className="font-orbitron text-3xl font-extrabold text-rose-400">-1 MARK</span>
                <p className="text-xs text-slate-400 mt-2 font-sans">Negative marking deducted for incorrect selection.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/10">
                <span className="text-xs text-slate-400 uppercase font-bold block mb-1">UNATTEMPTED / SKIPPED</span>
                <span className="font-orbitron text-3xl font-extrabold text-slate-300">0 MARKS</span>
                <p className="text-xs text-slate-400 mt-2 font-sans">No points added or deducted for unattempted questions.</p>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-slate-300 list-disc list-inside font-sans">
              <li>Preliminary assessment duration is exactly 45 minutes with a 30-second server grace period.</li>
              <li>Each participant is permitted exactly one official slot attempt. Once submitted or expired, attempts cannot be re-taken.</li>
              <li>Answers are cryptographically evaluated on the server with atomicity. Option answer keys are never delivered to the client.</li>
              <li>Multi-tab activity and unauthorized device sharing will trigger automatic disqualification.</li>
            </ul>
          </div>
        </section>

        {/* SCHEDULE SECTION (#schedule) */}
        <section id="schedule" className="w-full mt-24 text-left">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-mono mb-2 border border-pink-500/20">
                  <Calendar className="w-3.5 h-3.5" />
                  SLOT CALENDAR
                </div>
                <h2 className="font-orbitron text-3xl sm:text-4xl font-extrabold text-white">
                  ASSESSMENT SCHEDULE
                </h2>
              </div>
              <Link
                href="/lobby"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg flex items-center gap-2 w-fit"
              >
                Register for Slot
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {prelimRound?.slots?.map((slot) => {
                const isNow =
                  new Date().getTime() >= new Date(slot.startTime).getTime() &&
                  new Date().getTime() <= new Date(slot.endTime).getTime();

                return (
                  <div
                    key={slot.id}
                    className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-pink-500/30 transition-all font-mono"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-orbitron font-bold text-white text-base">
                        Slot #{slot.slotNumber}
                      </span>
                      {isNow ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse font-bold">
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          SCHEDULED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 space-y-1.5 py-2 border-y border-white/5 font-sans">
                      <p>
                        <span className="text-slate-500 font-mono">Date: </span>
                        {new Date(slot.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p>
                        <span className="text-slate-500 font-mono">Window: </span>
                        {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                        {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQs SECTION (#faq) */}
        <section id="faq" className="w-full mt-24 text-left">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono mb-4 border border-cyan-500/20">
              <HelpCircle className="w-3.5 h-3.5" />
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 className="font-orbitron text-3xl sm:text-4xl font-extrabold text-white mb-8">
              COMMON QUESTIONS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5">
                <h3 className="font-semibold text-white text-base mb-2">Who is eligible to participate in CIT?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Students enrolled in any recognized school, college, or university across India may participate. Both undergraduate and postgraduate candidates are welcome.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5">
                <h3 className="font-semibold text-white text-base mb-2">Can I attempt the test in multiple slots?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No. Each registered participant is allocated exactly one slot to ensure fair competition. Attempting multiple slots will invalidate all submissions.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5">
                <h3 className="font-semibold text-white text-base mb-2">When will scores and qualifiers be revealed?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Live scores are masked during active slot windows. Once all preliminary slots conclude, the administrative team evaluates cutoffs and declares qualifiers.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5">
                <h3 className="font-semibold text-white text-base mb-2">What happens if my network disconnects?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your selected answers are saved continuously in real-time. You can reconnect and resume from where you left off before the slot deadline expires.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <div className="w-full mt-24 text-center">
          <div className="glass-panel p-10 sm:p-16 rounded-3xl relative overflow-hidden border-pink-500/30">
            <h2 className="font-orbitron text-3xl sm:text-5xl font-extrabold text-white mb-4">
              READY TO TEST YOUR LIMITS?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-sans mb-8">
              Join thousands of aspiring engineers in the Cognitive Intelligence Test.
            </p>
            <Link
              href={user ? '/lobby' : '/login'}
              className="px-10 py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xl shadow-pink-600/40 hover:scale-[1.03] transition-all inline-flex items-center gap-2"
            >
              {user ? 'Go to Assessment Arena' : 'Get Started with CIT'}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-nav px-6 py-6 border-t border-slate-800 text-center text-xs text-slate-500 font-mono">
        CIT © {new Date().getFullYear()} • Indian Society for Technical Education (ISTE) Students&apos; Chapter NIT Durgapur
      </footer>
    </div>
  );
}
