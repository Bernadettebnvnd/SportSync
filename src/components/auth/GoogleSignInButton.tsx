'use client';

import React, { useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { GoogleSignInModal } from './GoogleSignInModal';
import { Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  onError?: (errorMsg: string) => void;
  onSuccess?: (isNewUser?: boolean) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  label = 'Continue with Google',
  className = '',
  disabled = false,
  onError,
  onSuccess,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    // If Supabase is configured with real cloud OAuth, initiate Google OAuth redirect
    if (isSupabaseConfigured) {
      try {
        setIsLoading(true);
        const supabase = getSupabaseClient();
        if (supabase) {
          // Clear any stale logged out flags prior to attempting sign-in
          if (typeof window !== 'undefined') {
            localStorage.removeItem('sportsync_logged_out');
          }

          const callbackUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : '/auth/callback';

          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: callbackUrl,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          });

          if (error) {
            setIsLoading(false);
            const errorMsg = error.message || 'Google sign-in failed.';
            onError?.(errorMsg);
            // If OAuth provider is disabled or missing credentials in Supabase Dashboard,
            // fall back to the interactive modal so the user can still proceed with authentication
            setIsModalOpen(true);
            return;
          }

          // If Supabase returns a direct OAuth URL and did not automatically navigate
          if (data?.url && typeof window !== 'undefined') {
            window.location.href = data.url;
            return;
          }
          return;
        }
      } catch (err: unknown) {
        setIsLoading(false);
        const msg = err instanceof Error ? err.message : 'Google sign-in encountered an error.';
        onError?.(msg);
        setIsModalOpen(true);
        return;
      }
    }

    // Supabase not configured or in local mode: open authentic Google Accounts modal
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-label="Continue with Google"
        className={`group relative w-full h-12 sm:h-13 px-6 rounded-full bg-white hover:bg-[#F9FAFB] active:bg-[#F3F4F6] border border-[#D1D5DB] hover:border-[#9CA3AF] text-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-md transition-all duration-200 active:scale-[0.99] flex items-center justify-center select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
      >
        {/* Google "G" Brand Icon anchored to left, exactly matching the reference design */}
        <div className="absolute left-4 sm:left-6 flex items-center justify-center shrink-0">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
          ) : (
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
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
          )}
        </div>

        {/* Centered label matching reference pill button typography */}
        <span className="font-semibold text-sm sm:text-[15px] text-[#111827] tracking-tight">
          {isLoading ? 'Connecting to Google...' : label}
        </span>
      </button>

      {/* Google Accounts Sign-In Window Modal matching image_a4d81c1e */}
      <GoogleSignInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onSuccess}
        onError={onError}
      />
    </>
  );
};
