'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';
import { SportType, MatchFormat, SkillLevel } from '@/types';
import { defaultGeocodingProvider } from '@/lib/maps/provider';
import { getPlayerInitials } from '@/lib/utils';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  Navigation,
  Search,
  MapPin,
  Loader2,
  User as UserIcon,
  Bell,
  AlertCircle,
  Sparkles,
  Trophy,
  Users,
  Lock,
  Mail,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const AVAILABLE_SPORTS: { id: SportType; label: string; icon: string }[] = [
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
  { id: 'badminton', label: 'Badminton', icon: '🏸' },
  { id: 'volleyball', label: 'Volleyball', icon: '🏐' },
  { id: 'football' as any, label: 'Football', icon: '⚽' },
  { id: 'pickleball', label: 'Pickleball', icon: '🏓' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'billiards' as any, label: 'Billiards', icon: '🎱' },
  { id: 'darts' as any, label: 'Darts', icon: '🎯' },
  { id: 'padel', label: 'Padel', icon: '🎾' },
];

const PHILIPPINE_AREAS = [
  'Naga City (Pilot Area)',
  'BGC, Taguig City',
  'Pasig & Ortigas Center',
  'Makati City',
  'Quezon City',
  'Mandaluyong / San Juan',
  'Alabang & South Metro',
  'Metro Cebu',
  'Davao City',
  'Baguio City',
];

const NICKNAME_SUGGESTIONS = [
  'Ace',
  'Clutch',
  'Captain',
  'The Maestro',
  'Rookie',
  'Deadeye',
];

