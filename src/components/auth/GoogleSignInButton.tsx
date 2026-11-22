'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMatchiStore } from '@/lib/store';
import { UserRole } from '@/types';
import { Loader2, ExternalLink, X, ShieldAlert } from 'lucide-react';

interface GoogleSignInButtonProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  intendedRole?: 'player' | 'facility_owner';
  onError?: (errorMsg: string) => void;
  onSuccess?: (isNewUser?: boolean, user?: { role?: string; [key: string]: unknown }) => void;
}

interface ProviderSetupGuide {
  error: string;
  supabaseUrl?: string;
  dashboardUrl?: string;
  callbackUrl?: string;
  instructions?: string[];
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (notification?: (notification: unknown) => void) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  label = 'Continue with Google',
  className = '',
  disabled = false,
  intendedRole,
  onError,
  onSuccess,
}) => {
  const { setAuthenticatedUser } = useMatchiStore();
  const [isLoading, setIsLoading] = useState(false);
  const [setupGuide, setSetupGuide] = useState<ProviderSetupGuide | null>(null);
  const popupRef = useRef<Window | null>(null);

  // Synchronize authenticated user profile to local storage & state
  const handleAuthCompleted = useCallback(
    (user: Record<string, unknown>, isComplete: boolean) => {
      setIsLoading(false);

      const isOwner = user?.role === 'venue_owner' || user?.role === 'organizer';
      const isCompleteUser = Boolean(
        isComplete === true ||
          user?.onboarding_completed === true ||
          user?.has_completed_onboarding === true
      );

      const resolvedRole: UserRole =
        user?.role === 'venue_owner' || user?.role === 'organizer' || user?.role === 'facility_owner'
          ? 'venue_owner'
          : 'player';

      setAuthenticatedUser({
        ...user,
        id: String(user.id || ''),
        email: String(user.email || ''),
        full_name: String(user.full_name || ''),
        nickname: String(user.nickname || ''),
        role: resolvedRole,
        onboarding_completed: isCompleteUser,
        has_completed_onboarding: isCompleteUser,
      });

      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_logged_out');
        localStorage.setItem('sportsync_user_id', String(user.id || ''));
        localStorage.setItem('sportsync_user_email', String(user.email || ''));
        localStorage.setItem('sportsync_user_role', String(user.role || 'player'));
        localStorage.setItem('sportsync_user_name', String(user.full_name || ''));
        localStorage.setItem('matchi_user_name', String(user.full_name || ''));

        if (isCompleteUser) {
          sessionStorage.removeItem('sportsync_just_registered');
          localStorage.removeItem('sportsync_pending_onboarding');
          localStorage.setItem('matchi_onboarding_completed', 'true');
          localStorage.setItem('sportsync_onboarding_completed', 'true');
        } else {
          localStorage.setItem('sportsync_pending_onboarding', 'true');
          localStorage.removeItem('matchi_onboarding_completed');
          localStorage.removeItem('sportsync_onboarding_completed');
        }
      }

      if (onSuccess) {
        onSuccess(!isCompleteUser, user);
      } else if (typeof window !== 'undefined') {
        window.location.href = isCompleteUser
          ? isOwner
            ? '/organizer'
            : '/'
          : isOwner
          ? '/onboarding?role=owner'
          : '/onboarding';
      }
    },
    [onSuccess, setAuthenticatedUser]
  );

  // Handle Google Identity Services (GIS) ID token verification
  const handleGisCredential = useCallback(
    async (credential: string) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential, intendedRole }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.user) {
          throw new Error(data.error || 'Google authentication failed.');
        }

        handleAuthCompleted(data.user, Boolean(data.isComplete));
      } catch (err: unknown) {
        setIsLoading(false);
        const msg = err instanceof Error ? err.message : 'Google authentication verification failed.';
        onError?.(msg);
      }
    },
    [handleAuthCompleted, intendedRole, onError]
  );

  // Initialize official Google Identity Services SDK if client ID is configured
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId || typeof window === 'undefined') return;

    const initGis = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (res: { credential?: string }) => {
              if (res?.credential) {
                handleGisCredential(res.credential);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
        } catch (e) {
          console.warn('[Google Identity Services] Initialize note:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGis();
    } else {
      const existingScript = document.getElementById('google-gsi-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGis;
        document.body.appendChild(script);
      }
    }
  }, [handleGisCredential]);

  // Listen for postMessage from official OAuth popup window
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (typeof window !== 'undefined' && event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { user, isComplete } = event.data;
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        handleAuthCompleted(user, Boolean(isComplete));
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setIsLoading(false);
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        onError?.(event.data.error || 'Google authentication was cancelled or encountered an error.');
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [handleAuthCompleted, onError]);

  // Handle Google Sign In click: uses real Google Accounts OAuth popup (like common websites)
  const handleClick = useCallback(async () => {
    setIsLoading(true);
    setSetupGuide(null);

    // Save intended role for session restore
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sportsync_logged_out');
      if (intendedRole) {
        sessionStorage.setItem('sportsync_intended_role', intendedRole);
        localStorage.setItem('sportsync_intended_role', intendedRole);
      } else {
        sessionStorage.removeItem('sportsync_intended_role');
        localStorage.removeItem('sportsync_intended_role');
      }
    }

    // Centered popup dimensions matching common websites (e.g. Spotify, Canva, TikTok)
    const width = 500;
    const height = 640;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    // Open placeholder popup synchronously on click to satisfy browser popup blockers
    let popup: Window | null = null;
    try {
      popup = window.open(
        'about:blank',
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=no,resizable=yes,scrollbars=yes`
      );
      popupRef.current = popup;
    } catch {
      popup = null;
    }

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const roleParam = intendedRole ? `&intended_role=${encodeURIComponent(intendedRole)}` : '';
      const res = await fetch(`/api/auth/google?origin=${encodeURIComponent(origin)}${roleParam}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        if (popup && !popup.closed) {
          popup.close();
        }
        setIsLoading(false);

        if (data.code === 'PROVIDER_NOT_ENABLED') {
          setSetupGuide({
            error: data.error || 'Google Sign-In is not enabled in your Supabase project dashboard.',
            supabaseUrl: data.supabaseUrl,
            dashboardUrl: data.dashboardUrl,
            callbackUrl: data.callbackUrl,
            instructions: data.instructions,
          });
          onError?.(
            'Google Sign-In is not enabled yet in your Supabase project. See instructions above or use email sign-in.'
          );
        } else {
          onError?.(data.error || 'Failed to initiate Google Sign-In.');
        }
        return;
      }

      // Navigate popup to the authentic Google Accounts authentication URL
      if (popup && !popup.closed) {
        popup.location.href = data.authUrl;

        // Monitor popup lifecycle: reset loading if user closes popup window manually
        const timer = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(timer);
            setIsLoading(false);
          }
        }, 600);
      } else {
        // Fallback for strict environments that block popups entirely: same-window redirect
        window.location.href = data.authUrl;
      }
    } catch (err: unknown) {
      if (popup && !popup.closed) {
        popup.close();
      }
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Failed to connect to Google.';
      onError?.(msg);
    }
  }, [intendedRole, onError]);

  return (
    <>
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

      {/* Helpful Setup Guidance Modal if Supabase Google Provider is not enabled yet */}
      {setupGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#141A15] border border-amber-500/30 text-[#F4F7F0] shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setSetupGuide(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#F4F7F0]">
                  Enable Google Provider
                </h3>
                <p className="text-xs text-amber-300/80">Setup required in Supabase</p>
              </div>
            </div>

            <div className="text-xs text-[#C2CDC3] leading-relaxed space-y-2 bg-[#0B0F0C] p-4 rounded-2xl border border-white/5">
              <p className="font-semibold text-white">To activate real Google Sign-In:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#A5B0A6]">
                <li>Open your Supabase project dashboard (Auth &gt; Providers &gt; Google)</li>
                <li>Turn ON &quot;Enable Sign in with Google&quot;</li>
                <li>
                  In Google Cloud Console, add Redirect URI:
                  <code className="block mt-1 p-1 bg-white/5 rounded text-[10px] text-amber-200 select-all font-mono break-all">
                    {setupGuide.callbackUrl || `${setupGuide.supabaseUrl}/auth/v1/callback`}
                  </code>
                </li>
                <li>Enter your Google Client ID &amp; Secret and click Save</li>
              </ol>
            </div>

            <div className="flex gap-2 pt-1">
              {setupGuide.dashboardUrl && (
                <a
                  href={setupGuide.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#C8FF2E] hover:bg-[#b5ec20] text-[#0B0F0C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Open Supabase Auth</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSetupGuide(null)}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-[#F4F7F0] font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
