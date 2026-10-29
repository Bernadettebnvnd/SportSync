'use client';

import React, { useState } from 'react';
import { useMatchiStore } from '@/lib/store';
import { SportType, MatchFormat, SkillLevel } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import {
  X,
  CheckCircle2,
  Users,
  User,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Bell,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_SPORTS: { id: SportType; label: string; desc: string }[] = [
  {
    id: 'basketball',
    label: 'Basketball',
    desc: 'Pickup runs, 3v3 half-court, and 5v5 covered court sessions.',
  },
  {
    id: 'badminton',
    label: 'Badminton',
    desc: 'High-speed smashes, agile drops, doubles rotations & singles ladders.',
  },
  {
    id: 'volleyball',
    label: 'Volleyball',
    desc: 'Spikes, sets, beach volleyball and covered court recreational rotations.',
  },
  {
    id: 'football' as any,
    label: 'Football',
    desc: 'Pitch action, 7v7 turf, futsal, and penalty box competitive runs.',
  },
  {
    id: 'pickleball',
    label: 'Pickleball',
    desc: 'Dinks, kitchen line rallies, fast doubles transitions & open play.',
  },
  {
    id: 'tennis',
    label: 'Tennis',
    desc: 'Baseline endurance, clay, and tournament hardcourt slots.',
  },
  {
    id: 'billiards' as any,
    label: 'Billiards',
    desc: 'Cue sports, 8-ball, 9-ball, and recreational community tournaments.',
  },
  {
    id: 'darts' as any,
    label: 'Darts',
    desc: 'Precision target sports, electronic dartboards, and local leagues.',
  },
  {
    id: 'padel',
    label: 'Padel',
    desc: 'Panoramic glass court rebounds and tactical doubles mixers.',
  },
];

const PHILIPPINE_AREAS = [
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

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { currentUser, completePlayerOnboarding } = useMatchiStore();

  // Clucky Interaction Philosophy: Progressive, single-decision steps
  const [step, setStep] = useState<number>(1);
  const totalSteps = 6;

  const [name, setName] = useState(currentUser.full_name || '');
  const [nickname, setNickname] = useState(currentUser.nickname || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar_url || AVATAR_PRESETS[0]);
  const [selectedSports, setSelectedSports] = useState<SportType[]>(
    currentUser.preferred_sports && currentUser.preferred_sports.length > 0
      ? currentUser.preferred_sports
      : ['pickleball', 'badminton']
  );
  const [preferredFormat, setPreferredFormat] = useState<MatchFormat>(currentUser.preferred_format || 'doubles');
  const [selectedArea, setSelectedArea] = useState(currentUser.city || PHILIPPINE_AREAS[0]);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(currentUser.skill_level || 'intermediate');
  const [notifyBookings, setNotifyBookings] = useState(true);

  if (!isOpen) return null;

  const toggleSport = (sport: SportType) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const handleFinish = () => {
    completePlayerOnboarding({
      fullName: name.trim() || currentUser.full_name,
      nickname: nickname.trim() || name.split(' ')[0] || currentUser.nickname,
      preferredSports: selectedSports,
      preferredFormat,
      city: selectedArea,
      skillLevel,
    });

    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2D724E', '#C87D43', '#E9C46A'],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Progress Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E5DF] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E]">
              Player Setup &bull; Step {step} of {totalSteps}
            </span>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 === step
                      ? 'w-6 bg-[#2D724E]'
                      : i + 1 < step
                      ? 'w-3 bg-[#2D724E]/50'
                      : 'w-3 bg-[#E8E5DF]'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#65756B] hover:bg-[#E8E5DF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Cards Container */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: Welcome & Name */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#C87D43]">
                  Welcome to SportSync
                </span>
                <h3 className="text-xl font-black text-[#1A241E] mt-0.5">
                  What should players call you on court?
                </h3>
                <p className="text-xs text-[#65756B] mt-1">
                  Your court nickname appears on open play rotation boards and booking confirmations.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-black text-[#1A241E] block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Miki Del Rosario"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-[#1A241E] block mb-1">Court Nickname</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Miki"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none min-h-[42px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Profile Photo Preset */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#C87D43]">
                  Court Identity
                </span>
                <h3 className="text-xl font-black text-[#1A241E] mt-0.5">
                  Choose your player avatar
                </h3>
                <p className="text-xs text-[#65756B] mt-1">
                  Helps venue hosts and doubles partners spot you at the facility.
                </p>
              </div>

              <div className="flex justify-center my-3">
                <div className="relative">
                  <img
                    src={selectedAvatar}
                    alt="Selected Avatar"
                    className="w-20 h-20 rounded-full object-cover border-4 border-[#2D724E] shadow-md"
                  />
                  <div className="absolute bottom-0 right-0 p-1 bg-[#2D724E] rounded-full text-white">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#65756B] block mb-2 text-center">
                  Select a photo style
                </label>
                <div className="flex justify-center gap-3">
                  {AVATAR_PRESETS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={`rounded-full p-0.5 border-2 transition-transform ${
                        selectedAvatar === url
                          ? 'border-[#2D724E] scale-110 shadow-sm'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-12 h-12 rounded-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preferred Sports (Multi-Sport Decoupled) */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#C87D43]">
                  Your Sports
                </span>
                <h3 className="text-xl font-black text-[#1A241E] mt-0.5">
                  What do you love to play?
                </h3>
                <p className="text-xs text-[#65756B] mt-1">
                  Select all that apply. SportSync connects you to courts across all your favorite racket and court sports.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {AVAILABLE_SPORTS.map((sport) => {
                  const isSelected = selectedSports.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSport(sport.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#2D724E] bg-[#EBF4EE] shadow-xs'
                          : 'border-[#E8E5DF] bg-white hover:border-[#D4CEBE]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-[#1A241E]">
                          {sport.label}
                        </div>
                        <p className="text-[11px] text-[#65756B] mt-0.5 leading-snug">
                          {sport.desc}
                        </p>
                      </div>

                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[#2D724E] bg-[#2D724E]' : 'border-[#D4CEBE]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Format & Skill Level */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#C87D43]">
                  Game Preferences
                </span>
                <h3 className="text-xl font-black text-[#1A241E] mt-0.5">
                  Format &amp; experience level
                </h3>
                <p className="text-xs text-[#65756B] mt-1">
                  Enables balanced match pairing for Open Play sessions.
                </p>
              </div>

              {/* Format */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-[#1A241E]">Preferred Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferredFormat('doubles')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      preferredFormat === 'doubles'
                        ? 'border-[#2D724E] bg-[#EBF4EE] text-[#1E4A32] font-bold'
                        : 'border-[#E8E5DF] bg-white text-[#65756B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      <Users className="w-3.5 h-3.5 text-[#2D724E]" />
                      <span>Doubles (2v2)</span>
                    </div>
                    <p className="text-[10px] text-[#65756B] mt-0.5">Social rotations &amp; team play</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredFormat('singles')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      preferredFormat === 'singles'
                        ? 'border-[#2D724E] bg-[#EBF4EE] text-[#1E4A32] font-bold'
                        : 'border-[#E8E5DF] bg-white text-[#65756B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      <User className="w-3.5 h-3.5 text-[#C87D43]" />
                      <span>Singles (1v1)</span>
                    </div>
                    <p className="text-[10px] text-[#65756B] mt-0.5">Full court challenge</p>
                  </button>
                </div>
              </div>

              {/* Skill level */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-[#1A241E]">Skill Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSkillLevel(lvl)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize text-center transition-all ${
                        skillLevel === lvl
                          ? 'border-[#2D724E] bg-[#2D724E] text-white shadow-xs'
                          : 'border-[#E8E5DF] bg-white text-[#65756B] hover:border-[#D4CEBE]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Location Area */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#C87D43]">
                  Location
                </span>
                <h3 className="text-xl font-black text-[#1A241E] mt-0.5">
                  Where do you usually play?
                </h3>
                <p className="text-xs text-[#65756B] mt-1">
                  We prioritize nearby courts and Open Play queues in your hub.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
                {PHILIPPINE_AREAS.map((area) => {
                  const isSelected = selectedArea === area;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSelectedArea(area)}
                      className={`p-3 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-[#2D724E] bg-[#EBF4EE] text-[#1E4A32]'
                          : 'border-[#E8E5DF] bg-white text-[#65756B] hover:border-[#D4CEBE]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2D724E]' : 'text-[#65756B]'}`} />
                        <span>{area}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#2D724E]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: Notification Preferences & Summary */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#2D724E]">
                  Ready for Court
                </span>
                <h3 className="text-xl font-black text-[#1A241E] mt-0.5">
                  Confirm your player profile
                </h3>
                <p className="text-xs text-[#65756B] mt-1">
                  You are all set to explore courts, book playing areas, and join live Open Play games.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#65756B]">Player</span>
                  <span className="font-bold text-[#1A241E]">{name || currentUser.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65756B]">Favorite Sports</span>
                  <span className="font-bold text-[#2D724E]">
                    {selectedSports.map(getSportDisplayName).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65756B]">Preferred Hub</span>
                  <span className="font-bold text-[#1A241E]">{selectedArea}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65756B]">Skill Level</span>
                  <span className="font-bold text-[#A35C2B] capitalize">{skillLevel}</span>
                </div>
              </div>

              {/* Notification toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#E8E5DF] bg-white">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#2D724E]" />
                  <div>
                    <div className="text-xs font-bold text-[#1A241E]">Booking &amp; Game Reminders</div>
                    <div className="text-[10px] text-[#65756B]">Get notified when your turn on court is called</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyBookings}
                  onChange={(e) => setNotifyBookings(e.target.checked)}
                  className="w-4 h-4 accent-[#2D724E] rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#E8E5DF] flex items-center justify-between gap-3 shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-[#1A241E] hover:bg-[#FAF8F5]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <span className="text-[11px] text-[#65756B] font-bold">Step 1 of {totalSteps}</span>
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-[#E9C46A]" />
              <span>Complete Setup &bull; Start Playing</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
