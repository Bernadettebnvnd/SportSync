'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  PlusCircle,
  Compass,
  UserPlus,
  CalendarCheck,
  MessageSquare,
  Building2,
  User,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { LandingNavbar } from './LandingNavbar';
import { LandingHero } from './LandingHero';
import { LandingFooter } from './LandingFooter';
import { Button } from '@/design-system/components/Button';
import type { AuthRole } from '@/screens/onboarding/AuthScreen';

export interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: (role?: AuthRole) => void;
  isLightMode?: boolean;
  onToggleTheme?: () => void;
}

const FEATURES = [
  {
    title: 'Find Players',
    description:
      'Connect with players based on sport, location, skill level, and availability.',
    icon: Users,
    accent: 'lime' as const,
    tag: 'Matchmaking',
  },
  {
    title: 'Create a Game',
    description:
      'Organize your own public or invite-only sports sessions and share invitation links.',
    icon: PlusCircle,
    accent: 'pink' as const,
    tag: 'Host Sessions',
  },
  {
    title: 'Discover Games',
    description:
      'Explore available local games and filter by sport or open spots.',
    icon: Compass,
    accent: 'lime' as const,
    tag: 'Live Feed',
  },
  {
    title: 'Join a Game',
    description:
      'Claim open roster spots and complete teams looking for players.',
    icon: UserPlus,
    accent: 'pink' as const,
    tag: 'Roster Fill',
  },
  {
    title: 'Court Booking',
    description:
      'Discover sports facilities, check court schedules, and request reservations.',
    icon: CalendarCheck,
    accent: 'lime' as const,
    tag: 'Venues & Courts',
  },
  {
    title: 'Connect with the Community',
    description:
      'Coordinate schedules in live match group chat and build local sports connections.',
    icon: MessageSquare,
    accent: 'pink' as const,
    tag: 'Squad Chat',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Create Your Account',
    description:
      'Sign up in seconds with Google or email as a Player looking for games or a Facility managing courts.',
    badge: 'Player or Facility',
  },
  {
    step: '02',
    title: 'Find or Organize a Game',
    description:
      'Browse available local pickup games and sports venues, or host your own match and invite players.',
    badge: 'Discover & Host',
  },
  {
    step: '03',
    title: 'Connect and Play',
    description:
      'Complete your team roster, coordinate schedules in live match chat, reserve your court, and enjoy the game.',
    badge: 'Hit the Court',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onGetStarted,
  isLightMode = false,
  onToggleTheme,
}) => {
  return (
    <div className="min-h-screen w-full bg-[#0B0F0C] text-[#F4F7F0] flex flex-col selection:bg-[#C8FF2E]/30 overflow-x-hidden">
      {/* A. Sticky Responsive Navigation Bar */}
      <LandingNavbar
        onSignIn={onSignIn}
        onGetStarted={() => onGetStarted('player')}
        isLightMode={isLightMode}
        onToggleTheme={onToggleTheme}
      />

      <main className="flex-1">
        {/* B. Hero Section (#home) */}
        <LandingHero onGetStarted={() => onGetStarted('player')} />

        {/* C. About SportSync (#about) */}
        <section
          id="about"
          className="relative w-full py-16 sm:py-24 lg:py-28 border-b border-white/5 overflow-hidden"
        >
          {/* Ambient Standalone S-Emblem Watermark */}
          <img
            src="/sportsync-logo.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute -left-24 top-1/2 -translate-y-1/2 w-96 h-96 object-contain opacity-[0.03]"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141A15] border border-white/10 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[#C8FF2E]" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#C8FF2E]">
                  About SportSync
                </span>
              </div>

              <h2 className="font-display font-bold text-2xl sm:text-4xl tracking-tight text-[#F4F7F0] mb-5">
                Built to Solve Local Sports Coordination
              </h2>

              <p className="text-base sm:text-lg text-[#A5B0A6] leading-relaxed">
                SportSync is a local sports matchmaking platform designed to connect
                recreational athletes and sports enthusiasts. It helps players find
                teammates, discover available games, organize matches, and connect with
                sports facilities in their area.
              </p>
            </div>

            {/* Dual Role Highlight Cards: For Players vs For Facilities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Card 1: For Players */}
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="rounded-[28px] bg-[#141A15] border border-white/10 hover:border-[#C8FF2E]/40 p-6 sm:p-8 flex flex-col justify-between shadow-lg transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/30 flex items-center justify-center">
                      <User className="w-6 h-6 text-[#C8FF2E]" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#1C241E] border border-white/10 text-xs font-bold text-[#C8FF2E]">
                      For Players
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl sm:text-2xl text-[#F4F7F0] mb-3">
                    Never Cancel a Game Over Missing Players
                  </h3>

                  <p className="text-sm sm:text-base text-[#A5B0A6] leading-relaxed mb-6">
                    Say goodbye to last-minute dropouts and scattered group messages.
                    Discover verified local games that match your sport, skill tier, and
                    schedule — or host your own run and fill open spots fast.
                  </p>

                  <ul className="space-y-3 mb-8">
                    {[
                      'Match with local players by sport, skill level, and availability',
                      'Host public or invite-only pickup sessions with direct share links',
                      'Coordinate game-day details inside real-time match group chat',
                      'Browse court schedules and submit facility booking requests',
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F4F7F0]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#C8FF2E] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onGetStarted('player')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="self-start font-display font-bold"
                >
                  Join as a Player
                </Button>
              </motion.div>

              {/* Card 2: For Facilities */}
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="rounded-[28px] bg-[#141A15] border border-white/10 hover:border-[#C8FF2E]/40 p-6 sm:p-8 flex flex-col justify-between shadow-lg transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#FF8FC7]/10 border border-[#FF8FC7]/30 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-[#FF8FC7]" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#1C241E] border border-white/10 text-xs font-bold text-[#FF8FC7]">
                      For Facilities
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl sm:text-2xl text-[#F4F7F0] mb-3">
                    Streamline Court Bookings &amp; Open Play
                  </h3>

                  <p className="text-sm sm:text-base text-[#A5B0A6] leading-relaxed mb-6">
                    Connect your sports complex, school gym, or club courts directly with
                    active local players. Manage court availability, booking approvals,
                    and community sessions from one dedicated organizer console.
                  </p>

                  <ul className="space-y-3 mb-8">
                    {[
                      'Showcase courts, surfaces, hourly rates, and operating hours',
                      'Review and approve player booking requests without double-bookings',
                      'Host official facility Open Play sessions and manage queues',
                      'Keep players informed with verified venue details and schedules',
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F4F7F0]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#FF8FC7] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => onGetStarted('facility_owner')}
                  rightIcon={<ArrowRight className="w-4 h-4 text-[#C8FF2E]" />}
                  className="self-start font-display font-bold border-white/15"
                >
                  Register a Facility
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* D. Features Section (#features) */}
        <section
          id="features"
          className="relative w-full py-16 sm:py-24 lg:py-28 border-b border-white/5"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141A15] border border-white/10 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#C8FF2E]" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#C8FF2E]">
                  Platform Capabilities
                </span>
              </div>

              <h2 className="font-display font-bold text-2xl sm:text-4xl tracking-tight text-[#F4F7F0] mb-4">
                Everything You Need to Organize &amp; Play
              </h2>

              <p className="text-sm sm:text-base text-[#A5B0A6] leading-relaxed">
                From finding one last player to booking a court for your regular squad,
                SportSync keeps your entire sports routine in sync.
              </p>
            </div>

            {/* 6 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                const isLime = feature.accent === 'lime';
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                    whileHover={{ y: -5 }}
                    className="group rounded-[24px] bg-[#141A15] border border-white/10 hover:border-[#C8FF2E]/40 p-6 sm:p-7 flex flex-col justify-between transition-all shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
                            isLime
                              ? 'bg-[#C8FF2E]/10 border-[#C8FF2E]/25 text-[#C8FF2E]'
                              : 'bg-[#FF8FC7]/10 border-[#FF8FC7]/25 text-[#FF8FC7]'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#1C241E] text-[#A5B0A6] border border-white/5">
                          {feature.tag}
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-lg sm:text-xl text-[#F4F7F0] mb-2.5">
                        {feature.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-[#A5B0A6] leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#C8FF2E]">
                      <span>Explore in SportSync</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* E. How It Works (#how-it-works) */}
        <section
          id="how-it-works"
          className="relative w-full py-16 sm:py-24 lg:py-28 border-b border-white/5"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141A15] border border-white/10 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#FF8FC7]" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#FF8FC7]">
                  How It Works
                </span>
              </div>

              <h2 className="font-display font-bold text-2xl sm:text-4xl tracking-tight text-[#F4F7F0] mb-4">
                Get in the Game in Three Simple Steps
              </h2>

              <p className="text-sm sm:text-base text-[#A5B0A6] leading-relaxed">
                Whether you&apos;re looking for a quick evening run or managing a multi-court
                facility, getting started takes less than a minute.
              </p>
            </div>

            <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {HOW_IT_WORKS_STEPS.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  className="relative rounded-[28px] bg-[#141A15] border border-white/10 p-6 sm:p-8 flex flex-col justify-between shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] font-display font-extrabold text-base flex items-center justify-center shadow-[0_0_20px_rgba(200,255,46,0.2)]">
                        {item.step}
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#1C241E] border border-white/10 text-[11px] font-bold text-[#A5B0A6]">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-lg sm:text-xl text-[#F4F7F0] mb-3">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#A5B0A6] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Desktop Step Connector Indicator */}
                  {index < HOW_IT_WORKS_STEPS.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="hidden lg:flex items-center justify-center absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#1C241E] border border-white/15 text-[#C8FF2E]"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* F. Call-to-Action Section (Protected Dark Stadium-Emerald Banner with Stacked Full Lockup /sportsync-full-logo.svg) */}
        <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div
              className="relative rounded-[32px] border border-white/15 px-6 py-12 sm:px-12 sm:py-16 text-center overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
              style={{
                background:
                  'linear-gradient(145deg, #0F2A22 0%, #091812 52%, #060E0A 100%)',
              }}
            >
              {/* Ambient Electric Lime Glow Behind Stacked Full Lockup */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[300px] rounded-full blur-[110px] opacity-35"
                style={{
                  background:
                    'radial-gradient(circle, rgba(200, 255, 46, 0.45) 0%, rgba(15, 42, 34, 0.2) 65%, transparent 100%)',
                }}
              />

              <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
                {/* Centered Official Stacked Full Lockup (/sportsync-full-logo.svg) */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center mb-3">
                  <img
                    src="/sportsync-full-logo.svg"
                    alt="SportSync Full Logo"
                    className="w-full h-full object-contain select-none pointer-events-none"
                  />
                </div>

                <h2
                  className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl tracking-tight mb-4"
                  style={{ color: '#F4F7F0' }}
                >
                  Your Next Game Starts Here.
                </h2>

                <p
                  className="text-sm sm:text-base lg:text-lg leading-relaxed mb-8 max-w-xl"
                  style={{ color: '#B4C2B7' }}
                >
                  Stop waiting for the perfect lineup. Find your teammates and get in
                  the game with SportSync.
                </p>

                <div className="w-full max-w-xs sm:max-w-sm">
                  <button
                    type="button"
                    onClick={() => onGetStarted('player')}
                    className="group w-full h-14 rounded-full font-display font-bold text-base px-6 flex items-center justify-between transition-all duration-150 press-scale shadow-[0_0_28px_rgba(200,255,46,0.3)]"
                    style={{
                      backgroundColor: '#C8FF2E',
                      color: '#0B0F0C',
                    }}
                  >
                    <span className="pl-2">Get Started Now</span>
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0"
                      style={{
                        backgroundColor: '#0B0F0C',
                        color: '#C8FF2E',
                      }}
                    >
                      <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* G. Footer */}
      <LandingFooter
        onSignIn={onSignIn}
        onGetStarted={() => onGetStarted('player')}
        isLightMode={isLightMode}
      />
    </div>
  );
};
