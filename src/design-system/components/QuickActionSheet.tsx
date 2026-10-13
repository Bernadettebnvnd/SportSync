import React from 'react';
import { Plus, Compass, Calendar, Users, X } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMatch: () => void;
  onBookCourt: () => void;
  onInviteFriends: () => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  isOpen,
  onClose,
  onCreateMatch,
  onBookCourt,
  onInviteFriends,
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Quick Actions">
      <div className="space-y-3">
        {/* 1. Create Match */}
        <button
          onClick={() => {
            onClose();
            onCreateMatch();
          }}
          className="w-full p-4 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-between text-left transition-all press-scale shadow-[0_4px_20px_rgba(200,255,46,0.2)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B0F0C] text-[#C8FF2E] flex items-center justify-center">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-display font-black text-sm block">
                Create Pickup Match
              </span>
              <span className="text-xs text-[#0B0F0C]/80">Set format, pitch & roster</span>
            </div>
          </div>
          <span className="font-bold text-xs">Start →</span>
        </button>

        {/* 2. Book a Court */}
        <button
          onClick={() => {
            onClose();
            onBookCourt();
          }}
          className="w-full p-4 rounded-2xl bg-[#1C241E] border border-white/10 text-white flex items-center justify-between text-left transition-all press-scale hover:border-white/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#141A15] text-[#C8FF2E] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-sm block">
                Book a Court / Pitch
              </span>
              <span className="text-xs text-[#A5B0A6]">Browse clay, grass & turf</span>
            </div>
          </div>
          <span className="text-xs text-[#C8FF2E]">Reserve →</span>
        </button>

        {/* 3. Invite Friends */}
        <button
          onClick={() => {
            onClose();
            onInviteFriends();
          }}
          className="w-full p-4 rounded-2xl bg-[#FF8FC7] text-[#0B0F0C] flex items-center justify-between text-left transition-all press-scale shadow-[0_4px_20px_rgba(255,143,199,0.2)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B0F0C] text-[#FF8FC7] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-black text-sm block">
                Invite Friends to Squad
              </span>
              <span className="text-xs text-[#0B0F0C]/80">Share direct invite links</span>
            </div>
          </div>
          <span className="font-bold text-xs">Share →</span>
        </button>
      </div>
    </BottomSheet>
  );
};
