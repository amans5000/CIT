'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import {
  getActiveAssessmentApi,
  getAdminUsersApi,
  updateUserRoleApi,
  getAuditLogsApi,
  evaluateCutoffApi,
  getAdminQuestionsApi,
  createQuestionApi,
  ActiveAssessmentInfo,
} from '../../lib/api-client';
import Navbar from '../../components/Navbar';
import { UserRole } from '@cit9/types';
import {
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Plus,
  Activity,
  Layers,
  Award,
} from 'lucide-react';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'cutoff' | 'questions' | 'users' | 'audit'>('overview');

  const [assessment, setAssessment] = useState<ActiveAssessmentInfo | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // Cutoff state
  const [cutoffScore, setCutoffScore] = useState<number>(8);
  const [topN, setTopN] = useState<number | undefined>(undefined);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [cutoffSuccess, setCutoffSuccess] = useState<string | null>(null);

  // New question form state
  const [newOrderIndex, setNewOrderIndex] = useState<number>(4);
  const [newPrompt, setNewPrompt] = useState('');
  const [newOpt1, setNewOpt1] = useState('');
  const [newOpt2, setNewOpt2] = useState('');
  const [newOpt3, setNewOpt3] = useState('');
  const [newOpt4, setNewOpt4] = useState('');
  const [correctOptIndex, setCorrectOptIndex] = useState<number>(1);
  const [creatingQ, setCreatingQ] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Security guard: Must be ADMIN
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== UserRole.ADMIN) {
        router.push('/');
        return;
      }
    }
  }, [user, authLoading, router]);

  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    setErrorMsg(null);
    try {
      const ass = await getActiveAssessmentApi();
      setAssessment(ass);

      const roundId = ass?.rounds?.[0]?.id;
      const [uRes, logRes, qRes] = await Promise.all([
        getAdminUsersApi(1, 50).catch(() => ({ items: [] })),
        getAuditLogsApi(1, 50).catch(() => ({ items: [] })),
        roundId ? getAdminQuestionsApi(roundId).catch(() => []) : Promise.resolve([]),
      ]);

      setUsersList(uRes?.items || []);
      setAuditLogs(logRes?.items || []);
      setQuestions(qRes || []);
      if (qRes?.length) {
        setNewOrderIndex(qRes.length + 1);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch admin data');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      loadAllData();
    }
  }, [user, loadAllData]);

  const handleEvaluateCutoff = async (e: React.FormEvent) => {
    e.preventDefault();
    const roundId = assessment?.rounds?.[0]?.id;
    if (!roundId) return;

    setEvaluating(true);
    setCutoffSuccess(null);
    setErrorMsg(null);
    try {
      const res = await evaluateCutoffApi({
        roundId,
        cutoffScore: cutoffScore !== undefined ? Number(cutoffScore) : undefined,
        topN: topN !== undefined && topN > 0 ? Number(topN) : undefined,
      });
      setCutoffSuccess(
        `Cutoff evaluation successful! Qualified ${(res as any)?.promotedCount || 0} participants.`,
      );
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to evaluate cutoffs');
    } finally {
      setEvaluating(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await updateUserRoleApi(targetUserId, newRole);
      setStatusMsg('User role updated successfully');
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update role');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const roundId = assessment?.rounds?.[0]?.id;
    if (!roundId) return;

    setCreatingQ(true);
    setErrorMsg(null);
    try {
      await createQuestionApi({
        roundId,
        orderIndex: Number(newOrderIndex),
        promptText: newPrompt.trim(),
        options: [
          { optionIndex: 1, optionText: newOpt1.trim(), isCorrect: correctOptIndex === 1 },
          { optionIndex: 2, optionText: newOpt2.trim(), isCorrect: correctOptIndex === 2 },
          { optionIndex: 3, optionText: newOpt3.trim(), isCorrect: correctOptIndex === 3 },
          { optionIndex: 4, optionText: newOpt4.trim(), isCorrect: correctOptIndex === 4 },
        ],
      });
      setStatusMsg(`Question #${newOrderIndex} created successfully!`);
      setNewPrompt('');
      setNewOpt1('');
      setNewOpt2('');
      setNewOpt3('');
      setNewOpt4('');
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create question');
    } finally {
      setCreatingQ(false);
    }
  };

  if (authLoading || (loadingData && !assessment)) {
    return (
      <div className="min-h-screen bg-cit-dark flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const prelimRound = assessment?.rounds?.find((r) => r.roundType === 'PRELIMINARY') || assessment?.rounds?.[0];

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-cit-dark">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {/* Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-pink-500/30">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-mono mb-2 border border-pink-500/20">
              <Shield className="w-3.5 h-3.5" />
              SYSTEM ADMINISTRATION
            </div>
            <h1 className="font-orbitron text-2xl sm:text-3xl font-extrabold text-white">
              CIT 9.0 ADMIN CONTROL
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Audit trails, question authoring, participant accreditation & cutoff promotions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              API Online (v1)
            </span>
          </div>
        </div>

        {/* Global Notifications */}
        {statusMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'overview', label: 'Platform Overview', icon: Activity },
            { id: 'cutoff', label: 'Cutoff Evaluator', icon: Award },
            { id: 'questions', label: 'Question Bank', icon: HelpCircle },
            { id: 'users', label: 'Participant Management', icon: Users },
            { id: 'audit', label: 'Audit Trail Logs', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30'
                    : 'glass-panel text-slate-300 hover:text-white hover:border-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="glass-panel p-6 rounded-3xl">
                <span className="text-xs font-mono text-slate-400 block mb-1">CONTEST</span>
                <div className="font-orbitron text-xl font-bold text-white truncate">
                  {assessment?.title}
                </div>
                <span className="text-[11px] text-pink-400 font-mono mt-2 block">Status: Active</span>
              </div>

              <div className="glass-panel p-6 rounded-3xl">
                <span className="text-xs font-mono text-slate-400 block mb-1">REGISTERED USERS</span>
                <div className="font-orbitron text-3xl font-extrabold text-cyan-400">
                  {usersList.length}
                </div>
                <span className="text-[11px] text-slate-500 font-mono mt-2 block">Participants & Admins</span>
              </div>

              <div className="glass-panel p-6 rounded-3xl">
                <span className="text-xs font-mono text-slate-400 block mb-1">QUESTIONS IN ROUND</span>
                <div className="font-orbitron text-3xl font-extrabold text-purple-400">
                  {questions.length}
                </div>
                <span className="text-[11px] text-slate-500 font-mono mt-2 block">Authoritative Answer Keys</span>
              </div>

              <div className="glass-panel p-6 rounded-3xl">
                <span className="text-xs font-mono text-slate-400 block mb-1">ASSESSMENT SLOTS</span>
                <div className="font-orbitron text-3xl font-extrabold text-emerald-400">
                  {prelimRound?.slots?.length || 0}
                </div>
                <span className="text-[11px] text-slate-500 font-mono mt-2 block">Scheduled Time Windows</span>
              </div>
            </div>

            {/* Slots Overview Table */}
            <div className="glass-panel p-6 rounded-3xl">
              <h3 className="font-orbitron text-base font-bold text-white mb-4">
                CONFIGURED ROUND SLOTS
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-4">SLOT</th>
                      <th className="py-3 px-4">START TIME</th>
                      <th className="py-3 px-4">END TIME</th>
                      <th className="py-3 px-4">CAPACITY</th>
                      <th className="py-3 px-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {prelimRound?.slots?.map((slot) => {
                      const isNow =
                        new Date().getTime() >= new Date(slot.startTime).getTime() &&
                        new Date().getTime() <= new Date(slot.endTime).getTime();

                      return (
                        <tr key={slot.id}>
                          <td className="py-3 px-4 font-bold text-white">Slot #{slot.slotNumber}</td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(slot.startTime).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(slot.endTime).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-cyan-400">{slot.capacity}</td>
                          <td className="py-3 px-4">
                            {isNow ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                ACTIVE NOW
                              </span>
                            ) : new Date().getTime() < new Date(slot.startTime).getTime() ? (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                                UPCOMING
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                                EXPIRED
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUTOFF EVALUATOR */}
        {activeTab === 'cutoff' && (
          <div className="glass-panel p-8 rounded-3xl max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <Award className="w-6 h-6 text-pink-400" />
              <div>
                <h2 className="font-orbitron text-lg font-bold text-white">
                  AUTOMATED CUTOFF & PROMOTION ENGINE
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Evaluate participant preliminary attempts and promote qualifiers to Round 2 (Finals)
                </p>
              </div>
            </div>

            {cutoffSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{cutoffSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEvaluateCutoff} className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Minimum Qualification Score (Cutoff Threshold)
                </label>
                <input
                  type="number"
                  value={cutoffScore}
                  onChange={(e) => setCutoffScore(Number(e.target.value))}
                  placeholder="e.g. 8"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-pink-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  All participants with score &ge; this value will be marked as qualified for the Finals.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Top-N Qualifiers (Optional Cap)
                </label>
                <input
                  type="number"
                  value={topN || ''}
                  onChange={(e) => setTopN(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 50 (leave blank to qualify all meeting cutoff)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                disabled={evaluating}
                className="w-full py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xl shadow-pink-600/30 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {evaluating ? 'Evaluating Cutoffs...' : 'Execute Cutoff Promotion'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: QUESTIONS BANK */}
        {activeTab === 'questions' && (
          <div className="space-y-8">
            {/* Create New Question Form */}
            <div className="glass-panel p-8 rounded-3xl">
              <h3 className="font-orbitron text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Plus className="w-5 h-5 text-pink-400" />
                AUTHOR NEW QUESTION
              </h3>
              <p className="text-xs text-slate-400 mb-6 font-mono">
                Adds questions directly to Round 1 Preliminary Bank with tamper-proof answer key
              </p>

              <form onSubmit={handleCreateQuestion} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Order Sequence #
                    </label>
                    <input
                      type="number"
                      required
                      value={newOrderIndex}
                      onChange={(e) => setNewOrderIndex(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Question Prompt Text
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. What is the time complexity of QuickSelect average case?"
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Option A Text
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Option 1"
                      value={newOpt1}
                      onChange={(e) => setNewOpt1(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Option B Text
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Option 2"
                      value={newOpt2}
                      onChange={(e) => setNewOpt2(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Option C Text
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Option 3"
                      value={newOpt3}
                      onChange={(e) => setNewOpt3(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Option D Text
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Option 4"
                      value={newOpt4}
                      onChange={(e) => setNewOpt4(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Correct Option Key
                  </label>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4].map((optNum) => (
                      <label
                        key={optNum}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono cursor-pointer transition-all border ${
                          correctOptIndex === optNum
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                            : 'border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="correctKey"
                          checked={correctOptIndex === optNum}
                          onChange={() => setCorrectOptIndex(optNum)}
                          className="hidden"
                        />
                        <span>Option {['A', 'B', 'C', 'D'][optNum - 1]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingQ}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 hover:scale-[1.02] transition-all flex items-center gap-1.5 disabled:opacity-50 mt-4"
                >
                  <Plus className="w-4 h-4" />
                  {creatingQ ? 'Adding Question...' : 'Add Question to Bank'}
                </button>
              </form>
            </div>

            {/* List of Existing Questions */}
            <div className="glass-panel p-6 rounded-3xl">
              <h3 className="font-orbitron text-base font-bold text-white mb-4">
                EXISTING QUESTIONS IN ROUND ({questions.length})
              </h3>
              <div className="space-y-4">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-900/50 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-pink-400 font-bold">Question #{q.orderIndex}</span>
                      <span className="text-slate-500">{q.id}</span>
                    </div>
                    <p className="text-sm text-slate-200 font-sans">{q.promptText}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      {q.options?.map((opt: any) => (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-xl text-xs font-mono ${
                            opt.isCorrect
                              ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 font-bold'
                              : 'bg-slate-950/30 border border-white/5 text-slate-400'
                          }`}
                        >
                          {['A', 'B', 'C', 'D'][opt.optionIndex - 1]}: {opt.optionText}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="glass-panel p-6 rounded-3xl overflow-hidden">
            <h3 className="font-orbitron text-base font-bold text-white mb-4">
              USERS & ROLES REGISTRY
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 bg-slate-950/40">
                    <th className="py-3 px-4">EMAIL</th>
                    <th className="py-3 px-4">NAME / DISPLAY</th>
                    <th className="py-3 px-4">INSTITUTE</th>
                    <th className="py-3 px-4">CURRENT ROLE</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white">{u.email}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {u.profile?.fullName || u.profile?.displayName || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {u.profile?.instituteName || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            u.role === UserRole.ADMIN
                              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                              : 'bg-cyan-500/10 text-cyan-400'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.role === UserRole.ADMIN ? (
                          <button
                            onClick={() => handleRoleChange(u.id, UserRole.PARTICIPANT)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                          >
                            Demote to Participant
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(u.id, UserRole.ADMIN)}
                            className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/30 text-[10px] transition-colors"
                          >
                            Promote to Admin
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="glass-panel p-6 rounded-3xl overflow-hidden">
            <h3 className="font-orbitron text-base font-bold text-white mb-4">
              IMMUTABLE AUDIT TRAIL LOGS
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 bg-slate-950/40">
                    <th className="py-3 px-4">TIMESTAMP</th>
                    <th className="py-3 px-4">ACTION</th>
                    <th className="py-3 px-4">RESOURCE</th>
                    <th className="py-3 px-4">DETAILS</th>
                    <th className="py-3 px-4">IP / AGENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-pink-400">{log.action}</td>
                      <td className="py-3 px-4 text-slate-300">{log.resource}</td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="glass-nav px-6 py-4 text-center text-xs text-slate-500 font-mono">
        CIT 9.0 Administrative Console • Confidential System Access
      </footer>
    </div>
  );
}
