'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMatchiStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  onError?: (errorMsg: string) => void;
  onSuccess?: (isNewUser?: boolean, user?: any) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  label = 'Continue with Google',
  className = '',
  disabled = false,
  onError,
  onSuccess,
}) => {
  const { setAuthenticatedUser } = useMatchiStore();
  const [isLoading, setIsLoading] = useState(false);

  // Listen for authentication completion postMessage from popup window
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (typeof window !== 'undefined' && event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { user, isComplete } = event.data;
        setIsLoading(false);

        const isOwner = user?.role === 'venue_owner' || user?.role === 'organizer';
        const isCompleteUser = Boolean(
          isComplete === true ||
          user?.onboarding_completed === true ||
          user?.has_completed_onboarding === true ||
          ((Array.isArray(user?.preferred_sports) && user.preferred_sports.length > 0) || user?.primary_sport)
        );

        if (user) {
          setAuthenticatedUser({
            ...user,
            primary_sport: isCompleteUser ? (user.primary_sport || '') : ('' as any),
            preferred_sports: isCompleteUser ? (user.preferred_sports || []) : [],
            skill_level: isCompleteUser ? (user.skill_level || '') : ('' as any),
            city: isCompleteUser ? (user.city || '') : '',
            onboarding_completed: isCompleteUser,
            has_completed_onboarding: isCompleteUser,
          });
        }

        if (typeof window !== 'undefined') {
          localStorage.removeItem('sportsync_logged_out');
          localStorage.setItem('sportsync_user_id', user?.id);
          localStorage.setItem('sportsync_user_email', user?.email);
          localStorage.setItem('sportsync_user_role', user?.role || 'player');
          localStorage.setItem('sportsync_user_name', user?.full_name || '');
          localStorage.setItem('matchi_user_name', user?.full_name || '');

          if (isCompleteUser) {
            localStorage.removeItem('sportsync_pending_onboarding');
            localStorage.setItem('matchi_onboarding_completed', 'true');
            localStorage.setItem('sportsync_onboarding_completed', 'true');
            const userSports = Array.isArray(user?.preferred_sports) && user.preferred_sports.length > 0
              ? user.preferred_sports.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
              : [];
            localStorage.setItem(
              'sportsync_user_profile',
              JSON.stringify({
                id: user?.id,
                name: user?.full_name,
                username: `@${user?.nickname || user?.email?.split('@')[0]}`,
                role: user?.role || 'player',
                city: user?.city || '',
                primarySport: user?.primary_sport || '',
                preferredSports: userSports,
                skillLevel: user?.skill_level ? (user.skill_level.charAt(0).toUpperCase() + user.skill_level.slice(1)) : '',
                onboardingCompleted: true,
                isGuest: false,
              })
            );
          } else {
            localStorage.setItem('sportsync_pending_onboarding', 'true');
            localStorage.removeItem('matchi_onboarding_completed');
            localStorage.removeItem('sportsync_onboarding_completed');
            localStorage.removeItem('sportsync_user_profile');
            localStorage.removeItem('sportsync_user_city');
            localStorage.removeItem('sportsync_user_sports');
            localStorage.removeItem('sportsync_user_skill');
          }
        }

        if (onSuccess) {
          onSuccess(!isCompleteUser, user);
        } else if (typeof window !== 'undefined') {
          window.location.href = isCompleteUser ? (isOwner ? '/organizer' : '/') : '/onboarding';
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [onSuccess, setAuthenticatedUser]);

  // Handle Google Sign In click: opens standard native browser popup window
  const handleClick = useCallback(() => {
    setIsLoading(true);

    const width = 500;
    const height = 640;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback';

    // 1. If direct Google Client ID is explicitly configured, open official Google Accounts OAuth
    if (googleClientId && googleClientId !== 'placeholder') {
      const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        googleClientId
      )}&redirect_uri=${encodeURIComponent(
        callbackUrl
      )}&response_type=code&scope=${encodeURIComponent(
        'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
      )}&access_type=offline&prompt=consent`;

      const popup = window.open(
        googleOAuthUrl,
        'google_signin_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=no,resizable=yes,scrollbars=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = googleOAuthUrl;
        return;
      }

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setIsLoading(false);
        }
      }, 500);
      return;
    }

    // 2. Open SportSync Google Sign-In Popup directly.
    // Avoids raw Supabase 400 "Unsupported provider: provider is not enabled" when
    // Google OAuth is not enabled in the cloud Supabase project dashboard.
    const popupUrl = '/auth/google-popup';
    const popup = window.open(
      popupUrl,
      'google_signin_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=no,resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = popupUrl;
      return;
    }

    // Monitor popup lifecycle to reset loading state if closed manually
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setIsLoading(false);
      }
    }, 500);
  }, []);

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
        {isLoading ? 'Opening Google...' : label}
      </span>
    </button>
  );
};

