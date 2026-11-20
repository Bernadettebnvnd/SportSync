'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Check, User, Mail, ChevronDown } from 'lucide-react';
import { APP_CONFIG } from '@/config/appConfig';

type AuthStep = 'email' | 'password' | 'consent';

export default function GoogleOAuthPopupPage() {
  const [step, setStep] = useState<AuthStep>('email');

  // Input states - NEVER prefilled, starts empty
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Focus & UI states
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Sync document title to authentic Google Accounts titles based on step
  useEffect(() => {
    if (step === 'email') {
      document.title = 'Sign in - Google Accounts';
    } else if (step === 'password') {
      document.title = 'Welcome - Google Accounts';
    } else if (step === 'consent') {
      document.title = `Sign in to ${APP_CONFIG.appName} - Google Accounts`;
    }
  }, [step]);

  // Focus appropriate input when step changes
  useEffect(() => {
    if (step === 'email') {
      setTimeout(() => emailInputRef.current?.focus(), 50);
    } else if (step === 'password') {
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    }
  }, [step]);

  const deriveNameFromEmail = (email: string): string => {
    const prefix = email.split('@')[0] || '';
    const cleaned = prefix.replace(/[0-9]+/g, '');
    let parts = cleaned.split(/[._+-]+/).filter(Boolean);

    if (parts.length === 1 && parts[0].length > 6) {
      const raw = parts[0];
      const camelParts = raw.replace(/([A-Z])/g, ' $1').trim().split(/\s+/);
      if (camelParts.length > 1) {
        parts = camelParts;
      } else {
        const knownFirsts = ['andrei', 'john', 'mark', 'mary', 'paul', 'mike', 'alex', 'chris', 'david', 'james', 'robert', 'michael'];
        for (const kf of knownFirsts) {
          if (raw.toLowerCase().startsWith(kf) && raw.length > kf.length + 2) {
            parts = [raw.slice(0, kf.length), raw.slice(kf.length)];
            break;
          }
        }
      }
    }

    if (parts.length === 0 || !parts[0]) return 'SportSync Athlete';
    return parts
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const handleEmailSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let email = emailInput.trim();
    if (!email) {
      setErrorMsg('Enter an email or phone number');
      emailInputRef.current?.focus();
      return;
    }

    if (!email.includes('@')) {
      email = `${email}@gmail.com`;
      setEmailInput(email);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Enter a valid email address');
      emailInputRef.current?.focus();
      return;
    }

    setErrorMsg(null);
    setStep('password');
  };

  const handlePasswordSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMsg('Enter a password');
      passwordInputRef.current?.focus();
      return;
    }

    setErrorMsg(null);
    setStep('consent');
  };

  const handleConsentConfirm = async () => {
    setErrorMsg(null);
    setIsLoading(true);

    const trimmedEmail = emailInput.trim().toLowerCase();
    const derivedFullName = deriveNameFromEmail(trimmedEmail);

    try {
      const res = await fetch('/api/auth/oauth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: `usr_google_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          email: trimmedEmail,
          fullName: derivedFullName,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(derivedFullName)}&backgroundColor=0f2a22&textColor=c8ff2e`,
          provider: 'google',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Google authentication failed.');
      }

      const isComplete = Boolean(data.isComplete === true);
      const finalName = data.user.full_name || derivedFullName;

      // Persist authenticated identity in localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_logged_out');
        localStorage.setItem('sportsync_user_id', data.user.id);
        localStorage.setItem('sportsync_user_email', trimmedEmail);
        localStorage.setItem('sportsync_user_role', data.user.role || 'player');
        localStorage.setItem('sportsync_user_name', finalName);
        localStorage.setItem('matchi_user_name', finalName);

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

      setIsSuccess(true);

      // Post message back to parent window and close popup
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'GOOGLE_AUTH_SUCCESS',
            user: {
              ...data.user,
              full_name: finalName,
              nickname: data.user.nickname || finalName.split(' ')[0],
              onboarding_completed: isComplete,
              has_completed_onboarding: isComplete,
            },
            isComplete,
          },
          window.location.origin
        );

        setTimeout(() => {
          window.close();
        }, 350);
      } else {
        setTimeout(() => {
          window.location.href = !isComplete ? '/onboarding' : '/';
        }, 350);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed.';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (typeof window !== 'undefined') {
      window.close();
    }
  };

  const derivedFullName = deriveNameFromEmail(emailInput);

  return (
    <div
      style={{ backgroundColor: '#131314', color: '#E3E3E3', colorScheme: 'dark' }}
      className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 font-sans select-none antialiased"
    >
      {/* Indeterminate linear loading bar at the top */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#131314] overflow-hidden z-50">
          <div className="h-full bg-[#A8C7FA] animate-pulse w-full" />
        </div>
      )}

      {/* Main Google Accounts Container matching Canva Google Sign-in reference video */}
      <div className="w-full max-w-[448px] mx-auto my-auto flex flex-col">
        {/* Google Header: G logo + "Sign in with Google" */}
        <div className="flex items-center gap-3 mb-7">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
          <span className="text-[15px] font-normal text-[#E3E3E3] tracking-normal">
            Sign in with Google
          </span>
        </div>

        {/* STEP 1: Enter Email or Phone */}
        {step === 'email' && (
          <div className="flex flex-col animate-in fade-in duration-200">
            {/* Target App Brand Logo & Name */}
            <div className="mb-6 flex items-center">
              <img src="/sportsync-name.svg" alt="SportSync" className="h-6 w-auto object-contain" />
            </div>

            {/* Main Heading & Subtitle */}
            <h1 className="text-[32px] sm:text-[36px] font-normal text-[#E3E3E3] tracking-normal leading-tight mb-2">
              Sign in
            </h1>
            <p className="text-sm text-[#C4C7C5] mb-8">
              to continue to{' '}
              <span className="text-[#A8C7FA] hover:underline cursor-pointer font-medium">
                {APP_CONFIG.appName}
              </span>
            </p>

            <form onSubmit={handleEmailSubmit} className="flex flex-col">
              {/* Outlined Material 3 "Email or phone" input with floating notch label */}
              <div className="relative mb-2">
                <div className="relative">
                  <input
                    ref={emailInputRef}
                    type="text"
                    id="identifierId"
                    name="identifier"
                    autoComplete="username"
                    autoFocus
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    className={`w-full h-14 px-4 bg-transparent rounded-[4px] text-base text-[#E3E3E3] focus:outline-none transition-all ${
                      errorMsg
                        ? 'border-2 border-[#F2B8B5]'
                        : isEmailFocused
                        ? 'border-2 border-[#A8C7FA]'
                        : 'border border-[#8E918F] hover:border-[#C4C7C5]'
                    }`}
                  />
                  <label
                    htmlFor="identifierId"
                    onClick={() => emailInputRef.current?.focus()}
                    className={`absolute pointer-events-none transition-all duration-150 select-none ${
                      isEmailFocused || emailInput
                        ? '-top-2.5 left-3 px-1.5 text-xs bg-[#131314]'
                        : 'top-4 left-4 text-base'
                    } ${
                      errorMsg
                        ? 'text-[#F2B8B5]'
                        : isEmailFocused
                        ? 'text-[#A8C7FA]'
                        : 'text-[#8E918F]'
                    }`}
                  >
                    Email or phone
                  </label>
                </div>

                {/* Error state */}
                {errorMsg && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#F2B8B5]">
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              {/* "Forgot email?" link */}
              <div className="mt-2 mb-8">
                <button
                  type="button"
                  onClick={() => {
                    if (!emailInput) {
                      setErrorMsg('Enter an email or phone number');
                      emailInputRef.current?.focus();
                    }
                  }}
                  className="text-sm font-medium text-[#A8C7FA] hover:underline cursor-pointer"
                >
                  Forgot email?
                </button>
              </div>

              {/* Privacy & Terms Consent Notice */}
              <p className="text-xs sm:text-[13px] text-[#C4C7C5] leading-relaxed mb-10">
                Before using this app, you can review {APP_CONFIG.appName}&apos;s{' '}
                <a href="#" className="text-[#A8C7FA] hover:underline font-medium">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="#" className="text-[#A8C7FA] hover:underline font-medium">
                  Terms of Service
                </a>
                .
              </p>

              {/* Actions Row */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!emailInput) {
                      emailInputRef.current?.focus();
                    } else {
                      handleEmailSubmit();
                    }
                  }}
                  className="text-sm font-medium text-[#A8C7FA] hover:underline cursor-pointer"
                >
                  Create account
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#A8C7FA] hover:bg-[#93B7F8] active:bg-[#7CA9F5] text-[#041E49] text-sm font-medium transition-colors shadow-none cursor-pointer flex items-center justify-center min-w-[84px] h-10"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Password Screen ("Welcome") matching video frame 00:10 */}
        {step === 'password' && (
          <div className="flex flex-col animate-in fade-in duration-200">
            {/* Target App Brand Logo & Name */}
            <div className="mb-6 flex items-center">
              <span className="text-2xl font-black italic tracking-wide text-[#F4F7F0]">
                Sport<span className="text-[#C8FF2E]">Sync</span>
              </span>
            </div>

            {/* Heading: "Welcome" */}
            <h1 className="text-[32px] sm:text-[36px] font-normal text-[#E3E3E3] tracking-normal leading-tight mb-3">
              Welcome
            </h1>

            {/* Email Chip Pill (click to change account) */}
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setStep('email');
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#8E918F]/50 hover:bg-white/5 transition-colors text-xs sm:text-sm text-[#E3E3E3] mb-8 max-w-fit group cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[#C4C7C5]">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="truncate max-w-[200px] sm:max-w-[260px] font-medium">{emailInput}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#C4C7C5] group-hover:text-white shrink-0" />
            </button>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col">
              {/* Outlined Material 3 Password input */}
              <div className="relative mb-3">
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    id="passwordInputId"
                    name="password"
                    autoComplete="current-password"
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className={`w-full h-14 px-4 bg-transparent rounded-[4px] text-base text-[#E3E3E3] focus:outline-none transition-all ${
                      errorMsg
                        ? 'border-2 border-[#F2B8B5]'
                        : isPasswordFocused
                        ? 'border-2 border-[#A8C7FA]'
                        : 'border border-[#8E918F] hover:border-[#C4C7C5]'
                    }`}
                  />
                  <label
                    htmlFor="passwordInputId"
                    onClick={() => passwordInputRef.current?.focus()}
                    className={`absolute pointer-events-none transition-all duration-150 select-none ${
                      isPasswordFocused || passwordInput
                        ? '-top-2.5 left-3 px-1.5 text-xs bg-[#131314]'
                        : 'top-4 left-4 text-base'
                    } ${
                      errorMsg
                        ? 'text-[#F2B8B5]'
                        : isPasswordFocused
                        ? 'text-[#A8C7FA]'
                        : 'text-[#8E918F]'
                    }`}
                  >
                    Enter your password
                  </label>
                </div>

                {/* Error state */}
                {errorMsg && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#F2B8B5]">
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              {/* Show Password Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer text-sm text-[#E3E3E3] select-none mb-8">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 rounded-[2px] bg-transparent border-[#8E918F] accent-[#A8C7FA] cursor-pointer"
                />
                <span>Show password</span>
              </label>

              {/* Privacy & Terms Consent Notice */}
              <p className="text-xs sm:text-[13px] text-[#C4C7C5] leading-relaxed mb-10">
                Before using this app, you can review {APP_CONFIG.appName}&apos;s{' '}
                <a href="#" className="text-[#A8C7FA] hover:underline font-medium">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="#" className="text-[#A8C7FA] hover:underline font-medium">
                  Terms of Service
                </a>
                .
              </p>

              {/* Actions Row: "Try another way" on left, "Next" pill button on right */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setStep('email');
                  }}
                  className="text-sm font-medium text-[#A8C7FA] hover:underline cursor-pointer"
                >
                  Try another way
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#A8C7FA] hover:bg-[#93B7F8] active:bg-[#7CA9F5] text-[#041E49] text-sm font-medium transition-colors shadow-none cursor-pointer flex items-center justify-center min-w-[84px] h-10"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: Permissions / Consent Screen ("Sign in to SportSync") matching video frame 00:17 */}
        {step === 'consent' && (
          <div className="flex flex-col animate-in fade-in duration-200">
            {/* Heading: "Sign in to SportSync" */}
            <h1 className="text-[28px] sm:text-[32px] font-normal text-[#E3E3E3] tracking-normal leading-tight mb-3">
              Sign in to {APP_CONFIG.appName}
            </h1>

            {/* Email Chip Pill */}
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setStep('email');
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#8E918F]/50 hover:bg-white/5 transition-colors text-xs sm:text-sm text-[#E3E3E3] mb-6 max-w-fit group cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[#C4C7C5]">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="truncate max-w-[200px] sm:max-w-[260px] font-medium">{emailInput}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#C4C7C5] group-hover:text-white shrink-0" />
            </button>

            {/* Scope Explanation Header */}
            <p className="text-sm text-[#E3E3E3] mb-4">
              Google will allow <span className="font-medium text-white">{APP_CONFIG.appName}</span> to access this info about you:
            </p>

            {/* Requested Scopes Card */}
            <div className="border-t border-b border-white/10 py-3.5 space-y-4 mb-6">
              {/* Permission 1: Name and profile picture */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#A8C7FA] shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#E3E3E3] truncate">
                    {derivedFullName}
                  </div>
                  <div className="text-xs text-[#C4C7C5]">
                    Name and profile picture
                  </div>
                </div>
              </div>

              {/* Permission 2: Email address */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#A8C7FA] shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#E3E3E3] truncate">
                    {emailInput}
                  </div>
                  <div className="text-xs text-[#C4C7C5]">
                    Email address
                  </div>
                </div>
              </div>
            </div>

            {/* Informational & Policy Explanations */}
            <div className="space-y-3 text-xs text-[#C4C7C5] leading-relaxed mb-8">
              <p>
                Review {APP_CONFIG.appName}&apos;s{' '}
                <a href="#" className="text-[#A8C7FA] hover:underline font-medium">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="#" className="text-[#A8C7FA] hover:underline font-medium">
                  Terms of Service
                </a>{' '}
                to understand how {APP_CONFIG.appName} will process and protect your data.
              </p>
              <p>
                To make changes at any time, go to your{' '}
                <a href="#" className="text-[#A8C7FA] hover:underline font-medium">
                  Google Account
                </a>
                .
              </p>
              <p>
                <a href="#" className="text-[#A8C7FA] hover:underline font-medium">
                  Learn more about Sign in with Google.
                </a>
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-[#F2B8B5]">
                {errorMsg}
              </div>
            )}

            {isSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#A8C7FA]/15 text-[#A8C7FA] flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <p className="text-sm font-medium text-[#E3E3E3]">Signed in successfully</p>
                <p className="text-xs text-[#8E918F]">Redirecting to {APP_CONFIG.appName}...</p>
              </div>
            ) : (
              /* Bottom Actions Row: Cancel on left, Continue pill on right */
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="text-sm font-medium text-[#A8C7FA] hover:underline cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConsentConfirm}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-full bg-[#A8C7FA] hover:bg-[#93B7F8] active:bg-[#7CA9F5] text-[#041E49] text-sm font-medium transition-colors shadow-none cursor-pointer disabled:opacity-60 flex items-center justify-center min-w-[96px] h-10"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#041E49]" />
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Google Footer (Language & Legal Links) matching reference across all steps */}
      <div className="w-full max-w-[448px] mx-auto mt-auto pt-8 flex items-center justify-between text-xs text-[#C4C7C5]">
        <div className="flex items-center gap-1 cursor-pointer hover:text-[#E3E3E3]">
          <span>English (United States)</span>
          <span className="text-[10px] ml-0.5">▼</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hover:text-[#E3E3E3] cursor-pointer transition-colors">Help</span>
          <span className="hover:text-[#E3E3E3] cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-[#E3E3E3] cursor-pointer transition-colors">Terms</span>
        </div>
      </div>
    </div>
  );
}
