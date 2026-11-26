'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Compass,
  Users,
  MapPin,
  Calendar,
  CalendarCheck,
  Clock,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { SportIcon, SportId } from '@/illustrations/SportIcons';

export interface LandingHeroProps {
  onGetStarted: () => void;
  onExploreFeatures?: () => void;
}

const SUPPORTED_SPORTS: SportId[] = [
  'Basketball',
  'Badminton',
  'Volleyball',
  'Football',
  'Pickleball',
  'Tennis',
  'Billiards',
  'Darts',
];

const ROSTER_PLAYERS = [
  { initials: 'MC', name: 'Marco C.', role: 'Host', color: '#C8FF2E', text: '#0B0F0C' },
  { initials: 'JR', name: 'Jules R.', role: 'Guard', color: '#1C241E', text: '#F4F7F0' },
  { initials: 'AL', name: 'Alex L.', role: 'Wing', color: '#0F2A22', text: '#C8FF2E' },
  { initials: 'KS', name: 'Ken S.', role: 'Center', color: '#263028', text: '#F4F7F0' },
  { initials: 'DN', name: 'Dani N.', role: 'Forward', color: '#FF8FC7', text: '#0B0F0C' },
];

export const LandingHero: React.FC<LandingHeroProps> = ({
  onGetStarted,
  onExploreFeatures,
}) => {
  const handleScrollToFeatures = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (onExploreFeatures) {
      onExploreFeatures();
      return;
    }
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-20 lg:pb-28 border-b border-white/5"
    >
      {/* Stadium Emerald & Electric Lime Ambient Radial Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-36 left-1/2 -translate-x-1/2 w-[min(780px,100vw)] h-[480px] rounded-full blur-[130px] opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(15, 42, 34, 0.95) 0%, rgba(200, 255, 46, 0.14) 55%, rgba(11, 15, 12, 0) 100%)',
          }}
        />
        <div
          className="absolute top-1/3 right-0 w-[min(420px,90vw)] h-[420px] rounded-full blur-[140px] opacity-25"
          style={{
            background:
              'radial-gradient(circle, rgba(200, 255, 46, 0.18) 0%, rgba(15, 42, 34, 0.4) 60%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline, Description, CTAs & Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="lg:col-span-7 flex flex-col items-start text-left"
          >
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#141A15] border border-white/10 mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#C8FF2E] animate-live-pulse" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C8FF2E]">
                Local Sports Matchmaking Platform
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-[56px] tracking-tight leading-[1.08] text-[#F4F7F0] mb-5">
              Find Your Game.{' '}
              <span className="block sm:inline text-[#C8FF2E]">
                Build Your Team.
              </span>{' '}
              <span className="block">Play Together.</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#A5B0A6] leading-relaxed max-w-2xl mb-8">
              SportSync connects local recreational athletes, makes finding teammates
              effortless, helps you organize or join pickup games to complete rosters,
              and links players directly with nearby sports facilities.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-9">
              <Button
                variant="primary"
                size="lg"
                onClick={onGetStarted}
                rightIcon={<ArrowRight className="w-5 h-5" />}
                className="font-display font-bold text-base px-8 py-4 shadow-[0_0_28px_rgba(200,255,46,0.28)]"
              >
                Get Started
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={handleScrollToFeatures}
                leftIcon={<Compass className="w-5 h-5 text-[#C8FF2E]" />}
                className="font-semibold text-base px-7 py-4 bg-[#141A15] border-white/15"
              >
                Explore Features
              </Button>
            </div>

            {/* Key Value Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full pt-6 border-t border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/25 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-[#C8FF2E]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F4F7F0]">Smart Roster Match</p>
                  <p className="text-[11px] text-[#6F7B71]">By sport, skill &amp; schedule</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF8FC7]/10 border border-[#FF8FC7]/25 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-4 h-4 text-[#FF8FC7]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F4F7F0]">Direct Booking</p>
                  <p className="text-[11px] text-[#6F7B71]">Create, join &amp; confirm matches</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/25 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-[#C8FF2E]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F4F7F0]">Verified Facilities</p>
                  <p className="text-[11px] text-[#6F7B71]">Discover &amp; reserve courts</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Modern Sports-Themed Composition & Live UI Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="lg:col-span-5 relative"
          >
            {/* Outer Stadium Arena Showcase Frame (Always dark pitch surface for high-contrast court visual) */}
            <div
              className="relative rounded-[28px] p-5 sm:p-6 border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.45)] overflow-hidden"
              style={{
                background:
                  'linear-gradient(155deg, #0F2A22 0%, #0B1611 52%, #080C09 100%)',
              }}
            >
              {/* Architectural Court-Line SVG Geometry Backdrop */}
              <svg
                aria-hidden="true"
                viewBox="0 0 400 440"
                fill="none"
                className="pointer-events-none absolute inset-0 w-full h-full opacity-15"
              >
                <rect
                  x="16"
                  y="16"
                  width="368"
                  height="408"
                  rx="20"
                  stroke="#C8FF2E"
                  strokeWidth="1.5"
                />
                <line
                  x1="16"
                  y1="220"
                  x2="384"
                  y2="220"
                  stroke="#C8FF2E"
                  strokeWidth="1.5"
                />
                <circle
                  cx="200"
                  cy="220"
                  r="54"
                  stroke="#C8FF2E"
                  strokeWidth="1.5"
                />
                <path
                  d="M 92 16 L 92 105 A 108 108 0 0 0 308 105 L 308 16"
                  stroke="#C8FF2E"
                  strokeWidth="1.5"
                />
                <rect
                  x="145"
                  y="16"
                  width="110"
                  height="88"
                  stroke="#C8FF2E"
                  strokeWidth="1.5"
                />
                <path
                  d="M 92 424 L 92 335 A 108 108 0 0 1 308 335 L 308 424"
                  stroke="#C8FF2E"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Subtle Low-Opacity Ambient Standalone "S" Ribbon-Athlete Emblem (/sportsync-logo.svg) */}
              <img
                src="/sportsync-logo.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute -right-10 -bottom-10 w-60 h-60 object-contain opacity-[0.08]"
              />

              {/* Top Arena Header Row with Standalone /sportsync-logo.svg Crest */}
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center p-1 shadow-md"
                    style={{ backgroundColor: '#060E0A' }}
                  >
                    <img
                      src="/sportsync-logo.svg"
                      alt="SportSync Emblem"
                      className="w-full h-full object-contain select-none"
                    />
                  </div>
                  <div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest block"
                      style={{ color: '#C8FF2E' }}
                    >
                      Live Matchmaking
                    </span>
                    <span
                      className="text-xs font-bold block"
                      style={{ color: '#F4F7F0' }}
                    >
                      Active Local Sessions
                    </span>
                  </div>
                </div>

                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                  style={{
                    backgroundColor: 'rgba(200, 255, 46, 0.14)',
                    borderColor: 'rgba(200, 255, 46, 0.35)',
                    color: '#C8FF2E',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: '#C8FF2E' }}
                  />
                  Open Roster
                </span>
              </div>

              {/* Card 1: Primary Matchmaking & Roster Card */}
              <div
                className="relative z-10 rounded-2xl p-4 border border-white/10 shadow-xl mb-3.5"
                style={{ backgroundColor: 'rgba(20, 26, 21, 0.92)' }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: 'rgba(200, 255, 46, 0.15)',
                        color: '#C8FF2E',
                      }}
                    >
                      <SportIcon sport="Basketball" size={20} color="#C8FF2E" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-extrabold uppercase tracking-wider"
                          style={{ color: '#C8FF2E' }}
                        >
                          Basketball &bull; 5v5 Full Court
                        </span>
                      </div>
                      <h3
                        className="font-display font-bold text-sm sm:text-base leading-snug"
                        style={{ color: '#F4F7F0' }}
                      >
                        Evening Pickup Run
                      </h3>
                    </div>
                  </div>

                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide shrink-0"
                    style={{
                      backgroundColor: 'rgba(255, 143, 199, 0.16)',
                      color: '#FF8FC7',
                      border: '1px solid rgba(255, 143, 199, 0.3)',
                    }}
                  >
                    2 Spots Left
                  </span>
                </div>

                {/* Time & Venue Metadata */}
                <div className="grid grid-cols-2 gap-2 mb-3.5 text-xs">
                  <div
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
                    style={{ backgroundColor: '#1C241E', color: '#A5B0A6' }}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: '#C8FF2E' }} />
                    <span className="truncate font-medium" style={{ color: '#F4F7F0' }}>
                      Tonight &bull; 7:00 PM
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
                    style={{ backgroundColor: '#1C241E', color: '#A5B0A6' }}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#C8FF2E' }} />
                    <span className="truncate font-medium" style={{ color: '#F4F7F0' }}>
                      Court 2 &bull; Indoor
                    </span>
                  </div>
                </div>

                {/* Roster Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                    <span style={{ color: '#A5B0A6' }}>Team Roster Progress</span>
                    <span style={{ color: '#C8FF2E' }}>8 / 10 Players Joined</span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#1C241E' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: '80%',
                        background: 'linear-gradient(90deg, #C8FF2E 0%, #3DDC84 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* Avatar Stack + Join Action Preview */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center -space-x-2">
                    {ROSTER_PLAYERS.map((player) => (
                      <div
                        key={player.initials}
                        title={`${player.name} (${player.role})`}
                        className="w-7 h-7 rounded-full text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[#141A15]"
                        style={{
                          backgroundColor: player.color,
                          color: player.text,
                        }}
                      >
                        {player.initials}
                      </div>
                    ))}
                    <div
                      className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-[#141A15]"
                      style={{
                        backgroundColor: '#263028',
                        color: '#A5B0A6',
                      }}
                    >
                      +3
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 transition-transform press-scale"
                    style={{
                      backgroundColor: '#C8FF2E',
                      color: '#0B0F0C',
                    }}
                  >
                    <span>Join Roster</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 2 & 3: Court Booking & Match Chat Mini Cards */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Court Reservation Card */}
                <div
                  className="rounded-2xl p-3.5 border border-white/10"
                  style={{ backgroundColor: 'rgba(20, 26, 21, 0.88)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                      style={{ color: '#3DDC84' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Court Booking
                    </span>
                    <SportIcon sport="Pickleball" size={15} color="#C8FF2E" />
                  </div>
                  <p
                    className="text-xs font-bold truncate mb-1"
                    style={{ color: '#F4F7F0' }}
                  >
                    Pickleball &amp; Badminton Courts
                  </p>
                  <div
                    className="flex items-center gap-1.5 text-[11px]"
                    style={{ color: '#A5B0A6' }}
                  >
                    <Clock className="w-3 h-3 shrink-0" style={{ color: '#C8FF2E' }} />
                    <span>Available Slots Today</span>
                  </div>
                </div>

                {/* Match Chat Coordination Card */}
                <div
                  className="rounded-2xl p-3.5 border border-white/10"
                  style={{ backgroundColor: 'rgba(20, 26, 21, 0.88)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                      style={{ color: '#FF8FC7' }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Squad Chat
                    </span>
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: '#A5B0A6' }}
                    >
                      Live
                    </span>
                  </div>
                  <p
                    className="text-xs font-bold truncate mb-1"
                    style={{ color: '#F4F7F0' }}
                  >
                    &ldquo;Court 2 reserved! See you at 7.&rdquo;
                  </p>
                  <div
                    className="flex items-center gap-1.5 text-[11px]"
                    style={{ color: '#A5B0A6' }}
                  >
                    <Users className="w-3 h-3 shrink-0" style={{ color: '#FF8FC7' }} />
                    <span>Instant roster updates</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Supported Standardized Sports Strip */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6F7B71] shrink-0">
              Built for Every Local Sport
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {SUPPORTED_SPORTS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#141A15] hover:bg-[#1C241E] border border-white/10 hover:border-[#C8FF2E]/40 text-xs font-semibold text-[#F4F7F0] transition-all shrink-0 press-scale"
                >
                  <SportIcon sport={sport} size={15} className="text-[#C8FF2E]" />
                  <span>{sport}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
