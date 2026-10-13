import React from 'react';
import { Settings, Award, Trophy, ChevronRight, Zap, Star } from 'lucide-react';
import { UserAvatar } from '../../illustrations/Avatars';
import { StatTile, LevelBadge, XpRing, RatingChip } from '../../design-system/components/StatTile';
import { CURRENT_USER } from '../../mock/mockData';
import { TeamCrest } from '../../illustrations/TeamCrests';
import { Button } from '../../design-system/components/Button';

interface ProfileScreenProps {
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onOpenSettings,
  onOpenLeaderboard,
}) => {
  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header with Settings gear */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <h1 className="font-display font-black text-2xl tracking-tight text-[#F4F7F0]">
          Player Profile
        </h1>

        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 pt-3 space-y-6">
        {/* 2. Hero Avatar & Playmaker Level & XP Ring (Ref B) */}
        <div className="p-5 rounded-3xl bg-[#0F2A22] border border-white/10 relative overflow-hidden flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <UserAvatar id={CURRENT_USER.avatarId} size={64} />
            <div>
              <h2 className="font-display font-black text-xl text-[#F4F7F0]">
                {CURRENT_USER.name}
              </h2>
              <span className="text-xs text-[#A5B0A6] block mb-1">
                {CURRENT_USER.username}
              </span>
              <LevelBadge
                level={CURRENT_USER.level}
                title={CURRENT_USER.levelTitle}
              />
            </div>
          </div>

          {/* XP Progress Ring */}
          <XpRing
            currentXp={CURRENT_USER.xp}
            nextLevelXp={CURRENT_USER.xpNextLevel}
            level={CURRENT_USER.level}
            size={76}
          />
        </div>

        {/* 3. Four Stat Tiles (Matches, Wins, Goals, Assists) (Ref B) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
              Career Performance
            </h3>
            <button
              onClick={onOpenLeaderboard}
              className="text-xs text-[#C8FF2E] font-semibold flex items-center gap-1"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <StatTile value={CURRENT_USER.matchesTotal} label="Matches Played" trend="+4 this wk" />
            <StatTile value={CURRENT_USER.wins} label="Matches Won" trend="68% Win Rate" />
            <StatTile value={CURRENT_USER.goals} label="Goals Scored" trend="0.8 / game" />
            <StatTile value={CURRENT_USER.assists} label="Total Assists" trend="0.6 / game" />
          </div>
        </div>

        {/* 4. About Bio */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block">
            About Alex
          </span>
          <p className="text-xs text-[#F4F7F0]/90 leading-relaxed">
            Central attacking playmaker & weekend 5s enthusiast. London Metro Sunday league runner-up 2025. Love fast one-touch transitions under floodlights.
          </p>
        </div>

        {/* 5. Recent Games with Ratings in Lime (Ref B) */}
        <div>
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6] mb-2.5">
            Recent Match Ratings
          </h3>
          <div className="space-y-2">
            {CURRENT_USER.recentGames.map((game, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-display font-bold text-xs text-[#F4F7F0]">
                    {game.title}
                  </h4>
                  <span className="text-[10px] text-[#A5B0A6]">
                    {game.date} • {game.role} • {game.result}
                  </span>
                </div>
                <RatingChip rating={game.rating} />
              </div>
            ))}
          </div>
        </div>

        {/* 6. Favorite Clubs followed */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block">
            Clubs Followed
          </span>
          <div className="flex items-center gap-3">
            {CURRENT_USER.favoriteTeams.map((team) => (
              <div key={team.id} className="flex items-center gap-2 bg-[#1C241E] px-3 py-1.5 rounded-full border border-white/5">
                <TeamCrest id={team.crestId} size={18} />
                <span className="text-xs font-semibold text-[#F4F7F0]">{team.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
