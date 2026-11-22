/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowLeft, ArrowRight, User, Building2, AlertCircle, CheckCircle2, Eye, EyeOff, RotateCw } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { useMatchiStore } from '../../lib/store';
import { validateRealEmail } from '@/lib/validation/emailValidator';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { SportSyncBrandLogo } from '@/components/ui/SportSyncBrandLogo';

export type AuthRole = 'player' | 'facility_owner';

interface AuthScreenProps {
  initialMode?: 'signup' | 'login';
  initialRole?: AuthRole;
  onSuccess: (role: AuthRole, isNewAccount?: boolean, user?: any) => void;
  onBack?: () => void;
  canGoBack?: boolean;
  onNavigateToResetPassword?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  initialRole = 'player',
  onSuccess,
  onBack,
  canGoBack = false,
  onNavigateToResetPassword,
}) => {
  const { currentUser, setAuthenticatedUser } = useMatchiStore();
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [selectedRole, setSelectedRole] = useState<AuthRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    setIsSignUp(initialMode === 'signup');
  }, [initialMode]);

  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  const handleSendResetEmail = async (targetEmail: string) => {
    const trimmedEmail = targetEmail.trim().toLowerCase();
    const emailValidation = validateRealEmail(trimmedEmail);
    if (!emailValidation.isValid) {
      setErrorMessage(emailValidation.error || 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage('Authentication service is currently unconfigured or unavailable. Please verify that Supabase environment variables are set.');
      setIsLoading(false);
      return;
    }

    try {
      // Dynamic origin handles both localhost (http://localhost:3000/auth/callback) and production (https://sportsync.ph/auth/callback)
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : 'https://sportsync.ph/auth/callback';

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (resetErr) {
        const msg = resetErr.message || '';
        if (msg.toLowerCase().includes('for security purposes') || msg.toLowerCase().includes('rate limit') || resetErr.status === 429) {
          setCooldown(60);
          throw new Error('For security purposes, you can only request a reset link once every 60 seconds. Please check your inbox or wait before retrying.');
        }
        throw new Error(msg || 'Failed to send reset link.');
      }

      setResetSent(true);
      setCooldown(60);
      setSuccessMessage(`Password reset link sent to ${trimmedEmail}! Please check your inbox and spam folder.`);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Failed to send reset link.';
      if (msg === 'Failed to fetch') {
        msg = 'Unable to reach the authentication service. Please verify your connection.';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Client-Side Validation - Real emails required for accounts
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (isSignUp) {
      const emailValidation = validateRealEmail(trimmedEmail);
      if (!emailValidation.isValid) {
        setErrorMessage(emailValidation.error || 'Please enter a real, valid email address. Fake or temporary accounts are forbidden.');
        setIsLoading(false);
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        setErrorMessage('Please enter a valid email address (e.g. player@example.com).');
        setIsLoading(false);
        return;
      }
    }

    // Password reset flow
    if (isPasswordReset) {
      await handleSendResetEmail(trimmedEmail);
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setErrorMessage(selectedRole === 'facility_owner' ? 'Please enter contact / owner name.' : 'Please enter your full name.');
      setIsLoading(false);
      return;
    }

    // 2. Perform Real Authentication Request via Backend API
    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const payload = isSignUp
        ? {
          email: trimmedEmail,
          password: cleanPassword,
          fullName: fullName.trim(),
          role: selectedRole === 'facility_owner' ? 'facility_owner' : 'player',
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
        throw new Error(data.error || (isSignUp ? 'Registration failed.' : 'Login failed. Please check credentials.'));
      }

      // Also sync client-side Supabase session if configured
      if (getSupabaseClient() && isSupabaseConfigured) {
        try {
          const client = getSupabaseClient();
          if (client) {
            await client.auth.signInWithPassword({
              email: trimmedEmail,
              password: cleanPassword,
            });
          }
        } catch (clientAuthErr) {
          console.warn('[AuthScreen] Client session sync notice:', clientAuthErr);
        }
      }

      // Update store user state with real authenticated session
      if (data.user) {
        // Role determination:
        // For existing login (!isSignUp): strictly use the existing account's database role
        // For new registration (isSignUp): use the selectedRole from UI
        const isDbOwner = Boolean(
          data.user.role === 'venue_owner' ||
          data.user.role === 'organizer' ||
          data.user.role === 'facility_owner' ||
          data.user.role === 'faculty'
        );
        const isFacility = isSignUp ? (selectedRole === 'facility_owner') : isDbOwner;
        const assignedRole = (isFacility ? 'venue_owner' : 'player') as any;

        // Check whether profile already exists and whether required setup fields are complete.
        // Existing users with completed profiles must proceed directly to their Player Dashboard.
        const isExplicitlyCompleted = Boolean(
          data.user.onboarding_completed === true || data.user.has_completed_onboarding === true
        );

        const hasRequiredPlayerFields = !isFacility && Boolean(
          data.user.full_name &&
          !['Player', 'Guest Player', 'Guest', 'SportSync Player', 'Google Player'].includes(data.user.full_name.trim()) &&
          ((Array.isArray(data.user.preferred_sports) && data.user.preferred_sports.length > 0) || data.user.primary_sport) &&
          Boolean(data.user.city || data.user.skill_level) &&
          data.user.onboarding_completed !== false
        );

        const hasRequiredOwnerFields = isFacility && Boolean(
          isExplicitlyCompleted ||
          (!isSignUp && data.user.full_name && data.user.onboarding_completed !== false)
        );

        // For new signups, strictly require onboarding! For existing logins, proceed to dashboard if fields are complete.
        const actualOnboardingCompleted = isSignUp
          ? false
          : (isExplicitlyCompleted || hasRequiredPlayerFields || hasRequiredOwnerFields);

        setAuthenticatedUser({
          id: data.user.id,
          auth_id: data.user.id,
          email: data.user.email,
          full_name: data.user.full_name,
          nickname: data.user.nickname,
          avatar_url: data.user.avatar_url,
          role: assignedRole,
          primary_sport: isSignUp ? ('' as any) : (data.user.primary_sport || (isFacility ? 'pickleball' : 'football')),
          preferred_sports: isSignUp ? [] : (data.user.preferred_sports || (isFacility ? ['pickleball', 'badminton'] : ['football'])),
          preferred_format: data.user.preferred_format || 'doubles',
          skill_level: isSignUp ? ('' as any) : (data.user.skill_level || 'intermediate'),
          city: data.user.city || 'Naga City',
          onboarding_completed: actualOnboardingCompleted,
          has_completed_onboarding: actualOnboardingCompleted,
        });

        if (typeof window !== 'undefined') {
          localStorage.removeItem('sportsync_logged_out');
          localStorage.removeItem('sportsync_guest');
          localStorage.setItem('sportsync_user_id', data.user.id);
          localStorage.setItem('sportsync_user_email', data.user.email);
          localStorage.setItem('sportsync_user_role', assignedRole);
          localStorage.setItem('sportsync_user_name', data.user.full_name);

          const cleanHandle = (data.user.nickname || (data.user.full_name ? data.user.full_name.split(' ')[0] : '') || data.user.email.split('@')[0] || 'player')
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '') || 'player';

          if (isSignUp) {
            // New registration strictly flags pending onboarding while immediately marking profile as authenticated (never guest)
            sessionStorage.setItem('sportsync_just_registered', 'true');
            localStorage.setItem('sportsync_pending_onboarding', 'true');
            localStorage.removeItem('matchi_onboarding_completed');
            localStorage.removeItem('sportsync_onboarding_completed');
            localStorage.removeItem('sportsync_skipped_onboarding');
            localStorage.removeItem('sportsync_user_sports');
            localStorage.removeItem('sportsync_user_skill');

            const initialProfile = {
              id: data.user.id,
              email: data.user.email,
              name: data.user.full_name,
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
          } else {
            // Returning user logging in: NEVER treat as new registration
            sessionStorage.removeItem('sportsync_just_registered');
            if (actualOnboardingCompleted) {
              localStorage.removeItem('sportsync_pending_onboarding');
              localStorage.setItem('matchi_onboarding_completed', 'true');
              localStorage.setItem('sportsync_onboarding_completed', 'true');
              localStorage.removeItem('sportsync_skipped_onboarding');

              const userSports = Array.isArray(data.user.preferred_sports) && data.user.preferred_sports.length > 0
                ? data.user.preferred_sports.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
                : ['Football'];
              const fullProfile = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.full_name,
                username: `@${cleanHandle}`,
                role: assignedRole,
                city: data.user.city || 'Naga City',
                primarySport: data.user.primary_sport || 'football',
                preferredSports: userSports,
                skillLevel: data.user.skill_level ? (data.user.skill_level.charAt(0).toUpperCase() + data.user.skill_level.slice(1)) : 'Intermediate',
                onboardingCompleted: true,
                isGuest: false,
              };
              localStorage.setItem('sportsync_user_profile', JSON.stringify(fullProfile));
              localStorage.setItem('sideline_user_profile', JSON.stringify(fullProfile));
            } else {
              localStorage.setItem('sportsync_pending_onboarding', 'true');
              localStorage.removeItem('matchi_onboarding_completed');
              localStorage.removeItem('sportsync_onboarding_completed');
              const incompleteProfile = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.full_name,
                username: `@${cleanHandle}`,
                role: assignedRole,
                city: data.user.city || 'Naga City',
                primarySport: data.user.primary_sport || '',
                preferredSports: Array.isArray(data.user.preferred_sports) ? data.user.preferred_sports : [],
                skillLevel: data.user.skill_level || '',
                onboardingCompleted: false,
                isGuest: false,
              };
              localStorage.setItem('sportsync_user_profile', JSON.stringify(incompleteProfile));
              localStorage.setItem('sideline_user_profile', JSON.stringify(incompleteProfile));
            }
          }
        }

        const detectedRole: AuthRole = isFacility ? 'facility_owner' : 'player';

        setSuccessMessage(
          isSignUp
            ? `Account registered successfully! Welcome to SportSync.`
            : 'Welcome back! Signed in.'
        );

        // Prevent any intermediate screen flashing: existing faculty accounts with complete profiles go directly to /organizer
        if (!isSignUp && isFacility && actualOnboardingCompleted) {
          if (typeof window !== 'undefined' && !window.location.port.includes('5173')) {
            window.location.href = '/organizer';
            return;
          }
        }

        setTimeout(() => onSuccess(detectedRole, isSignUp, data.user), 800);
      }
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Authentication failed. Please check credentials.';
      if (message === 'Failed to fetch') {
        message = 'Unable to connect to the authentication server. Please verify that the backend is running and reachable.';
      } else if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('rate_limit')) {
        message = 'Supabase email service is currently rate-limited. Tip: Use "Sign up with Google" above for instant access!';
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#0B0F0C] p-4 sm:p-6 pt-5 sm:pt-8 select-none overflow-y-auto no-scrollbar">
      {/* Top Header */}
      <div>
        {(isPasswordReset || (canGoBack && onBack)) && (
          <button
            type="button"
            onClick={() => {
              if (isPasswordReset) {
                setIsPasswordReset(false);
                setResetSent(false);
                setErrorMessage(null);
                setSuccessMessage(null);
              } else if (onBack) {
                onBack();
              }
            }}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header - Centered In The Middle */}
        <div className="flex flex-col items-center text-center mb-6 pt-1">
          <div className="flex items-center justify-center mb-3">
            <SportSyncBrandLogo
              variant="mark"
              imgClassName="w-14 h-14 sm:w-16 sm:h-16"
              alt="SportSync Logo"
            />
          </div>
          <h2 className="font-display font-bold text-2xl text-[#F4F7F0] tracking-tight">
            {isPasswordReset
              ? resetSent
                ? 'Check Your Inbox'
                : 'Reset your password'
              : isSignUp
                ? 'Create Account'
                : 'Welcome back'}
          </h2>
          <div className="text-xs text-[#A5B0A6] mt-1 font-medium">
            {isPasswordReset ? (
              <span>
                {resetSent
                  ? 'We sent a recovery link to your email'
                  : 'Enter your email to receive a recovery link'}
              </span>
            ) : isSignUp ? (
              <span>Find Players. Play Together.</span>
            ) : (
              <span>Log in to access your Player Hub</span>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 mb-4 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/30 text-[#C8FF2E] text-xs flex items-center gap-2 mb-4 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Primary OAuth Method: Continue with Google (Clean pill design matching reference) */}
        {!isPasswordReset && (
          <div className="mb-5 space-y-3">
            <GoogleSignInButton
              label={isSignUp ? 'Sign up with Google' : 'Continue with Google'}
              intendedRole={isSignUp ? selectedRole : undefined}
              onError={(err) => setErrorMessage(err)}
              onSuccess={(isNewUser, user) => {
                const isDbOwner =
                  user?.role === 'venue_owner' ||
                  user?.role === 'organizer' ||
                  user?.role === 'facility_owner';
                const isOwner = isNewUser ? (isDbOwner || selectedRole === 'facility_owner') : isDbOwner;
                onSuccess(isOwner ? 'facility_owner' : 'player', Boolean(isNewUser), user);
              }}
            />
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0B0F0C] px-3 text-[11px] font-semibold uppercase tracking-wider text-[#6F7B71] shrink-0">
                or continue with email
              </span>
              <div className="border-t border-white/10 w-full" />
            </div>
          </div>
        )}

        {/* Tab Switch: Log In vs Create Account */}
        {!isPasswordReset && (
          <div className="flex rounded-2xl bg-[#141A15] p-1 border border-white/5 mb-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${!isSignUp ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm' : 'text-[#A5B0A6] hover:text-white'
                }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${isSignUp ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm' : 'text-[#A5B0A6] hover:text-white'
                }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Role Choice for Registration: Continue as Player vs Register a Facility */}
        {isSignUp && !isPasswordReset && (
          <div className="mb-5 space-y-2">
            <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block ml-1">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('player')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all press-scale ${selectedRole === 'player'
                  ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_14px_rgba(200,255,46,0.15)]'
                  : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <User className={`w-4 h-4 ${selectedRole === 'player' ? 'text-[#C8FF2E]' : 'text-[#A5B0A6]'}`} />
                  <span className={`text-xs font-bold ${selectedRole === 'player' ? 'text-[#F4F7F0]' : 'text-[#A5B0A6]'}`}>
                    Player
                  </span>
                </div>
                <span className="text-[10px] text-[#6F7B71] leading-tight">
                  Join local games & complete rosters
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('facility_owner')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all press-scale ${selectedRole === 'facility_owner'
                  ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_14px_rgba(200,255,46,0.15)]'
                  : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className={`w-4 h-4 ${selectedRole === 'facility_owner' ? 'text-[#C8FF2E]' : 'text-[#A5B0A6]'}`} />
                  <span className={`text-xs font-bold ${selectedRole === 'facility_owner' ? 'text-[#F4F7F0]' : 'text-[#A5B0A6]'}`}>
                    Facility
                  </span>
                </div>
                <span className="text-[10px] text-[#6F7B71] leading-tight">
                  Host games & manage sports venues
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Form Fields & Confirmation State */}
        {isPasswordReset && resetSent ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/10 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 text-[#C8FF2E] flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F4F7F0]">Check your inbox</h3>
                <p className="text-xs text-[#A5B0A6] mt-1.5 leading-relaxed">
                  We’ve dispatched a recovery link to{' '}
                  <span className="font-semibold text-[#F4F7F0]">{email}</span>. Click the link in your email to choose a new password.
                </p>
              </div>
              <div className="text-[11px] text-[#6F7B71] bg-[#0B0F0C] p-2.5 rounded-xl border border-white/5 leading-relaxed">
                Tip: If you do not see the email within 1-2 minutes, check your spam or junk folder.
              </div>
            </div>

            {/* Resend Action with Supabase Cooldown */}
            <Button
              variant="primary"
              size="lg"
              type="button"
              onClick={() => handleSendResetEmail(email)}
              disabled={isLoading || cooldown > 0}
              className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.25)] flex items-center justify-center gap-2"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading
                ? 'Sending...'
                : cooldown > 0
                  ? `Resend link in ${cooldown}s`
                  : 'Resend Reset Link'}
            </Button>

            <div className="space-y-2 pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setResetSent(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full text-center text-xs text-[#C8FF2E] hover:underline font-semibold block"
              >
                Use a different email address
              </button>

              {onNavigateToResetPassword && (
                <button
                  type="button"
                  onClick={onNavigateToResetPassword}
                  className="w-full text-center text-xs text-[#A5B0A6] hover:text-[#F4F7F0] block"
                >
                  Already have a recovery link? Reset password here
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsPasswordReset(false);
                  setResetSent(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full text-center text-xs text-[#6F7B71] hover:text-[#A5B0A6] block"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && !isPasswordReset && (
              <div>
                <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block mb-1.5 ml-1">
                  {selectedRole === 'facility_owner' ? 'Contact / Owner Name' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
                  placeholder={selectedRole === 'facility_owner' ? 'e.g. Alex Morgan' : 'e.g. Alex Rivera'}
                  required
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-[#6F7B71]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full h-12 pl-10 pr-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
                  placeholder="your.email@sport.com"
                  required
                />
              </div>
            </div>

            {!isPasswordReset && (
              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block">
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPasswordReset(true);
                        setErrorMessage(null);
                      }}
                      className="text-[11px] text-[#C8FF2E] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[#6F7B71]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full h-12 pl-10 pr-11 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-[#6F7B71] hover:text-[#C8FF2E] transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 font-bold shadow-[0_8px_24px_rgba(200,255,46,0.25)]"
            >
              {isLoading
                ? 'Connecting...'
                : isPasswordReset
                  ? 'Send Reset Link'
                  : isSignUp
                    ? selectedRole === 'facility_owner'
                      ? 'Register Facility & Continue'
                      : 'Create Account'
                    : 'Log In'}
            </Button>

            {!isPasswordReset && (
              <div className="text-center pt-2">
                {isSignUp ? (
                  <p className="text-xs text-[#A5B0A6]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        setErrorMessage(null);
                      }}
                      className="text-[#C8FF2E] font-semibold hover:underline"
                    >
                      Log In
                    </button>
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-[#A5B0A6]">
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(true);
                          setErrorMessage(null);
                        }}
                        className="text-[#C8FF2E] font-semibold hover:underline"
                      >
                        Create an account
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {isPasswordReset && (
              <div className="space-y-2 pt-2 text-center">
                {onNavigateToResetPassword && (
                  <button
                    type="button"
                    onClick={onNavigateToResetPassword}
                    className="w-full text-center text-xs text-[#C8FF2E] hover:underline font-semibold block"
                  >
                    Already have a recovery link? Reset password here
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPasswordReset(false)}
                  className="w-full text-center text-xs text-[#A5B0A6] hover:text-[#F4F7F0]"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
