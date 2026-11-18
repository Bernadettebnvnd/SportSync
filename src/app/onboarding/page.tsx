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
  Clock,
  Phone,
  ShieldCheck,
  Layers,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { validateRealEmail } from '@/lib/validation/emailValidator';

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
  'Naga City',
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
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, setAuthenticatedUser, completePlayerOnboarding, completeOwnerOnboarding } = useMatchiStore();

  const urlRole = searchParams.get('role');
  const isFacilityUrl = urlRole === 'owner' || urlRole === 'facility_owner' || urlRole === 'facility' || urlRole === 'venue_owner';

  const [isMounted, setIsMounted] = useState(false);
  const [hasPendingOnboarding, setHasPendingOnboarding] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined' && localStorage.getItem('sportsync_pending_onboarding') === 'true') {
      setHasPendingOnboarding(true);
    }
  }, []);

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
    return '';
  });

  React.useEffect(() => {
    if (currentUser.full_name && currentUser.full_name !== 'Guest Player') {
      setFullName((prev) => prev || currentUser.full_name);
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sportsync_user_name') || localStorage.getItem('matchi_user_name');
      if (stored) {
        setFullName((prev) => prev || stored);
      }
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
  const [selectedArea, setSelectedArea] = useState('Naga City');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(() => {
    if (currentUser.skill_level && currentUser.skill_level !== 'all_levels') {
      return currentUser.skill_level;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sportsync_user_skill');
      if (stored && stored !== 'all_levels') return stored as SkillLevel;
    }
    return 'beginner';
  });
  const AVAILABILITY_OPTIONS = [
    'Weekday Evenings & Weekends',
    'Weekday Mornings',
    'Weekend Afternoons',
    'Flexible / Anytime',
  ];
  const [availability, setAvailability] = useState<string>(() => {
    if (currentUser.availability) return currentUser.availability;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sportsync_user_availability');
      if (stored) return stored;
    }
    return 'Weekday Evenings & Weekends';
  });
  const [notifyBookings, setNotifyBookings] = useState(true);
  const [playerValidationError, setPlayerValidationError] = useState<string | null>(null);

  // Geolocation & Search for Location
  const [isLocating, setIsLocating] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // =========================================================================
  // FACILITY OWNER / FACULTY STATE (MULTI-STEP PROFILE SETUP)
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
  const [ownerStep, setOwnerStep] = useState<number>(1);
  const totalOwnerSteps = 5;
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<'university' | 'club' | 'public' | 'commercial'>('university');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityDistrict, setFacilityDistrict] = useState('Bagumbayan Sur');
  const [facilityLandmark, setFacilityLandmark] = useState('');
  const [facilityCity, setFacilityCity] = useState(FACILITY_LOCATIONS[0]);
  const [facilitySports, setFacilitySports] = useState<SportType[]>(['pickleball', 'basketball', 'badminton']);
  const [courtCount, setCourtCount] = useState(4);
  const [courtSurface, setCourtSurface] = useState('Tournament Hardwood Parquet');
  const [isIndoor, setIsIndoor] = useState(true);
  const [hourlyRatePhp, setHourlyRatePhp] = useState(500);
  const [operatingHours, setOperatingHours] = useState('06:00 - 23:00');
  const [facilityAmenities, setFacilityAmenities] = useState<string[]>([
    'Air Conditioning',
    'Free Parking',
    'Shower & Locker Rooms',
    'High-Speed Wi-Fi',
  ]);
  const [bookingMode, setBookingMode] = useState<'instant' | 'inquiry'>('instant');
  const [ownerValidationError, setOwnerValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentUser.email && !ownerEmail) {
      setOwnerEmail(currentUser.email);
    }
  }, [currentUser.email, ownerEmail]);

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
    setIsLocating(true);
    setTimeout(() => {
      setSelectedArea('Naga City');
      setLocationSearch('Naga City');
      setIsLocating(false);
    }, 400);
  };

  const handleSearchLocation = async (q: string) => {
    setLocationSearch(q);
    if (!q || q.trim().length < 2) {
      setLocationSuggestions([]);
      return;
    }
    const nagaDistricts = [
      'Pacol, Naga City',
      'Triangulo, Naga City',
      'Magsaysay Ave, Naga City',
      'San Felipe, Naga City',
      'Concepcion Pequeña, Naga City',
      'San Francisco, Downtown, Naga City',
      'Bagumbayan Sur, Naga City',
      'Naga City',
    ];
    const matches = nagaDistricts.filter((d) => d.toLowerCase().includes(q.trim().toLowerCase()));
    setLocationSuggestions(matches.length > 0 ? matches : ['Naga City']);
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
        availability,
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
        floorType: courtSurface,
        isIndoor,
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

      const typeLabels: Record<string, string> = {
        university: 'University & Faculty Sports Complex',
        club: 'Private Sports Club & Academy',
        public: 'Municipal & Community Sports Arena',
        commercial: 'Commercial Sports & Leisure Hub',
      };

      const fullAddressParts = [
        facilityAddress.trim(),
        facilityDistrict,
        'Naga City',
        facilityLandmark.trim() ? `(Landmark: ${facilityLandmark.trim()})` : '',
      ].filter(Boolean);

      const fullAddress = fullAddressParts.join(', ');

      await completeOwnerOnboarding({
        ownerName: resolvedOwnerName,
        ownerEmail: resolvedOwnerEmail,
        ownerPhone: ownerPhone.trim() || '0917-555-0199',
        facilityName: facilityName.trim() || 'Ateneo Sports Complex',
        description: `${typeLabels[facilityType] || 'Sports Facility'} in Naga City featuring ${facilitySports.join(', ')} with tournament-grade courts.`,
        address: fullAddress,
        city: 'Naga City',
        featuredSports: facilitySports,
        courts: generatedCourts,
        inventorySource: 'manual',
      });

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#C8FF2E', '#3DDC84', '#FFFFFF', '#FF8FC7'],
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
                  <div
                    className="w-14 h-14 rounded-full bg-[#141A15] border-2 border-[#C8FF2E] text-[#C8FF2E] font-display font-black text-xl flex items-center justify-center shadow-[0_0_16px_rgba(200,255,46,0.3)] shrink-0 select-none"
                    suppressHydrationWarning
                  >
                    {isMounted ? getPlayerInitials(fullName) : (fullName.trim() ? getPlayerInitials(fullName) : 'CP')}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#F4F7F0] block truncate" suppressHydrationWarning>
                      {fullName.trim() || 'Court Player'}
                    </span>
                    <span className="text-[11px] text-[#A5B0A6] block truncate" suppressHydrationWarning>
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
                  suppressHydrationWarning
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

              {/* Hub Card */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArea('Naga City');
                    setLocationSearch('Naga City');
                  }}
                  className="w-full px-4 py-3 rounded-2xl border bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_12px_rgba(200,255,46,0.2)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin className="w-4 h-4 shrink-0 text-[#C8FF2E]" />
                    <div className="text-left">
                      <span className="text-sm font-bold block text-[#F4F7F0]">Naga City</span>
                      <span className="text-[11px] text-[#A5B0A6]">Camarines Sur, Bicol &bull; Exclusive Pilot Market</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8FF2E]/15 text-[#C8FF2E] border border-[#C8FF2E]/30 font-bold shrink-0 ml-1">
                    Pilot Hub
                  </span>
                </button>
              </div>
            </div>

            {/* -------------------------------------------------------------------
                SECTION 5: GENERAL AVAILABILITY
               ------------------------------------------------------------------- */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  5. General Availability
                </label>
                <span className="text-[10px] text-[#C8FF2E] font-medium">Match Scheduling</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const isSelected = availability === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAvailability(opt)}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_12px_rgba(200,255,46,0.2)]'
                          : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#C8FF2E]' : 'text-[#65756B]'}`} />
                        <span className="text-xs truncate">{opt}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#C8FF2E] shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* -------------------------------------------------------------------
                SECTION 6: NOTIFICATIONS & REMINDERS
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
  // 2. FACULTY & FACILITY PROFILE SETUP: 5-STEP MULTI-SCREEN EXPERIENCE
  // ===========================================================================
  const facilityTypeOptions: { id: 'university' | 'club' | 'public' | 'commercial'; label: string; badge: string; desc: string }[] = [
    { id: 'university', label: 'University / Faculty', badge: 'Academic', desc: 'Campus gymnasiums, collegiate courts & faculty recreation centers' },
    { id: 'club', label: 'Private Sports Club', badge: 'Club', desc: 'Member clubs, private training academies & competitive venues' },
    { id: 'public', label: 'Public / Municipal Arena', badge: 'Civic', desc: 'City barangay gyms, municipal coliseums & community courts' },
    { id: 'commercial', label: 'Commercial Sports Hub', badge: 'Commercial', desc: 'Dedicated pay-per-play sports complexes & indoor centers' },
  ];

  const surfaceOptions = [
    'Tournament Hardwood Parquet',
    'BWF Taraflex Rubber Cushion',
    'Cushioned Acrylic Hard Court',
    'Synthetic Turf / Polyurethane',
  ];

  const hourPresets = [
    { label: 'Full Day (06:00 - 23:00)', value: '06:00 - 23:00' },
    { label: 'Campus Hours (07:00 - 21:00)', value: '07:00 - 21:00' },
    { label: 'Evening Prime (15:00 - 23:00)', value: '15:00 - 23:00' },
    { label: 'Early Bird (05:00 - 18:00)', value: '05:00 - 18:00' },
  ];

  const ratePresets = [350, 450, 500, 600, 800, 1000];

  const districtOptions = [
    'Bagumbayan Sur',
    'Pacol',
    'Triangulo',
    'Magsaysay Ave',
    'San Felipe',
    'Concepcion Pequeña',
    'San Francisco (Downtown)',
  ];

  const amenityOptions = [
    'Air Conditioning',
    'Free Parking',
    'Shower & Locker Rooms',
    'Pro Shop & Equipment Rental',
    'Player Lounge & Water Station',
    'High-Speed Wi-Fi',
    'Spectator Bleachers',
    'Night Lighting',
  ];

  const toggleAmenity = (amenity: string) => {
    if (facilityAmenities.includes(amenity)) {
      setFacilityAmenities(facilityAmenities.filter((a) => a !== amenity));
    } else {
      setFacilityAmenities([...facilityAmenities, amenity]);
    }
  };

  const handleNextStep = async () => {
    setOwnerValidationError(null);

    // STEP 1 VALIDATION
    if (ownerStep === 1) {
      if (!facilityName.trim()) {
        setOwnerValidationError('Please enter your facility or campus athletic complex name.');
        return;
      }
      if (!fullName.trim() && !currentUser.full_name) {
        setOwnerValidationError('Please enter the management or contact person name.');
        return;
      }
      const activeEmail = ownerEmail.trim() || currentUser.email || '';
      const emailValidation = validateRealEmail(activeEmail);
      if (!emailValidation.isValid) {
        setOwnerValidationError(emailValidation.error || 'Please enter a valid official email address.');
        return;
      }

      // If user is not yet logged in / registered, register them now
      const isRegistered = Boolean(currentUser.id || currentUser.email || (typeof window !== 'undefined' && localStorage.getItem('sportsync_user_email')));
      if (!isRegistered) {
        if (!ownerPassword || ownerPassword.length < 6) {
          setOwnerValidationError('Password must be at least 6 characters long.');
          return;
        }
        setIsSubmitting(true);
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: fullName.trim() || 'Facility Partner',
              email: activeEmail.toLowerCase(),
              password: ownerPassword.trim(),
              role: 'facility_owner',
              city: 'Naga City',
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || 'Account registration failed.');
          }
          if (data.user) {
            setAuthenticatedUser({
              id: data.user.id,
              auth_id: data.user.id,
              email: data.user.email,
              full_name: data.user.full_name,
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
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Registration error.';
          setOwnerValidationError(msg);
          setIsSubmitting(false);
          return;
        } finally {
          setIsSubmitting(false);
        }
      }

      setOwnerStep(2);
      return;
    }

    // STEP 2 VALIDATION
    if (ownerStep === 2) {
      if (!facilityAddress.trim()) {
        setOwnerValidationError('Please enter your facility or campus street address.');
        return;
      }
      setOwnerStep(3);
      return;
    }

    // STEP 3 VALIDATION
    if (ownerStep === 3) {
      if (facilitySports.length === 0) {
        setOwnerValidationError('Please select at least one sport available at your facility.');
        return;
      }
      setOwnerStep(4);
      return;
    }

    // STEP 4 VALIDATION
    if (ownerStep === 4) {
      setOwnerStep(5);
      return;
    }

    // STEP 5: FINISH
    if (ownerStep === 5) {
      await handleFinishOwner();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] text-[#F4F7F0] flex flex-col justify-center p-3 sm:p-6 md:p-8 select-none">
      <div className="relative w-full max-w-xl mx-auto rounded-3xl bg-[#0B0F0C] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        {/* Top Header: Progress & Role Switcher */}
        <div className="p-4 sm:p-6 pb-4 border-b border-white/10 bg-[#0B0F0C] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (ownerStep > 1) {
                    setOwnerStep((s) => s - 1);
                    setOwnerValidationError(null);
                  } else {
                    router.push('/');
                  }
                }}
                className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#C8FF2E] block">
                  Faculty Setup • Step {ownerStep} of {totalOwnerSteps}
                </span>
                <h1 className="font-display font-black text-lg sm:text-xl text-[#F4F7F0]">
                  {ownerStep === 1 && 'Facility & Management Identity'}
                  {ownerStep === 2 && 'Location & Campus Address'}
                  {ownerStep === 3 && 'Sports & Court Inventory'}
                  {ownerStep === 4 && 'Schedule, Rates & Amenities'}
                  {ownerStep === 5 && 'Verify & Launch Portal'}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRole('player')}
              className="px-3 py-1.5 rounded-full bg-[#1C241E] hover:bg-[#253028] border border-white/10 text-[11px] font-semibold text-[#A5B0A6] hover:text-[#C8FF2E] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Player Setup?</span>
            </button>
          </div>

          {/* 5-Step Progress Pills Bar */}
          <div className="flex items-center gap-1.5 pt-1">
            {Array.from({ length: totalOwnerSteps }).map((_, i) => {
              const stepIndex = i + 1;
              const isPast = stepIndex < ownerStep;
              const isCurrent = stepIndex === ownerStep;

              return (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'bg-[#C8FF2E] shadow-[0_0_10px_rgba(200,255,46,0.5)]'
                      : isPast
                      ? 'bg-[#C8FF2E]/40'
                      : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Multi-Step Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(88vh-140px)] no-scrollbar">
          {/* Validation Alert */}
          {ownerValidationError && (
            <div className="p-3.5 rounded-2xl bg-[#E0533C]/10 border border-[#E0533C]/30 text-[#FFA494] text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E0533C]" />
              <span className="font-semibold">{ownerValidationError}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 1: FACILITY IDENTITY & MANAGEMENT CONTACTS */}
          {/* ================================================================= */}
          {ownerStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              {/* Facility Name & Preview Initials */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  1. Facility / Athletic Center Name
                </label>

                <div className="relative flex items-center">
                  <Building2 className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                  <input
                    type="text"
                    value={facilityName}
                    onChange={(e) => {
                      setFacilityName(e.target.value);
                      if (ownerValidationError) setOwnerValidationError(null);
                    }}
                    placeholder="e.g. Ateneo Sports Complex, Naga Active Arena"
                    autoComplete="off"
                    autoFocus
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                  />
                </div>

                {/* Circular Facility Initials Preview Badge */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-2xl bg-[#141A15] border-2 border-[#C8FF2E] text-[#C8FF2E] font-display font-black text-lg flex items-center justify-center shadow-[0_0_14px_rgba(200,255,46,0.25)] shrink-0 select-none">
                    {getPlayerInitials(facilityName || 'Sports Facility')}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#F4F7F0] block truncate">
                      {facilityName.trim() || 'New Sports Facility'}
                    </span>
                    <span className="text-[10px] text-[#A5B0A6] block truncate">
                      Official listing badge displayed on marketplace searches
                    </span>
                  </div>
                </div>
              </div>

              {/* Facility Category / Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  2. Facility Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {facilityTypeOptions.map((item) => {
                    const isSelected = facilityType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFacilityType(item.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.18)]'
                            : 'bg-[#1C241E] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                            {item.label}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-[#A5B0A6] font-semibold">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#A5B0A6] leading-tight">
                          {item.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Management Contacts */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  3. Management &amp; Desk Contact
                </label>

                <div className="space-y-2.5">
                  <div className="relative flex items-center">
                    <UserIcon className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (ownerValidationError) setOwnerValidationError(null);
                      }}
                      placeholder="Admin / Athletic Director Name (e.g. Coach Carlo Rivera)"
                      autoComplete="name"
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => {
                        setOwnerEmail(e.target.value);
                        if (ownerValidationError) setOwnerValidationError(null);
                      }}
                      placeholder="Official Contact Email (e.g. athletics@university.edu.ph)"
                      autoComplete="email"
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <Phone className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                    <input
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => {
                        setOwnerPhone(e.target.value);
                        if (ownerValidationError) setOwnerValidationError(null);
                      }}
                      placeholder="Mobile / Desk Telephone (e.g. 0917-123-4567)"
                      autoComplete="tel"
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                    />
                  </div>

                  {/* Password if direct guest onboarding */}
                  {!currentUser.email && !(typeof window !== 'undefined' && localStorage.getItem('sportsync_user_email')) && (
                    <div className="relative flex items-center pt-1">
                      <Lock className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                      <input
                        type="password"
                        value={ownerPassword}
                        onChange={(e) => {
                          setOwnerPassword(e.target.value);
                          if (ownerValidationError) setOwnerValidationError(null);
                        }}
                        placeholder="Create Portal Password (Min. 6 characters)"
                        className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: LOCATION & CAMPUS VENUE ADDRESS */}
          {/* ================================================================= */}
          {ownerStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              {/* Pilot Market Banner */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                    1. Operating City &amp; Market
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8FF2E]/15 text-[#C8FF2E] border border-[#C8FF2E]/30 font-bold">
                    Pilot Market
                  </span>
                </div>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                  <input
                    type="text"
                    readOnly
                    value="Naga City, Camarines Sur"
                    className="w-full h-11 pl-9 pr-4 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:outline-none cursor-default font-semibold"
                  />
                </div>
                <p className="text-[11px] text-[#A5B0A6]">
                  SportSync facility portal is actively live across Naga City. All pilot bookings are zero commission during launch.
                </p>
              </div>

              {/* Street & Campus Address */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  2. Street / Campus Address
                </label>
                <div className="relative flex items-center">
                  <Navigation className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                  <input
                    type="text"
                    value={facilityAddress}
                    onChange={(e) => {
                      setFacilityAddress(e.target.value);
                      if (ownerValidationError) setOwnerValidationError(null);
                    }}
                    placeholder="e.g. Ateneo Avenue, Bagumbayan Sur"
                    autoComplete="street-address"
                    autoFocus
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                  />
                </div>
              </div>

              {/* Barangay / District Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  3. Naga City District / Barangay
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {districtOptions.map((district) => {
                    const isSelected = facilityDistrict === district;
                    return (
                      <button
                        key={district}
                        type="button"
                        onClick={() => setFacilityDistrict(district)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all truncate flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E]'
                            : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{district}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Landmark & Gate Directions */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  4. Entrance Notes &amp; Landmarks (Optional)
                </label>
                <input
                  type="text"
                  value={facilityLandmark}
                  onChange={(e) => setFacilityLandmark(e.target.value)}
                  placeholder="e.g. Enter via Gate 2, beside Student Activity Center"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                />
                <p className="text-[10px] text-[#A5B0A6]">
                  Included in player digital QR tickets to assist court check-ins.
                </p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: SPORTS & COURT INVENTORY */}
          {/* ================================================================= */}
          {ownerStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              {/* Featured Sports */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
                    1. Sports Hosted at Facility
                  </label>
                  <span className="text-[11px] text-[#C8FF2E] font-bold">
                    {facilitySports.length} Selected
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {AVAILABLE_SPORTS.map((sport) => {
                    const isSelected = facilitySports.includes(sport.id);
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => toggleFacilitySport(sport.id)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.18)]'
                            : 'bg-[#1C241E] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{sport.icon}</span>
                          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                            {sport.label}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ml-1 ${
                            isSelected ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'border border-white/20'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number of Courts */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
                    2. Active Courts Available
                  </label>
                  <span className="text-xs font-mono font-bold text-[#C8FF2E]">
                    {courtCount} {courtCount === 1 ? 'Court' : 'Courts'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCourtCount(num)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        courtCount === num
                          ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                          : 'bg-[#1C241E] text-[#A5B0A6] border-white/10 hover:text-white'
                      }`}
                    >
                      {num} {num === 1 ? 'Court' : 'Courts'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Surface & Arena Environment */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  3. Court Playing Surface
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {surfaceOptions.map((surface) => {
                    const isSelected = courtSurface === surface;
                    return (
                      <button
                        key={surface}
                        type="button"
                        onClick={() => setCourtSurface(surface)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                            : 'bg-[#141A15] border-white/5 text-[#A5B0A6] hover:text-white'
                        }`}
                      >
                        <span>{surface}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#C8FF2E]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-[#A5B0A6] font-semibold">Environment:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsIndoor(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isIndoor ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'bg-[#1C241E] text-[#A5B0A6]'
                      }`}
                    >
                      Indoor Covered
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsIndoor(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !isIndoor ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'bg-[#1C241E] text-[#A5B0A6]'
                      }`}
                    >
                      Outdoor Lighted
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: OPERATIONS, SCHEDULE, RATES & AMENITIES */}
          {/* ================================================================= */}
          {ownerStep === 4 && (
            <div className="space-y-5 animate-in fade-in">
              {/* Operating Hours */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
                    1. Operating Schedule
                  </label>
                  <span className="text-xs font-mono font-bold text-[#C8FF2E]">
                    {operatingHours}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hourPresets.map((preset) => {
                    const isSelected = operatingHours === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setOperatingHours(preset.value)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                            : 'bg-[#141A15] border-white/5 text-[#A5B0A6] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-[#C8FF2E]' : 'text-[#65756B]'}`} />
                          <span>{preset.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#C8FF2E]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Standard Hourly Rate */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
                    2. Standard Hourly Rate (₱ / Hour)
                  </label>
                  <span className="text-sm font-mono font-black text-[#C8FF2E]">
                    ₱{hourlyRatePhp} / hr
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ratePresets.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setHourlyRatePhp(rate)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        hourlyRatePhp === rate
                          ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                          : 'bg-[#1C241E] text-[#A5B0A6] border-white/10 hover:text-white'
                      }`}
                    >
                      ₱{rate}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  3. Facility Amenities &amp; Conveniences
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {amenityOptions.map((amenity) => {
                    const isSelected = facilityAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E]'
                            : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{amenity}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Booking Confirmation Mode */}
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  4. Booking Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingMode('instant')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      bookingMode === 'instant'
                        ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                        : 'bg-[#141A15] border-white/5 text-[#A5B0A6]'
                    }`}
                  >
                    <span className="text-xs font-bold block">Instant Booking</span>
                    <span className="text-[10px] opacity-80 block">Direct reservations via GCash / Maya</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingMode('inquiry')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      bookingMode === 'inquiry'
                        ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                        : 'bg-[#141A15] border-white/5 text-[#A5B0A6]'
                    }`}
                  >
                    <span className="text-xs font-bold block">Desk Approval</span>
                    <span className="text-[10px] opacity-80 block">Requires manual review before confirm</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 5: REVIEW & VERIFY SUMMARY */}
          {/* ================================================================= */}
          {ownerStep === 5 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C8FF2E]">
                  Ready to Launch
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#F4F7F0]">
                  Review Your Facility Profile
                </h2>
                <p className="text-xs text-[#A5B0A6] max-w-sm mx-auto">
                  Confirm your details below. Once activated, your management console and bookings ledger will be ready.
                </p>
              </div>

              {/* Full Facility Card Preview */}
              <div className="p-5 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/30 space-y-4 shadow-[0_0_24px_rgba(200,255,46,0.1)]">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0B0F0C] border-2 border-[#C8FF2E] text-[#C8FF2E] font-display font-black text-lg flex items-center justify-center shrink-0">
                      {getPlayerInitials(facilityName || 'Sports Facility')}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-base sm:text-lg text-[#F4F7F0]">
                        {facilityName || 'Ateneo Sports Complex'}
                      </h3>
                      <span className="text-xs text-[#A5B0A6] capitalize">
                        {facilityTypeOptions.find((t) => t.id === facilityType)?.label || 'Sports Facility'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-[#C8FF2E]/15 border border-[#C8FF2E]/30 text-[#C8FF2E] text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF2E]" />
                    <span>Verified Partner</span>
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#1C241E] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                      Location
                    </span>
                    <p className="text-white font-medium truncate">{facilityAddress || 'Ateneo Ave'}</p>
                    <p className="text-[11px] text-[#C8FF2E]">{facilityDistrict}, Naga City</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1C241E] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                      Desk Contact
                    </span>
                    <p className="text-white font-medium truncate">{fullName || currentUser.full_name || 'Facility Admin'}</p>
                    <p className="text-[11px] text-[#A5B0A6] truncate">{ownerEmail || currentUser.email}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1C241E] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                      Court Setup
                    </span>
                    <p className="text-white font-medium">{courtCount} Courts ({isIndoor ? 'Indoor' : 'Outdoor'})</p>
                    <p className="text-[11px] text-[#A5B0A6] truncate">{courtSurface}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1C241E] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                      Operations &amp; Rate
                    </span>
                    <p className="text-[#C8FF2E] font-bold font-mono">₱{hourlyRatePhp} / hour</p>
                    <p className="text-[11px] text-[#A5B0A6]">{operatingHours}</p>
                  </div>
                </div>

                {/* Sports Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                    Featured Sports
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {facilitySports.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg bg-[#1C241E] border border-white/10 text-xs font-semibold text-[#F4F7F0] capitalize flex items-center gap-1"
                      >
                        <span>{AVAILABLE_SPORTS.find((asp) => asp.id === s)?.icon}</span>
                        <span>{s}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Amenities Tags */}
                {facilityAmenities.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                      Facility Amenities
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {facilityAmenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-[#A5B0A6] font-medium"
                        >
                          ✓ {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 sm:p-6 pt-3 border-t border-white/10 bg-[#0B0F0C] shrink-0 space-y-2">
          <div className="flex items-center gap-3">
            {ownerStep > 1 && (
              <button
                type="button"
                onClick={() => {
                  setOwnerStep((s) => s - 1);
                  setOwnerValidationError(null);
                }}
                className="h-12 px-5 rounded-2xl bg-[#1C241E] hover:bg-[#253028] text-xs font-bold text-[#F4F7F0] transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleNextStep}
              className="flex-1 h-12 rounded-2xl bg-[#C8FF2E] hover:bg-[#BCEE26] text-[#0B0F0C] font-display font-bold text-sm px-6 flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(200,255,46,0.3)] transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B0F0C]" />
                  <span>{ownerStep === 5 ? 'Activating Facility Portal...' : 'Processing...'}</span>
                </>
              ) : ownerStep === 5 ? (
                <>
                  <Building2 className="w-4 h-4 text-[#0B0F0C]" />
                  <span>Complete Setup &bull; Launch Faculty Portal</span>
                </>
              ) : (
                <>
                  <span>Continue to Step {ownerStep + 1}</span>
                  <ArrowRight className="w-4 h-4 text-[#0B0F0C] stroke-[2.5]" />
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-[#65756B] text-center">
            {ownerStep === 5
              ? 'Synchronizes your facility profile and courts with the SportSync management console.'
              : `Step ${ownerStep} of ${totalOwnerSteps} • Instant court setup for Naga City pilot.`}
          </p>
        </div>
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
