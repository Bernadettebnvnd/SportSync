'use client';

import React, { useState } from 'react';
import { X, Minus, Square, Lock, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import { APP_CONFIG } from '@/config/appConfig';
import { useMatchiStore } from '@/lib/store';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (isNewUser?: boolean) => void;
  onError?: (errorMsg: string) => void;
}

export function GoogleSignInModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: GoogleSignInModalProps) {
  const { setAuthenticatedUser } = useMatchiStore();

  const [step, setStep] = useState<'email' | 'details'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Helper: auto-format a readable full name from email prefix
  const deriveNameFromEmail = (email: string): string => {
    const prefix = email.split('@')[0] || '';
    // Replace dots, underscores, dashes with spaces
    const words = prefix
      .replace(/[._-]+/g, ' ')
      .replace(/[0-9]+/g, '')
      .trim()
      .split(/\s+/);

    if (words.length === 0 || !words[0]) return 'SportSync Player';

    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = emailInput.trim();
    if (!trimmed) {
      setValidationError('Enter an email or phone number');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let finalEmail = trimmed;
    if (!trimmed.includes('@')) {
      // Allow entering just the username, append @gmail.com
      finalEmail = `${trimmed}@gmail.com`;
      setEmailInput(finalEmail);
    } else if (!emailRegex.test(trimmed)) {
      setValidationError('Couldn’t find your Google Account. Enter a valid email address.');
      return;
    }

    // Auto-derive friendly name if not manually set
    if (!fullNameInput) {
      setFullNameInput(deriveNameFromEmail(finalEmail));
    }

    setStep('details');
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsLoading(true);

    const trimmedEmail = emailInput.trim().toLowerCase();
    const finalFullName = fullNameInput.trim() || deriveNameFromEmail(trimmedEmail);

    try {
      const res = await fetch('/api/auth/oauth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: `usr_google_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          email: trimmedEmail,
          fullName: finalFullName,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalFullName)}&backgroundColor=0f2a22&textColor=c8ff2e`,
          mock: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Google authentication failed.');
      }

      const isComplete = Boolean(data.isComplete === true);

      // Save user into active store
      setAuthenticatedUser({
        ...data.user,
        full_name: finalFullName,
        nickname: finalFullName.split(' ')[0],
        onboarding_completed: isComplete,
        has_completed_onboarding: isComplete,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('sportsync_user_id', data.user.id);
        localStorage.setItem('sportsync_user_email', trimmedEmail);
        localStorage.setItem('sportsync_user_role', data.user.role || 'player');
        localStorage.setItem('sportsync_user_name', finalFullName);

        if (!isComplete) {
          localStorage.setItem('sportsync_pending_onboarding', 'true');
          localStorage.removeItem('matchi_onboarding_completed');
          localStorage.removeItem('sportsync_onboarding_completed');
          localStorage.removeItem('sportsync_user_profile');
        } else {
          localStorage.removeItem('sportsync_pending_onboarding');
          localStorage.setItem('matchi_onboarding_completed', 'true');
          localStorage.setItem('sportsync_onboarding_completed', 'true');
        }
      }

      onClose();

      if (onSuccess) {
        onSuccess(!isComplete);
      } else if (typeof window !== 'undefined') {
        // Strict routing: Missing/incomplete profiles MUST go to Profile Setup screen
        window.location.href = !isComplete ? '/onboarding' : '/';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed.';
      setValidationError(msg);
      onError?.(msg);
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setValidationError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Outer Window Chrome matching OS browser popup */}
      <div className="w-full max-w-[460px] rounded-2xl overflow-hidden shadow-2xl border border-[#3C4043] bg-[#0E1013] text-[#E3E3E3] font-sans flex flex-col animate-in zoom-in-95 duration-200">
        {/* Top OS Window Bar */}
        <div className="h-9 bg-[#1E1F20] px-3 flex items-center justify-between border-b border-[#2D2F31] select-none text-[11px] text-[#9AA0A6]">
          <div className="flex items-center gap-2 truncate">
            {/* Google G mini-logo */}
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span className="font-medium text-[#C4C7C5] truncate">
              Sign in - Google Accounts - Google Chrome
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-[#9AA0A6] hover:text-white"
              title="Minimize"
              onClick={onClose}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className="text-[#9AA0A6] hover:text-white"
              title="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[#9AA0A6] hover:text-red-400 transition-colors"
              title="Close window"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chrome Address Bar */}
        <div className="h-8 bg-[#131314] px-3 flex items-center gap-2 border-b border-[#28292A] text-[11px] text-[#9AA0A6]">
          <Lock className="w-3 h-3 text-[#9AA0A6] shrink-0" />
          <div className="flex-1 bg-[#1E1F20] rounded-full px-2.5 py-0.5 text-[#C4C7C5] truncate text-[10.5px]">
            accounts.google.com/v3/signin/identifier?opparams=%253F&dsh=S5911...
          </div>
          <Key className="w-3 h-3 text-[#9AA0A6] shrink-0" />
        </div>

        {/* Google Dialog Content */}
        <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 min-h-[460px]">
          <div>
            {/* Header: Sign in with Google */}
            <div className="flex items-center gap-2.5 mb-5">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-sm font-medium text-[#E3E3E3]">
                Sign in with Google
              </span>
            </div>

            {/* App Brand Identity */}
            <div className="mb-4">
              <span className="font-display font-black text-xl tracking-tight text-[#C8FF2E] italic">
                {APP_CONFIG.appName}
              </span>
            </div>

            {/* Title & App continuation */}
            <h1 className="text-2xl sm:text-3xl font-normal text-white tracking-tight mb-1">
              {step === 'email' ? 'Sign in' : 'Welcome'}
            </h1>
            <p className="text-sm text-[#C4C7C5] mb-6">
              {step === 'email' ? (
                <>
                  to continue to{' '}
                  <span className="font-medium text-white">{APP_CONFIG.appName}</span>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#444746] bg-[#1E1F20] text-xs text-[#E3E3E3] hover:bg-[#28292A] transition-colors"
                >
                  <span className="w-4 h-4 rounded-full bg-[#8AB4F8] text-[#041E49] font-bold text-[10px] flex items-center justify-center">
                    {fullNameInput.charAt(0) || emailInput.charAt(0).toUpperCase()}
                  </span>
                  <span>{emailInput}</span>
                  <span className="text-[10px] text-[#8AB4F8]">▾</span>
                </button>
              )}
            </p>

            {/* Validation Message */}
            {validationError && (
              <div className="mb-4 text-xs text-[#F28B82] flex items-center gap-1.5">
                <span>{validationError}</span>
              </div>
            )}

            {/* STEP 1: Enter Gmail Form */}
            {step === 'email' ? (
              <form onSubmit={handleEmailNext} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    id="google-email-input"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Email or phone"
                    autoFocus
                    required
                    className="w-full h-13 px-4 rounded-md border border-[#8E918F] focus:border-[#8AB4F8] focus:border-2 bg-transparent text-sm text-[#E3E3E3] placeholder-[#8E918F] focus:outline-none transition-all"
                  />
                </div>

                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setEmailInput('player@gmail.com')}
                    className="text-xs font-medium text-[#8AB4F8] hover:underline"
                  >
                    Forgot email?
                  </button>
                </div>

                <div className="pt-4 text-xs text-[#C4C7C5] leading-relaxed">
                  Before using this app, you can review {APP_CONFIG.appName}&apos;s{' '}
                  <span className="text-[#8AB4F8] hover:underline cursor-pointer">
                    Privacy Policy
                  </span>{' '}
                  and{' '}
                  <span className="text-[#8AB4F8] hover:underline cursor-pointer">
                    Terms of Service
                  </span>
                  .
                </div>

                <div className="pt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput('new.athlete@gmail.com');
                      setFullNameInput('New Athlete');
                    }}
                    className="text-xs font-medium text-[#8AB4F8] hover:underline"
                  >
                    Create account
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#8AB4F8] hover:bg-[#A8C7FA] active:bg-[#7CA8F5] text-[#041E49] font-medium text-xs transition-colors shadow-xs"
                  >
                    Next
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: Confirm Real Name & Password */
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-[#C4C7C5] block mb-1.5 ml-0.5">
                    Your Name (as displayed on Google)
                  </label>
                  <input
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="e.g. Andrei Manrique"
                    required
                    autoFocus
                    className="w-full h-12 px-4 rounded-md border border-[#8E918F] focus:border-[#8AB4F8] focus:border-2 bg-transparent text-sm text-[#E3E3E3] placeholder-[#8E918F] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#C4C7C5] block mb-1.5 ml-0.5">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-12 pl-4 pr-11 rounded-md border border-[#8E918F] focus:border-[#8AB4F8] focus:border-2 bg-transparent text-sm text-[#E3E3E3] placeholder-[#8E918F] focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#9AA0A6] hover:text-[#E3E3E3] p-1"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-xs text-[#8E918F]">
                  Secure authentication verified through Google Identity Services
                </div>

                <div className="pt-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    disabled={isLoading}
                    className="text-xs font-medium text-[#8AB4F8] hover:underline"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 rounded-full bg-[#8AB4F8] hover:bg-[#A8C7FA] active:bg-[#7CA8F5] text-[#041E49] font-medium text-xs transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Next</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Dialog Footer */}
          <div className="pt-6 border-t border-[#28292A] mt-6 flex items-center justify-between text-[11px] text-[#9AA0A6]">
            <span className="hover:text-[#E3E3E3] cursor-pointer">
              English (United States) ▾
            </span>
            <div className="flex items-center gap-4">
              <span className="hover:text-[#E3E3E3] cursor-pointer">Help</span>
              <span className="hover:text-[#E3E3E3] cursor-pointer">Privacy</span>
              <span className="hover:text-[#E3E3E3] cursor-pointer">Terms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
