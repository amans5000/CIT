'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import {
  getCurrentAttemptApi,
  getQuestionApi,
  submitAnswerApi,
  finishAttemptApi,
  AttemptInfo,
  QuestionData,
} from '../../lib/api-client';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

export default function ArenaPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [attempt, setAttempt] = useState<AttemptInfo | null>(null);
  const [currentOrder, setCurrentOrder] = useState<number>(1);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answeredMap, setAnsweredMap] = useState<Record<number, string | null>>({});

  const [loading, setLoading] = useState(true);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer tracking
  const [remainingSeconds, setRemainingSeconds] = useState<number>(45 * 60);
  const questionStartTimeRef = useRef<number>(Date.now());

  // 1. Initial attempt check
  const initAttempt = useCallback(async () => {
    try {
      const activeAttempt = await getCurrentAttemptApi();
      if (!activeAttempt || activeAttempt.status !== 'IN_PROGRESS') {
        if (activeAttempt?.status === 'SUBMITTED') {
          router.push('/result');
          return;
        }
        router.push('/lobby');
        return;
      }

      setAttempt(activeAttempt);
      setCurrentOrder(activeAttempt.currentQuestion || 1);

      // Compute remaining seconds from slot end time
      if (activeAttempt.slot?.endTime) {
        const diffMs = new Date(activeAttempt.slot.endTime).getTime() - Date.now();
        setRemainingSeconds(Math.max(0, Math.floor(diffMs / 1000)));
      } else {
        // Fallback: 45 minutes
        setRemainingSeconds(45 * 60);
      }
    } catch {
      router.push('/lobby');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      initAttempt();
    }
  }, [user, authLoading, router, initAttempt]);

  // 2. Load Question whenever currentOrder changes
  const loadQuestion = useCallback(
    async (order: number) => {
      if (!attempt) return;
      try {
        setErrorMessage(null);
        const q = await getQuestionApi(attempt.roundId, order);
        setQuestion(q);
        questionStartTimeRef.current = Date.now();

        // Restore chosen option if already answered or in local map
        if (answeredMap[order] !== undefined) {
          setSelectedOptionId(answeredMap[order]);
        } else if (q.selectedOptionId) {
          setSelectedOptionId(q.selectedOptionId);
          setAnsweredMap((prev) => ({ ...prev, [order]: q.selectedOptionId! }));
        } else {
          setSelectedOptionId(null);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to load question');
      }
    },
    [attempt, answeredMap],
  );

  useEffect(() => {
    if (attempt) {
      loadQuestion(currentOrder);
    }
  }, [attempt, currentOrder, loadQuestion]);

  // 3. Auto submit on timer expiry
  const handleAutoSubmit = useCallback(async () => {
    if (!attempt) return;
    try {
      await finishAttemptApi(attempt.id);
      router.push('/result');
    } catch {
      router.push('/result');
    }
  }, [attempt, router]);

  // 4. Countdown timer
  useEffect(() => {
    if (!attempt || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, remainingSeconds, handleAutoSubmit]);

  // 5. Submit single answer
  const handleSaveAnswer = async (newOptionId: string | null = selectedOptionId) => {
    if (!attempt || !question) return;
    setSubmittingAnswer(true);
    setErrorMessage(null);

    const timeTakenMs = Date.now() - questionStartTimeRef.current;

    try {
      await submitAnswerApi({
        attemptId: attempt.id,
        questionId: question.id,
        selectedOptionId: newOptionId,
        timeTakenMs,
      });

      setAnsweredMap((prev) => ({ ...prev, [currentOrder]: newOptionId }));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to record answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleSelectOption = (optionId: string) => {
    const nextVal = selectedOptionId === optionId ? null : optionId;
    setSelectedOptionId(nextVal);
    handleSaveAnswer(nextVal);
  };

  const handleClearSelection = () => {
    setSelectedOptionId(null);
    handleSaveAnswer(null);
  };

  const handleNext = () => {
    if (question && currentOrder < question.totalQuestions) {
      setCurrentOrder((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentOrder > 1) {
      setCurrentOrder((prev) => prev - 1);
    }
  };

  const handleFinishExam = async () => {
    if (!attempt) return;
    setIsFinishing(true);
    try {
      await finishAttemptApi(attempt.id);
      router.push('/result');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit exam. Please try again.');
      setIsFinishing(false);
      setShowFinishModal(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-cit-dark flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-4" />
        <p className="font-orbitron text-xs text-pink-400 tracking-wider">ENTERING SECURE ARENA...</p>
      </div>
    );
  }

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const totalQ = question?.totalQuestions || 3;
  const answeredCount = Object.values(answeredMap).filter(Boolean).length;
  const isTimeCritical = remainingSeconds < 300; // < 5 mins

  return (
    <div className="min-h-screen flex flex-col justify-between bg-cit-dark text-white select-none">
      {/* Dynamic Background Glow */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Arena Top Navigation Header */}
      <header className="sticky top-0 z-50 glass-nav px-6 py-3.5 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-700 flex items-center justify-center font-orbitron font-extrabold text-white text-base shadow-lg shadow-pink-500/20">
              CIT
            </div>
            <div>
              <span className="font-orbitron font-bold tracking-wider text-sm sm:text-base text-white block">
                CIT 9.0 ARENA
              </span>
              <span className="text-[10px] text-pink-400 font-mono tracking-widest uppercase">
                Round 1 • Preliminary
              </span>
            </div>
          </div>

          {/* Real-time Countdown Timer Pill */}
          <div
            className={`px-4 py-2 rounded-2xl flex items-center gap-2.5 font-orbitron font-bold text-sm tracking-widest transition-all ${
              isTimeCritical
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-lg shadow-rose-500/30 animate-pulse'
                : 'bg-slate-900/80 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/20'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-400' : 'text-cyan-400'}`} />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          {/* Finish Button */}
          <button
            onClick={() => setShowFinishModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-[1.02] transition-all flex items-center gap-1.5"
          >
            <Flag className="w-3.5 h-3.5" />
            Finish Exam
          </button>
        </div>
      </header>

      {/* Main Arena Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full flex flex-col lg:flex-row gap-8">
        {/* Left Side: Question Presentation */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {errorMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Question Card */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden mb-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2 font-mono text-xs text-pink-400">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                  QUESTION {currentOrder} OF {totalQ}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  +4 Marks • -1 Negative
                </div>
              </div>

              {/* Prompt Text */}
              <h2 className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed font-sans mb-6">
                {question?.promptText}
              </h2>

              {/* Optional Question Image */}
              {question?.imageUrl && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 max-h-80 flex items-center justify-center bg-slate-950/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={question.imageUrl}
                    alt={`Question ${currentOrder}`}
                    className="max-h-80 object-contain"
                  />
                </div>
              )}

              {/* Options Grid */}
              <div className="space-y-3">
                {question?.options?.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const optionLetters = ['A', 'B', 'C', 'D'];
                  const letter = optionLetters[opt.optionIndex - 1] || opt.optionIndex;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt.id)}
                      disabled={submittingAnswer}
                      className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 group ${
                        isSelected
                          ? 'bg-pink-950/40 border-pink-500 border-2 shadow-lg shadow-pink-500/20'
                          : 'bg-slate-900/50 border border-white/10 hover:border-cyan-500/40 hover:bg-slate-900/80'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-orbitron font-bold text-xs transition-colors ${
                          isSelected
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-950/40'
                        }`}
                      >
                        {letter}
                      </div>

                      <div className="flex-1 text-sm font-sans text-slate-200">
                        {opt.optionText}
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-pink-500 bg-pink-500 text-white'
                            : 'border-slate-600 group-hover:border-cyan-400'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentOrder <= 1}
                className="px-4 py-2.5 rounded-xl glass-panel text-xs font-semibold hover:border-white/30 transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                disabled={!selectedOptionId}
                className="px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                Clear Choice
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNext}
                disabled={currentOrder >= totalQ}
                className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next Question
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Question Navigator Palette & Stats */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-3xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
              <h3 className="font-orbitron text-sm font-bold text-white tracking-wider">
                QUESTION PALETTE
              </h3>
              <span className="text-xs font-mono text-cyan-400">
                {answeredCount}/{totalQ} Answered
              </span>
            </div>

            {/* Quick Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-pink-500 shadow-sm shadow-pink-500/50" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-800 border border-white/20" />
                <span>Unattempted</span>
              </div>
            </div>

            {/* Number Grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {Array.from({ length: totalQ }, (_, i) => i + 1).map((idx) => {
                const isCurrent = idx === currentOrder;
                const isAnswered = Boolean(answeredMap[idx]);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentOrder(idx)}
                    className={`h-11 rounded-xl font-orbitron font-bold text-xs transition-all flex items-center justify-center ${
                      isCurrent
                        ? 'border-2 border-white ring-2 ring-pink-500 text-white font-extrabold scale-105 z-10'
                        : isAnswered
                        ? 'bg-gradient-to-br from-pink-600 to-purple-600 text-white shadow-md shadow-pink-600/30'
                        : 'bg-slate-900/60 border border-white/10 text-slate-400 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {idx}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Integrity Card */}
          <div className="glass-panel p-5 rounded-3xl border border-white/5 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-mono font-semibold">
              <ShieldAlert className="w-4 h-4" />
              INTEGRITY AUDIT ACTIVE
            </div>
            <p className="leading-relaxed">
              Every action is recorded with cryptographic timestamps. Do not refresh or navigate away from the arena.
            </p>
          </div>
        </div>
      </main>

      {/* Confirmation Modal for Finish Exam */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-pink-500/40 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
              <Flag className="w-6 h-6" />
            </div>

            <h3 className="font-orbitron text-xl font-bold text-white mb-2">
              SUBMIT ASSESSMENT?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6 font-sans">
              You have answered <span className="font-bold text-pink-400">{answeredCount}</span> of{' '}
              <span className="font-bold text-white">{totalQ}</span> questions. Once submitted, you cannot change your answers.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                disabled={isFinishing}
                className="px-4 py-2.5 rounded-xl glass-panel text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={handleFinishExam}
                disabled={isFinishing}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {isFinishing ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
