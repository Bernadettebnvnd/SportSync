import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Target, ArrowRight, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from './Button';

interface WagerWinCelebrationModalProps {
  isOpen: boolean;
  matchTitle: string;
  optionLabel: string;
  payoutXp: number;
  stakeXp: number;
  onClose: () => void;
}

export const WagerWinCelebrationModal: React.FC<WagerWinCelebrationModalProps> = ({
  isOpen,
  matchTitle,
  optionLabel,
  payoutXp,
  stakeXp,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 65,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#C8FF2E', '#3DDC84', '#FF8FC7', '#F4F7F0'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0F2A22] border-2 border-[#C8FF2E] p-6 text-center text-[#F4F7F0] shadow-[0_0_50px_rgba(200,255,46,0.3)] overflow-hidden animate-scaleUp">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#C8FF2E]/25 blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-[#1C241E] border-2 border-[#C8FF2E] mx-auto mb-4 flex items-center justify-center shadow-lg">
          <Target className="w-10 h-10 text-[#C8FF2E]" />
        </div>

        {/* Title */}
        <span className="inline-block px-3 py-1 rounded-full bg-[#C8FF2E]/20 text-[#C8FF2E] font-display font-black text-xs uppercase tracking-widest mb-2 border border-[#C8FF2E]/30">
          Prediction Hit!
        </span>

        <h3 className="font-display font-black text-2xl text-[#F4F7F0] mb-1">
          {optionLabel}
        </h3>

        <p className="text-xs text-[#A5B0A6] mb-4">
          Verified in <span className="text-[#F4F7F0] font-semibold">{matchTitle}</span>
        </p>

        {/* Payout Display */}
        <div className="bg-[#141A15] border border-white/10 rounded-2xl p-4 mb-5">
          <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block mb-1">
            Total Playmaker Payout
          </span>
          <div className="font-display font-black text-4xl text-[#C8FF2E] tabular-nums">
            +{payoutXp} <span className="text-base text-[#F4F7F0] font-bold">XP</span>
          </div>
          {stakeXp > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#3DDC84] mt-1 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Staked {stakeXp} XP • Net Profit: +{payoutXp - stakeXp} XP</span>
            </div>
          )}
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={onClose}
          className="bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-sm py-3.5 shadow-md press-scale"
        >
          <span>Collect XP & Continue</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
