'use client';

import React, { useState } from 'react';
import { Match } from '@/types';
import { useMonkeyStore } from '@/lib/store';
import { X, Trophy, Plus, Minus, Check } from 'lucide-react';
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

  const handleSaveScore = (isFinished = false) => {
    updateMatchScore(match.id, scoreA, scoreB, isFinished);
    if (isFinished) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#1F9D55', '#FF9F43', '#FFD700'],
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-[#EBEBE6] shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EBEBE6] pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF9F43]">
              Live Scorekeeper
            </span>
            <h3 className="text-lg font-extrabold text-[#171717]">{match.court_name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#6B7280] hover:bg-[#FAFAF7]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Counters */}
        <div className="grid grid-cols-2 gap-4">
          {/* Team A */}
          <div className="flex flex-col items-center rounded-2xl bg-[#E9F8EE] border border-[#1F9D55]/30 p-4 space-y-3">
            <span className="text-xs font-bold text-[#147A40] text-center truncate w-full">
              {match.team_a_names.join(' & ')}
            </span>
            <div className="text-4xl sm:text-5xl font-black text-[#1F9D55]">{scoreA}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScoreA((prev) => Math.max(0, prev - 1))}
                className="rounded-xl bg-white border border-[#EBEBE6] p-2 text-[#171717] hover:bg-[#FAFAF7] active:scale-95 shadow-sm"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setScoreA((prev) => prev + 1)}
                className="rounded-xl bg-[#1F9D55] text-white p-2 hover:bg-[#147A40] active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center rounded-2xl bg-[#FFF5EA] border border-[#FF9F43]/30 p-4 space-y-3">
            <span className="text-xs font-bold text-[#E68529] text-center truncate w-full">
              {match.team_b_names.join(' & ')}
            </span>
            <div className="text-4xl sm:text-5xl font-black text-[#FF9F43]">{scoreB}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScoreB((prev) => Math.max(0, prev - 1))}
                className="rounded-xl bg-white border border-[#EBEBE6] p-2 text-[#171717] hover:bg-[#FAFAF7] active:scale-95 shadow-sm"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setScoreB((prev) => prev + 1)}
                className="rounded-xl bg-[#FF9F43] text-white p-2 hover:bg-[#E68529] active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-[#6B7280]">
          Target: <strong className="text-[#171717]">{match.target_points} points</strong> (Sudden death)
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => handleSaveScore(false)}
            className="flex-1 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#EBEBE6] text-xs font-bold text-[#171717] hover:bg-[#EBEBE6] transition-all"
          >
            Save Live Score
          </button>
          <button
            type="button"
            onClick={() => handleSaveScore(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-md transition-all active:scale-[0.98]"
          >
            <Trophy className="w-4 h-4" />
            Finalize Match &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
