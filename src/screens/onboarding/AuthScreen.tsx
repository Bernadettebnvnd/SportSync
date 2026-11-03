import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowLeft, ArrowRight, ShieldCheck, User, Building2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { useMatchiStore } from '../../lib/store';
import { validateRealEmail } from '@/lib/validation/emailValidator';

export type AuthRole = 'player' | 'facility_owner';

interface AuthScreenProps {
  initialMode?: 'signup' | 'login';
  onSuccess: (role: AuthRole, isNewAccount?: boolean) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  onSuccess,
  onBack,
  canGoBack = false,
}) => {
  const { currentUser, setAuthenticatedUser } = useMatchiStore();
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [selectedRole, setSelectedRole] = useState<AuthRole>('player');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  useEffect(() => {
    setIsSignUp(initialMode === 'signup');
  }, [initialMode]);

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
      try {
        const supabase = getSupabaseClient();
        if (supabase && isSupabaseConfigured) {
          const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          });
          if (error) throw error;
        }
        setSuccessMessage('Password reset link sent! Check your inbox.');
        setTimeout(() => setIsPasswordReset(false), 2500);
      } catch (err: unknown) {
        let msg = err instanceof Error ? err.message : 'Failed to send reset link.';
        if (msg === 'Failed to fetch') {
          msg = 'Unable to reach the authentication service. Please verify your connection.';
        }
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
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

      // Update store user state with real authenticated session
      if (data.user) {
        const isNewUser = isSignUp;
        const isFacility = selectedRole === 'facility_owner' || data.user.role === 'venue_owner' || data.user.role === 'organizer';
        const assignedRole = (isFacility ? 'venue_owner' : (data.user.role || 'player')) as any;

        setAuthenticatedUser({
          id: data.user.id,
          auth_id: data.user.id,
          email: data.user.email,
          full_name: data.user.full_name,
          nickname: data.user.nickname,
          avatar_url: data.user.avatar_url,
          role: assignedRole,
          primary_sport: data.user.primary_sport || (isFacility ? 'pickleball' : 'football'),
          preferred_sports: data.user.preferred_sports || (isFacility ? ['pickleball', 'badminton'] : ['football']),
          preferred_format: data.user.preferred_format || 'doubles',
          skill_level: data.user.skill_level || 'intermediate',
          city: data.user.city || 'Naga City',
          onboarding_completed: !isNewUser,
          has_completed_onboarding: !isNewUser,
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem('sportsync_user_id', data.user.id);
          localStorage.setItem('sportsync_user_email', data.user.email);
          localStorage.setItem('sportsync_user_role', assignedRole);
          localStorage.setItem('sportsync_user_name', data.user.full_name);
          if (isNewUser) {
            localStorage.setItem('sportsync_pending_onboarding', 'true');
            localStorage.removeItem('matchi_onboarding_completed');
            localStorage.removeItem('sportsync_onboarding_completed');
            localStorage.removeItem('sportsync_user_profile');
            localStorage.removeItem('sportsync_user_city');
            localStorage.removeItem('sportsync_user_sports');
          } else {
            localStorage.removeItem('sportsync_pending_onboarding');
            localStorage.setItem('matchi_onboarding_completed', 'true');
            localStorage.setItem('sportsync_onboarding_completed', 'true');
            const userSports = Array.isArray(data.user.preferred_sports) && data.user.preferred_sports.length > 0
              ? data.user.preferred_sports.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
              : ['Football'];
            localStorage.setItem(
              'sportsync_user_profile',
              JSON.stringify({
                id: data.user.id,
                name: data.user.full_name,
                username: `@${data.user.nickname || data.user.email.split('@')[0]}`,
                role: data.user.role,
                city: data.user.city || 'Naga City',
                primarySport: data.user.primary_sport || 'football',
                preferredSports: userSports,
                skillLevel: data.user.skill_level ? (data.user.skill_level.charAt(0).toUpperCase() + data.user.skill_level.slice(1)) : 'Intermediate',
                onboardingCompleted: true,
                isGuest: false,
              })
            );
          }
        }
      }

      const userRole = data.user?.role;
      const detectedRole: AuthRole =
        userRole === 'venue_owner' || userRole === 'organizer' || selectedRole === 'facility_owner'
          ? 'facility_owner'
          : 'player';

      setSuccessMessage(
        isSignUp
          ? `Account registered successfully! Welcome to SportSync.`
          : 'Welcome back! Signed in.'
      );
      setTimeout(() => onSuccess(detectedRole, isSignUp), 800);
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Authentication failed. Please check credentials.';
      if (message === 'Failed to fetch') {
        message = 'Unable to connect to the authentication server. Please verify that the backend is running and reachable.';
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
        {canGoBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Brand Banner Header */}
        <div className="p-4 rounded-3xl bg-[#0F2A22] border border-white/10 mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-xl shrink-0 shadow-sm">
            {APP_CONFIG.appName.slice(0, 2)}
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-[#F4F7F0]">
              {isPasswordReset
                ? 'Reset your password'
                : isSignUp
                  ? 'Create Account'
                  : 'Welcome back'}
            </h2>
            <div className="text-xs text-[#A5B0A6]">
              {isPasswordReset ? (
                <span>Enter your email to receive a recovery link</span>
              ) : isSignUp ? (
                <div>
                  <span className="font-display font-black text-[11px] uppercase tracking-wider text-[#C8FF2E] block">
                    SportSync
                  </span>
                  <span>Find Players. Play Together.</span>
                </div>
              ) : (
                <span>Log in to access your Player Hub</span>
              )}
            </div>
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

        {/* Form Fields */}
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
                    Don't have an account?{' '}
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
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('test.player@sportsync.ph');
                      setPassword('password123');
                    }}
                    className="text-[11px] text-[#A5B0A6] hover:text-[#C8FF2E] transition-colors py-1 font-medium inline-block"
                  >
                    ⚡ Use Demo Account (test.player@sportsync.ph)
                  </button>
                </div>
              )}
            </div>
          )}

          {isPasswordReset && (
            <button
              type="button"
              onClick={() => setIsPasswordReset(false)}
              className="w-full text-center text-xs text-[#A5B0A6] hover:text-[#F4F7F0] pt-2"
            >
              Back to Sign In
            </button>
          )}
        </form>
      </div>

      {/* Security badge at bottom */}
      <div className="py-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#6F7B71]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3DDC84]" />
          256-bit secure player data encryption • SportSync
        </span>
      </div>
    </div>
  );
};
