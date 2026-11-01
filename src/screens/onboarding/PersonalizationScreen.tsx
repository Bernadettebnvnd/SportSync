'use client';

import React, { useState } from 'react';
import { Check, ArrowRight, ArrowLeft, MapPin, User, Calendar, Clock, Camera } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { SportIcon, SportId } from '../../illustrations/SportIcons';
import { UserAvatar, toAvatarId } from '../../illustrations/Avatars';
import { PRIMARY_SPORTS, PrimarySport } from '../../config/sports';

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
  initialValues,
  onDraftChange,
  onComplete,
}) => {
  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(initialValues?.selectedAvatar ?? 'alex');
  const [selectedSports, setSelectedSports] = useState<string[]>(initialValues?.selectedSports ?? ['Basketball', 'Pickleball']);
  const [customSportInput, setCustomSportInput] = useState<string>(initialValues?.customSportInput ?? '');
  const [skillLevel, setSkillLevel] = useState(initialValues?.skillLevel ?? 2); // 0: Beginner, 1: Casual, 2: Intermediate, 3: Competitive
  const [preferredArea, setPreferredArea] = useState(initialValues?.preferredArea ?? 'Metro Manila');
  const [availability, setAvailability] = useState(initialValues?.availability ?? 'Weekday Evenings & Weekends');

  const handleBack = () => {
    if (onDraftChange) {
      onDraftChange({
        displayName,
        selectedAvatar,
        selectedSports,
        customSportInput,
        skillLevel,
        preferredArea,
        availability,
      });
    }
    if (onBack) {
      onBack();
    }
  };

  const skillLabels = ['Beginner', 'Casual', 'Intermediate', 'Competitive'];

  const availabilityOptions = [
    'Weekday Evenings & Weekends',
    'Weekday Mornings',
    'Weekend Afternoons',
    'Flexible / Anytime',
  ];

  const locationOptions = [
    'Naga City',
    'Metro Manila',
    'Taguig / BGC',
    'Makati',
    'Pasig / Ortigas',
    'Quezon City',
    'Mandaluyong',
    'Cebu City',
    'Davao City',
  ];

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const hasOther = selectedSports.includes('Other');

  const handleFinish = () => {
    let finalSports = [...selectedSports];
    if (hasOther && customSportInput.trim()) {
      const normalizedCustom = customSportInput.trim();
      finalSports = finalSports.filter((s) => s !== 'Other').concat(normalizedCustom);
    }
    onComplete({
      fullName: displayName.trim() || 'Player',
      selectedSports: finalSports,
      skillLevel: skillLabels[skillLevel],
      preferredArea,
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
                Player Onboarding &bull; Preferences
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                Profile &amp; Playing Preferences
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
              placeholder="Your Display Name (e.g. Alex Rivera)"
              className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
            />
          </div>

          <div>
            <span className="text-[11px] text-[#A5B0A6] block mb-2">Choose Avatar (Optional)</span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {['alex', 'leo', 'elena', 'martin', 'marcus', 'kai', 'jordan'].map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`relative p-1 rounded-full border-2 transition-all shrink-0 ${
                    selectedAvatar === av
                      ? 'border-[#C8FF2E] shadow-[0_0_12px_rgba(200,255,46,0.4)]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <UserAvatar id={toAvatarId(av)} size={40} />
                </button>
              ))}
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
                placeholder="e.g. Table Tennis, Futsal, Squash, Padel..."
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
              {skillLabels[skillLevel]}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
            4. Preferred Playing Location
          </label>
          <div className="relative flex items-center">
            <MapPin className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
            <select
              value={preferredArea}
              onChange={(e) => setPreferredArea(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E] cursor-pointer"
            >
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
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
          <span>Complete Onboarding &amp; Play</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
