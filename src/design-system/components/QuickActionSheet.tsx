'use client';

import React from 'react';
import { Plus, Users, Share2, Calendar, Building2, Layers, CheckCircle2 } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  role?: 'player' | 'facility_owner';
  onCreateMatch: () => void;
  onFindPlayers?: () => void;
  onInviteFriends: () => void;
  onViewMyGames?: () => void;
  onAddPlayingArea?: () => void;
  onPublishGame?: () => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  isOpen,
  onClose,
  role = 'player',
  onCreateMatch,
  onFindPlayers,
  onInviteFriends,
  onViewMyGames,
  onAddPlayingArea,
  onPublishGame,
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Quick Actions">
      <div className="space-y-3">
        {role === 'facility_owner' ? (
          <>
            {/* Facility Action 1: Publish Game */}
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onPublishGame) onPublishGame();
                else onCreateMatch();
              }}
              className="w-full p-4 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-between text-left transition-all press-scale shadow-[0_4px_20px_rgba(200,255,46,0.2)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0B0F0C] text-[#C8FF2E] flex items-center justify-center">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="font-display font-black text-sm block">
                    Publish Facility Game
                  </span>
                  <span className="text-xs text-[#0B0F0C]/80">List open session for local players</span>
                </div>
              </div>
              <span className="font-bold text-xs">Publish →</span>
            </button>

            {/* Facility Action 2: Add Playing Area */}
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onAddPlayingArea) onAddPlayingArea();
                else if (typeof window !== 'undefined') window.location.href = '/organizer';
              }}
              className="w-full p-4 rounded-2xl bg-[#1C241E] border border-white/10 text-white flex items-center justify-between text-left transition-all press-scale hover:border-white/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#141A15] text-[#C8FF2E] flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm block">
                    Add Playing Area / Court
                  </span>
                  <span className="text-xs text-[#A5B0A6]">Define court specs, surface & sport</span>
                </div>
              </div>
              <span className="text-xs text-[#C8FF2E]">Manage →</span>
            </button>
          </>
        ) : (
          <>
            {/* Player Action 1: Create Game */}
            <button
              type="button"
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
                    Create Game
                  </span>
                  <span className="text-xs text-[#0B0F0C]/80">Set sport, venue, and required roster</span>
                </div>
              </div>
              <span className="font-bold text-xs">Start →</span>
            </button>

            {/* Player Action 2: Find Players */}
            {onFindPlayers && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFindPlayers();
                }}
                className="w-full p-4 rounded-2xl bg-[#1C241E] border border-white/10 text-white flex items-center justify-between text-left transition-all press-scale hover:border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#141A15] text-[#C8FF2E] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm block">
                      Find Players
                    </span>
                    <span className="text-xs text-[#A5B0A6]">Browse games needing roster completion</span>
                  </div>
                </div>
                <span className="text-xs text-[#C8FF2E]">Explore →</span>
              </button>
            )}

            {/* Player Action 3: Share Game */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onInviteFriends();
              }}
              className="w-full p-4 rounded-2xl bg-[#FF8FC7] text-[#0B0F0C] flex items-center justify-between text-left transition-all press-scale shadow-[0_4px_20px_rgba(255,143,199,0.2)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0B0F0C] text-[#FF8FC7] flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-display font-black text-sm block">
                    Share Game Link
                  </span>
                  <span className="text-xs text-[#0B0F0C]/80">Copy shareable SportSync match link</span>
                </div>
              </div>
              <span className="font-bold text-xs">Copy →</span>
            </button>

            {/* Player Action 4: View My Games */}
            {onViewMyGames && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewMyGames();
                }}
                className="w-full p-3.5 rounded-2xl bg-[#141A15] border border-white/5 text-white flex items-center justify-between text-left transition-all press-scale hover:border-white/15"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs block text-[#F4F7F0]">
                      View My Games &amp; Reservations
                    </span>
                    <span className="text-[11px] text-[#A5B0A6]">Your upcoming confirmed matches</span>
                  </div>
                </div>
                <span className="text-xs text-[#A5B0A6]">View →</span>
              </button>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
};
