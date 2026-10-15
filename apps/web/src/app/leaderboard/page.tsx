'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../lib/auth-context';
import {
  getActiveAssessmentApi,
  getSlotLeaderboardApi,
  getFinalsLeaderboardApi,
  ActiveAssessmentInfo,
  LeaderboardEntry,
} from '../../lib/api-client';
import { Trophy, Search, Shield, Users, AlertCircle } from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuth();

  const [assessment, setAssessment] = useState<ActiveAssessmentInfo | null>(null);
  const [activeTab, setActiveTab] = useState<string>('slot-1');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isMasked, setIsMasked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch active assessment to populate slot tabs
  useEffect(() => {
    getActiveAssessmentApi()
      .then((data) => {
        setAssessment(data);
        const firstSlot = data?.rounds?.find((r) => r.roundType === 'PRELIMINARY')?.slots?.[0];
        if (firstSlot) {
          setSelectedSlotId(firstSlot.id);
          setActiveTab(`slot-${firstSlot.slotNumber}`);
        }
      })
      .catch((err) => {
        setErrorMsg(err?.message || 'Failed to fetch assessment');
      });
  }, []);

  // 2. Fetch Leaderboard whenever selectedSlotId or activeTab changes
  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'finals') {
        const res = await getFinalsLeaderboardApi(1, 100);
        setLeaderboard(res?.items || []);
        setIsMasked(false);
      } else if (selectedSlotId) {
        const res = await getSlotLeaderboardApi(selectedSlotId, 1, 100);
        setLeaderboard(res?.items || []);
        setIsMasked(Boolean(res?.isMasked));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch leaderboard data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedSlotId]);

  useEffect(() => {
    if (selectedSlotId || activeTab === 'finals') {
      fetchRankings();
    }
  }, [selectedSlotId, activeTab, fetchRankings]);

  const prelimRound = assessment?.rounds?.find((r) => r.roundType === 'PRELIMINARY');

  const filteredLeaderboard = leaderboard.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.displayName.toLowerCase().includes(q) ||
      entry.instituteName.toLowerCase().includes(q)
    );
  });

  const top3 = filteredLeaderboard.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-cit-dark">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono mb-3 border border-amber-500/20">
            <Trophy className="w-3.5 h-3.5" />
            HALL OF FAME & RANKINGS
          </div>
          <h1 className="font-orbitron text-3xl sm:text-5xl font-extrabold text-white tracking-wide">
            CIT 9.0 LEADERBOARD
          </h1>
          <p className="mt-3 text-sm text-slate-400 font-sans max-w-xl mx-auto">
            High-concurrency Redis sorted-set rankings. Tied scores are sub-ranked by faster completion time.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {prelimRound?.slots?.map((slot) => (
            <button
              key={slot.id}
              onClick={() => {
                setActiveTab(`slot-${slot.slotNumber}`);
                setSelectedSlotId(slot.id);
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                activeTab === `slot-${slot.slotNumber}`
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30'
                  : 'glass-panel text-slate-300 hover:text-white hover:border-white/20'
              }`}
            >
              Slot #{slot.slotNumber}
            </button>
          ))}
          <button
            onClick={() => {
              setActiveTab('finals');
              setSelectedSlotId(null);
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all ${
              activeTab === 'finals'
                ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white shadow-lg shadow-amber-500/30'
                : 'glass-panel text-slate-300 hover:text-white hover:border-white/20'
            }`}
          >
            Grand Finals
          </button>
        </div>

        {/* Masked Alert Banner */}
        {isMasked && (
          <div className="mb-8 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-xs font-mono flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 flex-shrink-0 text-cyan-400" />
              <span>
                Active Contest Window: Individual scores are currently masked to preserve competitive integrity.
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] uppercase font-bold">
              Protected
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Podium Display (Top 3) */}
        {!loading && top3.length >= 3 && top3[0] && top3[1] && top3[2] && !searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
            {/* Rank 2 - Silver */}
            <div className="glass-panel p-6 rounded-3xl border-slate-400/30 text-center order-2 md:order-1 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-slate-300/20 border border-slate-300/40 text-slate-200 flex items-center justify-center mx-auto mb-3 font-orbitron font-bold">
                2
              </div>
              <h3 className="font-orbitron font-bold text-white text-base truncate">
                {top3[1]?.displayName}
              </h3>
              <p className="text-xs text-slate-400 truncate mt-1">{top3[1]?.instituteName}</p>
              <div className="mt-3 font-orbitron text-lg font-bold text-slate-300">
                {top3[1]?.score !== null && top3[1]?.score !== undefined ? `${top3[1]?.score} PTS` : 'Masked'}
              </div>
            </div>

            {/* Rank 1 - Gold (Elevated) */}
            <div className="glass-panel p-8 rounded-3xl border-amber-400/40 text-center order-1 md:order-2 relative overflow-hidden shadow-2xl shadow-amber-500/10 -translate-y-2">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center mx-auto mb-4 font-orbitron font-extrabold text-2xl shadow-lg shadow-amber-500/30">
                1
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold mb-2">
                <Trophy className="w-3.5 h-3.5" />
                POLE POSITION
              </div>
              <h3 className="font-orbitron font-extrabold text-white text-xl truncate">
                {top3[0]?.displayName}
              </h3>
              <p className="text-xs text-slate-400 truncate mt-1">{top3[0]?.instituteName}</p>
              <div className="mt-4 font-orbitron text-2xl font-extrabold text-amber-400">
                {top3[0]?.score !== null && top3[0]?.score !== undefined ? `${top3[0]?.score} PTS` : 'Masked'}
              </div>
            </div>

            {/* Rank 3 - Bronze */}
            <div className="glass-panel p-6 rounded-3xl border-amber-700/30 text-center order-3 md:order-3 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-amber-700/20 border border-amber-700/40 text-amber-600 flex items-center justify-center mx-auto mb-3 font-orbitron font-bold">
                3
              </div>
              <h3 className="font-orbitron font-bold text-white text-base truncate">
                {top3[2]?.displayName}
              </h3>
              <p className="text-xs text-slate-400 truncate mt-1">{top3[2]?.instituteName}</p>
              <div className="mt-3 font-orbitron text-lg font-bold text-amber-600">
                {top3[2]?.score !== null && top3[2]?.score !== undefined ? `${top3[2]?.score} PTS` : 'Masked'}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar & Stats Header */}
        <div className="glass-panel p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by participant or college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <div className="text-xs font-mono text-slate-400 flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-pink-400" />
              {filteredLeaderboard.length} Participants Listed
            </span>
          </div>
        </div>

        {/* Rankings Table */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-4" />
              <p className="text-xs font-mono text-slate-400">Loading live rankings...</p>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm font-sans">
              No submissions recorded yet for this round.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/40 font-mono text-xs text-slate-400">
                    <th className="py-4 px-6 w-20 text-center">RANK</th>
                    <th className="py-4 px-6">PARTICIPANT</th>
                    <th className="py-4 px-6">INSTITUTE</th>
                    <th className="py-4 px-6 text-right">SCORE</th>
                    <th className="py-4 px-6 text-right">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-sans">
                  {filteredLeaderboard.map((item) => {
                    const isCurrentUser =
                      user?.profile?.displayName === item.displayName ||
                      user?.email.split('@')[0] === item.displayName;

                    return (
                      <tr
                        key={item.rank}
                        className={`transition-colors ${
                          isCurrentUser
                            ? 'bg-pink-950/30 hover:bg-pink-900/30 border-l-4 border-pink-500'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-orbitron font-bold text-xs ${
                              item.rank === 1
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : item.rank === 2
                                ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                                : item.rank === 3
                                ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                                : 'text-slate-400 font-mono'
                            }`}
                          >
                            {item.rank}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold font-mono">
                              {item.displayName[0]?.toUpperCase() || 'P'}
                            </div>
                            <div>
                              <span className="font-semibold text-white block">
                                {item.displayName}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[10px] text-pink-400 font-mono">
                                  (Your Submission)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-300 text-xs">
                          {item.instituteName || '—'}
                        </td>

                        <td className="py-4 px-6 text-right">
                          {item.score !== null && item.score !== undefined ? (
                            <span className="font-orbitron font-bold text-cyan-400 text-base">
                              {item.score}
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-slate-500 italic">
                              Masked
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right text-xs font-mono text-slate-400">
                          {item.submittedAt
                            ? new Date(item.submittedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="glass-nav px-6 py-4 text-center text-xs text-slate-500 font-mono">
        CIT 9.0 Official Leaderboard • ISTE NIT Durgapur
      </footer>
    </div>
  );
}
