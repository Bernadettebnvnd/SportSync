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
  const { currentUser } = useMatchiStore();
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic_link'>(defaultMode);
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

    try {
      if (!isSupabaseConfigured) {
        // Local simulation with persistent storage update
        setSuccessMsg(
          mode === 'signup'
            ? 'Account registered! Email verification sent.'
            : 'Signed in successfully.'
        );
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.split('@')[0],
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg('Account registered and signed in!');
          setTimeout(onClose, 1200);
        } else {
          setSuccessMsg('Confirmation email sent. Please verify your email address to continue.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setSuccessMsg('Welcome back! Signed in.');
        setTimeout(onClose, 1000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
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
        setSuccessMsg(`Simulated magic link dispatched to ${email}. Check your inbox.`);
        setTimeout(onClose, 1500);
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
      const message = err instanceof Error ? err.message : 'Failed to send magic link';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      setSuccessMsg('Signed out successfully.');
      setTimeout(onClose, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error signing out';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isAlreadyLoggedIn = Boolean(currentUser.email && currentUser.auth_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E5DF] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#2D724E] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#E9C46A]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#1A241E]">
                {isAlreadyLoggedIn ? 'Account Session' : mode === 'signup' ? 'Create Matchi Account' : 'Sign in to Matchi'}
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
                    <div>
                      <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Juan Dela Cruz"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                        />
                      </div>
                    </div>
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
