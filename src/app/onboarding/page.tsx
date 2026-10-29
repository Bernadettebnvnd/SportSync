'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';
import { SportType } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import { defaultGeocodingProvider } from '@/lib/maps/provider';
import {
  Check,
  ArrowLeft,
  Building2,
  Navigation,
  Search,
  MapPin,
  Loader2,
  User as UserIcon,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const AVAILABLE_SPORTS: { id: SportType; label: string; desc: string }[] = [
  { id: 'pickleball', label: 'Pickleball', desc: 'Fast-paced dinks, kitchen rallies, and open play rotations' },
  { id: 'badminton', label: 'Badminton', desc: 'BWF rubber courts, agility rallies, and doubles matches' },
  { id: 'basketball', label: 'Basketball', desc: 'Hardwood covered courts, pickup runs, and 3v3 half-court' },
  { id: 'tennis', label: 'Tennis', desc: 'Tournament hardcourt and clay court hourly sessions' },
  { id: 'padel', label: 'Padel', desc: 'Enclosed glass court rebounds and tactical doubles mixers' },
];

const QUICK_LOCATIONS = [
  'BGC & Taguig',
  'Makati',
  'Pasig',
  'Quezon City',
  'Cebu City',
  'Davao City',
];

const PLAYING_STYLES = [
  { id: 'friends', label: 'With friends', desc: 'Book private courts for your regular group' },
  { id: 'new_players', label: 'Meet new players', desc: 'Find open games and match with community players' },
  { id: 'open_play', label: 'Open Play', desc: 'Drop-in paddle queue rotations and quick games' },
  { id: 'private', label: 'Private games', desc: 'Reserve exclusive court time for practice & coaching' },
  { id: 'practice', label: 'Practice & drills', desc: 'Solo wall drills, ball machines, and skills refinement' },
  { id: 'competitive', label: 'Competitive games', desc: 'Track scores, challenge players, and play tournaments' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { currentUser, completePlayerOnboarding, completeOwnerOnboarding } = useMatchiStore();

  const hasAccount = Boolean(currentUser.id && currentUser.email);
  const isCompleted = Boolean(
    hasAccount ||
    currentUser.onboarding_completed ||
    currentUser.has_completed_onboarding ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('matchi_onboarding_completed') === 'true' ||
      localStorage.getItem('sportsync_onboarding_completed') === 'true' ||
      Boolean(localStorage.getItem('sportsync_user_email'))
    ))
  );

  React.useEffect(() => {
    if (hasAccount || isCompleted) {
      const target = currentUser.role === 'venue_owner' || currentUser.role === 'organizer' ? '/organizer' : '/';
      router.replace(target);
    }
  }, [hasAccount, isCompleted, currentUser.role, router]);

  // Role: player or facility owner
  const [role, setRole] = useState<'player' | 'owner'>('player');
  // Step 1: Role, Step 2: Name, Step 3: Sports, Step 4: Location, Step 5: Preferences, Step 6: Confirmation
  const [step, setStep] = useState<number>(1);
  const totalSteps = role === 'player' ? 6 : 5;

  // Player fields
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [nickname, setNickname] = useState(currentUser.nickname || '');
  const [selectedSports, setSelectedSports] = useState<SportType[]>(
    currentUser.preferred_sports && currentUser.preferred_sports.length > 0
      ? currentUser.preferred_sports
      : ['pickleball']
  );
  const [selectedArea, setSelectedArea] = useState(currentUser.city || '');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['friends', 'open_play']);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Facility fields
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityCity, setFacilityCity] = useState(QUICK_LOCATIONS[0]);
  const [facilitySports, setFacilitySports] = useState<SportType[]>(['pickleball']);
  const [courtCount, setCourtCount] = useState(2);
  const [hourlyRatePhp, setHourlyRatePhp] = useState(500);

  const toggleSport = (sport: SportType) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
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

  const toggleStyle = (id: string) => {
    if (selectedStyles.includes(id)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== id));
    } else {
      setSelectedStyles([...selectedStyles, id]);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSelectedArea('Current Location');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
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
              data.address?.county ||
              'Current Location';
            setSelectedArea(city);
          } else {
            setSelectedArea('Current Location');
          }
        } catch {
          setSelectedArea('Current Location');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setSelectedArea('Current Location');
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

  const handleFinishPlayer = async () => {
    setIsSubmitting(true);
    try {
      await completePlayerOnboarding({
        fullName: fullName.trim() || currentUser.full_name || 'Player',
        nickname: nickname.trim() || fullName.split(' ')[0] || currentUser.nickname || 'Player',
        preferredSports: selectedSports,
        preferredFormat: selectedStyles.includes('private') ? 'singles' : 'doubles',
        city: selectedArea || 'Metro Manila',
        skillLevel: 'intermediate',
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2D724E', '#1E4A32', '#C87D43'],
      });

      router.replace('/');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setIsSubmitting(false);
    }
  };

  const handleFinishOwner = async () => {
    setIsSubmitting(true);
    try {
      const generatedCourts = Array.from({ length: courtCount }).map((_, idx) => ({
        name: `Court ${idx + 1}`,
        sport: facilitySports[idx % facilitySports.length],
        hourlyRateCents: hourlyRatePhp * 100,
        floorType: 'Tournament Standard Surface',
      }));

      await completeOwnerOnboarding({
        ownerName: fullName.trim() || currentUser.full_name || 'Facility Partner',
        ownerEmail: currentUser.email || 'partner@facility.ph',
        ownerPhone: '0917-000-0000',
        facilityName: facilityName.trim() || 'Premier Sports Center',
        description: 'Quality dedicated sports facility with tournament-standard courts.',
        address: facilityAddress.trim() || 'Sports Center Ave',
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

  if (hasAccount || isCompleted) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2D724E] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#65756B]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A241E] flex flex-col justify-between p-4 sm:p-8 max-w-xl mx-auto">
      {/* Top Bar: Back & Progress Indicator */}
      <div className="pt-2 sm:pt-4 space-y-3">
        <div className="flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#65756B] hover:text-[#1A241E] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <span className="text-xs font-bold tracking-tight text-[#65756B]">
              Step 1 of {totalSteps}
            </span>
          )}

          <span className="text-xs font-semibold text-[#65756B]">
            {role === 'player' ? 'Player Profile' : 'Facility Setup'}
          </span>
        </div>

        {/* Step Indicator Bar */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isCompleted = i + 1 < step;
            const isCurrent = i + 1 === step;

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

      {/* Main Conversational Screen Body */}
      <div className="my-auto py-8">
        {/* =========================================================================
         * STEP 1: ROLE SELECTION (Clucky Principle: One decision at a time)
         * ========================================================================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                How will you use SportSync?
              </h1>
              <p className="text-xs sm:text-sm text-[#65756B]">
                Choose how you want to experience the platform.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRole('player');
                  setStep(2);
                }}
                className={`w-full p-5 rounded-3xl border text-left flex items-center justify-between transition-all group ${
                  role === 'player'
                    ? 'border-[#2D724E] bg-white ring-1 ring-[#2D724E] shadow-sm'
                    : 'border-[#E8E5DF] bg-white/80 hover:border-[#2D724E]/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EBF4EE] flex items-center justify-center text-[#2D724E] shrink-0">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1A241E] group-hover:text-[#2D724E] transition-colors">
                      I&apos;m a Player
                    </h3>
                    <p className="text-xs text-[#65756B] mt-0.5">
                      Book courts, find open play games, and play more.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#65756B] group-hover:text-[#2D724E] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole('owner');
                  setStep(2);
                }}
                className={`w-full p-5 rounded-3xl border text-left flex items-center justify-between transition-all group ${
                  role === 'owner'
                    ? 'border-[#2D724E] bg-white ring-1 ring-[#2D724E] shadow-sm'
                    : 'border-[#E8E5DF] bg-white/80 hover:border-[#2D724E]/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#FBF0E6] flex items-center justify-center text-[#C87D43] shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1A241E] group-hover:text-[#C87D43] transition-colors">
                      I run a Facility
                    </h3>
                    <p className="text-xs text-[#65756B] mt-0.5">
                      Manage court schedules, accept bookings, and host rotations.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#65756B] group-hover:text-[#C87D43] group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
         * PLAYER FLOW
         * ========================================================================= */}
        {role === 'player' && (
          <>
            {/* STEP 2: Player Name */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                    What is your name?
                  </h1>
                  <p className="text-xs sm:text-sm text-[#65756B]">
                    Your name appears on court bookings and game rotation boards.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (!nickname) {
                          setNickname(e.target.value.split(' ')[0] || '');
                        }
                      }}
                      placeholder="e.g. Alex Santos"
                      autoFocus
                      className="w-full px-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-base font-bold text-[#1A241E] placeholder:text-[#65756B]/50 focus:border-[#2D724E] focus:outline-none shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-1.5">
                      Court Nickname
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full px-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-base font-bold text-[#1A241E] placeholder:text-[#65756B]/50 focus:border-[#2D724E] focus:outline-none shadow-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Choose Sports (Large Visual Touch Targets) */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                    Choose your sports
                  </h1>
                  <p className="text-xs sm:text-sm text-[#65756B]">
                    Select the sports you play. Your home screen prioritizes these courts.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  {AVAILABLE_SPORTS.map((sport) => {
                    const isSelected = selectedSports.includes(sport.id);
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => toggleSport(sport.id)}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all min-h-[58px] ${
                          isSelected
                            ? 'border-[#2D724E] bg-white shadow-sm ring-1 ring-[#2D724E]'
                            : 'border-[#E8E5DF] bg-white/70 hover:border-[#2D724E]/50'
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <span className="text-sm font-black text-[#1A241E] block">
                            {sport.label}
                          </span>
                          <span className="text-[11px] text-[#65756B] block mt-0.5 leading-snug">
                            {sport.desc}
                          </span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#2D724E] border-[#2D724E] text-white'
                              : 'border-[#E8E5DF]'
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

            {/* STEP 4: Where do you play? (Flexible & Non-restrictive, with Skip) */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                    Where do you play?
                  </h1>
                  <p className="text-xs sm:text-sm text-[#65756B]">
                    Discover nearby courts or skip and search anytime later.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Action 1: Use Current Location */}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      selectedArea === 'Current Location' || isLocating
                        ? 'border-[#2D724E] bg-white ring-1 ring-[#2D724E] shadow-sm'
                        : 'border-[#E8E5DF] bg-white hover:border-[#2D724E]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#EBF4EE] flex items-center justify-center text-[#2D724E] shrink-0">
                        {isLocating ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Navigation className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[#1A241E] block">
                          {isLocating ? 'Locating...' : 'Use Current Location'}
                        </span>
                        <span className="text-xs text-[#65756B] block">
                          {selectedArea || 'Find courts nearest to you right now'}
                        </span>
                      </div>
                    </div>
                    {selectedArea && !isLocating && (
                      <Check className="w-4 h-4 text-[#2D724E]" />
                    )}
                  </button>

                  {/* Action 2: Search for Location */}
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-[#65756B] absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => handleSearchLocation(e.target.value)}
                        placeholder="Search for a city, area, or district..."
                        className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-xs sm:text-sm text-[#1A241E] placeholder:text-[#65756B] focus:border-[#2D724E] focus:outline-none min-h-[48px]"
                      />
                      {isSearchingLocation && (
                        <Loader2 className="w-4 h-4 text-[#2D724E] animate-spin absolute right-3.5" />
                      )}
                    </div>

                    {locationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1.5 rounded-2xl border border-[#E8E5DF] bg-white p-1.5 shadow-lg space-y-1">
                        {locationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedArea(suggestion);
                              setLocationSearch(suggestion);
                              setLocationSuggestions([]);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#1A241E] hover:bg-[#FAF8F5] flex items-center gap-2"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#2D724E] shrink-0" />
                            <span>{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action 3: Quick Location Chips */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#65756B] block mb-2">
                      Popular Areas
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_LOCATIONS.map((loc) => {
                        const isSelected = selectedArea === loc;
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setSelectedArea(loc);
                              setLocationSearch(loc);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-[#2D724E] text-white shadow-xs'
                                : 'bg-white border border-[#E8E5DF] text-[#65756B] hover:text-[#1A241E]'
                            }`}
                          >
                            {loc}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Preferences (Multi-select with Skip) */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                    How do you like to play?
                  </h1>
                  <p className="text-xs sm:text-sm text-[#65756B]">
                    Select any that apply, or skip to start playing immediately.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  {PLAYING_STYLES.map((style) => {
                    const isSelected = selectedStyles.includes(style.id);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => toggleStyle(style.id)}
                        className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all min-h-[56px] ${
                          isSelected
                            ? 'border-[#2D724E] bg-white ring-1 ring-[#2D724E] shadow-sm'
                            : 'border-[#E8E5DF] bg-white/80 hover:border-[#2D724E]/50'
                        }`}
                      >
                        <div>
                          <span className="text-xs sm:text-sm font-black text-[#1A241E] block">
                            {style.label}
                          </span>
                          <span className="text-[11px] text-[#65756B] block mt-0.5">
                            {style.desc}
                          </span>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-3 ${
                            isSelected
                              ? 'bg-[#2D724E] border-[#2D724E] text-white'
                              : 'border-[#E8E5DF]'
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

            {/* STEP 6: Confirmation */}
            {step === 6 && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF4EE] text-[#2D724E]">
                  <Check className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                    You&apos;re all set.
                  </h1>
                  <p className="text-xs sm:text-sm text-[#65756B] max-w-sm mx-auto">
                    Your profile is ready. Find nearby courts or join live community
                    rotations anytime.
                  </p>
                </div>

                {/* Summary Chips */}
                <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                  <span className="rounded-xl border border-[#E8E5DF] bg-white px-3 py-1.5 text-xs font-bold text-[#1A241E]">
                    {selectedArea || 'All Areas'}
                  </span>
                  {selectedSports.map((s) => (
                    <span
                      key={s}
                      className="rounded-xl bg-[#2D724E]/10 px-3 py-1.5 text-xs font-bold text-[#2D724E]"
                    >
                      {getSportDisplayName(s)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* =========================================================================
         * FACILITY OWNER FLOW
         * ========================================================================= */}
        {role === 'owner' && (
          <>
            {/* STEP 2: Facility Name & Address */}
            {step === 2 && (
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
                      onChange={(e) => setFacilityName(e.target.value)}
                      placeholder="e.g. Metro Sports Hub"
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
                      onChange={(e) => setFacilityAddress(e.target.value)}
                      placeholder="e.g. 123 Sports Ave"
                      className="w-full px-4 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white text-base font-bold text-[#1A241E] focus:border-[#2D724E] focus:outline-none shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#65756B] block mb-1.5">
                      City / Area
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_LOCATIONS.slice(0, 4).map((c: string) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFacilityCity(c)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                            facilityCity === c
                              ? 'border-[#2D724E] bg-white ring-1 ring-[#2D724E]'
                              : 'border-[#E8E5DF] bg-white/70'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Sports Hosted */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
                    What sports do you host?
                  </h1>
                  <p className="text-xs sm:text-sm text-[#65756B]">
                    Select all sports that have dedicated courts at your center.
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
                        className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all min-h-[56px] ${
                          isSelected
                            ? 'border-[#2D724E] bg-white ring-1 ring-[#2D724E] shadow-sm'
                            : 'border-[#E8E5DF] bg-white/70 hover:border-[#2D724E]/50'
                        }`}
                      >
                        <span className="text-sm font-bold text-[#1A241E]">{sport.label}</span>
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
            {step === 4 && (
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
                          className={`flex-1 py-3 rounded-xl border text-sm font-black transition-all ${
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
                          className={`flex-1 py-3 rounded-xl border text-xs sm:text-sm font-black transition-all ${
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
            {step === 5 && (
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
          </>
        )}
      </div>

      {/* Bottom Action Area: Action-only labels */}
      <div className="pb-4 sm:pb-6">
        {step === 1 ? null : role === 'player' ? (
          step === 4 || step === 5 ? (
            /* Optional Steps provide prominent Skip button */
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 py-3.5 rounded-2xl border border-[#E8E5DF] bg-white hover:bg-[#FAF8F5] text-[#65756B] text-sm font-bold transition-all active:scale-[0.99] text-center min-h-[50px]"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-2 py-3.5 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] text-center min-h-[50px]"
              >
                Continue
              </button>
            </div>
          ) : step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="w-full py-3.5 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] text-center min-h-[50px]"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinishPlayer}
              className="w-full py-3.5 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] text-center min-h-[50px] disabled:opacity-50"
            >
              {isSubmitting ? 'Starting...' : 'Start Playing'}
            </button>
          )
        ) : step < totalSteps ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="w-full py-3.5 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] text-center min-h-[50px]"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleFinishOwner}
            className="w-full py-3.5 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] text-center min-h-[50px] disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Open Facility Console'}
          </button>
        )}
      </div>
    </div>
  );
}
