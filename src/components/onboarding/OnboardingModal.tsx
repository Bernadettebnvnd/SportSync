'use client';

import React, { useState } from 'react';
import { useMonkeyStore } from '@/lib/store';
import { MonkeyMascot } from '@/components/mascot/MonkeyMascot';
import { SportType, MatchFormat, SkillLevel } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import {
  Lock,
  Sparkles,
  CheckCircle2,
  Users,
  User,
  Shield,
  Activity,
  ArrowRight,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_SPORTS: { id: SportType; label: string; desc: string }[] = [
  {
    id: 'badminton',
    label: 'Badminton',
    desc: 'High-speed smashes, agile drops, doubles rotations & singles ladders.',
  },
  {
    id: 'pickleball',
    label: 'Pickleball',
    desc: 'Dinks, kitchen line rallies, fast doubles transitions & social play.',
  },
  {
    id: 'padel',
    label: 'Padel',
    desc: 'Panoramic glass court rebounds, tactical lobs & dynamic doubles.',
  },
  {
    id: 'tennis',
    label: 'Tennis',
    desc: 'Power baseline rallies, heavy topspin & classic full-court endurance.',
  },
  {
    id: 'basketball',
    label: 'Basketball',
    desc: 'Fast breaks, half-court pickups, 3v3 and 5v5 full court runs.',
  },
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { currentUser, completeOnboarding } = useMonkeyStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSport, setSelectedSport] = useState<SportType>(currentUser.primary_sport || 'badminton');
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>(currentUser.preferred_format || 'doubles');
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>(currentUser.skill_level || 'intermediate');

  if (!isOpen) return null;

  const handleFinish = () => {
    completeOnboarding(selectedSport, selectedFormat, selectedLevel);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2D724E', '#C87D43', '#E9C46A'],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Jungle Mascot Header */}
        <div className="bg-gradient-to-br from-[#1E4A32] via-[#2D724E] to-[#153423] p-5 text-white text-center relative overflow-hidden shrink-0">
          <div className="relative z-10 flex flex-col items-center">
            <MonkeyMascot mood="hype" size="md" equippedGear={currentUser.equipped_gear} />
            <span className="mt-2 text-[10px] font-black uppercase tracking-wider text-[#E9C46A] bg-white/10 px-2.5 py-0.5 rounded-full">
              Player Passport Onboarding
            </span>
            <h3 className="text-lg sm:text-xl font-black mt-1">
              Welcome to Matchi, {currentUser.nickname}!
            </h3>
            <p className="text-xs text-emerald-100 max-w-xs mt-0.5">
              Lock in your dedicated sport passport to enter live queue rotations.
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Step 1: Choose Permanent Dedicated Sport */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#C87D43]">
                  Step 1 of 2
                </span>
                <h4 className="text-base font-black text-[#1A241E]">
                  Choose Your Dedicated Sport
                </h4>
                <div className="mt-1 flex items-start gap-2 p-2.5 rounded-xl bg-[#FBF0E6] border border-[#C87D43]/30 text-xs text-[#A35C2B]">
                  <Lock className="w-4 h-4 shrink-0 text-[#C87D43] mt-0.5" />
                  <p className="text-[11px] leading-snug">
                    <strong>Sport Lock Rule:</strong> Per Matchi player passport rules, your chosen sport is permanently locked to your rating, win streaks, and queue ladder.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {AVAILABLE_SPORTS.map((sport) => {
                  const isSelected = selectedSport === sport.id;
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => setSelectedSport(sport.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#2D724E] bg-[#EBF4EE] shadow-sm'
                          : 'border-[#E8E5DF] bg-white hover:border-[#D4CEBE]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Activity className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2D724E]' : 'text-[#65756B]'}`} />
                          <span className="text-xs font-black text-[#1A241E]">
                            {sport.label}
                          </span>
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
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Format & Skill Level */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#C87D43]">
                  Step 2 of 2
                </span>
                <h4 className="text-base font-black text-[#1A241E]">
                  Preferred Format &amp; Skill Level
                </h4>
                <p className="text-xs text-[#65756B]">
                  Configures matchmaking and court pairing for {getSportDisplayName(selectedSport)}.
                </p>
              </div>

              {/* Format selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A241E]">Preferred Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('doubles')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedFormat === 'doubles'
                        ? 'border-[#2D724E] bg-[#EBF4EE] font-bold text-[#1E4A32]'
                        : 'border-[#E8E5DF] bg-white text-[#65756B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      <Users className="w-3.5 h-3.5 text-[#2D724E]" />
                      <span>Doubles (2v2)</span>
                    </div>
                    <p className="text-[10px] text-[#65756B] mt-1">
                      Team play with auto-pairing or designated partner.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat('singles')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedFormat === 'singles'
                        ? 'border-[#2D724E] bg-[#EBF4EE] font-bold text-[#1E4A32]'
                        : 'border-[#E8E5DF] bg-white text-[#65756B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      <User className="w-3.5 h-3.5 text-[#A35C2B]" />
                      <span>Singles (1v1)</span>
                    </div>
                    <p className="text-[10px] text-[#65756B] mt-1">
                      Full-court 1v1 challenger rotation.
                    </p>
                  </button>
                </div>
              </div>

              {/* Skill level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A241E]">Skill Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all text-center ${
                        selectedLevel === lvl
                          ? 'border-[#2D724E] bg-[#2D724E] text-white shadow-sm'
                          : 'border-[#E8E5DF] bg-white text-[#65756B] hover:border-[#D4CEBE]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passport summary note */}
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1 text-xs">
                <div className="font-bold text-[#1A241E] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#2D724E]" />
                  <span>Passport Confirmation</span>
                </div>
                <p className="text-[11px] text-[#65756B]">
                  Locking: <strong>{getSportDisplayName(selectedSport)}</strong> ({selectedFormat} &bull; {selectedLevel}).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#E8E5DF] flex items-center justify-between gap-3 shrink-0">
          {step === 1 ? (
            <>
              <span className="text-[11px] font-bold text-[#65756B]">
                Selected: {getSportDisplayName(selectedSport)}
              </span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all active:scale-95 min-h-[40px]"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-2 rounded-xl border border-[#E8E5DF] text-xs font-bold text-[#65756B] hover:text-[#1A241E] min-h-[40px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#C87D43] hover:bg-[#A35C2B] text-white text-xs font-black shadow-md transition-all active:scale-95 min-h-[40px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span>Lock Passport &amp; Play</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
