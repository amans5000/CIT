'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import {
  getActiveAssessmentApi,
  getAdminUsersApi,
  updateUserRoleApi,
  updateAttemptStatusApi,
  getAuditLogsApi,
  evaluateCutoffApi,
  getAdminQuestionsApi,
  createQuestionApi,
  updateQuestionApi,
  deleteQuestionApi,
  createSlotApi,
  updateSlotApi,
  deleteSlotApi,
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
  Calendar,
  Edit2,
  Trash2,
  Search,
  RotateCcw,
  Ban,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'slots' | 'questions' | 'users' | 'cutoff' | 'audit'>('overview');

  const [assessment, setAssessment] = useState<ActiveAssessmentInfo | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // Search & Filters for Students
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');

  // Slot Form States (Create & Edit)
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotNumber, setSlotNumber] = useState<number>(1);
  const [slotStart, setSlotStart] = useState<string>('');
  const [slotEnd, setSlotEnd] = useState<string>('');
  const [slotCapacity, setSlotCapacity] = useState<number>(1000);
  const [savingSlot, setSavingSlot] = useState(false);

  // Question Form States (Create & Edit)
  const [newOrderIndex, setNewOrderIndex] = useState<number>(1);
  const [newPrompt, setNewPrompt] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newOpt1, setNewOpt1] = useState('');
  const [newOpt2, setNewOpt2] = useState('');
  const [newOpt3, setNewOpt3] = useState('');
  const [newOpt4, setNewOpt4] = useState('');
  const [correctOptIndex, setCorrectOptIndex] = useState<number>(1);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Editing existing question
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

  // Cutoff state
  const [cutoffScore, setCutoffScore] = useState<number>(8);
  const [topN, setTopN] = useState<number | undefined>(undefined);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [cutoffSuccess, setCutoffSuccess] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const isStaff = user?.role === UserRole.ADMIN || user?.role === UserRole.ORGANIZER;
  const isSuperAdmin = user?.role === UserRole.ADMIN;

  // Security guard: Must be ADMIN or ORGANIZER
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!isStaff) {
        router.push('/');
        return;
      }
    }
  }, [user, authLoading, isStaff, router]);

  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    setErrorMsg(null);
    try {
      const ass = await getActiveAssessmentApi();
      setAssessment(ass);

      const roundId = ass?.rounds?.[0]?.id;
      const [uRes, logRes, qRes] = await Promise.all([
        getAdminUsersApi(1, 100, userSearch, userRoleFilter).catch(() => ({ items: [] })),
        isSuperAdmin ? getAuditLogsApi(1, 50).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
        roundId ? getAdminQuestionsApi(roundId).catch(() => []) : Promise.resolve([]),
      ]);

      setUsersList(uRes?.items || []);
      setAuditLogs(logRes?.items || []);
      setQuestions(qRes || []);
      if (qRes?.length) {
        setNewOrderIndex(qRes.length + 1);
      }
      if (ass?.rounds?.[0]?.slots?.length) {
        setSlotNumber(ass.rounds[0].slots.length + 1);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch admin data');
    } finally {
      setLoadingData(false);
    }
  }, [userSearch, userRoleFilter, isSuperAdmin]);

  useEffect(() => {
    if (isStaff) {
      loadAllData();
    }
  }, [isStaff, loadAllData]);

  // Format Date for datetime-local input
  const toLocalInputFormat = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // ---------------------------------------------------------------------------
  // SLOTS MANAGEMENT
  // ---------------------------------------------------------------------------

  const openNewSlotModal = () => {
    setEditingSlotId(null);
    const nextSlotNum = (assessment?.rounds?.[0]?.slots?.length || 0) + 1;
    setSlotNumber(nextSlotNum);
    const now = new Date();
    const start = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins from now
    const end = new Date(start.getTime() + 45 * 60 * 1000); // 45 mins test
    setSlotStart(toLocalInputFormat(start.toISOString()));
    setSlotEnd(toLocalInputFormat(end.toISOString()));
    setSlotCapacity(1000);
    setShowSlotModal(true);
  };

  const openEditSlotModal = (slot: any) => {
    setEditingSlotId(slot.id);
    setSlotNumber(slot.slotNumber);
    setSlotStart(toLocalInputFormat(slot.startTime));
    setSlotEnd(toLocalInputFormat(slot.endTime));
    setSlotCapacity(slot.capacity || 1000);
    setShowSlotModal(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const roundId = assessment?.rounds?.[0]?.id;
    if (!roundId) return;

    setSavingSlot(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const startUtc = new Date(slotStart).toISOString();
      const endUtc = new Date(slotEnd).toISOString();

      if (new Date(endUtc) <= new Date(startUtc)) {
        setErrorMsg('Slot end time must be after start time.');
        setSavingSlot(false);
        return;
      }

      if (editingSlotId) {
        await updateSlotApi(editingSlotId, {
          slotNumber: Number(slotNumber),
          startTime: startUtc,
          endTime: endUtc,
          capacity: Number(slotCapacity),
        });
        setStatusMsg(`Slot #${slotNumber} updated successfully!`);
      } else {
        await createSlotApi(roundId, {
          slotNumber: Number(slotNumber),
          startTime: startUtc,
          endTime: endUtc,
          capacity: Number(slotCapacity),
        });
        setStatusMsg(`Slot #${slotNumber} created successfully!`);
      }
      setShowSlotModal(false);
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save slot');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string, slotNum: number) => {
    if (!window.confirm(`Are you sure you want to delete Slot #${slotNum}? This action cannot be undone.`)) {
      return;
    }
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await deleteSlotApi(slotId);
      setStatusMsg(`Slot #${slotNum} deleted successfully.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete slot. Slots with registered attempts cannot be removed.');
    }
  };

  // ---------------------------------------------------------------------------
  // QUESTIONS MANAGEMENT
  // ---------------------------------------------------------------------------

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const roundId = assessment?.rounds?.[0]?.id;
    if (!roundId) return;

    setSavingQuestion(true);
    setErrorMsg(null);
    try {
      await createQuestionApi({
        roundId,
        orderIndex: Number(newOrderIndex),
        promptText: newPrompt.trim(),
        imageUrl: newImageUrl.trim() || undefined,
        options: [
          { optionIndex: 1, optionText: newOpt1.trim(), isCorrect: correctOptIndex === 1 },
          { optionIndex: 2, optionText: newOpt2.trim(), isCorrect: correctOptIndex === 2 },
          { optionIndex: 3, optionText: newOpt3.trim(), isCorrect: correctOptIndex === 3 },
          { optionIndex: 4, optionText: newOpt4.trim(), isCorrect: correctOptIndex === 4 },
        ],
      });
      setStatusMsg(`Question #${newOrderIndex} created successfully!`);
      setNewPrompt('');
      setNewImageUrl('');
      setNewOpt1('');
      setNewOpt2('');
      setNewOpt3('');
      setNewOpt4('');
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create question');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleSaveEditedQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setSavingQuestion(true);
    setErrorMsg(null);
    try {
      await updateQuestionApi(editingQuestion.id, {
        orderIndex: Number(editingQuestion.orderIndex),
        promptText: editingQuestion.promptText.trim(),
        imageUrl: editingQuestion.imageUrl?.trim() || undefined,
        options: editingQuestion.options.map((opt: any) => ({
          optionIndex: opt.optionIndex,
          optionText: opt.optionText.trim(),
          isCorrect: opt.isCorrect,
        })),
      });
      setStatusMsg(`Question #${editingQuestion.orderIndex} updated successfully!`);
      setEditingQuestion(null);
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update question');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string, orderIndex: number) => {
    if (!window.confirm(`Are you sure you want to delete Question #${orderIndex}?`)) {
      return;
    }
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await deleteQuestionApi(questionId);
      setStatusMsg(`Question #${orderIndex} deleted successfully.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete question');
    }
  };

  // ---------------------------------------------------------------------------
  // STUDENT & ROLE MANAGEMENT
  // ---------------------------------------------------------------------------

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await updateUserRoleApi(targetUserId, newRole);
      setStatusMsg(`User role updated to ${newRole}`);
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update user role');
    }
  };

  const handleAttemptStatusChange = async (attemptId: string, status: string, studentEmail: string) => {
    if (!window.confirm(`Change exam attempt status for ${studentEmail} to ${status}?`)) {
      return;
    }
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await updateAttemptStatusApi(attemptId, status);
      setStatusMsg(`Attempt status updated to ${status} for ${studentEmail}`);
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update attempt status');
    }
  };

  // ---------------------------------------------------------------------------
  // CUTOFF EVALUATION
  // ---------------------------------------------------------------------------

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
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-mono mb-2 border border-pink-500/20">
              <Shield className="w-3.5 h-3.5" />
              {isSuperAdmin ? 'SUPER ADMINISTRATOR CONSOLE' : 'STAFF / ORGANIZER PORTAL'}
            </div>
            <h1 className="font-orbitron text-2xl sm:text-3xl font-extrabold text-white">
              CIT MANAGEMENT SUITE
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Role-governed controls for Test Slots, Students / Candidates, and Exam Questions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              isSuperAdmin ? 'bg-pink-950/40 border-pink-500/30 text-pink-300' : 'bg-purple-950/40 border-purple-500/30 text-purple-300'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              Role: {user?.role}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              API v1 Live
            </span>
          </div>
        </div>

        {/* Global Notifications */}
        {statusMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{statusMsg}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          {[
            { id: 'overview', label: 'Platform Overview', icon: Activity },
            { id: 'slots', label: 'Test Slots Manager', icon: Calendar },
            { id: 'questions', label: 'Exam Questions Bank', icon: HelpCircle },
            { id: 'users', label: 'Students & Roles', icon: Users },
            ...(isSuperAdmin ? [
              { id: 'cutoff', label: 'Cutoff Evaluator', icon: Award },
              { id: 'audit', label: 'Audit Trail Logs', icon: Layers },
            ] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
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

        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW                                                   */}
        {/* ================================================================= */}
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

              <div className="glass-panel p-6 rounded-3xl cursor-pointer hover:border-cyan-500/40 transition-colors" onClick={() => setActiveTab('users')}>
                <span className="text-xs font-mono text-slate-400 block mb-1">REGISTERED USERS</span>
                <div className="font-orbitron text-3xl font-extrabold text-cyan-400">
                  {usersList.length}
                </div>
                <span className="text-[11px] text-slate-500 font-mono mt-2 block">Manage Candidates &rarr;</span>
              </div>

              <div className="glass-panel p-6 rounded-3xl cursor-pointer hover:border-purple-500/40 transition-colors" onClick={() => setActiveTab('questions')}>
                <span className="text-xs font-mono text-slate-400 block mb-1">QUESTIONS IN ROUND</span>
                <div className="font-orbitron text-3xl font-extrabold text-purple-400">
                  {questions.length}
                </div>
                <span className="text-[11px] text-slate-500 font-mono mt-2 block">Question Bank &rarr;</span>
              </div>

              <div className="glass-panel p-6 rounded-3xl cursor-pointer hover:border-emerald-500/40 transition-colors" onClick={() => setActiveTab('slots')}>
                <span className="text-xs font-mono text-slate-400 block mb-1">TEST SLOTS</span>
                <div className="font-orbitron text-3xl font-extrabold text-emerald-400">
                  {prelimRound?.slots?.length || 0}
                </div>
                <span className="text-[11px] text-slate-500 font-mono mt-2 block">Schedule Manager &rarr;</span>
              </div>
            </div>

            {/* Quick Slots Summary */}
            <div className="glass-panel p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-orbitron text-base font-bold text-white">
                  CONFIGURED TEST SLOTS SUMMARY
                </h3>
                <button
                  onClick={() => setActiveTab('slots')}
                  className="text-xs font-mono text-pink-400 hover:text-pink-300 flex items-center gap-1"
                >
                  Manage All Slots &rarr;
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-4">SLOT</th>
                      <th className="py-3 px-4">START TIME (IST)</th>
                      <th className="py-3 px-4">END TIME (IST)</th>
                      <th className="py-3 px-4">CAPACITY</th>
                      <th className="py-3 px-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {prelimRound?.slots?.map((slot) => {
                      const nowTime = new Date().getTime();
                      const isNow = nowTime >= new Date(slot.startTime).getTime() && nowTime <= new Date(slot.endTime).getTime();
                      const isUpcoming = nowTime < new Date(slot.startTime).getTime();

                      return (
                        <tr key={slot.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-bold text-white">Slot #{slot.slotNumber}</td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(slot.startTime).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(slot.endTime).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-cyan-400">{slot.capacity} seats</td>
                          <td className="py-3 px-4">
                            {isNow ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                LIVE NOW
                              </span>
                            ) : isUpcoming ? (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                UPCOMING
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                                CONCLUDED
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

        {/* ================================================================= */}
        {/* TAB 2: TEST SLOTS MANAGER                                         */}
        {/* ================================================================= */}
        {activeTab === 'slots' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-orbitron text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  TEST SLOTS SCHEDULE MANAGER
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Configure test windows, adjust start/end times, and regulate seat capacities
                </p>
              </div>

              <button
                onClick={openNewSlotModal}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-600/30 hover:scale-[1.02] transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Schedule New Slot
              </button>
            </div>

            {/* Slots Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {prelimRound?.slots?.map((slot) => {
                const nowTime = new Date().getTime();
                const isNow = nowTime >= new Date(slot.startTime).getTime() && nowTime <= new Date(slot.endTime).getTime();
                const isUpcoming = nowTime < new Date(slot.startTime).getTime();

                return (
                  <div
                    key={slot.id}
                    className={`glass-panel p-6 rounded-3xl relative flex flex-col justify-between transition-all ${
                      isNow
                        ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : isUpcoming
                        ? 'border-cyan-500/30'
                        : 'border-white/5 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center font-orbitron font-bold text-white text-sm">
                            {slot.slotNumber}
                          </div>
                          <span className="font-orbitron font-bold text-white text-sm">
                            Slot #{slot.slotNumber}
                          </span>
                        </div>

                        {isNow ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            LIVE NOW
                          </span>
                        ) : isUpcoming ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            UPCOMING
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-slate-800 text-slate-500">
                            EXPIRED
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 py-3 border-y border-white/5 font-mono text-xs text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Date:</span>
                          <span className="text-white font-medium">
                            {new Date(slot.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Start Time:</span>
                          <span className="text-emerald-400 font-bold">
                            {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">End Time:</span>
                          <span className="text-rose-400 font-bold">
                            {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Seat Capacity:</span>
                          <span className="text-cyan-400 font-bold">{slot.capacity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2">
                      <button
                        onClick={() => openEditSlotModal(slot)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Timings
                      </button>

                      <button
                        onClick={() => handleDeleteSlot(slot.id, slot.slotNumber)}
                        title="Delete slot"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/30 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLOT CREATE / EDIT MODAL */}
        {showSlotModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-3xl max-w-lg w-full border-pink-500/30 shadow-2xl relative">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <h3 className="font-orbitron text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  {editingSlotId ? `EDIT TEST SLOT #${slotNumber}` : 'SCHEDULE NEW TEST SLOT'}
                </h3>
                <button
                  onClick={() => setShowSlotModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSlot} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Slot Sequence #
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={slotNumber}
                      onChange={(e) => setSlotNumber(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Seat Capacity
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={slotCapacity}
                      onChange={(e) => setSlotCapacity(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Slot Opens (Start Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Slot Closes (End Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-pink-500"
                  />
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                    Candidates must enter and submit their exam before this deadline.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowSlotModal(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSlot}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {savingSlot ? 'Saving Slot...' : editingSlotId ? 'Save Changes' : 'Create Slot'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: EXAM QUESTIONS BANK                                        */}
        {/* ================================================================= */}
        {activeTab === 'questions' && (
          <div className="space-y-8">
            {/* Create New Question Form */}
            <div className="glass-panel p-8 rounded-3xl">
              <h3 className="font-orbitron text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Plus className="w-5 h-5 text-pink-400" />
                AUTHOR NEW EXAM QUESTION
              </h3>
              <p className="text-xs text-slate-400 mb-6 font-mono">
                Adds questions directly to Round 1 Preliminary Bank with tamper-proof server-side answer keys
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
                      min={1}
                      value={newOrderIndex}
                      onChange={(e) => setNewOrderIndex(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Diagram / Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/circuit.png"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Question Prompt / Text
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter the full question description..."
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-mono text-slate-400">
                    Option Choices (Select the radio button beside the Correct Answer)
                  </label>

                  {[
                    { label: 'Option A', val: newOpt1, setVal: setNewOpt1, idx: 1 },
                    { label: 'Option B', val: newOpt2, setVal: setNewOpt2, idx: 2 },
                    { label: 'Option C', val: newOpt3, setVal: setNewOpt3, idx: 3 },
                    { label: 'Option D', val: newOpt4, setVal: setNewOpt4, idx: 4 },
                  ].map((opt) => (
                    <div key={opt.idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        id={`opt-${opt.idx}`}
                        name="correctOption"
                        checked={correctOptIndex === opt.idx}
                        onChange={() => setCorrectOptIndex(opt.idx)}
                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="w-16 text-xs font-mono text-slate-400">{opt.label}:</span>
                      <input
                        type="text"
                        required
                        placeholder={`Text for ${opt.label}...`}
                        value={opt.val}
                        onChange={(e) => opt.setVal(e.target.value)}
                        className={`flex-1 px-4 py-2 rounded-xl bg-slate-900/60 border text-sm text-white focus:outline-none ${
                          correctOptIndex === opt.idx
                            ? 'border-emerald-500/70 bg-emerald-950/20'
                            : 'border-white/10 focus:border-pink-500'
                        }`}
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 hover:scale-[1.02] transition-all flex items-center gap-1.5 disabled:opacity-50 mt-4"
                >
                  <Plus className="w-4 h-4" />
                  {savingQuestion ? 'Adding Question...' : 'Add Question to Bank'}
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
                    className="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-bold">
                          Question #{q.orderIndex}
                        </span>
                        <span className="text-slate-500 text-[11px]">{q.id}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingQuestion(JSON.parse(JSON.stringify(q)))}
                          className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-cyan-400" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id, q.orderIndex)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-200 font-sans leading-relaxed">{q.promptText}</p>

                    {q.imageUrl && (
                      <div className="my-2 max-w-sm rounded-xl overflow-hidden border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={q.imageUrl} alt="Question diagram" className="w-full object-cover" />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      {q.options?.map((opt: any) => (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl text-xs font-mono ${
                            opt.isCorrect
                              ? 'bg-emerald-950/40 border border-emerald-500/60 text-emerald-300 font-bold flex items-center justify-between'
                              : 'bg-slate-950/40 border border-white/5 text-slate-400'
                          }`}
                        >
                          <span>{['A', 'B', 'C', 'D'][opt.optionIndex - 1]}: {opt.optionText}</span>
                          {opt.isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EDIT QUESTION MODAL */}
            {editingQuestion && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="glass-panel p-8 rounded-3xl max-w-2xl w-full border-pink-500/30 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <h3 className="font-orbitron text-lg font-bold text-white flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-pink-400" />
                      EDIT QUESTION #{editingQuestion.orderIndex}
                    </h3>
                    <button
                      onClick={() => setEditingQuestion(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditedQuestion} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-mono text-slate-400 mb-1.5">
                          Sequence #
                        </label>
                        <input
                          type="number"
                          required
                          value={editingQuestion.orderIndex}
                          onChange={(e) =>
                            setEditingQuestion({ ...editingQuestion, orderIndex: Number(e.target.value) })
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-mono text-slate-400 mb-1.5">
                          Image URL
                        </label>
                        <input
                          type="url"
                          value={editingQuestion.imageUrl || ''}
                          onChange={(e) =>
                            setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5">
                        Prompt Text
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={editingQuestion.promptText}
                        onChange={(e) =>
                          setEditingQuestion({ ...editingQuestion, promptText: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-mono text-slate-400">
                        Options (Mark radio button for the correct answer)
                      </label>
                      {editingQuestion.options.map((opt: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="editCorrectOption"
                            checked={opt.isCorrect}
                            onChange={() => {
                              const updated = editingQuestion.options.map((o: any, i: number) => ({
                                ...o,
                                isCorrect: i === idx,
                              }));
                              setEditingQuestion({ ...editingQuestion, options: updated });
                            }}
                            className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="w-16 text-xs font-mono text-slate-400">
                            {['Option A', 'Option B', 'Option C', 'Option D'][idx]}:
                          </span>
                          <input
                            type="text"
                            required
                            value={opt.optionText}
                            onChange={(e) => {
                              const updated = [...editingQuestion.options];
                              updated[idx].optionText = e.target.value;
                              setEditingQuestion({ ...editingQuestion, options: updated });
                            }}
                            className={`flex-1 px-4 py-2 rounded-xl bg-slate-900/60 border text-sm text-white focus:outline-none ${
                              opt.isCorrect
                                ? 'border-emerald-500/70 bg-emerald-950/20'
                                : 'border-white/10 focus:border-pink-500'
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setEditingQuestion(null)}
                        className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingQuestion}
                        className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                      >
                        {savingQuestion ? 'Saving Changes...' : 'Save Question'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: STUDENTS & PARTICIPANT REGISTRY                            */}
        {/* ================================================================= */}
        {activeTab === 'users' && (
          <div className="glass-panel p-6 rounded-3xl overflow-hidden space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-orbitron text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  STUDENTS & CANDIDATES REGISTRY
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Inspect student registrations, test attempt progress, scores, and manage roles
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by name, email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-900/60 border border-white/10 rounded-xl font-mono text-[11px]">
                  {['ALL', 'PARTICIPANT', 'ORGANIZER', 'ADMIN'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setUserRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        userRoleFilter === r
                          ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 bg-slate-950/40">
                    <th className="py-3 px-4">STUDENT / EMAIL</th>
                    <th className="py-3 px-4">INSTITUTE</th>
                    <th className="py-3 px-4">ROLE</th>
                    <th className="py-3 px-4">REGISTERED SLOT</th>
                    <th className="py-3 px-4">EXAM STATUS</th>
                    <th className="py-3 px-4">SCORE</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 font-mono text-xs">
                        No students or users found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => {
                      const attempt = u.currentAttempt;
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{u.email}</div>
                            <div className="text-slate-400 text-[11px]">
                              {u.profile?.fullName || u.profile?.displayName || '—'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <div>{u.profile?.instituteName || '—'}</div>
                            <div className="text-slate-500 text-[10px]">{u.profile?.yearOfStudy || ''}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                u.role === UserRole.ADMIN
                                  ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                                  : u.role === UserRole.ORGANIZER
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {attempt?.slot ? (
                              <span className="text-slate-200">
                                Slot #{attempt.slot.slotNumber}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Not Selected</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {attempt ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] ${
                                  attempt.status === 'SUBMITTED'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : attempt.status === 'IN_PROGRESS'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                    : attempt.status === 'DISQUALIFIED'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {attempt.status}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {attempt ? (
                              <div className="font-bold text-white">
                                {attempt.score} pts
                                {attempt.isQualified && (
                                  <span className="ml-1.5 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                    Q
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Attempt Disqualify / Reset Actions */}
                              {attempt && attempt.status !== 'DISQUALIFIED' && (
                                <button
                                  onClick={() => handleAttemptStatusChange(attempt.id, 'DISQUALIFIED', u.email)}
                                  title="Disqualify Attempt"
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-colors"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {attempt && (attempt.status === 'DISQUALIFIED' || attempt.status === 'EXPIRED') && (
                                <button
                                  onClick={() => handleAttemptStatusChange(attempt.id, 'NOT_STARTED', u.email)}
                                  title="Reset Attempt to Not Started"
                                  className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Role Assignment Buttons */}
                              {isSuperAdmin && (
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                  className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-pink-500"
                                >
                                  <option value={UserRole.PARTICIPANT}>Participant</option>
                                  <option value={UserRole.ORGANIZER}>Organizer</option>
                                  <option value={UserRole.ADMIN}>Admin</option>
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: CUTOFF EVALUATION (ADMIN ONLY)                             */}
        {/* ================================================================= */}
        {activeTab === 'cutoff' && isSuperAdmin && (
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

        {/* ================================================================= */}
        {/* TAB 6: AUDIT TRAIL LOGS (ADMIN ONLY)                              */}
        {/* ================================================================= */}
        {activeTab === 'audit' && isSuperAdmin && (
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="font-orbitron text-base font-bold text-white mb-4">
              IMMUTABLE AUDIT TRAIL LOGS
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 bg-slate-950/40">
                    <th className="py-3 px-4">TIMESTAMP</th>
                    <th className="py-3 px-4">PERFORMED BY</th>
                    <th className="py-3 px-4">ACTION</th>
                    <th className="py-3 px-4">RESOURCE</th>
                    <th className="py-3 px-4">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-400">
                        {log.user?.email || log.userId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{log.resource}</td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="glass-nav px-6 py-4 text-center text-xs text-slate-500 font-mono">
        CIT Staff Governance Engine • ISTE Students&apos; Chapter NIT Durgapur
      </footer>
    </div>
  );
}
