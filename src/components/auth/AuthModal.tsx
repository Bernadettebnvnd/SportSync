'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useMatchiStore } from '@/lib/store';
import { SportType } from '@/types';
import {
  X,
  Mail,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  User,
  Building2,
  Eye,
  EyeOff,
  MapPin,
  ChevronLeft,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const { currentUser, setAuthenticatedUser, logoutUser, completeOwnerOnboarding } = useMatchiStore();
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic_link'>(defaultMode);
  const [role, setRole] = useState<'player' | 'facility_owner'>('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Facility venue setup step state
  const [facilityStep, setFacilityStep] = useState<1 | 2>(1);
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityCity, setFacilityCity] = useState('Naga City');
  const [facilitySports, setFacilitySports] = useState<SportType[]>(['pickleball', 'badminton']);
  const [courtCount, setCourtCount] = useState<number>(2);
  const [hourlyRate, setHourlyRate] = useState<number>(450);
  const [courtSurface, setCourtSurface] = useState<string>('Cushioned Acrylic Surface');

  if (!isOpen) return null;

  const toggleFacilitySport = (sport: SportType) => {
    if (facilitySports.includes(sport)) {
      if (facilitySports.length > 1) {
        setFacilitySports(facilitySports.filter((s) => s !== sport));
      }
    } else {
      setFacilitySports([...facilitySports, sport]);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      setIsLoading(false);
      return;
    }

    // Step 1 for Facility Owner: Register credentials then advance to venue setup
    if (mode === 'signup' && role === 'facility_owner' && facilityStep === 1) {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmedEmail,
            password: cleanPassword,
            fullName: fullName.trim(),
            role: 'facility_owner',
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed.');
        }

        if (data.user) {
          setAuthenticatedUser({
            id: data.user.id,
            auth_id: data.user.id,
            email: data.user.email,
            full_name: data.user.full_name,
            nickname: data.user.nickname,
            avatar_url: data.user.avatar_url,
            role: 'venue_owner',
            primary_sport: 'pickleball',
            preferred_sports: ['pickleball', 'badminton'],
            preferred_format: 'doubles',
            skill_level: 'intermediate',
            city: data.user.city || facilityCity,
            onboarding_completed: false,
            has_completed_onboarding: false,
          });

          if (typeof window !== 'undefined') {
            localStorage.setItem('sportsync_user_email', data.user.email);
            localStorage.setItem('sportsync_user_role', 'facility_owner');
            localStorage.setItem('sportsync_user_name', data.user.full_name);
          }
        }

        setFacilityStep(2);
        setSuccessMsg('Account registered! Now set up your facility venue details.');
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err: unknown) {
        let message = err instanceof Error ? err.message : 'Registration failed';
        if (message === 'Failed to fetch') {
          message = 'Unable to connect to the authentication server. Please check your network connection.';
        }
        setErrorMsg(message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Standard Sign In or Player Sign Up
    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'signup'
        ? {
            email: trimmedEmail,
            password: cleanPassword,
            fullName: fullName.trim(),
            role,
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
        throw new Error(data.error || (mode === 'signup' ? 'Registration failed.' : 'Login failed. Please check credentials.'));
      }

      if (data.user) {
        setAuthenticatedUser({
          id: data.user.id,
          auth_id: data.user.id,
          email: data.user.email,
          full_name: data.user.full_name,
          nickname: data.user.nickname,
          avatar_url: data.user.avatar_url,
          role: data.user.role,
          primary_sport: data.user.primary_sport || 'pickleball',
          preferred_sports: data.user.preferred_sports || ['pickleball', 'badminton'],
          preferred_format: data.user.preferred_format || 'doubles',
          skill_level: data.user.skill_level || 'intermediate',
          city: data.user.city || 'Metro Manila',
          onboarding_completed: true,
          has_completed_onboarding: true,
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem('sportsync_user_email', data.user.email);
          localStorage.setItem('sportsync_user_role', data.user.role);
          localStorage.setItem('sportsync_user_name', data.user.full_name);
          localStorage.setItem('matchi_onboarding_completed', 'true');
          localStorage.setItem('sportsync_onboarding_completed', 'true');
          localStorage.setItem(
            'sportsync_user_profile',
            JSON.stringify({
              id: data.user.id,
              name: data.user.full_name,
              username: `@${data.user.nickname || data.user.email.split('@')[0]}`,
              role: data.user.role,
              city: data.user.city || 'Metro Manila',
              primarySport: data.user.primary_sport || 'pickleball',
              preferredSports: data.user.preferred_sports || ['Pickleball', 'Badminton'],
              skillLevel: data.user.skill_level || 'Intermediate',
              onboardingCompleted: true,
              isGuest: false,
            })
          );
        }
      }

      setSuccessMsg(
        mode === 'signup'
          ? 'Account registered successfully! Welcome to SportSync.'
          : 'Welcome back! Signed in.'
      );
      setTimeout(() => {
        onClose();
        if (role === 'facility_owner' || data.user?.role === 'venue_owner' || data.user?.role === 'facility_owner') {
          if (typeof window !== 'undefined') {
            window.location.href = '/organizer';
          }
        }
      }, 900);
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Authentication failed';
      if (message === 'Failed to fetch') {
        message = 'Unable to connect to the authentication server. Please check your network connection.';
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacilityVenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim()) {
      setErrorMsg('Please enter your facility name.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const courts = Array.from({ length: Math.max(1, courtCount) }).map((_, i) => ({
        name: `Court ${i + 1}`,
        sport: facilitySports[i % facilitySports.length] || 'pickleball',
        hourlyRateCents: hourlyRate * 100,
        floorType: courtSurface,
        courtType: 'standard' as const,
      }));

      await completeOwnerOnboarding({
        ownerName: fullName.trim() || currentUser.full_name || 'Facility Partner',
        ownerEmail: email.trim() || currentUser.email || 'partner@facility.ph',
        ownerPhone: '0917-000-0000',
        facilityName: facilityName.trim(),
        description: `${facilityName.trim()} is a dedicated sports facility equipped with tournament standard courts and amenities.`,
        address: facilityAddress.trim() || 'Sports Center Ave',
        city: facilityCity.trim() || 'Naga City',
        featuredSports: facilitySports,
        courts,
        inventorySource: 'manual',
      });

      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#2D724E', '#C87D43', '#E9C46A'],
      });

      setSuccessMsg('Facility venue registered successfully! Launching your dashboard...');
      setTimeout(() => {
        onClose();
        if (typeof window !== 'undefined') {
          window.location.href = '/organizer';
        }
      }, 900);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to register facility venue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!isSupabaseConfigured) {
        setErrorMsg('Magic link authentication requires Supabase configuration.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : undefined,
        },
      });

      if (error) throw error;
      setSuccessMsg(`Magic login link sent to ${email}. Check your email.`);
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Failed to send magic link';
      if (message === 'Failed to fetch') {
        message = 'Unable to connect to the authentication server.';
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setSuccessMsg('Signed out successfully.');
      setTimeout(onClose, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error signing out';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isAlreadyLoggedIn = Boolean(currentUser.email && (currentUser.auth_id || currentUser.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E5DF] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#2D724E] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#E9C46A]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#1A241E]">
                {isAlreadyLoggedIn
                  ? 'Account Session'
                  : mode === 'signup'
                  ? role === 'facility_owner' && facilityStep === 2
                    ? 'Facility Venue Setup'
                    : 'Create SportSync Account'
                  : 'Sign in to SportSync'}
              </h2>
              <span className="text-[10px] text-[#65756B] block">
                {isAlreadyLoggedIn
                  ? currentUser.email
                  : role === 'facility_owner' && facilityStep === 2
                  ? 'Configure venue details before proceeding'
                  : 'Unified Player & Facility Account'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#65756B] hover:bg-white hover:text-[#1A241E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#EBF4EE] border border-[#2D724E]/30 text-xs text-[#1E4A32]">
              <CheckCircle2 className="w-4 h-4 text-[#2D724E] shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {isAlreadyLoggedIn ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF]">
                <img
                  src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={currentUser.full_name}
                  className="w-10 h-10 rounded-full object-cover border border-[#2D724E]"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#1A241E] truncate">{currentUser.full_name}</div>
                  <div className="text-[11px] text-[#65756B] truncate">{currentUser.email}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF4EE] text-[#1E4A32] capitalize">
                      Mode: {currentUser.active_mode || 'play'}
                    </span>
                    {currentUser.email_verified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Switcher (Hidden in Step 2 of facility setup) */}
              {!(mode === 'signup' && role === 'facility_owner' && facilityStep === 2) && (
                <div className="grid grid-cols-2 gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E8E5DF] text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setFacilityStep(1);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`py-1.5 rounded-lg transition-all ${
                      mode === 'signin'
                        ? 'bg-white text-[#1A241E] shadow-xs'
                        : 'text-[#65756B] hover:text-[#1A241E]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setFacilityStep(1);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`py-1.5 rounded-lg transition-all ${
                      mode === 'signup'
                        ? 'bg-white text-[#1A241E] shadow-xs'
                        : 'text-[#65756B] hover:text-[#1A241E]'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Step 2: Venue Setup for Facility Owner */}
              {mode === 'signup' && role === 'facility_owner' && facilityStep === 2 ? (
                <form onSubmit={handleFacilityVenueSubmit} className="space-y-3.5 pt-1">
                  <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E5DF] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E] bg-[#EBF4EE] px-2.5 py-0.5 rounded-full border border-[#2D724E]/20">
                        Step 2 of 2: Facility Venue Setup
                      </span>
                      <button
                        type="button"
                        onClick={() => setFacilityStep(1)}
                        className="text-[11px] font-bold text-[#65756B] hover:text-[#1A241E] flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Edit Account</span>
                      </button>
                    </div>
                    <h3 className="text-sm font-black text-[#1A241E]">
                      Set Up Your Sports Facility & Courts
                    </h3>
                    <p className="text-[11px] text-[#65756B] leading-relaxed">
                      Configure your venue and courts first before accessing your management dashboard.
                    </p>
                  </div>

                  {/* Facility Name */}
                  <div>
                    <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                      Facility / Club Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        placeholder="e.g. Naga Smash Badminton & Pickleball Hub"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Address & City */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                        Address / Street
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={facilityAddress}
                          onChange={(e) => setFacilityAddress(e.target.value)}
                          placeholder="e.g. Magsaysay Ave"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={facilityCity}
                        onChange={(e) => setFacilityCity(e.target.value)}
                        placeholder="Naga City"
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Featured Sports */}
                  <div>
                    <label className="text-[11px] font-bold text-[#65756B] block mb-1.5">
                      Sports Offered
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['pickleball', 'badminton', 'tennis', 'basketball'] as SportType[]).map((sp) => {
                        const isSelected = facilitySports.includes(sp);
                        return (
                          <button
                            key={sp}
                            type="button"
                            onClick={() => toggleFacilitySport(sp)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                              isSelected
                                ? 'bg-[#EBF4EE] border-[#2D724E] text-[#1E4A32] shadow-xs'
                                : 'bg-[#FAF8F5] border-[#E8E5DF] text-[#65756B] hover:text-[#1A241E]'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{sp}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Courts Count & Hourly Rate */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                        Number of Courts
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCourtCount(Math.max(1, courtCount - 1))}
                          className="w-8 h-9 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] flex items-center justify-center font-bold text-sm text-[#1A241E] hover:bg-white"
                        >
                          -
                        </button>
                        <div className="flex-1 text-center py-2 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-black text-[#1A241E]">
                          {courtCount} {courtCount === 1 ? 'Court' : 'Courts'}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCourtCount(Math.min(12, courtCount + 1))}
                          className="w-8 h-9 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] flex items-center justify-center font-bold text-sm text-[#1A241E] hover:bg-white"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                        Hourly Rate (₱)
                      </label>
                      <input
                        type="number"
                        min={100}
                        step={50}
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Number(e.target.value) || 450)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-black text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Court Surface */}
                  <div>
                    <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                      Court Floor Surface
                    </label>
                    <select
                      value={courtSurface}
                      onChange={(e) => setCourtSurface(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                    >
                      <option value="Cushioned Acrylic Surface">Cushioned Acrylic Surface (Tournament)</option>
                      <option value="Yonex BWF Taraflex Rubber">Yonex BWF Taraflex Rubber</option>
                      <option value="Hardcourt / Polished Wood">Hardcourt / Polished Wood</option>
                      <option value="Outdoor Weatherproof Concrete">Outdoor Weatherproof Concrete</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-md transition-all active:scale-[0.98] disabled:opacity-50 min-h-[46px]"
                  >
                    {isLoading ? (
                      <span>Saving Facility Venue...</span>
                    ) : (
                      <>
                        <Building2 className="w-4 h-4" />
                        <span>Save Facility & Proceed to Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              ) : mode === 'magic_link' ? (
                <form onSubmit={handleMagicLink} className="space-y-3.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
                  >
                    {isLoading ? <span>Sending...</span> : <span>Send Magic Login Link</span>}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-[11px] font-bold text-[#2D724E] hover:underline"
                    >
                      Use password instead
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePasswordAuth} className="space-y-3 pt-1">
                  {mode === 'signup' && (
                    <>
                      <div>
                        <label className="text-[11px] font-bold text-[#65756B] block mb-1.5">
                          Account Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRole('player');
                              setFacilityStep(1);
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                              role === 'player'
                                ? 'bg-[#EBF4EE] border-[#2D724E] text-[#1E4A32] font-bold shadow-xs'
                                : 'bg-[#FAF8F5] border-[#E8E5DF] text-[#65756B]'
                            }`}
                          >
                            <User className="w-4 h-4 shrink-0" />
                            <span className="text-xs">Player</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRole('facility_owner');
                              setFacilityStep(1);
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                              role === 'facility_owner'
                                ? 'bg-[#EBF4EE] border-[#2D724E] text-[#1E4A32] font-bold shadow-xs'
                                : 'bg-[#FAF8F5] border-[#E8E5DF] text-[#65756B]'
                            }`}
                          >
                            <Building2 className="w-4 h-4 shrink-0" />
                            <span className="text-xs">Facility Owner</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                          {role === 'facility_owner' ? 'Owner / Contact Name' : 'Full Name'}
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={role === 'facility_owner' ? 'Alex Morgan' : 'Juan Dela Cruz'}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder={role === 'facility_owner' ? 'owner@facility.ph' : 'player@domain.ph'}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#65756B] block mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#65756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-semibold text-[#1A241E] focus:bg-white focus:border-[#2D724E] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#65756B] hover:text-[#2D724E] p-1 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
                  >
                    {isLoading ? (
                      <span>Processing...</span>
                    ) : (
                      <span>
                        {mode === 'signup'
                          ? role === 'facility_owner'
                            ? 'Next: Set Up Facility Venue'
                            : 'Register Account'
                          : 'Sign In'}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-1.5 flex items-center justify-center gap-3 text-[11px] text-[#65756B]">
                    <button
                      type="button"
                      onClick={() => setMode('magic_link')}
                      className="font-bold text-[#2D724E] hover:underline"
                    >
                      Email Magic Link
                    </button>
                    <span>&bull;</span>
                    <span className="text-[10px]">Persistent Session</span>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
