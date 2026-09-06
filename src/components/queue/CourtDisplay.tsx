'use client';

import React, { useState } from 'react';
import { Match, Court } from '@/types';
import { ScoreModal } from './ScoreModal';
import { getSportEmoji } from '@/lib/utils';
import { PlayCircle, Clock, Edit3, Flame } from 'lucide-react';

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
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1F9D55] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#1F9D55]"></span>
          </span>
          <h2 className="text-lg font-black text-[#171717]">Active Court Rallies</h2>
        </div>
        <span className="text-xs font-semibold text-[#6B7280]">
          {matches.filter((m) => m.status === 'in_progress').length} Live Matches
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courts.map((court) => {
          const ongoingMatch = matches.find(
            (m) => m.court_id === court.id && m.status === 'in_progress'
          );

          return (
            <div
              key={court.id}
              className="relative overflow-hidden rounded-3xl border border-[#EBEBE6] bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#EBEBE6] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getSportEmoji(court.sport)}</span>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#171717]">{court.name}</h3>
                    <span className="text-[11px] text-[#6B7280]">{court.floor_type}</span>
                  </div>
                </div>

                {ongoingMatch ? (
                  <span className="flex items-center gap-1 rounded-full bg-[#E9F8EE] border border-[#1F9D55]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#147A40]">
                    <Flame className="w-3 h-3 text-[#FF9F43]" />
                    In Progress
                  </span>
                ) : (
                  <span className="rounded-full bg-[#FAFAF7] border border-[#EBEBE6] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B7280]">
                    Court Open / Warmup
                  </span>
                )}
              </div>

              {ongoingMatch ? (
                <div className="space-y-4">
                  {/* Live scoreboard */}
                  <div className="flex items-center justify-between rounded-2xl bg-[#FAFAF7] p-3 border border-[#EBEBE6]">
                    <div className="flex-1 text-center">
                      <span className="text-xs font-bold text-[#171717] block truncate">
                        {ongoingMatch.team_a_names.join(' & ')}
                      </span>
                      <div className="text-3xl font-black text-[#1F9D55] mt-1">
                        {ongoingMatch.score_a}
                      </div>
                    </div>

                    <div className="px-3 text-xs font-bold text-[#6B7280]">VS</div>

                    <div className="flex-1 text-center">
                      <span className="text-xs font-bold text-[#171717] block truncate">
                        {ongoingMatch.team_b_names.join(' & ')}
                      </span>
                      <div className="text-3xl font-black text-[#FF9F43] mt-1">
                        {ongoingMatch.score_b}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <Clock className="w-3.5 h-3.5 text-[#1F9D55]" />
                      <span>Match time: ~12m</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMatch(ongoingMatch)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Update Score</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#6B7280]">
                  <p className="font-medium">No match currently recorded on this court.</p>
                  <p className="text-[11px] mt-1 text-[#1F9D55] font-semibold">
                    Next waiting group will be called automatically!
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
