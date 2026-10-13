'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useMatchiStore } from '@/lib/store';
import { SportType } from '@/types';
import { getSportDisplayName, formatCurrency } from '@/lib/utils';
import { AuthModal } from '@/components/auth/AuthModal';
import {
  Calendar,
  Clock,
  ArrowRight,
  Users,
  Compass,
  Zap,
  MapPin,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const SPORTS: { id: SportType; label: string }[] = [
  { id: 'pickleball', label: 'Pickleball' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'padel', label: 'Padel' },
];

export default function HomePage() {
  const { currentUser, bookings, sessions, venues, courts } = useMatchiStore();
  const [selectedSport, setSelectedSport] = useState<SportType>('pickleball');
  const [previewFilterSport, setPreviewFilterSport] = useState<string>('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const isOnboarded = Boolean(
    currentUser.onboarding_completed || currentUser.has_completed_onboarding
  );

  // Active upcoming booking for current user (strictly shown if real)
  const upcomingBooking = bookings.find(
    (b) =>
      b.user_id === currentUser.id &&
      (b.status === 'confirmed' || b.status === 'pending')
  );

  const upcomingVenue = upcomingBooking
    ? venues.find((v) => v.id === upcomingBooking.venue_id)
    : null;

  const activeSessions = sessions.filter((s) => s.status === 'active');
  const activeSessionsCount = activeSessions.length;

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Filtered venues for Quick Preview
  const previewVenues = useMemo(() => {
    if (previewFilterSport === 'all') return venues.slice(0, 3);
    return venues
      .filter((v) => v.featured_sports?.includes(previewFilterSport as SportType))
      .slice(0, 3);
  }, [venues, previewFilterSport]);

  /* =========================================================================
   * EXPERIENCE 1: QUICK PREVIEW (Unauthenticated / Not Onboarded)
   * Minimal, confident entry: "Find courts. Find games. Play more."
   * No full dashboards, no forced walls, real data preview only.
   * ========================================================================= */
  if (!isOnboarded) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14 space-y-10 pb-28 md:pb-16">
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultMode="signin"
        />

        {/* SIDELINE Multi-Sport Prototype Banner */}
        <div className="w-full bg-[#0B0F0C] border border-[#C8FF2E]/30 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8FF2E]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1C241E] border border-[#C8FF2E]/30 text-[#C8FF2E] text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#C8FF2E] animate-pulse" />
                <span>NEW &bull; SIDELINE MOBILE SYSTEM</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#F4F7F0] tracking-tight">
                28 High-Fidelity Mobile Screens &amp; Design Board
              </h2>
              <p className="text-xs sm:text-sm text-[#A5B0A6] max-w-xl">
                One app for live sports scores, community pickup organizing, and instant court bookings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/sideline"
                className="px-5 py-2.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-bold text-xs flex items-center gap-1.5 hover:bg-[#b8f020] transition-all shadow-[0_0_20px_rgba(200,255,46,0.35)]"
              >
                <span>⚡ Launch Mobile App</span>
              </Link>
              <Link
                href="/showcase"
                className="px-4 py-2.5 rounded-full bg-[#1C241E] border border-white/10 text-white font-semibold text-xs hover:bg-[#263028] transition-all"
              >
                <span>Dribbble Canvas</span>
              </Link>
              <Link
                href="/styleguide"
                className="px-4 py-2.5 rounded-full bg-[#141A15] border border-white/10 text-[#A5B0A6] hover:text-white text-xs transition-all"
              >
                <span>Styleguide</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quiet Minimal Hero */}
        <section className="space-y-4 text-center max-w-2xl mx-auto pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF4EE] border border-[#2D724E]/20 text-[#2D724E] text-[11px] font-bold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D724E] animate-pulse" />
            <span>Sports Discovery &bull; Philippines</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1A241E] leading-[1.12]">
            Find courts. Find games.{' '}
            <span className="text-[#2D724E]">Play more.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#65756B] leading-relaxed max-w-lg mx-auto">
            Instant court reservations at verified sports centers and live drop-in
            game rotations with community players.
          </p>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/explore"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Courts</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/queue"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#1A241E] hover:bg-[#0F172A] text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
            >
              <Zap className="w-4 h-4 text-[#E9C46A]" />
              <span>Find Games</span>
            </Link>

            <Link
              href="/onboarding"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white border border-[#E8E5DF] hover:border-[#1A241E] text-[#1A241E] text-sm font-bold transition-all text-center"
            >
              Get Started
            </Link>
          </div>

          {/* Sign In Prompt */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs text-[#65756B] hover:text-[#1A241E] underline font-medium"
            >
              Already have an account? Sign In
            </button>
          </div>
        </section>

        {/* Live Sport Selector Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2D724E]" />
              <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                Nearby Sports Centers
              </h2>
            </div>
            <Link
              href={`/explore?sport=${previewFilterSport !== 'all' ? previewFilterSport : 'pickleball'}`}
              className="text-xs font-bold text-[#2D724E] hover:underline flex items-center gap-0.5"
            >
              <span>View all ({venues.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Sport Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setPreviewFilterSport('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                previewFilterSport === 'all'
                  ? 'bg-[#1E4A32] text-white border-[#1E4A32]'
                  : 'bg-white border-[#E8E5DF] text-[#65756B] hover:border-[#1A241E]'
              }`}
            >
              All Sports
            </button>
            {SPORTS.map((sport) => {
              const isSelected = previewFilterSport === sport.id;
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setPreviewFilterSport(sport.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-[#1E4A32] text-white border-[#1E4A32]'
                      : 'bg-white border-[#E8E5DF] text-[#65756B] hover:border-[#1A241E]'
                  }`}
                >
                  {sport.label}
                </button>
              );
            })}
          </div>

          {/* Venues Preview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {previewVenues.map((venue) => {
              const minRate =
                venue.courts && venue.courts.length > 0
                  ? Math.min(...venue.courts.map((c) => c.hourly_rate_cents))
                  : 45000;

              return (
                <Link
                  key={venue.id}
                  href={`/explore?city=${encodeURIComponent(venue.city)}`}
                  className="group rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#65756B]">
                      <span className="flex items-center gap-1 text-[#2D724E]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                      <span>{venue.city}</span>
                    </div>

                    <h3 className="text-base font-black text-[#1A241E] group-hover:text-[#2D724E] transition-colors">
                      {venue.name}
                    </h3>

                    <p className="text-xs text-[#65756B] line-clamp-2 leading-relaxed">
                      {venue.description}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {venue.featured_sports.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E8E5DF] text-[10px] font-bold text-[#65756B]"
                        >
                          {getSportDisplayName(s)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#E8E5DF] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#65756B] block">From</span>
                      <span className="text-xs font-black text-[#2D724E]">
                        {formatCurrency(minRate)}/hr
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#1A241E] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      View
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Live Open Play Preview */}
        {activeSessionsCount > 0 && (
          <section className="rounded-3xl border border-[#E8E5DF] bg-[#FAF8F5] p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E9C46A] animate-pulse" />
                <h3 className="text-sm sm:text-base font-black text-[#1A241E]">
                  Live Open Play Drop-in Sessions
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#2D724E] uppercase tracking-wider bg-[#EBF4EE] px-2 py-0.5 rounded-md">
                {activeSessionsCount} active today
              </span>
            </div>

            <p className="text-xs text-[#65756B] leading-relaxed">
              Show up solo or with friends. Rotate with players of equal skill using our
              automated paddle queue.
            </p>

            <div className="pt-1">
              <Link
                href="/queue"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A241E] text-white text-xs font-bold hover:bg-black transition-colors"
              >
                <span>View Live Rotations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        )}
      </div>
    );
  }

  /* =========================================================================
   * EXPERIENCE 2: PLAYER EXPERIENCE (Authenticated & Onboarded)
   * Focused player cockpit:
   * 1. Primary: Find a Court
   * 2. Primary: Find a Game
   * 3. Conditional: Your next activity (only when real booking exists)
   * Zero leaderboards, streaks, or social feed clutter.
   * ========================================================================= */
  return (
    <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 pb-24 md:pb-12">
      {/* Quiet Top Header */}
      <div className="space-y-1 border-b border-[#E8E5DF] pb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#65756B]">
            {todayFormatted}
          </span>
          <span className="text-xs font-semibold text-[#2D724E]">
            {currentUser.city || 'Philippines'}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
          {currentUser.nickname
            ? `Welcome, ${currentUser.nickname}`
            : 'Matchi'}
        </h1>
        <p className="text-xs sm:text-sm text-[#65756B]">
          Find courts, join live game rotations, and manage reservations.
        </p>
      </div>

      {/* CONDITIONAL SECTION: YOUR NEXT ACTIVITY (Strictly rendered if real booking exists) */}
      {upcomingBooking && (
        <section className="rounded-2xl border border-[#2D724E]/30 bg-[#EBF4EE]/70 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E] block">
              Your Next Activity &bull;{' '}
              {upcomingBooking.status === 'confirmed' ? 'Confirmed' : 'Pending Verification'}
            </span>
            <h3 className="text-sm sm:text-base font-black text-[#1A241E] truncate">
              {upcomingBooking.court?.name || upcomingVenue?.name || 'Reserved Court'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[#65756B] flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#2D724E]" />
                {upcomingBooking.booking_date}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#2D724E]" />
                {upcomingBooking.start_time} - {upcomingBooking.end_time}
              </span>
            </div>
          </div>

          <Link
            href="/bookings"
            className="px-3.5 py-1.5 rounded-xl bg-[#2D724E] text-white text-xs font-bold shrink-0 hover:bg-[#1E4A32] transition-colors"
          >
            View
          </Link>
        </section>
      )}

      {/* PRIMARY ACTION 1: FIND A COURT */}
      <section className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2D724E]" />
            <h2 className="text-lg sm:text-xl font-black text-[#1A241E] tracking-tight">
              Find a Court
            </h2>
          </div>
          <p className="text-xs text-[#65756B]">
            Dedicated venues with verified playing surfaces and instant hourly slots.
          </p>
        </div>

        {/* Mobile Sport Selector */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#65756B] uppercase tracking-wider block">
            Select Sport
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPORTS.map((sport) => {
              const isSelected = selectedSport === sport.id;
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setSelectedSport(sport.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#1E4A32] text-white border-[#1E4A32] shadow-xs'
                      : 'bg-[#FAF8F5] border-[#E8E5DF] text-[#1A241E] hover:border-[#1A241E]'
                  }`}
                >
                  <span>{sport.label}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E9C46A]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div>
          <Link
            href={`/explore?sport=${selectedSport}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
          >
            <Compass className="w-4 h-4" />
            <span>Find a Court</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* PRIMARY ACTION 2: FIND A GAME */}
      <section className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C87D43]" />
            <h2 className="text-lg sm:text-xl font-black text-[#1A241E] tracking-tight">
              Find a Game
            </h2>
          </div>
          <p className="text-xs text-[#65756B]">
            Drop-in paddle queues, live rotation boards, and open play matches.
          </p>
        </div>

        {/* Live Queue Pulse Indicator */}
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-3.5 text-xs text-[#65756B]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2D724E]" />
            <span>
              <strong className="text-[#1A241E] font-black">
                {activeSessionsCount} active sessions
              </strong>{' '}
              open today
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#2D724E] uppercase tracking-wider bg-[#EBF4EE] px-2 py-0.5 rounded-md">
            Live Rotation
          </span>
        </div>

        {/* Action Button */}
        <div>
          <Link
            href="/queue"
            className="w-full py-3.5 px-4 rounded-2xl bg-[#1A241E] hover:bg-[#0F172A] text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
          >
            <Zap className="w-4 h-4 text-[#E9C46A]" />
            <span>Find a Game</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

