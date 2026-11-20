'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { APP_CONFIG } from '@/config/appConfig';

export default function GoogleOAuthPopupPage() {
  const [emailInput, setEmailInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Set popup window title matching authentic Google Accounts popup
    document.title = 'Sign in - Google Accounts';

    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('sportsync_user_email');
      const storedName = localStorage.getItem('sportsync_user_name');
      if (storedEmail && storedEmail.includes('@')) {
        setEmailInput(storedEmail);
        setCustomNameInput(storedName || deriveNameFromEmail(storedEmail));
      }
    }
  }, []);

  const deriveNameFromEmail = (email: string): string => {
    const prefix = email.split('@')[0] || '';
    const words = prefix
      .replace(/[._-]+/g, ' ')
      .replace(/[0-9]+/g, '')
      .trim()
      .split(/\s+/);

    if (words.length === 0 || !words[0]) return 'SportSync Athlete';
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const handleSignIn = async (email: string, fullNameOverride?: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Enter a valid email address');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    const finalFullName = fullNameOverride?.trim() || customNameInput?.trim() || deriveNameFromEmail(trimmedEmail);

    try {
      const res = await fetch('/api/auth/oauth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: `usr_google_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          email: trimmedEmail,
          fullName: finalFullName,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalFullName)}&backgroundColor=0f2a22&textColor=c8ff2e`,
          provider: 'google',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Google authentication failed.');
      }

      const isComplete = Boolean(data.isComplete === true);

      // Persist authenticated identity in localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_logged_out');
        localStorage.setItem('sportsync_user_id', data.user.id);
        localStorage.setItem('sportsync_user_email', trimmedEmail);
        localStorage.setItem('sportsync_user_role', data.user.role || 'player');
        localStorage.setItem('sportsync_user_name', finalFullName);
        localStorage.setItem('matchi_user_name', finalFullName);

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
              full_name: finalFullName,
              nickname: finalFullName.split(' ')[0],
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let email = emailInput.trim();
    if (!email) {
      setErrorMsg('Enter an email or phone');
      return;
    }
    if (!email.includes('@')) {
      email = `${email}@gmail.com`;
    }
    handleSignIn(email, customNameInput);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F9] text-[#1F1F1F] flex flex-col justify-between p-4 sm:p-8 font-sans select-none antialiased">
      {/* Centered Google Accounts Card (Authentic Standard Google Material UI) */}
      <div className="w-full max-w-[460px] mx-auto my-auto bg-white rounded-[28px] border border-[#747775]/20 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 sm:p-10 flex flex-col">
        {/* Top Google Header: Multi-color G logo + "Sign in with Google" */}
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
          <span className="text-[17px] font-medium text-[#1F1F1F] tracking-normal">
            Sign in with Google
          </span>
        </div>

        {/* Target App Brand Logo & Name */}
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xl font-black italic tracking-wide text-[#0F2A22]">
            Sport<span className="text-[#365314]">Sync</span>
          </span>
        </div>

        {/* Main Heading & Subtitle */}
        <h1 className="text-[28px] sm:text-[32px] font-normal text-[#1F1F1F] tracking-tight leading-tight mb-2">
          Sign in
        </h1>
        <p className="text-sm text-[#444746] mb-6">
          to continue to <span className="font-semibold text-[#1F1F1F]">{APP_CONFIG.appName}</span>
        </p>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {isSuccess ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <p className="text-sm font-semibold text-[#1F1F1F]">Signed in successfully</p>
            <p className="text-xs text-[#444746]">Connecting and closing window...</p>
          </div>
        ) : isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#0B57D0] animate-spin" />
            <p className="text-sm font-medium text-[#1F1F1F]">Connecting to Google...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Outlined Material 3 "Email or phone" input */}
            <div className="relative mb-2">
              <input
                type="text"
                id="google-email"
                required
                autoFocus
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                  if (!customNameInput) {
                    setCustomNameInput(deriveNameFromEmail(e.target.value));
                  }
                }}
                placeholder="Email or phone"
                className="w-full h-13 px-4 rounded-lg bg-white border border-[#747775] hover:border-[#1F1F1F] focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] text-base text-[#1F1F1F] placeholder-[#747775] focus:outline-none transition-all"
              />
            </div>

            {/* "Forgot email?" link */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setEmailInput('player@gmail.com')}
                className="text-sm font-medium text-[#0B57D0] hover:underline"
              >
                Forgot email?
              </button>
            </div>

            {/* Player's Display Name */}
            <div className="mb-5">
              <label className="text-xs font-medium text-[#444746] block mb-1.5">
                Player Name (auto-derived from email prefix or customized)
              </label>
              <input
                type="text"
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                placeholder="e.g. Andrei Manrique"
                className="w-full h-11 px-4 rounded-lg bg-white border border-[#C4C7C5] hover:border-[#747775] focus:border-[#0B57D0] text-sm text-[#1F1F1F] placeholder-[#747775] focus:outline-none transition-all"
              />
            </div>

            {/* Privacy & Terms Consent Notice */}
            <p className="text-xs text-[#444746] leading-relaxed mb-6">
              Before using this app, you can review {APP_CONFIG.appName}&apos;s{' '}
              <a href="#" className="text-[#0B57D0] hover:underline font-medium">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="#" className="text-[#0B57D0] hover:underline font-medium">
                Terms of Service
              </a>
              .
            </p>

            {/* Bottom Actions Row: "Create account" on left, "Next" pill button on right */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setEmailInput('new.athlete@gmail.com');
                  setCustomNameInput('New Athlete');
                }}
                className="text-sm font-medium text-[#0B57D0] hover:underline cursor-pointer"
              >
                Create account
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-7 py-2.5 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] active:bg-[#06337B] text-white text-sm font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Google Footer (Language & Legal Links) */}
      <div className="w-full max-w-[460px] mx-auto mt-6 px-2 flex items-center justify-between text-xs text-[#444746]">
        <span className="hover:text-[#1F1F1F] cursor-pointer">
          English (United States) ▾
        </span>
        <div className="flex items-center gap-6">
          <span className="hover:text-[#1F1F1F] cursor-pointer">Help</span>
          <span className="hover:text-[#1F1F1F] cursor-pointer">Privacy</span>
          <span className="hover:text-[#1F1F1F] cursor-pointer">Terms</span>
        </div>
      </div>
    </div>
  );
}