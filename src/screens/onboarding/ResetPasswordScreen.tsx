'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowLeft, KeyRound, Info } from 'lucide-react';
import { SportSyncBrandLogo } from '@/components/ui/SportSyncBrandLogo';

interface ResetPasswordScreenProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  onSuccess,
  onBack,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // Prevent any onboarding guard from intercepting this recovery session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sportsync_recovery_mode', 'true');
    }

    const checkSession = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase || !isSupabaseConfigured) return;

        // Listen for recovery event
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (isCancelled) return;
          if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
            setHasActiveSession(true);
            setErrorMessage(null);
          }
        });

        // Check search params for code
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (code) {
            const { data } = await supabase.auth.exchangeCodeForSession(code).catch(() => ({ data: null }));
            if (data?.session && !isCancelled) {
              setHasActiveSession(true);
            }
          }

          // Check hash params
          if (window.location.hash) {
            const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const accessToken = hash.get('access_token');
            const refreshToken = hash.get('refresh_token');
            if (accessToken) {
              const { data } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              }).catch(() => ({ data: null }));
              if (data?.session && !isCancelled) {
                setHasActiveSession(true);
              }
            }
          }
        }

        const { data } = await supabase.auth.getSession();
        if (data?.session && !isCancelled) {
          setHasActiveSession(true);
        }

        return () => {
          authListener?.subscription.unsubscribe();
        };
      } catch (e) {
        console.warn('[ResetPasswordScreen] Init note:', e);
      }
    };

    checkSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage('Authentication service is currently unavailable.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('Your password has been successfully updated! Redirecting to login...');

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('sportsync_recovery_mode');
        localStorage.removeItem('sportsync_pending_onboarding');
      }

      await supabase.auth.signOut().catch(() => {});

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (typeof window !== 'undefined') {
          window.location.href = '/?auth=signin';
        }
      }, 2000);
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Failed to update password.';
      if (message.includes('Auth session missing') || message.includes('session has expired') || message.includes('user not found')) {
        message = 'Active recovery session missing. Please open the reset link sent to your email to authenticate the password change.';
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/?auth=signin';
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#0B0F0C] text-[#F4F7F0] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-md bg-[#141A15] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Brand Header - Centered In The Middle */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <SportSyncBrandLogo variant="wordmark" imgClassName="h-10 sm:h-11" />
          </div>
          <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-[#A5B0A6] mt-1.5 leading-relaxed max-w-xs">
            Create a new secure password for your SportSync account.
          </p>
        </div>

        {/* Localhost Preview Notice */}
        {!hasActiveSession && !successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-[#C8FF2E]/5 border border-[#C8FF2E]/20 text-[#A5B0A6] text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#C8FF2E] flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed text-[11px]">
              Ready for password reset. Open the link from your recovery email to submit directly to Supabase.
            </span>
          </div>
        )}

        {/* Success Confirmation State */}
        {successMessage ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 text-[#C8FF2E] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white mb-2">Password Updated!</h2>
            <p className="text-xs text-[#A5B0A6] mb-6 leading-relaxed max-w-xs">
              {successMessage}
            </p>
            <button
              type="button"
              onClick={handleBackToLogin}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#C8FF2E] hover:bg-[#b5ec20] text-[#0B0F0C] font-bold text-xs transition-colors"
            >
              Sign In Now
            </button>
          </div>
        ) : (
          /* Reset Password Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* New Password Input */}
            <div>
              <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block mb-1.5 ml-1">
                New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-[#6F7B71]" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full h-12 pl-10 pr-11 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E] transition-colors"
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 text-[#6F7B71] hover:text-[#C8FF2E] transition-colors p-1"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block mb-1.5 ml-1">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-[#6F7B71]" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full h-12 pl-10 pr-11 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E] transition-colors"
                  placeholder="Re-enter your new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 text-[#6F7B71] hover:text-[#C8FF2E] transition-colors p-1"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Validation Feedback */}
            {newPassword.length > 0 && (
              <div className="space-y-1 px-1">
                <div className={`text-[11px] flex items-center gap-1.5 ${newPassword.length >= 6 ? 'text-[#C8FF2E]' : 'text-[#6F7B71]'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>At least 6 characters</span>
                </div>
                {confirmPassword.length > 0 && (
                  <div className={`text-[11px] flex items-center gap-1.5 ${newPassword === confirmPassword ? 'text-[#C8FF2E]' : 'text-red-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !newPassword || !confirmPassword}
              className="w-full h-12 mt-2 rounded-2xl bg-[#C8FF2E] hover:bg-[#b5ec20] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0F0C] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(200,255,46,0.25)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>

            {/* Back to Login link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-xs text-[#A5B0A6] hover:text-[#C8FF2E] transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
