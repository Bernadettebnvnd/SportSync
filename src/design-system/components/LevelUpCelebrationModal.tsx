import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, ArrowRight, Star, ShieldCheck, Zap } from 'lucide-react';
import { Button } from './Button';

interface LevelUpCelebrationModalProps {
  isOpen: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  rewardReason?: string;
  onClose: () => void;
}

export const LevelUpCelebrationModal: React.FC<LevelUpCelebrationModalProps> = ({
  isOpen,
  oldLevel,
  newLevel,
  newTitle,
  rewardReason,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Trigger multi-stage confetti burst in electric lime, pink, and cream
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#C8FF2E', '#FF8FC7', '#F4F7F0', '#0F2A22'],
      });

      const timer = setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#C8FF2E', '#3DDC84', '#F4F7F0'],
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FF8FC7', '#C8FF2E', '#F4F7F0'],
        });
      }, 250);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0F2A22] border-2 border-[#C8FF2E]/40 p-6 text-center text-[#F4F7F0] shadow-[0_0_50px_rgba(200,255,46,0.25)] overflow-hidden animate-scaleUp">
        {/* Glowing backdrop aura */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[#C8FF2E]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[#FF8FC7]/15 blur-3xl pointer-events-none" />

        {/* Celebration Badge Icon */}
        <div className="relative mx-auto mb-4 w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#C8FF2E]/20 animate-ping" />
          <div className="w-20 h-20 rounded-full bg-[#1C241E] border-2 border-[#C8FF2E] flex items-center justify-center shadow-lg">
            <Trophy className="w-10 h-10 text-[#C8FF2E]" />
          </div>
        </div>

        {/* Level Up Title */}
        <span className="inline-block px-3 py-1 rounded-full bg-[#C8FF2E]/15 border border-[#C8FF2E]/30 text-[#C8FF2E] font-display font-black text-xs uppercase tracking-widest mb-2">
          Level Promoted!
        </span>

        <h2 className="font-display font-black text-3xl tracking-tight text-[#F4F7F0] mb-1">
          Level {newLevel}
        </h2>

        <p className="font-display font-semibold text-sm text-[#C8FF2E] mb-4">
          {newTitle}
        </p>

        {/* Reward Reason pill */}
        {rewardReason && (
          <p className="text-xs text-[#A5B0A6] mb-5 bg-[#141A15] p-2.5 rounded-xl border border-white/5">
            Earned via <span className="text-[#F4F7F0] font-semibold">{rewardReason}</span>
          </p>
        )}

        {/* Perks Unlocked */}
        <div className="text-left bg-[#141A15]/90 border border-white/10 rounded-2xl p-4 mb-5 space-y-2.5">
          <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block">
            New Playmaker Perks Unlocked:
          </span>
          <div className="flex items-center gap-2.5 text-xs text-[#F4F7F0]">
            <Zap className="w-4 h-4 text-[#C8FF2E] shrink-0" />
            <span>+15% Squad XP Multiplier on Match Wins</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#F4F7F0]">
            <ShieldCheck className="w-4 h-4 text-[#FF8FC7] shrink-0" />
            <span>Priority booking access at Verified Venues</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#F4F7F0]">
            <Star className="w-4 h-4 text-[#C8FF2E] shrink-0" />
            <span>Exclusive Gold avatar ring in Live Match Chat</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="primary"
          fullWidth
          onClick={onClose}
          className="bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-sm py-3.5 shadow-[0_0_20px_rgba(200,255,46,0.3)] hover:brightness-110 press-scale"
        >
          <span>Claim Rewards & Continue</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
