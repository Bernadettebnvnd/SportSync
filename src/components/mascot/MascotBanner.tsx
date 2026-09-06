'use client';

import React, { useState } from 'react';
import { MonkeyMascot, MascotMood } from './MonkeyMascot';
import { EquippedGear } from '@/types';
import { Sparkles } from 'lucide-react';

const RANDOM_BANTER = [
  "Courts are heating up! Time to unleash your inner monkey power! 🐒🔥",
  "Rally, smash, hydrate, repeat! Don't let the shuttle touch the floor!",
  "Open play rotation is moving fast today! Check Court 1 for insane rallies!",
  "Win streaks give you Banana Points! Save up for that 24K golden paddle!",
  "Stay maligalig on court! Quick feet win every drop shot! ⚡",
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
  title = "Miki's Court Dispatch",
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
      className={`relative overflow-hidden rounded-2xl bg-white border border-[#EBEBE6] p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${className}`}
    >
      {/* Subtle green ambient gradient */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-[#1F9D55]/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-12 -mb-8 h-24 w-24 rounded-full bg-[#FF9F43]/10 blur-xl pointer-events-none" />

      <div className="relative flex items-center gap-4">
        {/* Mascot Avatar with poke interaction */}
        <button
          type="button"
          onClick={interactive ? handlePoke : undefined}
          title={interactive ? 'Poke Miki for more hype!' : undefined}
          className={`shrink-0 cursor-pointer focus:outline-none transition-transform active:scale-95 ${
            interactive ? 'group' : ''
          }`}
        >
          <MonkeyMascot
            mood={mood}
            size="md"
            equippedGear={equippedGear}
            className="group-hover:scale-110 transition-transform"
          />
        </button>

        {/* Speech Bubble */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1F9D55] bg-[#1F9D55]/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FF9F43]" />
              {title}
            </span>
          </div>

          <p className="text-sm sm:text-base font-medium text-[#171717] leading-snug">
            &ldquo;{displayMessage}&rdquo;
          </p>

          <div className="mt-2 flex items-center gap-3">
            {actionText && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                {actionText}
              </button>
            )}

            {interactive && !message && (
              <button
                type="button"
                onClick={handlePoke}
                className="text-xs text-[#6B7280] hover:text-[#1F9D55] font-medium transition-colors"
              >
                Tap Miki for game tips 🍌
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
