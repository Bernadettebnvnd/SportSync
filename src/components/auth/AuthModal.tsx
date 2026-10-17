'use client';

import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useMatchiStore } from '@/lib/store';
import {
  X,
  Mail,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  User,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const { currentUser, setAuthenticatedUser, logoutUser } = useMatchiStore();
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic_link'>(defaultMode);
  const [role, setRole] = useState<'player' | 'facility_owner'>('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'signup'
        ? {
            email: trimmedEmail,
            password,
            fullName: fullName.trim(),
            role,
          }
        : {
            email: trimmedEmail,
            password,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || (mode === 'signup' ? 'Registration failed.' : 'Login failed. Please check credentials.'));
      }

      if (data.user) {
        const isOnboarded = Boolean(data.user.onboarding_completed);
        setAuthenticatedUser({
          id: data.user.id,
          auth_id: data.user.id,
          email: data.user.email,
          full_name: data.user.full_name,
          nickname: data.user.nickname,
          avatar_url: data.user.avatar_url,
          role: data.user.role,
          primary_sport: data.user.primary_sport || 'pickleball',
          preferred_sports: data.user.preferred_sports || ['pickleball', 'badminton'],
          preferred_format: data.user.preferred_format || 'doubles',
          skill_level: data.user.skill_level || 'intermediate',
          city: data.user.city || 'Metro Manila',
          onboarding_completed: isOnboarded,
          has_completed_onboarding: isOnboarded,
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem('sportsync_user_email', data.user.email);
          localStorage.setItem('sportsync_user_role', data.user.role);
          localStorage.setItem('sportsync_user_name', data.user.full_name);
          if (isOnboarded) {
            localStorage.setItem('matchi_onboarding_completed', 'true');
            localStorage.setItem('sportsync_onboarding_completed', 'true');
          }
          localStorage.setItem(
            'sportsync_user_profile',
            JSON.stringify({
              id: data.user.id,
              name: data.user.full_name,
              username: `@${data.user.nickname || data.user.email.split('@')[0]}`,
              role: data.user.role,
              city: data.user.city || 'Metro Manila',
              primarySport: data.user.primary_sport || 'pickleball',
              preferredSports: data.user.preferred_sports || ['Pickleball', 'Badminton'],
              skillLevel: data.user.skill_level || 'Intermediate',
              onboardingCompleted: isOnboarded,
              isGuest: false,
            })
          );
        }
      }

      setSuccessMsg(
        mode === 'signup'
          ? 'Account registered successfully! Welcome to SportSync.'
          : 'Welcome back! Signed in.'
      );
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Authentication failed';
      if (message === 'Failed to fetch') {
        message = 'Unable to connect to the authentication server. Please check your network connection.';
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!isSupabaseConfigured) {
        setErrorMsg('Magic link authentication requires Supabase configuration.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : undefined,
        },
      });

      if (error) throw error;
      setSuccessMsg(`Magic login link sent to ${email}. Check your email.`);
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Failed to send magic link';
      if (message === 'Failed to fetch') {
        message = 'Unable to connect to the authentication server.';
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setSuccessMsg('Signed out successfully.');
      setTimeout(onClose, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error signing out';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isAlreadyLoggedIn = Boolean(currentUser.email && (currentUser.auth_id || currentUser.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E5DF] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#2D724E] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#E9C46A]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#1A241E]">
                {isAlreadyLoggedIn ? 'Account Session' : mode === 'signup' ? 'Create SportSync Account' : 'Sign in to SportSync'}
              </h2>
              <span className="text-[10px] text-[#65756B] block">
                {isAlreadyLoggedIn ? currentUser.email : 'Unified Player & Facility Account'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#65756B] hover:bg-white hover:text-[#1A241E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#EBF4EE] border border-[#2D724E]/30 text-xs text-[#1E4A32]">
              <CheckCircle2 className="w-4 h-4 text-[#2D724E] shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {isAlreadyLoggedIn ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF]">
                <img
                  src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={currentUser.full_name}
                  className="w-10 h-10 rounded-full object-cover border border-[#2D724E]"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#1A241E] truncate">{currentUser.full_name}</div>
                  <div className="text-[11px] text-[#65756B] truncate">{currentUser.email}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF4EE] text-[#1E4A32] capitalize">
                      Mode: {currentUser.active_mode || 'play'}
                    </span>
                    {currentUser.email_verified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E8E5DF] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-1.5 rounded-lg transition-all ${
                    mode === 'signin'
                      ? 'bg-white text-[#1A241E] shadow-xs'
                      : 'text-[#65756B] hover:text-[#1A241E]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-1.5 rounded-lg transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-[#1A241E] shadow-xs'
                      : 'text-[#65756B] hover:text-[#1A241E]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {mode === 'magic_link' ? (
                <form onSubmit={handleMagicLink} className="space-y-3.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
                  >
                    {isLoading ? <span>Sending...</span> : <span>Send Magic Login Link</span>}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-[11px] font-bold text-[#2D724E] hover:underline"
                    >
                      Use password instead
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePasswordAuth} className="space-y-3 pt-1">
                  {mode === 'signup' && (
                    <>
                      <div>
                        <label className="text-[11px] font-bold text-[#65756B] block mb-1.5">
                          Account Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRole('player')}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                              role === 'player'
                                ? 'bg-[#EBF4EE] border-[#2D724E] text-[#1E4A32] font-bold shadow-xs'
                                : 'bg-[#FAF8F5] border-[#E8E5DF] text-[#65756B]'
                            }`}
                          >
                            <User className="w-4 h-4 shrink-0" />
                            <span className="text-xs">Player</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole('facility_owner')}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                              role === 'facility_owner'
                                ? 'bg-[#EBF4EE] border-[#2D724E] text-[#1E4A32] font-bold shadow-xs'
                                : 'bg-[#FAF8F5] border-[#E8E5DF] text-[#65756B]'
                            }`}
                          >
                            <Building2 className="w-4 h-4 shrink-0" />
                            <span className="text-xs">Facility Owner</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                          {role === 'facility_owner' ? 'Owner / Contact Name' : 'Full Name'}
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={role === 'facility_owner' ? 'Alex Morgan' : 'Juan Dela Cruz'}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="player@domain.ph"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
                  >
                    {isLoading ? (
                      <span>Authenticating...</span>
                    ) : (
                      <span>{mode === 'signup' ? 'Register Account' : 'Sign In'}</span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-1.5 flex items-center justify-center gap-3 text-[11px] text-[#65756B]">
                    <button
                      type="button"
                      onClick={() => setMode('magic_link')}
                      className="font-bold text-[#2D724E] hover:underline"
                    >
                      Email Magic Link
                    </button>
                    <span>&bull;</span>
                    <span className="text-[10px]">Persistent Session</span>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
