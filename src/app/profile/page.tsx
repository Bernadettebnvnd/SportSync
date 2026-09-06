'use client';

import React from 'react';
import { useMonkeyStore } from '@/lib/store';
import { MascotLocker } from '@/components/mascot/MascotLocker';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { formatTimeAgo, getSportEmoji } from '@/lib/utils';
import {
  Trophy,
  Flame,
  Award,
  Zap,
  MapPin,
  Calendar,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, matches } = useMonkeyStore();

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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Player Header Card */}
      <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar with Win Streak Ring */}
          <div className="relative">
            <img
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
              className="h-24 w-24 rounded-full object-cover border-4 border-[#1F9D55] shadow-md"
            />
            <div
              title="Win Streak"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF9F43] text-white shadow-md"
            >
              <Flame className="w-5 h-5 fill-current" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#171717]">
                    {currentUser.full_name}
                  </h1>
                  <span className="rounded-full bg-[#1F9D55]/10 px-2.5 py-0.5 text-xs font-bold text-[#1F9D55]">
                    &ldquo;{currentUser.nickname}&rdquo;
                  </span>
                </div>
                <p className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-[#6B7280] mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#1F9D55]" />
                  <span>{currentUser.city}</span>
                  <span>&bull;</span>
                  <span>Member since 2026</span>
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-xl bg-[#FFF5EA] px-3 py-1.5 text-xs font-bold text-[#E68529] border border-[#FF9F43]/20">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Top 10% Smasher</span>
                </span>
              </div>
            </div>

            {/* Quick sport & skill level tags */}
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-2 flex-wrap">
              <span className="rounded-xl bg-[#FAFAF7] border border-[#EBEBE6] px-3 py-1 text-xs font-bold text-[#171717] flex items-center gap-1">
                <span>{getSportEmoji(currentUser.primary_sport)}</span>
                <span className="capitalize">{currentUser.primary_sport} Main</span>
              </span>
              <span className="rounded-xl bg-[#FAFAF7] border border-[#EBEBE6] px-3 py-1 text-xs font-bold text-[#171717] capitalize">
                Level: {currentUser.skill_level}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#EBEBE6] pt-6">
          <div className="rounded-2xl bg-[#FAFAF7] p-4 text-center">
            <span className="text-xs font-semibold text-[#6B7280]">Matches Played</span>
            <div className="text-2xl font-black text-[#171717] mt-1">
              {currentUser.matches_played}
            </div>
          </div>

          <div className="rounded-2xl bg-[#FAFAF7] p-4 text-center">
            <span className="text-xs font-semibold text-[#6B7280]">Win Rate</span>
            <div className="text-2xl font-black text-[#1F9D55] mt-1">
              {winRate}%
            </div>
          </div>

          <div className="rounded-2xl bg-[#FAFAF7] p-4 text-center">
            <span className="text-xs font-semibold text-[#6B7280]">Current Streak</span>
            <div className="text-2xl font-black text-[#FF9F43] mt-1 flex items-center justify-center gap-1">
              <Flame className="w-5 h-5 fill-current" />
              <span>{currentUser.win_streak}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#FAFAF7] p-4 text-center">
            <span className="text-xs font-semibold text-[#6B7280]">Banana Points</span>
            <div className="text-2xl font-black text-[#E68529] mt-1 flex items-center justify-center gap-1">
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
        message="5-game win streak! You're dominating the open play courts. Keep racking up bananas to unlock the 24K Golden Paddle!"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Mascot Customizer / Locker Room */}
      <MascotLocker />

      {/* Match History Timeline */}
      <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#EBEBE6] pb-3">
          <div>
            <h2 className="text-lg font-black text-[#171717]">Recent Match Timeline</h2>
            <p className="text-xs text-[#6B7280]">
              Verified results from your open play rotations
            </p>
          </div>
          <span className="text-xs font-bold text-[#1F9D55]">
            {playerMatches.length} Recorded Matches
          </span>
        </div>

        <div className="space-y-3">
          {playerMatches.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6B7280]">
              No matches recorded yet. Hop into an open play rotation to start your streak!
            </div>
          ) : (
            playerMatches.map((match) => {
              const userInTeamA = match.team_a_player_ids.includes(currentUser.id);
              const isWin =
                (match.winner_team === 'team_a' && userInTeamA) ||
                (match.winner_team === 'team_b' && !userInTeamA);

              return (
                <div
                  key={match.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#EBEBE6] p-4 bg-[#FAFAF7] hover:border-[#1F9D55] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black ${
                        isWin
                          ? 'bg-[#1F9D55] text-white shadow-sm'
                          : 'bg-[#6B7280] text-white'
                      }`}
                    >
                      {isWin ? 'WIN' : 'PLAY'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#171717]">
                          {match.team_a_names.join(' & ')} vs {match.team_b_names.join(' & ')}
                        </span>
                        <span className="text-xs">{getSportEmoji(match.sport)}</span>
                      </div>
                      <span className="text-[11px] text-[#6B7280]">
                        {match.court_name} &bull; {formatTimeAgo(match.started_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-[#EBEBE6] pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="font-mono text-base font-black text-[#171717]">
                        {match.score_a} - {match.score_b}
                      </span>
                      <span className="block text-[10px] text-[#6B7280]">
                        {match.status === 'completed' ? 'Final Score' : 'In Progress'}
                      </span>
                    </div>

                    {isWin && (
                      <span className="rounded-full bg-[#E9F8EE] px-2.5 py-1 text-xs font-bold text-[#147A40] flex items-center gap-1">
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
    </div>
  );
}
