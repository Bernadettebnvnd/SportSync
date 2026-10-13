import React from 'react';

// Common Palette for Ref B Poster Illustrations:
// Forest #0F2A22, Clay #C8432B, Lime #C8FF2E, Pink #FF8FC7, Cream #F4F7F0, Base #0B0F0C

interface SceneProps {
  className?: string;
}

/** 1. Floodlit Stadium Stand */
export const StadiumScene: React.FC<SceneProps> = ({ className = 'w-full h-44' }) => (
  <svg
    viewBox="0 0 400 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`select-none overflow-hidden ${className}`}
  >
    {/* Sky & Floodlight Rays */}
    <rect width="400" height="220" fill="#0F2A22" />
    <path d="M40 0L0 220H120L60 0H40Z" fill="#C8FF2E" opacity="0.12" />
    <path d="M360 0L340 220H400L380 0H360Z" fill="#C8FF2E" opacity="0.12" />
    <circle cx="200" cy="80" r="46" fill="#FF8FC7" opacity="0.25" />

    {/* Floodlight Towers */}
    <rect x="36" y="20" width="8" height="140" fill="#1C241E" />
    <polygon points="28,20 52,20 48,8 32,8" fill="#C8FF2E" />
    <rect x="356" y="20" width="8" height="140" fill="#1C241E" />
    <polygon points="348,20 372,20 368,8 352,8" fill="#C8FF2E" />

    {/* Stadium Grandstands (Stepped tiers) */}
    <path d="M0 130L140 180H260L400 130V220H0V130Z" fill="#141A15" />
    <polygon points="40,145 150,185 250,185 360,145 350,155 245,192 155,192 50,155" fill="#C8432B" />
    <polygon points="70,165 160,195 240,195 330,165 320,172 235,200 165,200 80,172" fill="#FF8FC7" />

    {/* Pitch Floor at Bottom */}
    <path d="M0 195L120 185H280L400 195V220H0V195Z" fill="#0B0F0C" />
    <line x1="80" y1="210" x2="320" y2="210" stroke="#C8FF2E" strokeWidth="3" strokeDasharray="12 8" />
    <circle cx="200" cy="210" r="14" stroke="#C8FF2E" strokeWidth="2.5" />
  </svg>
);

/** 2. Goalposts + Ball on Clay Pitch */
export const ClayPitchScene: React.FC<SceneProps> = ({ className = 'w-full h-44' }) => (
  <svg
    viewBox="0 0 400 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`select-none overflow-hidden ${className}`}
  >
    {/* Sky & Sun Disc */}
    <rect width="400" height="220" fill="#0F2A22" />
    <circle cx="280" cy="65" r="38" fill="#FF8FC7" />

    {/* Clay Pitch in Perspective */}
    <polygon points="0,110 400,110 400,220 0,220" fill="#C8432B" />
    <polygon points="40,110 360,110 390,220 10,220" fill="#B33A24" />

    {/* Penalty Box Lines */}
    <polygon points="120,110 280,110 310,180 90,180" stroke="#F4F7F0" strokeWidth="3" fill="none" />
    <path d="M160 180C170 195 230 195 240 180" stroke="#F4F7F0" strokeWidth="3" fill="none" />

    {/* Minimalist Flat Goalposts */}
    <line x1="150" y1="70" x2="150" y2="125" stroke="#F4F7F0" strokeWidth="4" strokeLinecap="round" />
    <line x1="250" y1="70" x2="250" y2="125" stroke="#F4F7F0" strokeWidth="4" strokeLinecap="round" />
    <line x1="148" y1="70" x2="252" y2="70" stroke="#F4F7F0" strokeWidth="4" strokeLinecap="round" />
    {/* Net Lines */}
    <path d="M150 70L165 52H235L250 70" stroke="rgba(255,255,255,0.4)" strokeWidth="2" fill="none" />
    <path d="M165 52V115M235 52V115" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

    {/* Football (Front Right) */}
    <circle cx="230" cy="165" r="16" fill="#F4F7F0" />
    <polygon points="230,153 238,159 235,168 225,168 222,159" fill="#0B0F0C" />
    <circle cx="230" cy="165" r="16" stroke="#C8FF2E" strokeWidth="2.5" />
    {/* Shadow */}
    <ellipse cx="230" cy="182" rx="14" ry="4" fill="rgba(0,0,0,0.3)" />
  </svg>
);

/** 3. Basketball Hoop at Dusk with Sun Disc */
export const BasketballDuskScene: React.FC<SceneProps> = ({ className = 'w-full h-44' }) => (
  <svg
    viewBox="0 0 400 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`select-none overflow-hidden ${className}`}
  >
    {/* Dusk Gradient Backdrop */}
    <rect width="400" height="220" fill="#0F2A22" />
    {/* Big Pink/Clay Sun Disc */}
    <circle cx="200" cy="110" r="64" fill="#FF8FC7" />
    <circle cx="200" cy="110" r="50" fill="#C8432B" />

    {/* Court Floor */}
    <rect y="160" width="400" height="60" fill="#141A15" />
    <line x1="0" y1="160" x2="400" y2="160" stroke="#C8FF2E" strokeWidth="2" />
    <circle cx="200" cy="160" r="40" stroke="#C8FF2E" strokeWidth="2" fill="none" />

    {/* Pole and Backboard */}
    <line x1="200" y1="60" x2="200" y2="160" stroke="#F4F7F0" strokeWidth="5" strokeLinecap="round" />
    <rect x="175" y="44" width="50" height="36" rx="4" fill="#1C241E" stroke="#F4F7F0" strokeWidth="3" />
    <rect x="188" y="56" width="24" height="18" fill="none" stroke="#C8FF2E" strokeWidth="2" />

    {/* Orange/Clay Rim and Net */}
    <line x1="186" y1="74" x2="214" y2="74" stroke="#C8432B" strokeWidth="3.5" strokeLinecap="round" />
    <polygon points="188,74 212,74 206,94 194,94" fill="none" stroke="#F4F7F0" strokeWidth="2" strokeDasharray="3 2" />

    {/* Floating Basketball */}
    <circle cx="150" cy="72" r="14" fill="#C8432B" stroke="#0B0F0C" strokeWidth="2" />
    <path d="M138 72H162M150 58V86" stroke="#0B0F0C" strokeWidth="1.5" />
  </svg>
);

