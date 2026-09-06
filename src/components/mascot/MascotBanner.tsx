'use client';

import React, { useState } from 'react';
import { MonkeyMascot, MascotMood } from './MonkeyMascot';
import { EquippedGear } from '@/types';
import { Sparkles } from 'lucide-react';

const RANDOM_BANTER = [
  "Stay light on your feet! High-tempo doubles rallies win games! 🌿⚡",
  "Rally, smash, reset! Clear communication with your doubles partner wins!",
  "Open play rotation is in full swing! Jump in as a pair or get paired up!",
  "Win streaks earn you Banana Points! Stock up for custom jungle gear!",
  "Keep that maligalig energy rolling on the baseline and the kitchen! 🏸",
];

interface MascotBannerProps {
  mood?: MascotMood;
  title?: string;
  message?: string;
  equippedGear?: EquippedGear;
  interactive?: boolean;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function MascotBanner({
  mood = 'hype',
  title = "Matchi Court Intel",
  message,
  equippedGear,
  interactive = true,
  actionText,
  onAction,
  className = '',
}: MascotBannerProps) {
  const [banterIndex, setBanterIndex] = useState(0);

  const displayMessage =
    message || RANDOM_BANTER[banterIndex % RANDOM_BANTER.length];

  const handlePoke = () => {
    setBanterIndex((prev) => prev + 1);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-white border border-[#E8E5DF] p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${className}`}
    >
      {/* Ambient Tarzan color glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-[#2D724E]/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-12 -mb-8 h-24 w-24 rounded-full bg-[#C87D43]/10 blur-xl pointer-events-none" />

      <div className="relative flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={interactive ? handlePoke : undefined}
          title={interactive ? 'Tap Miki for game tips!' : undefined}
          className={`shrink-0 cursor-pointer focus:outline-none transition-transform active:scale-95 ${
            interactive ? 'group' : ''
          }`}
        >
          <MonkeyMascot
            mood={mood}
            size="md"
            equippedGear={equippedGear}
            className="group-hover:scale-105 transition-transform"
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#2D724E] bg-[#2D724E]/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#C87D43]" />
              {title}
            </span>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-[#1A241E] leading-snug">
            &ldquo;{displayMessage}&rdquo;
          </p>

          <div className="mt-2 flex items-center gap-3">
            {actionText && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                {actionText}
              </button>
            )}

            {interactive && !message && (
              <button
                type="button"
                onClick={handlePoke}
                className="text-[11px] text-[#65756B] hover:text-[#2D724E] font-medium transition-colors"
              >
                Tap Miki for more tips 🍌
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
