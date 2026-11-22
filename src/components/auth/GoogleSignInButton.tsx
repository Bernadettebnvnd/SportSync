'use client';

import React, { useState, useCallback } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  onError?: (errorMsg: string) => void;
  onSuccess?: (isNewUser?: boolean, user?: { role?: string; [key: string]: unknown }) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  label = 'Continue with Google',
  className = '',
  disabled = false,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Google authentication requires Supabase configuration.');
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_logged_out');
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Failed to initiate Google Sign-In.';
      onError?.(msg);
    }
  }, [onError]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label="Continue with Google"
      data-theme-ignore="true"
      style={{
        backgroundColor: '#FFFFFF',
        color: '#1F1F1F',
        borderColor: 'rgba(116, 119, 117, 0.4)',
      }}
      className={`google-signin-btn group relative w-full h-12 sm:h-13 px-6 rounded-full !bg-white hover:!bg-[#F8F9FA] active:!bg-[#F1F3F4] !border !border-[#747775]/40 hover:!border-[#747775] !text-[#1F1F1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-md transition-all duration-200 active:scale-[0.99] flex items-center justify-center select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
    >
      {/* Google "G" Brand Icon anchored to left */}
      <div className="absolute left-4 sm:left-6 flex items-center justify-center shrink-0">
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
        ) : (
          <svg
            className="w-5 h-5 shrink-0"
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
      <span
        style={{ color: '#1F1F1F' }}
        className="font-semibold text-sm sm:text-[15px] !text-[#1F1F1F] tracking-tight"
      >
        {isLoading ? 'Connecting to Google...' : label}
      </span>
    </button>
  );
};