/** 4. Tennis Court from Above */
export const TennisAerialScene: React.FC<SceneProps> = ({ className = 'w-full h-44' }) => (
  <svg
    viewBox="0 0 400 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`select-none overflow-hidden ${className}`}
  >
    {/* Grass Green Border */}
    <rect width="400" height="220" fill="#0F2A22" />

    {/* Tennis Clay Inner Court */}
    <rect x="40" y="24" width="320" height="172" rx="10" fill="#C8432B" />

    {/* Doubles and Singles Boundaries */}
    <rect x="60" y="38" width="280" height="144" stroke="#F4F7F0" strokeWidth="2.5" fill="none" />
    <line x1="90" y1="38" x2="90" y2="182" stroke="#F4F7F0" strokeWidth="1.5" />
    <line x1="310" y1="38" x2="310" y2="182" stroke="#F4F7F0" strokeWidth="1.5" />

    {/* Service Boxes & T-Line */}
    <line x1="130" y1="38" x2="130" y2="182" stroke="#F4F7F0" strokeWidth="2" />
    <line x1="270" y1="38" x2="270" y2="182" stroke="#F4F7F0" strokeWidth="2" />
    <line x1="130" y1="110" x2="270" y2="110" stroke="#F4F7F0" strokeWidth="2" />

    {/* Center Net (White cord with lime posts) */}
    <line x1="200" y1="20" x2="200" y2="200" stroke="#F4F7F0" strokeWidth="4" />
    <circle cx="200" cy="20" r="5" fill="#C8FF2E" />
    <circle cx="200" cy="200" r="5" fill="#C8FF2E" />

    {/* Tennis Ball with Lime Aura */}
    <circle cx="160" cy="80" r="8" fill="#C8FF2E" />
    <path d="M155 76C158 80 158 84 155 86M165 76C162 80 162 84 165 86" stroke="#0B0F0C" strokeWidth="1" />
  </svg>
);

/** 5. Runner on Track */
export const RunnerTrackScene: React.FC<SceneProps> = ({ className = 'w-full h-44' }) => (
  <svg
    viewBox="0 0 400 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`select-none overflow-hidden ${className}`}
  >
    {/* Night Backdrop */}
    <rect width="400" height="220" fill="#0B0F0C" />

    {/* Curved Running Tracks (Clay Red with White Lane Dividers) */}
    <path d="M0 60C120 60 200 120 200 220H0V60Z" fill="#C8432B" opacity="0.3" />
    <path d="M0 100C100 100 160 150 160 220H0V100Z" fill="#C8432B" />
    <path d="M0 100C100 100 160 150 160 220" stroke="#F4F7F0" strokeWidth="2" fill="none" strokeDasharray="8 6" />
    <path d="M0 140C80 140 120 180 120 220" stroke="#F4F7F0" strokeWidth="2" fill="none" strokeDasharray="8 6" />

    {/* Stadium Stands Top Right */}
    <polygon points="260,20 400,20 400,100 300,100" fill="#0F2A22" />
    <circle cx="340" cy="50" r="28" fill="#FF8FC7" opacity="0.4" />
    <circle cx="340" cy="50" r="16" fill="#C8FF2E" />

    {/* Dynamic Runner Silhouette */}
    <circle cx="210" cy="115" r="8" fill="#C8FF2E" />
    {/* Body */}
    <path d="M210 123L202 145L216 155" stroke="#F4F7F0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    {/* Arms */}
    <path d="M205 130L218 134L225 125" stroke="#FF8FC7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {/* Legs */}
    <path d="M202 145L188 152L178 168" stroke="#F4F7F0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M216 155L228 170L242 166" stroke="#C8FF2E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 6. Empty State: No Matches Quiet Pitch */
export const EmptyMatchesScene: React.FC<SceneProps> = ({ className = 'w-48 h-36' }) => (
  <svg
    viewBox="0 0 240 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`select-none overflow-hidden mx-auto ${className}`}
  >
    <rect width="240" height="160" rx="20" fill="#141A15" stroke="rgba(255,255,255,0.06)" />
    {/* Quiet Sun/Moon */}
    <circle cx="160" cy="45" r="22" fill="#FF8FC7" opacity="0.3" />
    <circle cx="160" cy="45" r="14" fill="#C8FF2E" opacity="0.8" />

    {/* Pitch arc */}
    <path d="M20 120C80 90 160 90 220 120" stroke="#0F2A22" strokeWidth="18" strokeLinecap="round" />
    <path d="M20 120C80 90 160 90 220 120" stroke="#263028" strokeWidth="2" strokeDasharray="6 4" />

    {/* Single lone ball waiting on grass */}
    <circle cx="120" cy="98" r="9" fill="#F4F7F0" />
    <circle cx="120" cy="98" r="9" stroke="#C8FF2E" strokeWidth="2" />
    <ellipse cx="120" cy="110" rx="8" ry="2.5" fill="rgba(0,0,0,0.4)" />
    {/* Boot footprint */}
    <path d="M84 105C86 102 90 102 92 105" stroke="#FF8FC7" strokeWidth="2" strokeLinecap="round" />
    <path d="M152 107C154 104 158 104 160 107" stroke="#FF8FC7" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
