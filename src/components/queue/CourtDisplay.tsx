'use client';

import React, { useState } from 'react';
import { Match, Court } from '@/types';
import { ScoreModal } from './ScoreModal';
import { Clock, Edit3, Flame, Users, User } from 'lucide-react';

interface CourtDisplayProps {
  courts: Court[];
  matches: Match[];
}

export function CourtDisplay({ courts, matches }: CourtDisplayProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D724E] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2D724E]"></span>
          </span>
          <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
            Active Court Rallies
          </h2>
        </div>
        <span className="text-xs font-bold text-[#65756B]">
          {matches.filter((m) => m.status === 'in_progress').length} Live Matches
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courts.map((court) => {
          const ongoingMatch = matches.find(
            (m) => m.court_id === court.id && m.status === 'in_progress'
          );
          const isDoubles = ongoingMatch?.match_format === 'doubles' || ongoingMatch?.team_a_names.length === 2;

          return (
            <div
              key={court.id}
              className="relative overflow-hidden rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-[#1A241E]">{court.name}</h3>
                    {isDoubles ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#EBF4EE] px-1.5 py-0.5 text-[9px] font-black text-[#1E4A32]">
                        <Users className="w-2.5 h-2.5" /> Doubles (2v2)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FBF0E6] px-1.5 py-0.5 text-[9px] font-black text-[#A35C2B]">
                        <User className="w-2.5 h-2.5" /> Singles (1v1)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#65756B]">{court.floor_type}</span>
                </div>

                {ongoingMatch ? (
                  <span className="flex items-center gap-1 rounded-full bg-[#EBF4EE] border border-[#2D724E]/30 px-2.5 py-0.5 text-[10px] font-black text-[#1E4A32]">
                    <Flame className="w-3 h-3 text-[#C87D43]" />
                    In Progress
                  </span>
                ) : (
                  <span className="rounded-full bg-[#FAF8F5] border border-[#E8E5DF] px-2.5 py-0.5 text-[10px] font-bold text-[#65756B]">
                    Warm-up / Open
                  </span>
                )}
              </div>

              {ongoingMatch ? (
                <div className="space-y-3">
                  {/* Live 4-Player / 2-Player Scoreboard */}
                  <div className="flex items-center justify-between rounded-2xl bg-[#FAF8F5] p-3 border border-[#E8E5DF]">
                    {/* Team A */}
                    <div className="flex-1 text-center">
                      <div className="text-xs font-black text-[#1A241E] truncate">
                        {ongoingMatch.team_a_names.join(' & ')}
                      </div>
                      <span className="text-[9px] font-bold text-[#65756B] block">
                        {isDoubles ? 'Doubles Pair A' : 'Challenger A'}
                      </span>
                      <div className="text-3xl font-black text-[#2D724E] mt-0.5">
                        {ongoingMatch.score_a}
                      </div>
                    </div>

                    <div className="px-2 text-xs font-black text-[#8C877D]">VS</div>

                    {/* Team B */}
                    <div className="flex-1 text-center">
                      <div className="text-xs font-black text-[#1A241E] truncate">
                        {ongoingMatch.team_b_names.join(' & ')}
                      </div>
                      <span className="text-[9px] font-bold text-[#65756B] block">
                        {isDoubles ? 'Doubles Pair B' : 'Challenger B'}
                      </span>
                      <div className="text-3xl font-black text-[#C87D43] mt-0.5">
                        {ongoingMatch.score_b}
                      </div>
                    </div>
                  </div>

                  {/* Score update action */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#65756B]">
                      <Clock className="w-3.5 h-3.5 text-[#2D724E]" />
                      <span>Game in progress: ~12m</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMatch(ongoingMatch)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm transition-all active:scale-95 min-h-[38px]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Update Score</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#65756B]">
                  <p className="font-semibold text-[#1A241E]">Court is open for next rotation!</p>
                  <p className="text-[11px] text-[#2D724E] font-bold mt-0.5">
                    Calling next doubles or singles group...
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedMatch && (
        <ScoreModal
          isOpen={Boolean(selectedMatch)}
          onClose={() => setSelectedMatch(null)}
          match={selectedMatch}
        />
      )}
    </div>
  );
}
