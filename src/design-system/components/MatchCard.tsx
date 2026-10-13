import React from 'react';
import { ChevronRight, Users, Clock, MapPin, Plus, Compass } from 'lucide-react';
import { CommunityGame } from '../../mock/types';
import { AvatarStack } from './AvatarStack';

interface MatchCardProps {
  game: CommunityGame;
  onClick?: () => void;
  className?: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({ game, onClick, className = '' }) => {
  const isAlmostFull = game.spotsTotal - game.spotsJoined <= 2 && game.spotsTotal - game.spotsJoined > 0;
  const isFull = game.spotsJoined >= game.spotsTotal;

  // Ref B sport tile icon color
  const sportTileStyles: Record<string, string> = {
    Football: 'bg-[#0F2A22] text-[#C8FF2E] border-[#C8FF2E]/30',
    Basketball: 'bg-[#C8432B]/20 text-[#FF8570] border-[#C8432B]/40',
    Tennis: 'bg-[#1C241E] text-[#FF8FC7] border-[#FF8FC7]/30',
    Pickleball: 'bg-[#0F2A22] text-[#C8FF2E] border-[#C8FF2E]/30',
    Badminton: 'bg-[#1C241E] text-[#00E599] border-[#00E599]/30',
    Volleyball: 'bg-[#2A1D0F] text-[#FFB800] border-[#FFB800]/30',
    Billiards: 'bg-[#151D28] text-[#5AC8FA] border-[#5AC8FA]/30',
    Darts: 'bg-[#28151D] text-[#FF2D55] border-[#FF2D55]/30',
    Padel: 'bg-[#141A15] text-[#3DDC84] border-[#3DDC84]/30',
    Running: 'bg-[#263028] text-[#C8FF2E] border-white/10',
    Other: 'bg-[#1C241E] text-[#A5B0A6] border-white/10',
  };
  const currentSportStyle = sportTileStyles[game.sport] || 'bg-[#1C241E] text-[#C8FF2E]';

  return (
    <div
      onClick={onClick}
      className={`w-full bg-[#141A15] hover:bg-[#1C241E] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all press-scale cursor-pointer flex items-center justify-between gap-3 ${className}`}
    >
      {/* Left: Colored Sport Icon Tile (Ref B) */}
      <div
        className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center shrink-0 font-display font-bold text-xs uppercase ${currentSportStyle}`}
      >
        <span>{game.sport.slice(0, 3)}</span>
        <span className="text-[9px] opacity-80">{game.format}</span>
      </div>

      {/* Middle: Title, Meta, Joined counter */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-semibold text-sm text-[#F4F7F0] truncate">
            {game.title}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#A5B0A6] mb-2">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#6F7B71]" />
            {game.date} • {game.time}
          </span>
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#6F7B71]" />
            {game.locationName}
          </span>
        </div>

        {/* Players joined bar + spots left */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AvatarStack
              avatars={game.members.map((m) => m.avatar)}
              size={20}
              maxVisible={3}
            />
            <span className="text-xs font-semibold text-[#F4F7F0] tabular-nums">
              {game.spotsJoined}/{game.spotsTotal} joined
            </span>
          </div>

          {isAlmostFull && (
            <span className="text-[11px] font-bold text-[#FF8FC7] bg-[#FF8FC7]/15 px-2 py-0.5 rounded-full border border-[#FF8FC7]/30">
              {game.spotsTotal - game.spotsJoined} spots left!
            </span>
          )}
          {isFull && (
            <span className="text-[11px] font-medium text-[#6F7B71] bg-white/5 px-2 py-0.5 rounded-full">
              Full match
            </span>
          )}
        </div>
      </div>

      {/* Right: Chevron */}
      <div className="shrink-0 text-[#6F7B71] pl-1">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  );
};

/** Ref B: Two Big Colorful Action Tiles ("create match" lime, "join match" pink) */
export const ActionTiles: React.FC<{
  onCreate: () => void;
  onJoin: () => void;
  className?: string;
}> = ({ onCreate, onJoin, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 gap-3.5 w-full ${className}`}>
      {/* 1. Create Match Tile (Flooded Lime) */}
      <button
        onClick={onCreate}
        className="group h-28 rounded-[24px] bg-[#C8FF2E] text-[#0B0F0C] p-4 flex flex-col justify-between text-left transition-all duration-150 press-scale shadow-[0_8px_24px_rgba(200,255,46,0.22)] select-none"
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-9 h-9 rounded-full bg-[#0B0F0C] text-[#C8FF2E] flex items-center justify-center transition-transform group-hover:rotate-90">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
            Host Game
          </span>
        </div>
        <div>
          <span className="font-display font-black text-lg leading-tight block">
            create match
          </span>
          <span className="text-[11px] text-[#0B0F0C]/80 font-medium">Pick pitch & roster</span>
        </div>
      </button>

      {/* 2. Join Match Tile (Flooded Soft Pink) */}
      <button
        onClick={onJoin}
        className="group h-28 rounded-[24px] bg-[#FF8FC7] text-[#0B0F0C] p-4 flex flex-col justify-between text-left transition-all duration-150 press-scale shadow-[0_8px_24px_rgba(255,143,199,0.2)] select-none"
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-9 h-9 rounded-full bg-[#0B0F0C] text-[#FF8FC7] flex items-center justify-center transition-transform group-hover:scale-110">
            <Compass className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
            Find Pickup
          </span>
        </div>
        <div>
          <span className="font-display font-black text-lg leading-tight block">
            join match
          </span>
          <span className="text-[11px] text-[#0B0F0C]/80 font-medium">15 games nearby</span>
        </div>
      </button>
    </div>
  );
};
