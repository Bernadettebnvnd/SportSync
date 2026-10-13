import React from 'react';
import { Bell, Plus, Users, Calendar, Sparkles } from 'lucide-react';
import { StadiumScene } from '../../illustrations/Scenes';
import { ActionTiles } from '../../design-system/components/MatchCard';
import { MatchCard } from '../../design-system/components/MatchCard';
import { UserAvatar } from '../../illustrations/Avatars';
import { COMMUNITY_GAMES, FRIENDS, CURRENT_USER } from '../../mock/mockData';
import { CommunityGame } from '../../mock/types';

interface SocialHomeScreenProps {
  games?: CommunityGame[];
  user?: typeof CURRENT_USER;
  onCreateMatch: () => void;
  onJoinMatch: () => void;
  onSelectGame: (game: CommunityGame) => void;
  onOpenNotifications: () => void;
}

export const SocialHomeScreen: React.FC<SocialHomeScreenProps> = ({
  games = COMMUNITY_GAMES,
  user = CURRENT_USER,
  onCreateMatch,
  onJoinMatch,
  onSelectGame,
  onOpenNotifications,
}) => {
  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Illustrated Stadium Header (Ref B Forest Green Canvas) */}
      <div className="relative w-full rounded-b-[36px] bg-[#0F2A22] overflow-hidden p-5 pt-4 border-b border-white/10 shadow-xl">
        {/* Stadium Vector Scene Backdrop */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <StadiumScene className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F2A22] via-[#0F2A22]/70 to-transparent pointer-events-none" />

        {/* Top greeting row */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <UserAvatar id={user.avatarId} size={38} showBadge badgeLevel={user.level} />
            <div>
              <span className="text-[11px] text-[#A5B0A6] uppercase tracking-wider font-semibold block">
                Community Hub
              </span>
              <h2 className="font-display font-black text-base text-[#F4F7F0]">
                Hey, {user.name.split(' ')[0]} 👋
              </h2>
            </div>
          </div>

          <button
            onClick={onOpenNotifications}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>

        {/* Punchy Microcopy (Ref B) */}
        <div className="relative z-10 pt-2 pb-1">
          <h1 className="font-display font-black text-2xl text-[#F4F7F0] leading-tight">
            Ready to play today?
          </h1>
          <p className="text-xs text-[#C8FF2E] font-medium mt-0.5">
            {games.length} pickup matches kicking off near you this evening.
          </p>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6">
        {/* 2. Two Big Action Tiles (Lime "create match" + Pink "join match") */}
        <ActionTiles onCreate={onCreateMatch} onJoin={onJoinMatch} />

        {/* 3. Upcoming Games (Ref B List Rows) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
              Upcoming Community Runs
            </h3>
            <button onClick={onJoinMatch} className="text-xs text-[#C8FF2E] font-semibold">
              View all ({games.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {games.slice(0, 3).map((game) => (
              <MatchCard
                key={game.id}
                game={game}
                onClick={() => onSelectGame(game)}
              />
            ))}
          </div>
        </div>

        {/* 4. Friend Activity Feed with Mini Pitch Thumbnails (Ref B) */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
              Squad Feed
            </h3>
            <span className="text-[11px] text-[#C8FF2E] font-bold">Active now</span>
          </div>

          <div className="divide-y divide-white/5 space-y-2.5">
            {FRIENDS.slice(0, 3).map((f) => (
              <div key={f.id} className="pt-2.5 flex items-center gap-3 text-xs">
                <UserAvatar id={f.avatarId} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#F4F7F0] truncate">{f.name}</span>
                    <span className="text-[10px] text-[#A5B0A6]">({f.username})</span>
                  </div>
                  <p className="text-[11px] text-[#A5B0A6] truncate">{f.activity}</p>
                </div>
                {/* Mini Pitch Thumbnail indicator */}
                <div className="w-8 h-8 rounded-lg bg-[#0F2A22] border border-[#C8FF2E]/30 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-[#C8FF2E]">⚽</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
