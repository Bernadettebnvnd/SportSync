'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  Plus,
  Users,
  Calendar,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { StadiumScene } from '../../illustrations/Scenes';
import { MatchCard } from '../../design-system/components/MatchCard';
import { UserAvatar, toAvatarId } from '../../illustrations/Avatars';
import { CommunityGame } from '../../mock/types';
import { SportIcon } from '../../illustrations/SportIcons';
import { STANDARDIZED_SPORTS } from '../../config/sports';

interface SocialHomeScreenProps {
  games?: CommunityGame[];
  user?: {
    id?: string;
    name: string;
    avatarId: string;
    level: number;
    isGuest?: boolean;
  };
  onCreateMatch: () => void;
  onJoinMatch: () => void;
  onSelectGame: (game: CommunityGame) => void;
  onOpenNotifications: () => void;
  onRequireAuth?: (actionName?: string) => void;
  isGuest?: boolean;
}

export const SocialHomeScreen: React.FC<SocialHomeScreenProps> = ({
  games = [],
  user,
  onCreateMatch,
  onJoinMatch,
  onSelectGame,
  onOpenNotifications,
  onRequireAuth,
  isGuest = false,
}) => {
  const effectiveIsGuest = isGuest || !user?.id || user.isGuest;
  const userName = user?.name || (effectiveIsGuest ? 'Guest' : 'Player');

  const [activeTab, setActiveTab] = useState<'discover' | 'my_games' | 'hosting'>('discover');
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter games by tab and sport
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      // Tab filter
      if (activeTab === 'my_games') {
        const isJoined = game.members.some((m) => m.name === userName);
        if (!isJoined) return false;
      } else if (activeTab === 'hosting') {
        if (game.hostName !== userName) return false;
      }

      // Sport filter
      if (selectedSport !== 'All') {
        if (!game.sport.toLowerCase().includes(selectedSport.toLowerCase())) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = game.title.toLowerCase().includes(q);
        const matchesLoc = game.locationName.toLowerCase().includes(q);
        const matchesSport = game.sport.toLowerCase().includes(q);
        if (!matchesTitle && !matchesLoc && !matchesSport) return false;
      }

      return true;
    });
  }, [games, activeTab, selectedSport, searchQuery, userName]);

  const handleCreateClick = () => {
    if (effectiveIsGuest && onRequireAuth) {
      onRequireAuth('create a game');
      return;
    }
    onCreateMatch();
  };

  const handleNotificationsClick = () => {
    if (effectiveIsGuest && onRequireAuth) {
      onRequireAuth('view notifications');
      return;
    }
    onOpenNotifications();
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Stadium Header Canvas */}
      <div className="relative w-full rounded-b-[36px] bg-[#0F2A22] overflow-hidden p-5 pt-4 border-b border-white/10 shadow-xl">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <StadiumScene className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F2A22] via-[#0F2A22]/70 to-transparent pointer-events-none" />

        {/* Top Greeting Row */}
        <div className="relative z-10 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <UserAvatar
              id={toAvatarId(user?.avatarId)}
              size={38}
              showBadge={!effectiveIsGuest}
              badgeLevel={user?.level || 1}
            />
            <div>
              <span className="text-[11px] text-[#A5B0A6] uppercase tracking-wider font-semibold block">
                Play &amp; Sync Feed
              </span>
              <h2 className="font-display font-black text-base text-[#F4F7F0]">
                {effectiveIsGuest ? 'Welcome to Play' : `Hey, ${userName.split(' ')[0]}`}
              </h2>
            </div>
          </div>

          <button
            onClick={handleNotificationsClick}
            aria-label="View notifications"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>

        {/* Header Punchy Copy */}
        <div className="relative z-10 pt-1 pb-1">
          <h1 className="font-display font-black text-2xl text-[#F4F7F0] leading-tight">
            Ready to play today?
          </h1>
          <p className="text-xs text-[#C8FF2E] font-medium mt-0.5">
            {games.length > 0
              ? `${games.length} open rosters and pickup matches scheduled.`
              : 'Join open pickup rosters or host a new match.'}
          </p>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* 2. Action Tiles: Create Game + Find Players */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCreateClick}
            className="p-4 rounded-3xl bg-[#C8FF2E] text-[#0B0F0C] text-left flex flex-col justify-between h-28 shadow-lg hover:bg-[#d4ff52] transition-all press-scale"
          >
            <div className="w-8 h-8 rounded-full bg-[#0B0F0C] text-[#C8FF2E] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-black text-sm block">Create Match</span>
              <span className="text-[10px] text-[#0B0F0C]/80 font-bold">Host &amp; split court</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onJoinMatch}
            className="p-4 rounded-3xl bg-[#141A15] border border-white/10 text-left flex flex-col justify-between h-28 shadow-lg hover:border-[#C8FF2E]/40 transition-all press-scale"
          >
            <div className="w-8 h-8 rounded-full bg-[#1C241E] text-[#C8FF2E] flex items-center justify-center border border-white/5">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display font-black text-sm text-[#F4F7F0] block">Find Players</span>
              <span className="text-[10px] text-[#A5B0A6]">Browse open rosters</span>
            </div>
          </button>
        </div>

        {/* 3. Section Tabs: Discover Games | My Games | Games I Host */}
        <div className="flex rounded-2xl bg-[#141A15] p-1 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'discover' ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold' : 'text-[#A5B0A6] hover:text-white'
            }`}
          >
            Discover Games
          </button>
          <button
            type="button"
            onClick={() => {
              if (effectiveIsGuest && onRequireAuth) {
                onRequireAuth('view joined games');
                return;
              }
              setActiveTab('my_games');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'my_games' ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold' : 'text-[#A5B0A6] hover:text-white'
            }`}
          >
            My Games
          </button>
          <button
            type="button"
            onClick={() => {
              if (effectiveIsGuest && onRequireAuth) {
                onRequireAuth('view hosted games');
                return;
              }
              setActiveTab('hosting');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'hosting' ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold' : 'text-[#A5B0A6] hover:text-white'
            }`}
          >
            Games I Host
          </button>
        </div>

        {/* 4. Sport Categories Filter (Phase 9 Standardized) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {STANDARDIZED_SPORTS.map((sport) => {
            const isActive = selectedSport === sport;
            return (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`h-8 px-3 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border press-scale ${
                  isActive
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                    : 'bg-[#141A15] text-[#A5B0A6] border-white/10 hover:text-white'
                }`}
              >
                {sport !== 'All' ? (
                  <SportIcon sport={sport} size={12} color={isActive ? '#0B0F0C' : '#A5B0A6'} />
                ) : (
                  <Sparkles className="w-3 h-3 text-current" />
                )}
                <span>{sport}</span>
              </button>
            );
          })}
        </div>

        {/* 5. Games List vs Meaningful Empty State */}
        <div>
          {filteredGames.length > 0 ? (
            <div className="space-y-2.5">
              {filteredGames.map((game) => (
                <MatchCard
                  key={game.id}
                  game={game}
                  onClick={() => onSelectGame(game)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1C241E] border border-white/10 flex items-center justify-center mx-auto text-[#A5B0A6]">
                <Calendar className="w-5 h-5 text-[#C8FF2E]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                  {activeTab === 'my_games'
                    ? "You haven't joined a game yet"
                    : activeTab === 'hosting'
                    ? "You aren't hosting any games right now"
                    : 'No upcoming games'}
                </h4>
                <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                  {activeTab === 'my_games'
                    ? 'Join an open roster on the Discover feed to play with other verified players.'
                    : activeTab === 'hosting'
                    ? 'Host a game to complete your roster and invite local sports enthusiasts.'
                    : selectedSport !== 'All'
                    ? `No ${selectedSport} runs currently scheduled. Host the first match!`
                    : 'No pickup runs scheduled yet. Host a session to complete your squad roster!'}
                </p>
              </div>

              <div className="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="px-4 py-2 rounded-xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm press-scale"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Host a Game</span>
                </button>
                {activeTab !== 'discover' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="px-4 py-2 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-xs font-bold text-[#A5B0A6] hover:text-white"
                  >
                    View All Games
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
