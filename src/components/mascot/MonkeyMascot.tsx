'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { EquippedGear } from '@/types';

export type MascotMood = 'hype' | 'referee' | 'waiting' | 'victory' | 'thinking' | 'sleeping';

interface MonkeyMascotProps {
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  equippedGear?: EquippedGear;
  className?: string;
  animated?: boolean;
}

export function MonkeyMascot({
  mood = 'hype',
  size = 'md',
  equippedGear,
  className,
  animated = true,
}: MonkeyMascotProps) {
  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  const animationClass = animated
    ? mood === 'hype'
      ? 'animate-monkey-bounce'
      : mood === 'victory'
      ? 'animate-monkey-wiggle'
      : 'hover:scale-105 transition-transform duration-300'
    : '';

  // Gear colors
  const headbandColor =
    equippedGear?.headband === 'gold_champion'
      ? '#FFD700'
      : equippedGear?.headband === 'fire_red'
      ? '#EF4444'
      : '#1F9D55'; // default brand green

  const hasHeadband = equippedGear?.headband && equippedGear.headband !== 'none';
  const hasRacket = equippedGear?.racket && equippedGear.racket !== 'none';
  const racketColor =
    equippedGear?.racket === 'golden_paddle'
      ? '#FF9F43'
      : equippedGear?.racket === 'voltric_pro'
      ? '#147A40'
      : '#3B82F6';

  const outfitColor =
    equippedGear?.outfit === 'banana_suit'
      ? '#FFC837'
      : equippedGear?.outfit === 'neon_jersey'
      ? '#10B981'
      : '#1F9D55';

  return (
    <div className={cn('relative inline-flex items-center justify-center select-none', sizeMap[size], className)}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('w-full h-full drop-shadow-md', animationClass)}
      >
        {/* Tail */}
        <path
          d="M 28 85 C 10 90, 5 65, 14 55 C 22 45, 30 58, 25 68"
          stroke="#8D5B4C"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Body */}
        <ellipse cx="60" cy="85" rx="30" ry="26" fill="#8D5B4C" />

        {/* Outfit / T-shirt */}
        <path
          d="M 38 72 C 45 68, 75 68, 82 72 C 85 85, 84 96, 78 102 C 65 106, 55 106, 42 102 C 36 96, 35 85, 38 72 Z"
          fill={outfitColor}
        />
        {/* Outfit collar/number */}
        <circle cx="60" cy="86" r="6" fill="#FFFFFF" opacity="0.9" />
        <text
          x="60"
          y="89"
          fontSize="7"
          fontWeight="bold"
          fill={outfitColor}
          textAnchor="middle"
          dominantBaseline="central"
        >
          M
        </text>

        {/* Left Ear */}
        <circle cx="28" cy="45" r="14" fill="#8D5B4C" />
        <circle cx="28" cy="45" r="8" fill="#F8C8B4" />

        {/* Right Ear */}
        <circle cx="92" cy="45" r="14" fill="#8D5B4C" />
        <circle cx="92" cy="45" r="8" fill="#F8C8B4" />

        {/* Head Base */}
        <circle cx="60" cy="48" r="28" fill="#8D5B4C" />

        {/* Face Patch (Peach) */}
        <path
          d="M 40 45 C 40 37, 50 34, 60 38 C 70 34, 80 37, 80 45 C 82 56, 75 66, 60 66 C 45 66, 38 56, 40 45 Z"
          fill="#F8C8B4"
        />

        {/* Headband if equipped or referee mood */}
        {(hasHeadband || mood === 'referee') && (
          <g>
            <path
              d="M 34 33 C 48 27, 72 27, 86 33 L 85 40 C 71 34, 49 34, 35 40 Z"
              fill={mood === 'referee' ? '#171717' : headbandColor}
            />
            {mood === 'referee' && (
              <path
                d="M 44 31 L 46 38 M 58 29 L 58 37 M 72 31 L 70 38"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            )}
            {hasHeadband && (
              <circle
                cx="60"
                cy="33"
                r="3"
                fill={equippedGear?.headband === 'gold_champion' ? '#FFFFFF' : '#FF9F43'}
              />
            )}
          </g>
        )}

        {/* Eyes based on mood */}
        {mood === 'hype' && (
          <g>
            {/* Sparkly hyperactive eyes */}
            <circle cx="50" cy="46" r="4.5" fill="#171717" />
            <circle cx="70" cy="46" r="4.5" fill="#171717" />
            <circle cx="48.5" cy="44.5" r="1.8" fill="#FFFFFF" />
            <circle cx="68.5" cy="44.5" r="1.8" fill="#FFFFFF" />
            <circle cx="51.5" cy="47.5" r="0.8" fill="#FFFFFF" />
            <circle cx="71.5" cy="47.5" r="0.8" fill="#FFFFFF" />
          </g>
        )}

        {mood === 'victory' && (
          <g>
            {/* Happy arch eyes (^_^) */}
            <path
              d="M 46 47 C 48 43, 53 43, 55 47"
              stroke="#171717"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 65 47 C 67 43, 72 43, 74 47"
              stroke="#171717"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Cheek blush */}
            <ellipse cx="44" cy="52" rx="3" ry="1.8" fill="#FF9F43" opacity="0.6" />
            <ellipse cx="76" cy="52" rx="3" ry="1.8" fill="#FF9F43" opacity="0.6" />
          </g>
        )}

        {mood === 'referee' && (
          <g>
            {/* Focused sharp referee eyes */}
            <circle cx="50" cy="46" r="4" fill="#171717" />
            <circle cx="70" cy="46" r="4" fill="#171717" />
            <circle cx="49" cy="45" r="1.5" fill="#FFFFFF" />
            <circle cx="69" cy="45" r="1.5" fill="#FFFFFF" />
            {/* Whistle in mouth */}
            <rect x="57" y="54" width="10" height="4" rx="2" fill="#E5E7EB" stroke="#4B5563" strokeWidth="1" />
            <circle cx="67" cy="56" r="3" fill="#D1D5DB" />
          </g>
        )}

        {mood === 'waiting' && (
          <g>
            {/* Big curious eyes looking up/side */}
            <circle cx="50" cy="45" r="4.5" fill="#171717" />
            <circle cx="70" cy="45" r="4.5" fill="#171717" />
            <circle cx="51.5" cy="43.5" r="1.8" fill="#FFFFFF" />
            <circle cx="71.5" cy="43.5" r="1.8" fill="#FFFFFF" />
          </g>
        )}

        {mood === 'thinking' && (
          <g>
            {/* Winking or inquisitive eye */}
            <circle cx="49" cy="45" r="4.5" fill="#171717" />
            <circle cx="48" cy="44" r="1.8" fill="#FFFFFF" />
            <path
              d="M 66 47 C 69 44, 73 44, 75 47"
              stroke="#171717"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Raised eyebrow */}
            <path
              d="M 45 38 C 48 36, 53 36, 55 38"
              stroke="#6B4226"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* Snout & Nose */}
        <ellipse cx="60" cy="52" rx="4.5" ry="3" fill="#6B4226" />

        {/* Mouth */}
        {mood !== 'referee' && (
          <g>
            {mood === 'hype' || mood === 'victory' ? (
              <path
                d="M 52 56 C 54 62, 66 62, 68 56 Z"
                fill="#DC2626"
                stroke="#6B4226"
                strokeWidth="1.2"
              />
            ) : (
              <path
                d="M 54 57 C 58 60, 62 60, 66 57"
                stroke="#6B4226"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </g>
        )}

        {/* Arms / Hands */}
        {mood === 'victory' ? (
          <g>
            {/* Arms raised celebrating */}
            <path
              d="M 36 78 C 24 64, 18 50, 24 40"
              stroke="#8D5B4C"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="24" cy="38" r="5" fill="#F8C8B4" />
            <path
              d="M 84 78 C 96 64, 102 50, 96 40"
              stroke="#8D5B4C"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="96" cy="38" r="5" fill="#F8C8B4" />
            {/* Golden banana trophy */}
            <path
              d="M 94 36 C 98 28, 108 26, 112 34 C 108 42, 98 40, 94 36 Z"
              fill="#FFC837"
              stroke="#D97706"
              strokeWidth="1"
            />
          </g>
        ) : (
          <g>
            {/* Normal energetic arm posture */}
            <path
              d="M 36 80 C 26 86, 26 94, 34 100"
              stroke="#8D5B4C"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="34" cy="100" r="4.5" fill="#F8C8B4" />

            {/* Right hand with racket if equipped */}
            {hasRacket ? (
              <g>
                <path
                  d="M 84 80 C 92 85, 96 90, 94 98"
                  stroke="#8D5B4C"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="94" cy="98" r="4.5" fill="#F8C8B4" />
                {/* Sports Racket */}
                <line x1="94" y1="98" x2="108" y2="76" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />
                <ellipse cx="112" cy="70" rx="9" ry="12" fill="none" stroke={racketColor} strokeWidth="2.5" transform="rotate(25 112 70)" />
                <line x1="108" y1="64" x2="116" y2="76" stroke="#9CA3AF" strokeWidth="0.8" />
                <line x1="116" y1="64" x2="108" y2="76" stroke="#9CA3AF" strokeWidth="0.8" />
              </g>
            ) : (
              <g>
                <path
                  d="M 84 80 C 94 86, 94 94, 86 100"
                  stroke="#8D5B4C"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="86" cy="100" r="4.5" fill="#F8C8B4" />
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
