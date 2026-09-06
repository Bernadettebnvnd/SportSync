'use client';

import React, { useState } from 'react';
import { Match } from '@/types';
import { useMonkeyStore } from '@/lib/store';
import { X, Trophy, Plus, Minus } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
}

export function ScoreModal({ isOpen, onClose, match }: ScoreModalProps) {
  const { updateMatchScore } = useMonkeyStore();

  const [scoreA, setScoreA] = useState(match.score_a);
  const [scoreB, setScoreB] = useState(match.score_b);

  if (!isOpen) return null;

  const isDoubles = match.match_format === 'doubles' || match.team_a_names.length === 2;

  const handleSaveScore = (isFinished = false) => {
    updateMatchScore(match.id, scoreA, scoreB, isFinished);
    if (isFinished) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#2D724E', '#C87D43', '#E9C46A'],
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl p-5 sm:p-6 space-y-5 my-0 sm:my-8 animate-in slide-in-from-bottom sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#C87D43]">
              {isDoubles ? 'Doubles Live Scoring' : 'Singles Live Scoring'}
            </span>
            <h3 className="text-base sm:text-lg font-black text-[#1A241E]">{match.court_name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#65756B] hover:bg-[#FAF8F5]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Counters with Big Thumb Targets */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Team A */}
          <div className="flex flex-col items-center rounded-2xl bg-[#EBF4EE] border border-[#2D724E]/30 p-3 sm:p-4 space-y-2.5">
            <span className="text-xs font-black text-[#1E4A32] text-center truncate w-full">
              {match.team_a_names.join(' & ')}
            </span>
            <div className="text-4xl sm:text-5xl font-black text-[#2D724E]">{scoreA}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScoreA((prev) => Math.max(0, prev - 1))}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-[#E8E5DF] text-[#1A241E] active:scale-95 shadow-sm min-h-[44px]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setScoreA((prev) => prev + 1)}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#2D724E] text-white active:scale-95 shadow-sm min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center rounded-2xl bg-[#FBF0E6] border border-[#C87D43]/30 p-3 sm:p-4 space-y-2.5">
            <span className="text-xs font-black text-[#A35C2B] text-center truncate w-full">
              {match.team_b_names.join(' & ')}
            </span>
            <div className="text-4xl sm:text-5xl font-black text-[#C87D43]">{scoreB}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScoreB((prev) => Math.max(0, prev - 1))}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-[#E8E5DF] text-[#1A241E] active:scale-95 shadow-sm min-h-[44px]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setScoreB((prev) => prev + 1)}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#C87D43] text-white active:scale-95 shadow-sm min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-[#65756B]">
          Match Target: <strong className="text-[#1A241E]">{match.target_points} points</strong>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => handleSaveScore(false)}
            className="flex-1 py-3 rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] text-xs font-bold text-[#1A241E] hover:bg-[#E8E5DF] transition-all min-h-[44px]"
          >
            Save Live Score
          </button>
          <button
            type="button"
            onClick={() => handleSaveScore(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-md transition-all active:scale-[0.98] min-h-[44px]"
          >
            <Trophy className="w-4 h-4 text-[#E9C46A]" />
            <span>Finalize Match</span>
          </button>
        </div>
      </div>
    </div>
  );
}
