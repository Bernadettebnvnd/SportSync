import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, ArrowRight, Sparkles, Flame } from 'lucide-react';
import { Button } from './Button';
import { BadgeItem } from '../../mock/types';

interface BadgeClaimModalProps {
  isOpen: boolean;
  badge: BadgeItem | null;
  earnedXp: number;
  multiplierBonus?: number;
  onClose: () => void;
}

export const BadgeClaimModal: React.FC<BadgeClaimModalProps> = ({
  isOpen,
  badge,
  earnedXp,
  multiplierBonus = 0,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen && badge) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.55 },
        colors: ['#C8FF2E', '#F4F7F0', '#FF8FC7'],
      });
    }
  }, [isOpen, badge]);

  if (!isOpen || !badge) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#141A15] border-2 border-[#C8FF2E]/40 p-6 text-center text-[#F4F7F0] shadow-[0_0_40px_rgba(200,255,46,0.2)] overflow-hidden animate-scaleUp">
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-[#C8FF2E]/20 blur-3xl pointer-events-none" />

        {/* Badge Icon */}
        <div className="w-20 h-20 rounded-3xl bg-[#1C241E] border-2 border-[#C8FF2E]/50 mx-auto mb-4 flex items-center justify-center text-4xl shadow-inner">
          {badge.icon}
        </div>

        {/* Title */}
        <span className="inline-block px-3 py-0.5 rounded-full bg-[#C8FF2E]/15 border border-[#C8FF2E]/30 text-[#C8FF2E] font-display font-bold text-[10px] uppercase tracking-wider mb-2">
          Badge Unlocked
        </span>

        <h3 className="font-display font-black text-2xl text-[#F4F7F0] mb-1">
          {badge.title}
        </h3>

        <p className="text-xs text-[#A5B0A6] mb-4">
          {badge.desc}
        </p>

        {/* Reward counter with streak multiplier breakdown */}
        <div className="bg-[#0B0F0C] border border-white/5 rounded-2xl p-4 mb-5">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[#A5B0A6] block mb-1">
            Reward Granted
          </span>
          <div className="font-display font-black text-3xl text-[#C8FF2E] flex items-center justify-center gap-1">
            <span>+{earnedXp}</span>
            <span className="text-sm font-semibold text-[#F4F7F0]">XP</span>
          </div>
          {multiplierBonus > 0 && (
            <div className="flex items-center justify-center gap-1 text-[11px] text-[#FF8FC7] mt-1 font-semibold">
              <Flame className="w-3.5 h-3.5 fill-[#FF8FC7]" />
              <span>Includes +{multiplierBonus} XP from 4-Week Streak (1.5x Multiplier)</span>
            </div>
          )}
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={onClose}
          className="bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-sm py-3.5 shadow-md press-scale"
        >
          <span>Claim & Continue</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
