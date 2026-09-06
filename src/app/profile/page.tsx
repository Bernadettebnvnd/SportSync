'use client';

import React, { useState } from 'react';
import { useMonkeyStore } from '@/lib/store';
import { MascotLocker } from '@/components/mascot/MascotLocker';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { formatTimeAgo, getSportDisplayName } from '@/lib/utils';
import {
  Trophy,
  Flame,
  MapPin,
  Users,
  User,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, matches } = useMonkeyStore();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const winRate =
    currentUser.matches_played > 0
      ? Math.round((currentUser.matches_won / currentUser.matches_played) * 100)
      : 0;

  const playerMatches = matches.filter(
    (m) =>
      m.team_a_player_ids.includes(currentUser.id) ||
      m.team_b_player_ids.includes(currentUser.id)
  );

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Player Header Card */}
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
          {/* Avatar with Win Streak Ring */}
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-[#2D724E] shadow-md"
            />
            <div
              title="Win Streak"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#C87D43] text-white shadow-md"
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
                  <span>Matchi Player</span>
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-xl bg-[#FBF0E6] px-3 py-1.5 text-xs font-bold text-[#A35C2B] border border-[#C87D43]/20">
                  <Trophy className="w-3.5 h-3.5 text-[#E9C46A]" />
                  <span>Top Doubles Player</span>
                </span>
              </div>
            </div>

            {/* Sport & Format tags (LOCKED SPORT PASSPORT) */}
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1.5 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E4A32] text-white px-3 py-1 font-black shadow-sm" title="Your primary sport is permanently locked to your player passport">
                <Lock className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span>{getSportDisplayName(currentUser.primary_sport)} Main (Locked)</span>
              </span>
              <span className="rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] px-3 py-1 font-bold text-[#2D724E] flex items-center gap-1">
                <Users className="w-3 h-3" />
                Doubles Specialist
              </span>
              <span className="rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] px-3 py-1 font-medium text-[#65756B] capitalize">
                Level: {currentUser.skill_level}
              </span>

              <button
                type="button"
                onClick={() => setIsOnboardingOpen(true)}
                className="text-[11px] font-bold text-[#C87D43] hover:underline flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-[#FBF0E6] transition-colors"
                title="Try the Clucky-style onboarding experience"
              >
                <Sparkles className="w-3 h-3" />
                <span>Retake Onboarding (Demo)</span>
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
            <span className="text-[11px] font-bold text-[#65756B]">Banana Points</span>
            <div className="text-xl sm:text-2xl font-black text-[#A35C2B] mt-0.5 flex items-center justify-center gap-1">
              <span>🍌</span>
              <span>{currentUser.banana_points}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mascot banter banner */}
      <MascotBanner
        mood="victory"
        title="Streak Master Miki"
        message="6-game doubles win streak! Your court coverage and communication are on point. Keep racking up bananas for that Tarzan Ochre gear!"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Mascot Customizer / Locker Room */}
      <MascotLocker />

      {/* Match History Timeline */}
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
              Recent Match Timeline
            </h2>
            <p className="text-xs text-[#65756B]">
              Verified Doubles &amp; Singles results from open play
            </p>
          </div>
          <span className="text-xs font-bold text-[#2D724E]">
            {playerMatches.length} Matches Recorded
          </span>
        </div>

        <div className="space-y-3">
          {playerMatches.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#65756B]">
              No matches recorded yet. Hop into an open play rotation to start your streak!
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
                          ? 'bg-[#2D724E] text-white shadow-sm'
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
                        <span>+45 🍌</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Clucky-style Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
