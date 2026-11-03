'use client';

import React, { useState } from 'react';
import { useMatchiStore } from '@/lib/store';
import { SportType, MatchFormat, SkillLevel } from '@/types';
import { getPlayerInitials } from '@/lib/utils';
import {
  X,
  Check,
  Users,
  User,
  ArrowRight,
  MapPin,
  Bell,
  AlertCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

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

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { currentUser, completePlayerOnboarding } = useMatchiStore();

  const [name, setName] = useState(currentUser.full_name && currentUser.full_name !== 'Guest Player' && currentUser.full_name !== 'Guest' ? currentUser.full_name : '');
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

  // Validation & Submission States
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleSport = (sport: SportType) => {
    if (validationError) setValidationError(null);
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      } else {
        setValidationError('Please keep at least one favorite sport selected.');
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (validationError) setValidationError(null);
  };

  const handleFinish = async () => {
    if (!name.trim()) {
      setValidationError('Please enter your full player name to continue.');
      return;
    }
    if (selectedSports.length === 0) {
      setValidationError('Please select at least one sport category.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      const finalFullName = name.trim() || currentUser.full_name || 'Player';
      const finalNickname = nickname.trim() || finalFullName.split(' ')[0] || currentUser.nickname || 'Player';
      const cleanCity = (selectedArea || 'Naga City').replace(/\s*\(Pilot Area\)/i, '').trim();

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

      if (onComplete) {
        onComplete();
      }
      onClose();
    } catch (err) {
      console.error('Failed to complete player profile setup:', err);
      setValidationError('Failed to save profile settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-profile-setup-title"
        className="relative w-full max-w-xl rounded-3xl bg-[#0B0F0C] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] select-none animate-in zoom-in-95 duration-200 text-[#F4F7F0]"
      >
        {/* =====================================================================
            1. HEADER (DARK THEME, LIME GREEN ACCENT, SINGLE-PAGE BADGE)
           ===================================================================== */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/10 bg-[#0B0F0C] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C8FF2E] shadow-[0_0_8px_#C8FF2E]" />
              <span className="font-display font-bold text-xs uppercase tracking-wider text-[#C8FF2E]">
                Player Profile Setup
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1C241E] text-[#A5B0A6] border border-white/5">
                Single-Page Setup
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close setup modal"
              className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-[#FFA394] hover:bg-[#263028] flex items-center justify-center transition-all cursor-pointer border border-white/5 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5">
            <h2
              id="player-profile-setup-title"
              className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0] tracking-tight"
            >
              Set up your player profile
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-0.5 leading-relaxed">
              Configure your identity, favorite sports, court format, and local play hub in one place.
            </p>
          </div>

          {/* Lime Accent Divider */}
          <div className="w-full h-1 rounded-full bg-white/10 mt-3 overflow-hidden">
            <div className="h-full bg-[#C8FF2E] rounded-full w-28 shadow-[0_0_10px_rgba(200,255,46,0.6)]" />
          </div>
        </div>

        {/* =====================================================================
            2. SCROLLABLE BODY (ALL SECTIONS ORGANIZED ON A SINGLE PAGE)
           ===================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 overscroll-contain">
          {/* Validation Alert Banner */}
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-[#E0533C]/15 border border-[#E0533C]/40 text-[#FFA394] text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E0533C]" />
              <span className="leading-tight font-medium">{validationError}</span>
            </div>
          )}

          {/* -------------------------------------------------------------------
              SECTION 1: PLAYER IDENTITY & INITIALS PROFILE ICON
             ------------------------------------------------------------------- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#C8FF2E]" />
                Player Identity <span className="text-[#C8FF2E]">*</span>
              </label>
              <span className="text-[10px] text-[#65756B]">Public to Courts</span>
            </div>

            {/* Circular Initials Profile Icon Row */}
            <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-full bg-[#141A15] border-2 border-[#C8FF2E] text-[#C8FF2E] font-display font-black text-xl flex items-center justify-center shadow-[0_0_16px_rgba(200,255,46,0.3)] shrink-0 select-none">
                  {getPlayerInitials(name)}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-[#F4F7F0] block truncate">
                    {name.trim() || 'Court Player'}
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
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Maria Santos" autoComplete="off"
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
                placeholder="e.g. The Maestro" autoComplete="off"
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
              SECTION 2: SELECT SPORT CATEGORIES (3-COLUMN CARDS LIKE REFERENCE)
             ------------------------------------------------------------------- */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#C8FF2E]" />
                Select Sport Categories <span className="text-[#C8FF2E]">*</span>
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
                  Preferred Match Format
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C8FF2E]" />
                Preferred Location / Home Hub
              </label>
              <span className="text-[10px] text-[#C8FF2E] font-medium">Court Discovery</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PHILIPPINE_AREAS.map((area) => {
                const isSelected = selectedArea === area;
                const isPilot = area.includes('Naga City');
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSelectedArea(area)}
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
        </div>

        {/* =====================================================================
            3. STICKY BOTTOM FOOTER (CTA BUTTON MATCHING REFERENCE)
           ===================================================================== */}
        <div className="p-4 sm:p-5 bg-gradient-to-t from-[#0B0F0C] via-[#0B0F0C]/95 to-transparent border-t border-white/10 shrink-0 space-y-2">
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitting}
            className="w-full h-12 sm:h-13 rounded-full bg-[#C8FF2E] hover:bg-[#BCEE26] active:scale-[0.98] text-[#0B0F0C] font-display font-bold text-sm sm:text-base px-6 flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(200,255,46,0.3)] transition-all cursor-pointer disabled:opacity-50"
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
  );
}
