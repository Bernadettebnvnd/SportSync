'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ArrowRight, ArrowLeft, MapPin, User, Calendar, Clock, Camera, Search, Navigation, Loader2 } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { SportIcon, SportId } from '../../illustrations/SportIcons';
import { UserAvatar, toAvatarId } from '../../illustrations/Avatars';
import { PRIMARY_SPORTS, PrimarySport } from '../../config/sports';
import { getPlayerInitials } from '@/lib/utils';

export interface PersonalizationDraftData {
  displayName?: string;
  selectedAvatar?: string;
  selectedSports?: string[];
  customSportInput?: string;
  skillLevel?: number;
  preferredArea?: string;
  availability?: string;
}

interface PersonalizationScreenProps {
  onBack?: () => void;
  isEditing?: boolean;
  initialValues?: PersonalizationDraftData;
  onDraftChange?: (draft: PersonalizationDraftData) => void;
  onComplete: (preferences?: {
    fullName?: string;
    selectedSports: string[];
    skillLevel: string;
    preferredArea?: string;
    availability?: string;
    avatarUrl?: string;
  }) => void;
}

export const PersonalizationScreen: React.FC<PersonalizationScreenProps> = ({
  onBack,
  isEditing,
  initialValues,
  onDraftChange,
  onComplete,
}) => {
  const skillLabels = ['Beginner', 'Intermediate', 'Advanced'];

  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(initialValues?.selectedAvatar ?? 'alex');
  const [selectedSports, setSelectedSports] = useState<string[]>(initialValues?.selectedSports ?? []);
  const [customSportInput, setCustomSportInput] = useState<string>(initialValues?.customSportInput ?? '');
  const [skillLevel, setSkillLevel] = useState<number | null>(() => {
    if (typeof initialValues?.skillLevel === 'number') {
      return Math.min(Math.max(initialValues.skillLevel, 0), skillLabels.length - 1);
    }
    return null;
  });
  const [preferredArea, setPreferredArea] = useState(initialValues?.preferredArea ?? '');
  const [locationSearch, setLocationSearch] = useState(initialValues?.preferredArea ?? '');
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [availability, setAvailability] = useState(initialValues?.availability ?? '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBack = async () => {
    if (onDraftChange) {
      onDraftChange({
        displayName,
        selectedAvatar,
        selectedSports,
        customSportInput,
        skillLevel: skillLevel ?? 0,
        preferredArea,
        availability,
      });
    }
    if (onBack) {
      await onBack();
    }
  };

  const availabilityOptions = [
    'Weekday Evenings & Weekends',
    'Weekday Mornings',
    'Weekend Afternoons',
    'Flexible / Anytime',
  ];

  const POPULAR_LOCATIONS = [
    'Naga City, Camarines Sur',
    'Legazpi City, Albay',
    'Quezon City, Metro Manila',
    'Makati, Metro Manila',
    'Taguig (BGC), Metro Manila',
    'Pasig, Metro Manila',
    'Manila, Metro Manila',
    'Mandaluyong, Metro Manila',
    'Cebu City, Cebu',
    'Mandaue City, Cebu',
    'Davao City, Davao del Sur',
    'Iloilo City, Iloilo',
    'Bacolod, Negros Occidental',
    'Baguio City, Benguet',
    'San Fernando, Pampanga',
    'Angeles City, Pampanga',
    'Antipolo, Rizal',
    'Santa Rosa, Laguna',
    'Calamba, Laguna',
    'Batangas City, Batangas',
    'Cagayan de Oro, Misamis Oriental',
    'General Santos, South Cotabato',
    'Iriga City, Camarines Sur',
    'Daet, Camarines Norte',
    'Sorsogon City, Sorsogon',
  ];

  const filteredLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return POPULAR_LOCATIONS.slice(0, 8);
    return POPULAR_LOCATIONS.filter((loc) => loc.toLowerCase().includes(q)).slice(0, 8);
  }, [locationSearch]);

  const handleSelectLocation = (loc: string) => {
    setPreferredArea(loc);
    setLocationSearch(loc);
    setIsLocationDropdownOpen(false);
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.municipality || addr.city_district || addr.county || '';
            const state = addr.state || addr.province || addr.region || '';
            const detected = city && state ? `${city}, ${state}` : city || state || 'Current Location';
            setPreferredArea(detected);
            setLocationSearch(detected);
            setIsLocationDropdownOpen(false);
          } else {
            setPreferredArea('Current Location');
            setLocationSearch('Current Location');
          }
        } catch {
          setPreferredArea('Current Location');
          setLocationSearch('Current Location');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        alert('Could not retrieve your location. Please enter your city or municipality manually.');
      },
      { timeout: 8000 }
    );
  };

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      setSelectedSports(selectedSports.filter((s) => s !== sport));
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const hasOther = selectedSports.includes('Other');

  const handleFinish = () => {
    if (selectedSports.length === 0) {
      alert('Please select at least one sport to continue.');
      return;
    }
    if (skillLevel === null) {
      alert('Please choose your skill level.');
      return;
    }
    if (!preferredArea.trim()) {
      alert('Please enter or select your playing location / city.');
      return;
    }
    if (!availability) {
      alert('Please select your general availability.');
      return;
    }

    let finalSports = [...selectedSports];
    if (hasOther && customSportInput.trim()) {
      const normalizedCustom = customSportInput.trim();
      finalSports = finalSports.filter((s) => s !== 'Other').concat(normalizedCustom);
    }
    onComplete({
      fullName: displayName.trim() || 'Player',
      selectedSports: finalSports,
      skillLevel: skillLabels[skillLevel],
      preferredArea: preferredArea.trim(),
      availability,
      avatarUrl: selectedAvatar,
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#0B0F0C] p-4 sm:p-6 pt-4 sm:pt-6 select-none overflow-y-auto no-scrollbar">
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            {onBack && (
              <button
                type="button"
                onClick={handleBack}
                className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
                aria-label="Go back to previous screen"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <span className="text-[11px] font-bold text-[#C8FF2E] uppercase tracking-widest block">
                {isEditing ? 'Account & Profile • Preferences' : 'Player Onboarding • Preferences'}
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                {isEditing ? 'Edit Profile & Preferences' : 'Profile & Playing Preferences'}
              </h2>
            </div>
          </div>
          <p className="text-xs text-[#A5B0A6] mt-0.5">
            SportSync connects you with compatible local players and complete rosters.
          </p>
        </div>

        {/* 1. Display Name & Avatar Selection */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
            1. Player Identity
          </label>

          <div className="relative flex items-center">
            <User className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Display Name (e.g. Alex Rivera)" autoComplete="off"
              className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
            />
          </div>

          {/* Circular Player Initials Profile Icon */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-12 h-12 rounded-full bg-[#141A15] border-2 border-[#C8FF2E] text-[#C8FF2E] font-display font-black text-lg flex items-center justify-center shadow-[0_0_14px_rgba(200,255,46,0.25)] shrink-0 select-none">
              {getPlayerInitials(displayName)}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#F4F7F0] block truncate">
                {displayName.trim() || 'Player'}
              </span>
              <span className="text-[10px] text-[#A5B0A6] block truncate">
                Initials automatically generated from your name
              </span>
            </div>
          </div>
        </div>

        {/* 2. Select Preferred Sports (Standardized Phase 9 Order) */}
        <div>
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block mb-2.5">
            2. Select Your Preferred Sports
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PRIMARY_SPORTS.map((sport) => {
              const isSelected = selectedSports.includes(sport);
              return (
                <button
                  key={sport}
                  type="button"
                  onClick={() => toggleSport(sport)}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all press-scale ${
                    isSelected
                      ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.18)]'
                      : 'bg-[#1C241E] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SportIcon
                      sport={sport}
                      size={18}
                      color={isSelected ? '#C8FF2E' : '#A5B0A6'}
                    />
                    <span className={`text-xs font-semibold truncate ${isSelected ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                      {sport}
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

          {/* Custom sport input if "Other" is checked */}
          {hasOther && (
            <div className="mt-3 p-3.5 rounded-2xl bg-[#141A15] border border-white/10 space-y-1.5 animate-fadeIn">
              <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block">
                Specify Custom Sport
              </label>
              <input
                type="text"
                value={customSportInput}
                onChange={(e) => setCustomSportInput(e.target.value)}
                placeholder="e.g. Table Tennis, Futsal, Squash, Padel..." autoComplete="off"
                className="w-full h-10 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
              />
            </div>
          )}
        </div>

        {/* 3. Skill Level */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
              3. Self-Assessed Skill Level
            </label>
            <span className="text-xs font-bold text-[#C8FF2E]">
              {skillLevel !== null ? skillLabels[skillLevel] : 'Tap to select'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {skillLabels.map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setSkillLevel(idx)}
                className={`py-2.5 px-1 rounded-xl text-xs font-semibold text-center border transition-all truncate ${
                  skillLevel === idx
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold shadow-sm'
                    : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Preferred Playing Location */}
        <div ref={dropdownRef} className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3 relative">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
              4. Preferred Playing Location
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="text-[11px] text-[#C8FF2E] hover:underline flex items-center gap-1 font-semibold disabled:opacity-50"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3 h-3" />
                  <span>Current Location</span>
                </>
              )}
            </button>
          </div>

          {/* Location Input with Search Icon */}
          <div className="relative flex items-center">
            <MapPin className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => {
                const val = e.target.value;
                setLocationSearch(val);
                setPreferredArea(val);
                setIsLocationDropdownOpen(true);
              }}
              onFocus={() => setIsLocationDropdownOpen(true)}
              placeholder="Search or enter your city, municipality, province..."
              className="w-full h-11 pl-9 pr-4 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E] font-medium"
            />
          </div>

          {/* Location Dropdown / Suggestions */}
          {isLocationDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-52 overflow-y-auto rounded-xl bg-[#1C241E] border border-white/10 shadow-2xl p-1.5 space-y-1 no-scrollbar">
              {locationSearch.trim() && !POPULAR_LOCATIONS.some((l) => l.toLowerCase() === locationSearch.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => handleSelectLocation(locationSearch.trim())}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#C8FF2E]/10 hover:bg-[#C8FF2E]/20 text-[#C8FF2E] text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Use &ldquo;{locationSearch.trim()}&rdquo;</span>
                </button>
              )}
              {filteredLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleSelectLocation(loc)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    preferredArea === loc
                      ? 'bg-[#141A15] text-[#C8FF2E] font-bold'
                      : 'text-[#A5B0A6] hover:bg-[#141A15] hover:text-[#F4F7F0]'
                  }`}
                >
                  <span className="truncate">{loc}</span>
                  {preferredArea === loc && <Check className="w-3.5 h-3.5 text-[#C8FF2E]" />}
                </button>
              ))}
            </div>
          )}

          {/* Quick Select Popular Pills */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-[#6F7B71] uppercase tracking-wider font-semibold block">
              Popular areas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['Naga City', 'Quezon City', 'Makati', 'Cebu City', 'Davao City', 'Legazpi City', 'Baguio City'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSelectLocation(chip)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                    preferredArea.toLowerCase().includes(chip.toLowerCase())
                      ? 'bg-[#C8FF2E]/15 border-[#C8FF2E]/40 text-[#C8FF2E] font-bold'
                      : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:text-white'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. General Availability */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
            5. General Availability
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availabilityOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAvailability(opt)}
                className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all flex items-center justify-between ${
                  availability === opt
                    ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                    : 'bg-[#141A15] border-white/5 text-[#A5B0A6] hover:text-white'
                }`}
              >
                <span>{opt}</span>
                {availability === opt && <Check className="w-3.5 h-3.5 text-[#C8FF2E]" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Complete Button */}
      <div className="pt-6 pb-2">
        <Button
          variant="primary"
          size="lg"
          onClick={handleFinish}
          className="w-full text-base font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)]"
        >
          <span>{isEditing ? 'Save Changes' : 'Complete Onboarding & Play'}</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
