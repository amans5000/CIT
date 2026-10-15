'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { updateProfileApi } from '../../lib/api-client';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { User, CheckCircle2, AlertCircle, ArrowRight, Save, School, Phone, BookOpen, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mobile, setMobile] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('2nd');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user?.profile) {
      setFullName(user.profile.fullName || '');
      setDisplayName(user.profile.displayName || '');
      setMobile(user.profile.mobile || '');
      setInstituteName(user.profile.instituteName || '');
      setDepartment(user.profile.department || '');
      setYearOfStudy(user.profile.yearOfStudy || '2nd');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateProfileApi({
        fullName: fullName.trim(),
        displayName: displayName.trim(),
        mobile: mobile.trim(),
        instituteName: instituteName.trim(),
        department: department.trim() || undefined,
        yearOfStudy,
      });
      await refreshUser();
      setSuccessMsg('Profile updated successfully!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cit-dark flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const isCompleted = user?.profile?.isCompleted;

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-cit-dark">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        {/* Top Header Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-orbitron font-extrabold shadow-lg shadow-pink-500/20">
              {user?.profile?.displayName ? user.profile.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-orbitron text-xl sm:text-2xl font-bold text-white">
                  {user?.profile?.fullName || user?.email.split('@')[0]}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-1">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isCompleted ? (
              <Link
                href="/lobby"
                className="px-5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                Go to Assessment Lobby
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Profile Incomplete
              </div>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div>
              <h2 className="font-orbitron text-lg font-bold text-white">PARTICIPANT PROFILE</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official accreditation and qualification credentials for CIT 9.0
              </p>
            </div>
            {isCompleted && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <CheckCircle2 className="w-4 h-4" />
                Verified & Complete
              </div>
            )}
          </div>

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-pink-400" />
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  Display / Screen Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maverick"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +919876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-emerald-400" />
                  College / School / Institute Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Institute of Technology Durgapur"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  Department / Branch
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science & Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Year of Study *
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500 transition-colors"
                >
                  <option value="1st">1st Year (Freshman)</option>
                  <option value="2nd">2nd Year (Sophomore)</option>
                  <option value="3rd">3rd Year (Junior)</option>
                  <option value="4th">4th Year (Senior)</option>
                  <option value="Postgraduate">Postgraduate / Masters</option>
                  <option value="Other">Other / School</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Profile Details'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="glass-nav px-6 py-4 text-center text-xs text-slate-500 font-mono">
        CIT 9.0 Participant Registry • ISTE NIT Durgapur
      </footer>
    </div>
  );
}
