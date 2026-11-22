'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useMatchiStore } from '@/lib/store';
import { SportType } from '@/types';
import { validateRealEmail } from '@/lib/validation/emailValidator';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
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
  Building2,
  Eye,
  EyeOff,
  MapPin,
  ChevronLeft,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const { currentUser, setAuthenticatedUser, logoutUser, completeOwnerOnboarding } = useMatchiStore();
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic_link'>(defaultMode);
  const [role, setRole] = useState<'player' | 'facility_owner'>('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (mode === 'signup') {
      const emailValidation = validateRealEmail(trimmedEmail);
      if (!emailValidation.isValid) {
        setErrorMsg(emailValidation.error || 'Please enter a real, valid email address. Fake or temporary accounts are forbidden.');
        setIsLoading(false);
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        setErrorMsg('Please enter a valid email address.');
        setIsLoading(false);
        return;
      }
    }

    if (!cleanPassword || cleanPassword.length < 6) {
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
          password: cleanPassword,
          fullName: fullName.trim(),
          role: role === 'facility_owner' ? 'facility_owner' : 'player',
        }
        : {
          email: trimmedEmail,
          password: cleanPassword,
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
        const isDbOwner = Boolean(
          data.user.role === 'venue_owner' ||
          data.user.role === 'organizer' ||
          data.user.role === 'facility_owner' ||
          data.user.role === 'faculty'
        );
        const isFacility = mode === 'signup' ? (role === 'facility_owner' || isDbOwner) : isDbOwner;
        const assignedRole = (isFacility ? 'venue_owner' : (data.user.role || 'player')) as any;

        if (mode === 'signup') {
          // NEW ACCOUNT: Must see onboarding!
          setAuthenticatedUser({
            id: data.user.id,
            auth_id: data.user.id,
            email: data.user.email,
            full_name: data.user.full_name || fullName.trim(),
            nickname: data.user.nickname || fullName.trim().split(' ')[0],
            avatar_url: data.user.avatar_url,
            role: assignedRole,
            primary_sport: '' as any,
            preferred_sports: [],
            preferred_format: 'doubles',
            skill_level: '' as any,
            city: data.user.city || 'Naga City',
            onboarding_completed: false,
            has_completed_onboarding: false,
          });

          if (typeof window !== 'undefined') {
            localStorage.removeItem('sportsync_logged_out');
            localStorage.removeItem('sportsync_guest');
            localStorage.removeItem('sportsync_skipped_onboarding');
            sessionStorage.setItem('sportsync_just_registered', 'true');
            localStorage.setItem('sportsync_user_id', data.user.id);
            localStorage.setItem('sportsync_user_email', data.user.email);
            localStorage.setItem('sportsync_user_role', assignedRole);
            localStorage.setItem('sportsync_user_name', data.user.full_name || fullName.trim());
            localStorage.setItem('sportsync_pending_onboarding', 'true');
            localStorage.removeItem('matchi_onboarding_completed');
            localStorage.removeItem('sportsync_onboarding_completed');
            localStorage.removeItem('sportsync_user_city');
            localStorage.removeItem('sportsync_user_sports');
            localStorage.removeItem('sportsync_user_skill');

            const cleanName = data.user.full_name || fullName.trim() || data.user.email.split('@')[0];
            const cleanHandle = (data.user.nickname || cleanName.split(' ')[0] || data.user.email.split('@')[0] || 'player')
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '') || 'player';
            const initialProfile = {
              id: data.user.id,
              email: data.user.email,
              name: cleanName,
              username: `@${cleanHandle}`,
              role: assignedRole,
              city: data.user.city || 'Naga City',
              primarySport: '',
              preferredSports: [],
              skillLevel: '',
              onboardingCompleted: false,
              isGuest: false,
            };
            localStorage.setItem('sportsync_user_profile', JSON.stringify(initialProfile));
            localStorage.setItem('sideline_user_profile', JSON.stringify(initialProfile));
          }

          setSuccessMsg(
            isFacility
              ? 'Facility account registered! Redirecting to facility setup...'
              : 'Account registered successfully! Redirecting to setup...'
          );
          setTimeout(() => {
            onClose();
            window.location.href = isFacility ? '/onboarding?role=owner' : '/onboarding';
          }, 600);
        } else {
          // Check actual database onboarding status.
          // Incomplete profiles must NEVER be marked as onboarded during sign-in.
          const isDbOwner = Boolean(
            data.user.role === 'venue_owner' ||
            data.user.role === 'organizer' ||
            data.user.role === 'facility_owner' ||
            data.user.role === 'faculty'
          );
          const isOwnerRole = isDbOwner;
          const isExplicitlyCompleted = Boolean(
            data.user.onboarding_completed === true || data.user.has_completed_onboarding === true
          );
          const hasRequiredPlayerFields = !isOwnerRole && Boolean(
            data.user.full_name &&
            !['Guest', 'Guest Player', 'Player', 'SportSync Player', 'Google Player'].includes(data.user.full_name.trim()) &&
            ((Array.isArray(data.user.preferred_sports) && data.user.preferred_sports.length > 0) || data.user.primary_sport) &&
            (data.user.city || data.user.skill_level) &&
            data.user.onboarding_completed !== false
          );
          const actualOnboardingCompleted = isOwnerRole
            ? isExplicitlyCompleted
            : (isExplicitlyCompleted || hasRequiredPlayerFields);

          setAuthenticatedUser({
            id: data.user.id,
            auth_id: data.user.id,
            email: data.user.email,
            full_name: data.user.full_name,
            nickname: data.user.nickname,
            avatar_url: data.user.avatar_url,
            role: isOwnerRole ? 'venue_owner' : (data.user.role || 'player'),
            primary_sport: data.user.primary_sport || (actualOnboardingCompleted ? 'football' : ('' as any)),
            preferred_sports: data.user.preferred_sports || (actualOnboardingCompleted ? ['football'] : []),
            preferred_format: data.user.preferred_format || 'doubles',
            skill_level: data.user.skill_level || (actualOnboardingCompleted ? 'intermediate' : ('' as any)),
            city: data.user.city || 'Naga City',
            onboarding_completed: actualOnboardingCompleted,
            has_completed_onboarding: actualOnboardingCompleted,
          });

          if (typeof window !== 'undefined') {
            localStorage.removeItem('sportsync_logged_out');
            localStorage.removeItem('sportsync_guest');
            localStorage.removeItem('sportsync_skipped_onboarding');
            localStorage.setItem('sportsync_user_id', data.user.id);
            localStorage.setItem('sportsync_user_email', data.user.email);
            localStorage.setItem('sportsync_user_role', isOwnerRole ? 'venue_owner' : (data.user.role || 'player'));
            localStorage.setItem('sportsync_user_name', data.user.full_name);

            const cleanHandle = (data.user.nickname || (data.user.full_name ? data.user.full_name.split(' ')[0] : '') || data.user.email.split('@')[0] || 'player')
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '') || 'player';

            if (!actualOnboardingCompleted) {
              sessionStorage.setItem('sportsync_just_registered', 'true');
              localStorage.setItem('sportsync_pending_onboarding', 'true');
              localStorage.removeItem('matchi_onboarding_completed');
              localStorage.removeItem('sportsync_onboarding_completed');
              const incompleteProfile = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.full_name || data.user.email.split('@')[0],
                username: `@${cleanHandle}`,
                role: isOwnerRole ? 'venue_owner' : (data.user.role || 'player'),
                city: data.user.city || 'Naga City',
                primarySport: data.user.primary_sport || '',
                preferredSports: Array.isArray(data.user.preferred_sports) ? data.user.preferred_sports : [],
                skillLevel: data.user.skill_level || '',
                onboardingCompleted: false,
                isGuest: false,
              };
              localStorage.setItem('sportsync_user_profile', JSON.stringify(incompleteProfile));
              localStorage.setItem('sideline_user_profile', JSON.stringify(incompleteProfile));
            } else {
              sessionStorage.removeItem('sportsync_just_registered');
              localStorage.removeItem('sportsync_pending_onboarding');
              localStorage.setItem('matchi_onboarding_completed', 'true');
              localStorage.setItem('sportsync_onboarding_completed', 'true');
              const userSports = Array.isArray(data.user.preferred_sports) && data.user.preferred_sports.length > 0
                ? data.user.preferred_sports.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
                : ['Football'];
              const fullProfile = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.full_name,
                username: `@${cleanHandle}`,
                role: data.user.role,
                city: data.user.city || 'Naga City',
                primarySport: data.user.primary_sport || 'football',
                preferredSports: userSports,
                skillLevel: data.user.skill_level ? (data.user.skill_level.charAt(0).toUpperCase() + data.user.skill_level.slice(1)) : 'Intermediate',
                onboardingCompleted: true,
                isGuest: false,
              };
              localStorage.setItem('sportsync_user_profile', JSON.stringify(fullProfile));
              localStorage.setItem('sideline_user_profile', JSON.stringify(fullProfile));
            }
          }

          if (!actualOnboardingCompleted) {
            setSuccessMsg('Account verified. Redirecting to Profile Setup...');
            setTimeout(() => {
              onClose();
              window.location.href = isOwnerRole ? '/onboarding?role=owner' : '/onboarding';
            }, 600);
          } else {
            setSuccessMsg('Welcome back! Signed in.');
            setTimeout(() => {
              onClose();
              if (isOwnerRole) {
                window.location.href = '/organizer';
              } else {
                window.location.href = '/';
              }
            }, 600);
          }
        }
      }
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Authentication failed';
      if (message === 'Failed to fetch') {
        message = 'Unable to connect to the authentication server. Please check your network connection.';
      } else if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('rate_limit')) {
        message = 'Supabase email service is currently rate-limited. Tip: Use "Continue with Google" for instant access!';
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
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('sportsync_logged_out', 'true');
        const authKeys = [
          'sportsync_user_id',
          'matchi_user_id',
          'sportsync_user_email',
          'sportsync_user_role',
          'matchi_user_role',
          'sportsync_user_name',
          'matchi_user_name',
          'sportsync_user_nickname',
          'matchi_user_nickname',
          'sportsync_user_profile',
          'sideline_user_profile',
          'sportsync_auth_user',
          'sportsync_pending_onboarding',
          'sportsync_onboarding_completed',
          'matchi_onboarding_completed',
          'sportsync_facility_venue_id',
          'sportsync_notifications',
          'sportsync_sent_notifications',
          'sportsync-auth-token',
          'sb-access-token',
        ];
        authKeys.forEach((k) => localStorage.removeItem(k));
        const dynamicKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith('sportsync_venue_id_') ||
              key.startsWith('sportsync_chat_') ||
              key.startsWith('sb-') ||
              key.startsWith('supabase.'))
          ) {
            dynamicKeys.push(key);
          }
        }
        dynamicKeys.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
      }
      await logoutUser();
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl bg-[#141A15] border border-white/10 shadow-2xl flex flex-col text-[#F4F7F0]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#1C241E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#0F2A22] text-[#C8FF2E] flex items-center justify-center shadow-xs border border-[#C8FF2E]/20">
              <ShieldCheck className="w-4 h-4 text-[#C8FF2E]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#F4F7F0]">
                {isAlreadyLoggedIn
                  ? 'Account Session'
                  : mode === 'signup'
                    ? 'Create SportSync Account'
                    : 'Sign in to SportSync'}
              </h2>
              <span className="text-[10px] text-[#A5B0A6] block">
                {isAlreadyLoggedIn
                  ? currentUser.email
                  : 'Unified Player & Facility Account'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#A5B0A6] hover:bg-white/10 hover:text-[#F4F7F0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/30 text-xs text-[#C8FF2E]">
              <CheckCircle2 className="w-4 h-4 text-[#C8FF2E] shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {isAlreadyLoggedIn ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0B0F0C] border border-white/10">
                <img
                  src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={currentUser.full_name}
                  className="w-10 h-10 rounded-full object-cover border border-[#C8FF2E]/40"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#F4F7F0] truncate">{currentUser.full_name}</div>
                  <div className="text-[11px] text-[#A5B0A6] truncate">{currentUser.email}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C8FF2E]/10 text-[#C8FF2E] capitalize border border-[#C8FF2E]/20">
                      Mode: {currentUser.active_mode || 'play'}
                    </span>
                    {currentUser.email_verified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
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
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#0B0F0C] rounded-xl border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-1.5 rounded-lg transition-all ${mode === 'signin'
                      ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-xs'
                      : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
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
                  className={`py-1.5 rounded-lg transition-all ${mode === 'signup'
                      ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-xs'
                      : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
                    }`}
                >
                  Create Account
                </button>
              </div>

              {/* Primary OAuth Method: Continue with Google */}
              <div className="mb-3 space-y-2.5">
                <GoogleSignInButton
                  label={mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
                  intendedRole={mode === 'signup' ? role : undefined}
                  onError={(err) => setErrorMsg(err)}
                  onSuccess={(isNewUser, user) => {
                    onClose();
                    const isDbOwner =
                      user?.role === 'venue_owner' ||
                      user?.role === 'organizer' ||
                      user?.role === 'facility_owner';
                    const isOwner = isNewUser ? (isDbOwner || role === 'facility_owner') : isDbOwner;
                    const isComplete = Boolean(user?.onboarding_completed === true || user?.has_completed_onboarding === true);
                    if (typeof window !== 'undefined') {
                      if (!isComplete || isNewUser) {
                        window.location.href = isOwner ? '/onboarding?role=owner' : '/onboarding';
                      } else {
                        window.location.href = isOwner ? '/organizer' : '/';
                      }
                    }
                  }}
                />
                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-[#141A15] px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6] shrink-0">
                    or continue with email
                  </span>
                  <div className="border-t border-white/10 w-full" />
                </div>
              </div>

              {mode === 'magic_link' ? (
                <form onSubmit={handleMagicLink} className="space-y-3.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-[#A5B0A6] block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#6F7B71] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#0B0F0C] text-xs font-semibold text-[#F4F7F0] placeholder-[#6F7B71] focus:bg-[#141A15] focus:border-[#C8FF2E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#C8FF2E] hover:bg-[#B5F01A] text-[#0B0F0C] text-xs font-black shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
                  >
                    {isLoading ? <span>Sending...</span> : <span>Send Magic Login Link</span>}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-[11px] font-bold text-[#C8FF2E] hover:underline"
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
                        <label className="text-[11px] font-bold text-[#A5B0A6] block mb-1.5">
                          Account Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRole('player')}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${role === 'player'
                                ? 'bg-[#0F2A22] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-xs'
                                : 'bg-[#0B0F0C] border-white/10 text-[#A5B0A6]'
                              }`}
                          >
                            <User className="w-4 h-4 shrink-0" />
                            <span className="text-xs">Player</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole('facility_owner')}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${role === 'facility_owner'
                                ? 'bg-[#0F2A22] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-xs'
                                : 'bg-[#0B0F0C] border-white/10 text-[#A5B0A6]'
                              }`}
                          >
                            <Building2 className="w-4 h-4 shrink-0" />
                            <span className="text-xs">Facility Owner</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#A5B0A6] block mb-1">
                          {role === 'facility_owner' ? 'Owner / Contact Name' : 'Full Name'}
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[#6F7B71] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={role === 'facility_owner' ? 'Alex Morgan' : 'Juan Dela Cruz'}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#0B0F0C] text-xs font-semibold text-[#F4F7F0] placeholder-[#6F7B71] focus:bg-[#141A15] focus:border-[#C8FF2E] focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-[#A5B0A6] block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#6F7B71] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder={role === 'facility_owner' ? 'owner@facility.ph' : 'player@domain.ph'}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#0B0F0C] text-xs font-semibold text-[#F4F7F0] placeholder-[#6F7B71] focus:bg-[#141A15] focus:border-[#C8FF2E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#A5B0A6] block mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#6F7B71] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-white/10 bg-[#0B0F0C] text-xs font-semibold text-[#F4F7F0] placeholder-[#6F7B71] focus:bg-[#141A15] focus:border-[#C8FF2E] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F7B71] hover:text-[#C8FF2E] p-1 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#C8FF2E] hover:bg-[#B5F01A] text-[#0B0F0C] text-xs font-black shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
                  >
                    {isLoading ? (
                      <span>Processing...</span>
                    ) : (
                      <span>
                        {mode === 'signup' ? 'Create Account & Continue' : 'Sign In'}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-1.5 flex items-center justify-center gap-3 text-[11px] text-[#A5B0A6]">
                    <button
                      type="button"
                      onClick={() => setMode('magic_link')}
                      className="font-bold text-[#C8FF2E] hover:underline"
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
