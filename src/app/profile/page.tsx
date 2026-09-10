'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { formatTimeAgo, getSportDisplayName, formatCurrency } from '@/lib/utils';
import {
  Trophy,
  Flame,
  MapPin,
  Users,
  User,
  Lock,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRight,
  Compass,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, matches, bookings, resetOnboardingState, activeMode, toggleMode } = useMatchiStore();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookings' | 'matches'>('bookings');

  const winRate =
    currentUser.matches_played > 0
      ? Math.round((currentUser.matches_won / currentUser.matches_played) * 100)
      : 0;

  const playerMatches = matches.filter(
    (m) =>
      m.team_a_player_ids.includes(currentUser.id) ||
      m.team_b_player_ids.includes(currentUser.id)
  );

  const myBookings = bookings.filter((b) => b.user_id === currentUser.id);

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 pb-24 md:pb-12">
      {/* Player Passport Card */}
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
          {/* Avatar with Win Streak Ring */}
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt={currentUser.full_name}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-[#2D724E] shadow-sm"
            />
            <div
              title="Win Streak"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#C87D43] text-white shadow-sm"
            >
              <Flame className="w-4 h-4 fill-current text-[#E9C46A]" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-3xl font-black text-[#1A241E]">
                    {currentUser.full_name}
                  </h1>
                  <span className="rounded-full bg-[#2D724E]/10 px-2.5 py-0.5 text-xs font-bold text-[#2D724E]">
                    &ldquo;{currentUser.nickname}&rdquo;
                  </span>
                </div>
                <p className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-[#65756B] mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2D724E]" />
                  <span>{currentUser.city}</span>
                  <span>&bull;</span>
                  <span>Verified Matchi Player</span>
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#FBF0E6] px-3 py-1.5 text-xs font-bold text-[#A35C2B] border border-[#C87D43]/20">
                  <Trophy className="w-3.5 h-3.5 text-[#E9C46A]" />
                  <span>Active Competitor</span>
                </span>
              </div>
            </div>

            {/* Sport & Format tags */}
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1.5 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E4A32] text-white px-3 py-1 font-black shadow-xs" title="Primary Sport">
                <Lock className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span>{getSportDisplayName(currentUser.primary_sport)}</span>
              </span>
              <span className="rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] px-3 py-1 font-bold text-[#2D724E] flex items-center gap-1">
                <Users className="w-3 h-3" />
                {currentUser.preferred_format === 'doubles' ? 'Doubles Specialist' : 'Singles Specialist'}
              </span>
              <span className="rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] px-3 py-1 font-medium text-[#65756B] capitalize">
                Skill: {currentUser.skill_level.replace('_', ' ')}
              </span>

              <button
                type="button"
                onClick={() => setIsOnboardingOpen(true)}
                className="text-[11px] font-bold text-[#C87D43] hover:underline flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#FBF0E6] transition-colors"
                title="Update your preferences"
              >
                <Sparkles className="w-3 h-3" />
                <span>Edit Preferences</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[#E8E5DF] pt-5">
          <div className="rounded-2xl bg-[#FAF8F5] p-3 text-center">
            <span className="text-[11px] font-bold text-[#65756B]">Matches Played</span>
            <div className="text-xl sm:text-2xl font-black text-[#1A241E] mt-0.5">
              {currentUser.matches_played}
            </div>
          </div>

          <div className="rounded-2xl bg-[#FAF8F5] p-3 text-center">
            <span className="text-[11px] font-bold text-[#65756B]">Win Rate</span>
            <div className="text-xl sm:text-2xl font-black text-[#2D724E] mt-0.5">
              {winRate}%
            </div>
          </div>

          <div className="rounded-2xl bg-[#FAF8F5] p-3 text-center">
            <span className="text-[11px] font-bold text-[#65756B]">Current Streak</span>
            <div className="text-xl sm:text-2xl font-black text-[#C87D43] mt-0.5 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-current text-[#E9C46A]" />
              <span>{currentUser.win_streak}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#FAF8F5] p-3 text-center">
            <span className="text-[11px] font-bold text-[#65756B]">Reservations</span>
            <div className="text-xl sm:text-2xl font-black text-[#1E4A32] mt-0.5">
              {myBookings.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Bookings vs Match Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E8E5DF] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'bookings'
                ? 'bg-[#2D724E] text-white shadow-xs'
                : 'bg-white border border-[#E8E5DF] text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Your Reservations ({myBookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'matches'
                ? 'bg-[#2D724E] text-white shadow-xs'
                : 'bg-white border border-[#E8E5DF] text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Match Results ({playerMatches.length})</span>
          </button>
        </div>

        {/* TAB 1: RESERVATIONS */}
        {activeTab === 'bookings' && (
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                  Court Reservations
                </h2>
                <p className="text-xs text-[#65756B]">
                  Verified bookings, confirmed private court hours &amp; access passes
                </p>
              </div>
              <Link
                href="/explore"
                className="text-xs font-bold text-[#2D724E] hover:underline flex items-center gap-1"
              >
                <span>Book Court</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {myBookings.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-[#EBF4EE] flex items-center justify-center text-[#2D724E] mx-auto">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#1A241E]">No court reservations yet</h3>
                <p className="text-xs text-[#65756B] max-w-sm mx-auto">
                  Search through verified venues, check hourly availability, and reserve your private court time.
                </p>
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-xs transition-all"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Find Courts</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myBookings.map((b) => {
                  const isConfirmed = b.status === 'confirmed' || b.status === 'completed';
                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-[#E8E5DF] p-4 bg-[#FAF8F5] hover:border-[#2D724E] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-[#1E4A32] bg-white border border-[#E8E5DF] px-2 py-0.5 rounded-md">
                            {b.booking_reference}
                          </span>
                          <span className="rounded-md bg-[#EBF4EE] px-2 py-0.5 text-[10px] font-bold text-[#1E4A32] uppercase">
                            {getSportDisplayName(b.sport)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isConfirmed
                                ? 'bg-[#EBF4EE] text-[#1E4A32]'
                                : 'bg-[#FBF0E6] text-[#A35C2B]'
                            }`}
                          >
                            {isConfirmed ? (
                              <CheckCircle2 className="w-3 h-3 text-[#2D724E]" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-[#C87D43]" />
                            )}
                            <span className="capitalize">{b.status}</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-black text-[#1A241E]">
                          {b.court?.name || 'Private Court'} &bull; {b.venue?.name || 'Sports Center'}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-[#65756B] flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#2D724E]" />
                            {b.booking_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#2D724E]" />
                            {b.start_time} - {b.end_time} ({b.duration_minutes} mins)
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 border-t sm:border-t-0 border-[#E8E5DF] pt-2 sm:pt-0">
                        <span className="text-[10px] text-[#65756B] block">Total Amount</span>
                        <div className="text-base font-black text-[#1A241E]">
                          {formatCurrency(b.total_amount_cents)}
                        </div>
                        <span className="text-[10px] font-bold text-[#2D724E] capitalize">
                          {b.payment_method?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MATCHES */}
        {activeTab === 'matches' && (
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                  Recent Match Results
                </h2>
                <p className="text-xs text-[#65756B]">
                  Doubles &amp; Singles match timeline from open play rotations
                </p>
              </div>
              <span className="text-xs font-bold text-[#2D724E]">
                {playerMatches.length} Matches Recorded
              </span>
            </div>

            <div className="space-y-3">
              {playerMatches.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#65756B]">
                  No matches recorded yet. Drop into an Open Play session to compete!
                </div>
              ) : (
                playerMatches.map((match) => {
                  const userInTeamA = match.team_a_player_ids.includes(currentUser.id);
                  const isWin =
                    (match.winner_team === 'team_a' && userInTeamA) ||
                    (match.winner_team === 'team_b' && !userInTeamA);
                  const isDoubles = match.match_format === 'doubles' || match.team_a_names.length === 2;

                  return (
                    <div
                      key={match.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E8E5DF] p-3.5 sm:p-4 bg-[#FAF8F5] hover:border-[#2D724E] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black shrink-0 ${
                            isWin
                              ? 'bg-[#2D724E] text-white shadow-xs'
                              : 'bg-[#65756B] text-white'
                          }`}
                        >
                          {isWin ? 'WIN' : 'PLAY'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-[#1A241E]">
                              {match.team_a_names.join(' & ')} vs {match.team_b_names.join(' & ')}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-[#E8E5DF] text-[#65756B]">
                              {isDoubles ? <Users className="w-2.5 h-2.5 text-[#2D724E]" /> : <User className="w-2.5 h-2.5 text-[#C87D43]" />}
                              {isDoubles ? 'Doubles (2v2)' : 'Singles (1v1)'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#65756B] block mt-0.5">
                            {match.court_name} &bull; {formatTimeAgo(match.started_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-[#E8E5DF] pt-2 sm:pt-0">
                        <div className="text-right">
                          <span className="font-mono text-sm sm:text-base font-black text-[#1A241E]">
                            {match.score_a} - {match.score_b}
                          </span>
                          <span className="block text-[9px] text-[#65756B]">
                            {match.status === 'completed' ? 'Final Score' : 'In Progress'}
                          </span>
                        </div>

                        {isWin && (
                          <span className="rounded-full bg-[#EBF4EE] px-2.5 py-1 text-xs font-bold text-[#1E4A32] flex items-center gap-1 shrink-0">
                            <Trophy className="w-3 h-3 text-[#2D724E]" />
                            <span>Winner</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Developer Testing Controls (localhost only) */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="rounded-3xl border-2 border-dashed border-[#C87D43]/40 bg-[#FAF8F5] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#C87D43] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Developer Mode
              </span>
              <h3 className="text-sm font-black text-[#1A241E]">Testing &amp; Diagnostics</h3>
            </div>
            <span className="text-[11px] font-mono text-[#65756B]">localhost only</span>
          </div>

          <p className="text-xs text-[#65756B]">
            Tools to test the Clucky onboarding flow, toggle manager/player roles, and simulate a fresh first-time user journey.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={async () => {
                await resetOnboardingState();
                router.push('/onboarding');
              }}
              className="px-4 py-2 rounded-xl bg-[#1A241E] text-white text-xs font-bold hover:bg-black transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#E9C46A]" />
              <span>Reset Onboarding</span>
            </button>

            <button
              type="button"
              onClick={toggleMode}
              className="px-4 py-2 rounded-xl bg-white border border-[#E8E5DF] text-[#1A241E] text-xs font-bold hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#2D724E]" />
              <span>{activeMode === 'manage' ? 'Switch to Player' : 'Switch to Manager'}</span>
            </button>

            <Link
              href="/onboarding"
              className="px-4 py-2 rounded-xl bg-white border border-[#E8E5DF] text-[#1A241E] text-xs font-bold hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5"
            >
              <span>Open Onboarding</span>
            </Link>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