const FACILITY_LOCATIONS = [
  'Naga City',
  'BGC & Taguig',
  'Makati',
  'Pasig',
  'Quezon City',
  'Cebu City',
  'Davao City',
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, setAuthenticatedUser, completePlayerOnboarding, completeOwnerOnboarding } = useMatchiStore();

  const urlRole = searchParams.get('role');
  const isFacilityUrl = urlRole === 'owner' || urlRole === 'facility_owner' || urlRole === 'facility' || urlRole === 'venue_owner';

  const [hasPendingOnboarding, setHasPendingOnboarding] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('sportsync_pending_onboarding') === 'true';
  });

  const isCompleted = !hasPendingOnboarding && Boolean(
    currentUser.onboarding_completed === true ||
    currentUser.has_completed_onboarding === true ||
    (!currentUser.id && typeof window !== 'undefined' && (
      localStorage.getItem('matchi_onboarding_completed') === 'true' ||
      localStorage.getItem('sportsync_onboarding_completed') === 'true'
    ))
  );

  React.useEffect(() => {
    if (isCompleted) {
      const target = currentUser.role === 'venue_owner' || currentUser.role === 'organizer' ? '/organizer' : '/';
      router.replace(target);
    }
  }, [isCompleted, currentUser.role, router]);

  // Role: player or facility owner
  const [role, setRole] = useState<'player' | 'owner'>(() => {
    if (isFacilityUrl) return 'owner';
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('sportsync_user_role') || localStorage.getItem('matchi_user_role');
      if (storedRole === 'venue_owner' || storedRole === 'facility_owner' || storedRole === 'organizer') {
        return 'owner';
      }
    }
    return currentUser.role === 'venue_owner' || currentUser.role === 'organizer' || (currentUser.role as string) === 'facility_owner'
      ? 'owner'
      : 'player';
  });

  React.useEffect(() => {
    if (isFacilityUrl) {
      setRole('owner');
      return;
    }
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('sportsync_user_role') || localStorage.getItem('matchi_user_role');
      if (storedRole === 'venue_owner' || storedRole === 'facility_owner' || storedRole === 'organizer') {
        setRole('owner');
        return;
      }
    }
    if (currentUser.role === 'venue_owner' || currentUser.role === 'organizer' || (currentUser.role as string) === 'facility_owner') {
      setRole('owner');
    }
  }, [isFacilityUrl, currentUser.role]);

  // =========================================================================
  // PLAYER STATE (SINGLE-PAGE SETUP MATCHING REFERENCE SCREENSHOT)
  // =========================================================================
  const [fullName, setFullName] = useState(() => {
    if (currentUser.full_name && currentUser.full_name !== 'Guest Player') return currentUser.full_name;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sportsync_user_name') || localStorage.getItem('matchi_user_name') || '';
    }
    return '';
  });

  React.useEffect(() => {
    if (currentUser.full_name && currentUser.full_name !== 'Guest Player') {
      setFullName((prev) => prev || currentUser.full_name);
    }
  }, [currentUser.full_name]);

  const [nickname, setNickname] = useState(currentUser.nickname && currentUser.nickname !== 'Guest' ? currentUser.nickname : '');
  const [selectedSports, setSelectedSports] = useState<SportType[]>(() => {
    if (currentUser.preferred_sports && currentUser.preferred_sports.length > 0) {
      return currentUser.preferred_sports;
    }
    return ['pickleball', 'basketball'];
  });
  const [preferredFormat, setPreferredFormat] = useState<MatchFormat>(currentUser.preferred_format || 'doubles');
  const [selectedArea, setSelectedArea] = useState(currentUser.city || PHILIPPINE_AREAS[0]);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(currentUser.skill_level || 'intermediate');
  const [notifyBookings, setNotifyBookings] = useState(true);
  const [playerValidationError, setPlayerValidationError] = useState<string | null>(null);

  // Geolocation & Search for Location
  const [isLocating, setIsLocating] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // =========================================================================
  // FACILITY OWNER STATE (PRESERVED STEP-BY-STEP FLOW)
  // =========================================================================
  const [ownerEmail, setOwnerEmail] = useState(() => {
    if (currentUser.email) return currentUser.email;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sportsync_user_email') || '';
    }
    return '';
  });
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPhone, setOwnerPhone] = useState(currentUser.phone || '');
  const [ownerStep, setOwnerStep] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const hasEmail = Boolean(currentUser.email || localStorage.getItem('sportsync_user_email'));
      if (hasEmail) return 2;
    }
    return currentUser.email ? 2 : 1;
  });
  const totalOwnerSteps = 5;
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityCity, setFacilityCity] = useState(FACILITY_LOCATIONS[0]);
  const [facilitySports, setFacilitySports] = useState<SportType[]>(['pickleball']);
  const [courtCount, setCourtCount] = useState(2);
  const [hourlyRatePhp, setHourlyRatePhp] = useState(500);
  const [ownerValidationError, setOwnerValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentUser.email && ownerStep === 1) {
      setOwnerStep(2);
      setOwnerEmail(currentUser.email);
    }
  }, [currentUser.email, ownerStep]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSport = (sport: SportType) => {
    if (playerValidationError) setPlayerValidationError(null);
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      } else {
        setPlayerValidationError('Please keep at least one favorite sport selected.');
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const toggleFacilitySport = (sport: SportType) => {
    if (facilitySports.includes(sport)) {
      if (facilitySports.length > 1) {
        setFacilitySports(facilitySports.filter((s) => s !== sport));
      }
    } else {
      setFacilitySports([...facilitySports, sport]);
    }
  };

  const handleNameChange = (val: string) => {
    setFullName(val);
    if (playerValidationError) setPlayerValidationError(null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSelectedArea('Naga City (Pilot Area)');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // Quick bounding box check for active Philippine hubs
          // Bicol / Naga City area: lat ~13.0 to 14.2, lon ~122.5 to 124.0
          if (lat >= 13.0 && lat <= 14.2 && lon >= 122.5 && lon <= 124.0) {
            setSelectedArea('Naga City (Pilot Area)');
            return;
          }
          // Metro Manila area: lat ~14.3 to 14.8, lon ~120.8 to 121.2
          if (lat >= 14.3 && lat <= 14.8 && lon >= 120.8 && lon <= 121.2) {
            setSelectedArea('BGC, Taguig City');
            return;
          }
          // Metro Cebu area: lat ~10.1 to 10.6, lon ~123.7 to 124.1
          if (lat >= 10.1 && lat <= 10.6 && lon >= 123.7 && lon <= 124.1) {
            setSelectedArea('Metro Cebu');
            return;
          }

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12`
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.municipality ||
              data.address?.suburb ||
              data.address?.county;
            if (city) {
              const lower = city.toLowerCase();
              if (lower.includes('naga') || lower.includes('camarines') || lower.includes('bicol')) {
                setSelectedArea('Naga City (Pilot Area)');
              } else {
                setSelectedArea(city);
              }
            } else {
              setSelectedArea('Naga City (Pilot Area)');
            }
          } else {
            setSelectedArea('Naga City (Pilot Area)');
          }
        } catch {
          setSelectedArea('Naga City (Pilot Area)');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setSelectedArea('Naga City (Pilot Area)');
      },
      { timeout: 6000 }
    );
  };

  const handleSearchLocation = async (q: string) => {
    setLocationSearch(q);
    if (!q || q.trim().length < 2) {
      setLocationSuggestions([]);
      return;
    }
    setIsSearchingLocation(true);
    try {
      const results = await defaultGeocodingProvider.search(q);
      setLocationSuggestions(results.map((r) => r.shortName));
    } catch {
      setLocationSuggestions([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // =========================================================================
  // SUBMISSIONS
  // =========================================================================
  const handleFinishPlayer = async () => {
    if (!fullName.trim()) {
      setPlayerValidationError('Please enter your full player name to continue.');
      return;
    }
    if (selectedSports.length === 0) {
      setPlayerValidationError('Please select at least one sport category.');
      return;
    }

    setPlayerValidationError(null);
    setIsSubmitting(true);

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_pending_onboarding');
      }
      setHasPendingOnboarding(false);

      const finalFullName = fullName.trim() || currentUser.full_name || 'Player';
      const finalNickname = nickname.trim() || finalFullName.split(' ')[0] || currentUser.nickname || 'Player';
      const rawCity = selectedArea || 'Naga City';
      const cleanCity = rawCity === 'Current Location'
        ? 'Naga City'
        : (rawCity.replace(/\s*\(Pilot Area\)/i, '').trim() || 'Naga City');

      await completePlayerOnboarding({
        fullName: finalFullName,
        nickname: finalNickname,
        preferredSports: selectedSports,
        preferredFormat,
        city: cleanCity,
        skillLevel,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C8FF2E', '#3DDC84', '#FFFFFF'],
      });

      router.replace('/');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setPlayerValidationError('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishOwner = async () => {
    setIsSubmitting(true);
    setOwnerValidationError(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_pending_onboarding');
      }
      setHasPendingOnboarding(false);
      const generatedCourts = Array.from({ length: courtCount }).map((_, idx) => ({
        name: `Court ${idx + 1}`,
        sport: facilitySports[idx % facilitySports.length],
        hourlyRateCents: hourlyRatePhp * 100,
        floorType: 'Tournament Standard Surface',
      }));

      const resolvedOwnerEmail =
        ownerEmail.trim() ||
        currentUser.email ||
        (typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_email') : '') ||
        'partner@facility.ph';

      const resolvedOwnerName =
        fullName.trim() ||
        (currentUser.full_name && currentUser.full_name !== 'Guest Player' ? currentUser.full_name : '') ||
        (typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_name') : '') ||
        'Facility Partner';

      await completeOwnerOnboarding({
        ownerName: resolvedOwnerName,
        ownerEmail: resolvedOwnerEmail,
        ownerPhone: ownerPhone.trim(),
        facilityName: facilityName.trim(),
        description: 'Quality dedicated sports facility with tournament-standard courts.',
        address: facilityAddress.trim(),
        city: facilityCity,
        featuredSports: facilitySports,
        courts: generatedCourts,
        inventorySource: 'manual',
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1E4A32', '#2D724E', '#E9C46A'],
      });

      router.replace('/organizer');
    } catch (err) {
      console.warn('Facility setup warning:', err);
      router.replace('/organizer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C8FF2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#A5B0A6]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // 1. PLAYER ONBOARDING: SINGLE-PAGE SETUP (VISUAL REFERENCE THEME)
  // ===========================================================================
  if (role === 'player') {
    return (
      <div className="min-h-screen bg-[#0B0F0C] text-[#F4F7F0] flex flex-col justify-center p-3 sm:p-6 md:p-8 select-none">
        <div className="relative w-full max-w-xl mx-auto rounded-3xl bg-[#0B0F0C] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
          {/* Top Bar: Role Switcher & Header */}
          <div className="p-4 sm:p-6 pb-4 border-b border-white/10 bg-[#0B0F0C] shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#C8FF2E] shadow-[0_0_8px_#C8FF2E]" />
                <span className="font-display font-bold text-xs uppercase tracking-wider text-[#C8FF2E]">
                  Player Profile Setup
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1C241E] text-[#A5B0A6] border border-white/5">
                  Single-Page Setup
                </span>
              </div>

              {/* Role Switcher to Facility Setup */}
              <button
                type="button"
                onClick={() => setRole('owner')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C241E] hover:bg-[#263028] border border-white/10 text-[11px] font-semibold text-[#A5B0A6] hover:text-white transition-all cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-[#C8FF2E]" />
                <span>Facility Partner?</span>
              </button>
            </div>

            <div className="mt-3">
              <h1 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0] tracking-tight">
                Set up your player profile
              </h1>
              <p className="text-xs text-[#A5B0A6] mt-0.5 leading-relaxed">
                Configure your identity, favorite sports, court format, and local play hub on a single page.
              </p>
            </div>

            {/* Lime Accent Divider */}
            <div className="w-full h-1 rounded-full bg-white/10 mt-3.5 overflow-hidden">
              <div className="h-full bg-[#C8FF2E] rounded-full w-28 shadow-[0_0_10px_rgba(200,255,46,0.6)]" />
            </div>
          </div>

          {/* Scrollable Single-Page Form Body */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Validation Alert */}
            {playerValidationError && (
              <div className="p-3.5 rounded-2xl bg-[#E0533C]/15 border border-[#E0533C]/40 text-[#FFA394] text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E0533C]" />
                <span className="leading-tight font-medium">{playerValidationError}</span>
              </div>
            )}

            {/* -------------------------------------------------------------------
                SECTION 1: PLAYER IDENTITY & INITIALS PROFILE ICON
               ------------------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  1. Player Identity <span className="text-[#C8FF2E]">*</span>
                </label>
                <span className="text-[10px] text-[#65756B]">Public to Courts</span>
              </div>

              {/* Circular Initials Profile Icon Row */}
              <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-[#141A15] border-2 border-[#C8FF2E] text-[#C8FF2E] font-display font-black text-xl flex items-center justify-center shadow-[0_0_16px_rgba(200,255,46,0.3)] shrink-0 select-none">
                    {getPlayerInitials(fullName)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#F4F7F0] block truncate">
                      {fullName.trim() || 'Court Player'}
                    </span>
                    <span className="text-[11px] text-[#A5B0A6] block truncate">
                      &ldquo;{nickname.trim() || 'Moniker'}&rdquo; &bull; {selectedArea}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#1C241E] text-[#C8FF2E] border border-[#C8FF2E]/30 font-bold shrink-0">
                  Initials Icon
                </span>
              </div>

              {/* Full Name Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                    Full Name <span className="text-[#C8FF2E]">*</span>
                  </label>
                  <span className="text-[10px] text-[#65756B]">Min 2 chars</span>
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  autoComplete="off"
                  className="w-full h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] placeholder-[#65756B] focus:border-[#C8FF2E] focus:outline-none transition-all"
                />
              </div>

              {/* Court Moniker Input & Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                    Court Moniker / Nickname
                  </label>
                  <span className="text-[10px] text-[#65756B]">Optional alias</span>
                </div>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. The Maestro"
                  autoComplete="off"
                  className="w-full h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] placeholder-[#65756B] focus:border-[#C8FF2E] focus:outline-none transition-all"
                />

                {/* Suggestions chips matching screenshot */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NICKNAME_SUGGESTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNickname(tag)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-[#141A15] border border-white/10 text-[#A5B0A6] hover:text-[#C8FF2E] hover:border-[#C8FF2E]/40 transition-colors cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------------
                SECTION 2: SELECT SPORT CATEGORIES (3-COLUMN CARDS MATCHING REFERENCE)
               ------------------------------------------------------------------- */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  2. Select Sport Categories <span className="text-[#C8FF2E]">*</span>
                </label>
                <span className="text-[10px] font-bold text-[#C8FF2E]">
                  {selectedSports.length} Selected
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_SPORTS.map((sp) => {
                  const isSelected = selectedSports.includes(sp.id);
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => toggleSport(sp.id)}
                      className={`h-20 sm:h-22 p-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_14px_rgba(200,255,46,0.25)]'
                          : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span className="text-2xl leading-none">{sp.icon}</span>
                      <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight line-clamp-1">
                        {sp.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* -------------------------------------------------------------------
                SECTION 3: PLAYING FORMAT & SKILL TIER
               ------------------------------------------------------------------- */}
            <div className="space-y-3">
              {/* 3A: Preferred Format */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#C8FF2E]" />
                    3. Preferred Match Format
                  </label>
                  <span className="text-[10px] text-[#65756B]">Queue Preference</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPreferredFormat('doubles')}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-left cursor-pointer active:scale-95 ${
                      preferredFormat === 'doubles'
                        ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] shadow-[0_0_14px_rgba(200,255,46,0.25)]'
                        : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">👥</span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Doubles (2v2)</span>
                      <span className="text-[10px] opacity-70 block truncate">Mixers &amp; rotations</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredFormat('singles')}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-left cursor-pointer active:scale-95 ${
                      preferredFormat === 'singles'
                        ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] shadow-[0_0_14px_rgba(200,255,46,0.25)]'
                        : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">👤</span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Singles (1v1)</span>
                      <span className="text-[10px] opacity-70 block truncate">Solo rallies &amp; ladders</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3B: Experience & Skill Tier */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C8FF2E]" />
                    Experience &amp; Skill Tier
                  </label>
                  <span className="text-[10px] text-[#65756B]">Fair Matchmaking</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'beginner', label: 'Beginner', desc: 'Learning & Casual' },
                      { id: 'intermediate', label: 'Intermediate', desc: 'Tactics & Regular' },
                      { id: 'advanced', label: 'Advanced', desc: 'Competitive' },
                    ] as const
                  ).map((lvl) => {
                    const isSelected = skillLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setSkillLevel(lvl.id)}
                        className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_14px_rgba(200,255,46,0.25)]'
                            : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold block">{lvl.label}</span>
                        <span className="text-[10px] opacity-70 block truncate mt-0.5">{lvl.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------------
                SECTION 4: PREFERRED LOCATION / HOME HUB
               ------------------------------------------------------------------- */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  4. Preferred Location / Home Hub
                </label>
                <span className="text-[10px] text-[#C8FF2E] font-medium">Court Discovery</span>
              </div>

              {/* Action: Use Current Location */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  selectedArea.includes('Naga City') || selectedArea === 'Current Location' || isLocating
                    ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] shadow-[0_0_12px_rgba(200,255,46,0.2)]'
                    : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0B0F0C] flex items-center justify-center text-[#C8FF2E] shrink-0 border border-white/5">
                    {isLocating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#F4F7F0] block">
                      {isLocating ? 'Detecting Location...' : 'Use Current GPS Location'}
                    </span>
                    <span className="text-[10px] text-[#A5B0A6] block">
                      {selectedArea || 'Find courts closest to where you are'}
                    </span>
                  </div>
                </div>
                {selectedArea && !isLocating && (
                  <Check className="w-4 h-4 text-[#C8FF2E]" />
                )}
              </button>

              {/* Search Location Input */}
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-[#65756B] absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => handleSearchLocation(e.target.value)}
                    placeholder="Search city, area, or district..."
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#1C241E] border border-white/10 text-xs sm:text-sm text-[#F4F7F0] placeholder-[#65756B] focus:border-[#C8FF2E] focus:outline-none transition-all"
                  />
                  {isSearchingLocation && (
                    <Loader2 className="w-4 h-4 text-[#C8FF2E] animate-spin absolute right-3.5" />
                  )}
                </div>

                {locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1.5 rounded-2xl border border-white/10 bg-[#1C241E] p-1.5 shadow-xl space-y-1">
                    {locationSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedArea(suggestion);
                          setLocationSearch(suggestion);
                          setLocationSuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#F4F7F0] hover:bg-[#141A15] hover:text-[#C8FF2E] flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hub Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {PHILIPPINE_AREAS.map((area) => {
                  const isSelected = selectedArea === area;
                  const isPilot = area.includes('Naga City');
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => {
                        setSelectedArea(area);
                        setLocationSearch(area);
                      }}
                      className={`px-3.5 py-2.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_12px_rgba(200,255,46,0.2)]'
                          : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#C8FF2E]' : 'text-[#65756B]'}`} />
                        <span className="text-xs truncate">{area}</span>
                      </div>
                      {isPilot && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#C8FF2E]/15 text-[#C8FF2E] border border-[#C8FF2E]/30 font-bold shrink-0 ml-1">
                          Pilot Hub
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* -------------------------------------------------------------------
                SECTION 5: NOTIFICATIONS & REMINDERS
               ------------------------------------------------------------------- */}
            <div className="p-3.5 rounded-2xl bg-[#1C241E] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#141A15] text-[#C8FF2E] flex items-center justify-center shrink-0 border border-white/5">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#F4F7F0] truncate">
                    Booking &amp; Game Reminders
                  </div>
                  <div className="text-[10px] text-[#A5B0A6] truncate">
                    Get notified when your turn on court is called or match fills up
                  </div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={notifyBookings}
                onChange={(e) => setNotifyBookings(e.target.checked)}
                aria-label="Toggle booking reminders"
                className="w-4 h-4 accent-[#C8FF2E] rounded cursor-pointer shrink-0"
              />
            </div>

            {/* -------------------------------------------------------------------
                STICKY BOTTOM ACTION BUTTON (MATCHING REFERENCE EXACTLY)
               ------------------------------------------------------------------- */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleFinishPlayer}
                disabled={isSubmitting}
                className="w-full h-13 sm:h-14 rounded-full bg-[#C8FF2E] hover:bg-[#BCEE26] active:scale-[0.98] text-[#0B0F0C] font-display font-bold text-sm sm:text-base px-6 flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(200,255,46,0.3)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B0F0C]" />
                    <span>Saving Player Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Profile &bull; Start Playing</span>
                    <ArrowRight className="w-4 h-4 text-[#0B0F0C] stroke-[2.5]" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-[#65756B] text-center">
                Saves your player identity and preferences to SportSync &bull; Instant court access
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // 2. FACILITY OWNER ONBOARDING: PRESERVED STEP-BY-STEP FLOW
  // ===========================================================================
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A241E] flex flex-col justify-between p-4 sm:p-8 max-w-xl mx-auto">
      {/* Top Bar: Back & Progress Indicator */}
      <div className="pt-2 sm:pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (ownerStep > 2) {
                setOwnerStep((s) => s - 1);
              } else if (ownerStep === 2 && !currentUser.email && (!ownerEmail || !ownerEmail.trim())) {
                setOwnerStep(1);
              } else {
                router.push('/');
              }
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#65756B] hover:text-[#1A241E] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{ownerStep > 1 ? 'Back' : 'Home'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#65756B]">
              Facility Setup &bull; Step {ownerStep} of {totalOwnerSteps}
            </span>
            <button
              type="button"
              onClick={() => setRole('player')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#F2EFE9] border border-[#E8E5DF] text-[11px] font-semibold text-[#65756B] hover:text-[#1A241E] transition-all cursor-pointer shadow-2xs"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#2D724E]" />
              <span>Player Setup?</span>
            </button>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalOwnerSteps }).map((_, i) => {
            const isCompleted = i + 1 < ownerStep;
            const isCurrent = i + 1 === ownerStep;

            return (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? 'bg-[#2D724E]'
                    : isCompleted
                    ? 'bg-[#2D724E]/40'
                    : 'bg-[#E8E5DF]'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Main Facility Owner Flow Body */}
      <div className="my-auto py-8">
        {/* STEP 1: Facility Account Setup */}
        {ownerStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                Facility account setup
              </h1>
              <p className="text-xs sm:text-sm text-[#65756B]">
                Enter contact and credentials for managing your sports facility portal.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-1.5">
                  Contact / Owner Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (ownerValidationError) setOwnerValidationError(null);
                  }}
                  placeholder="e.g. Alex Morgan"
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-base font-bold text-[#1A241E] focus:border-[#2D724E] focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => {
                    setOwnerEmail(e.target.value);
                    if (ownerValidationError) setOwnerValidationError(null);
                  }}
                  placeholder="owner@facility.ph"
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-base font-bold text-[#1A241E] focus:border-[#2D724E] focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => {
                    setOwnerPassword(e.target.value);
                    if (ownerValidationError) setOwnerValidationError(null);
                  }}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-base font-bold text-[#1A241E] focus:border-[#2D724E] focus:outline-none shadow-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Facility Name & Address */}
        {ownerStep === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                Facility details
              </h1>
              <p className="text-xs sm:text-sm text-[#65756B]">
                Players look for your sports center on the marketplace.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-1.5">
                  Facility Name
                </label>
                <input
                  type="text"
                  value={facilityName}
                  onChange={(e) => {
                    setFacilityName(e.target.value);
                    if (ownerValidationError) setOwnerValidationError(null);
                  }}
                  placeholder="e.g. Metro Sports Hub"
                  autoComplete="off"
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-base font-bold text-[#1A241E] focus:border-[#2D724E] focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  value={facilityAddress}
                  onChange={(e) => {
                    setFacilityAddress(e.target.value);
                    if (ownerValidationError) setOwnerValidationError(null);
                  }}
                  placeholder="e.g. 123 Sports Ave"
                  autoComplete="off"
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-base font-bold text-[#1A241E] focus:border-[#2D724E] focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-1.5">
                  City / Area
                </label>
                <select
                  value={facilityCity}
                  onChange={(e) => setFacilityCity(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-base font-bold text-[#1A241E] focus:border-[#2D724E] focus:outline-none shadow-xs"
                >
                  {FACILITY_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Featured Sports */}
        {ownerStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                Featured sports
              </h1>
              <p className="text-xs sm:text-sm text-[#65756B]">
                Select the sports your facility provides courts for.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {AVAILABLE_SPORTS.map((sport) => {
                const isSelected = facilitySports.includes(sport.id);
                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => toggleFacilitySport(sport.id)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2D724E] bg-white shadow-sm ring-1 ring-[#2D724E]'
                        : 'border-[#E8E5DF] bg-white/70 hover:border-[#2D724E]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sport.icon}</span>
                      <span className="text-sm font-black text-[#1A241E]">{sport.label}</span>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#2D724E] border-[#2D724E] text-white' : 'border-[#E8E5DF]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Courts & Rates */}
        {ownerStep === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                Court setup &amp; rates
              </h1>
              <p className="text-xs sm:text-sm text-[#65756B]">
                Configure court count and standard hourly rates.
              </p>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-2">
                  Number of Courts
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCourtCount(num)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-black transition-all cursor-pointer ${
                        courtCount === num
                          ? 'border-[#2D724E] bg-[#2D724E] text-white shadow-xs'
                          : 'border-[#E8E5DF] bg-white text-[#1A241E]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-2">
                  Hourly Court Rate (₱)
                </label>
                <div className="flex items-center gap-2">
                  {[350, 450, 500, 600, 800].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setHourlyRatePhp(rate)}
                      className={`flex-1 py-3 rounded-xl border text-xs sm:text-sm font-black transition-all cursor-pointer ${
                        hourlyRatePhp === rate
                          ? 'border-[#2D724E] bg-[#2D724E] text-white shadow-xs'
                          : 'border-[#E8E5DF] bg-white text-[#1A241E]'
                      }`}
                    >
                      ₱{rate}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Facility Ready */}
        {ownerStep === 5 && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF4EE] text-[#2D724E]">
              <Building2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                Your facility is ready.
              </h1>
              <p className="text-xs sm:text-sm text-[#65756B] max-w-sm mx-auto">
                Manage court schedules, view today&apos;s bookings, and host open play sessions from your console.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E5DF] bg-white p-4 max-w-xs mx-auto text-left space-y-1">
              <span className="text-sm font-black text-[#1A241E] block">
                {facilityName || 'Metro Sports Hub'}
              </span>
              <span className="text-xs text-[#65756B] block">
                {courtCount} courts &bull; ₱{hourlyRatePhp}/hr
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Area: Facility Flow */}
      <div className="pb-4 sm:pb-6 space-y-2.5">
        {ownerValidationError && (
          <div className="p-3.5 rounded-2xl bg-[#E0533C]/10 border border-[#E0533C]/30 text-[#A82B17] text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E0533C]" />
            <span className="font-semibold">{ownerValidationError}</span>
          </div>
        )}

        {ownerStep < totalOwnerSteps ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              if (ownerStep === 1) {
                if (!fullName.trim()) {
                  setOwnerValidationError('Please enter contact / owner name.');
                  return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!ownerEmail.trim() || !emailRegex.test(ownerEmail.trim())) {
                  setOwnerValidationError('Please enter a valid email address.');
                  return;
                }
                if (!ownerPassword || ownerPassword.length < 6) {
                  setOwnerValidationError('Password must be at least 6 characters long.');
                  return;
                }
                setIsSubmitting(true);
                setOwnerValidationError(null);
                try {
                  const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fullName: fullName.trim(),
                      email: ownerEmail.trim().toLowerCase(),
                      password: ownerPassword.trim(),
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
                      role: 'venue_owner',
                      onboarding_completed: false,
                      has_completed_onboarding: false,
                    });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('sportsync_user_id', data.user.id);
                      localStorage.setItem('sportsync_user_email', data.user.email);
                      localStorage.setItem('sportsync_user_role', 'venue_owner');
                      localStorage.setItem('sportsync_user_name', data.user.full_name);
                      localStorage.setItem('sportsync_pending_onboarding', 'true');
                    }
                  }
                  setOwnerStep(2);
                } catch (err) {
                  setOwnerValidationError(err instanceof Error ? err.message : 'Registration failed.');
                } finally {
                  setIsSubmitting(false);
                }
                return;
              }

              if (ownerStep === 2) {
                if (!facilityName.trim()) {
                  setOwnerValidationError('Please enter your sports facility name.');
                  return;
                }
                if (!facilityAddress.trim()) {
                  setOwnerValidationError('Please enter your facility street address.');
                  return;
                }
                setOwnerValidationError(null);
                setOwnerStep(3);
                return;
              }

              if (ownerStep === 3) {
                if (facilitySports.length === 0) {
                  setOwnerValidationError('Please select at least one sport your facility provides.');
                  return;
                }
                setOwnerValidationError(null);
                setOwnerStep(4);
                return;
              }

              if (ownerStep === 4) {
                setOwnerValidationError(null);
                setOwnerStep(5);
                return;
              }
            }}
            className="w-full py-3.5 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] text-center min-h-[50px] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Registering Account...' : 'Continue'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleFinishOwner}
            className="w-full py-3.5 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] text-center min-h-[50px] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Creating Facility...' : 'Open Facility Console'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#C8FF2E] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-[#A5B0A6]">Loading setup...</p>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
