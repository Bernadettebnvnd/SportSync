'use client';

import React from 'react';
import {
  Settings,
  Trophy,
  Flame,
  MapPin,
  Sparkles,
  LogOut,
  UserCheck,
  Calendar,
  Activity,
} from 'lucide-react';
import { UserAvatar, toAvatarId } from '../../illustrations/Avatars';
import { StatTile, LevelBadge, XpRing, RatingChip } from '../../design-system/components/StatTile';
import { SportIcon } from '../../illustrations/SportIcons';
import { APP_CONFIG } from '../../config/appConfig';

interface ProfileScreenProps {
  user?: {
    id?: string;
    name: string;
    username: string;
    avatarId: string;
    level: number;
    levelTitle: string;
    xp: number;
    xpNextLevel: number;
    streakWeeks?: number;
    matchesTotal?: number;
    wins?: number;
    city?: string;
    preferredSports?: string[];
    skillLevel?: string;
    isGuest?: boolean;
  };
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  onLogout?: () => void;
  onRequireAuth?: (title?: string, message?: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onOpenSettings,
  onOpenLeaderboard,
  onLogout,
  onRequireAuth,
}) => {
  const isGuest = !user?.id || user?.isGuest || user?.name === 'Guest';
  const displayName = isGuest ? 'Guest Player' : user?.name || 'Player';
  const username = isGuest ? '@guest' : user?.username || '@player';
  const userCity = user?.city || 'Metro Manila';
  const userSports = user?.preferredSports || ['Basketball', 'Pickleball', 'Badminton'];
  const userSkill = user?.skillLevel || 'Intermediate';

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header with Settings Gear */}
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

      <div className="px-5 pt-3 space-y-5">
        {/* 2. Hero Avatar & Playmaker Level & XP Ring */}
        <div className="p-5 rounded-3xl bg-[#0F2A22] border border-white/10 relative overflow-hidden flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatar id={toAvatarId(user?.avatarId)} size={64} />
            <div className="min-w-0">
              <h2 className="font-display font-black text-xl text-[#F4F7F0] truncate">
                {displayName}
              </h2>
              <span className="text-xs text-[#A5B0A6] block mb-1 truncate">
                {username}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <LevelBadge
                  level={isGuest ? 1 : user?.level || 1}
                  title={isGuest ? 'Guest Explorer' : user?.levelTitle || 'Rookie Starter'}
                />
                {!isGuest && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1C241E] border border-[#C8FF2E]/40 text-[#C8FF2E] text-[10px] font-bold">
                    <Flame className="w-3 h-3 text-[#C8FF2E]" />
                    <span>{user?.streakWeeks || 0}W Streak</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* XP Progress Ring */}
          <XpRing
            currentXp={isGuest ? 0 : user?.xp || 0}
            nextLevelXp={isGuest ? 500 : user?.xpNextLevel || 500}
            level={isGuest ? 1 : user?.level || 1}
            size={76}
          />
        </div>

        {/* 3. Performance Stats (Participation History) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
              Career Participation &amp; XP
            </h3>
            <button
              onClick={onOpenLeaderboard}
              className="text-xs text-[#C8FF2E] font-semibold flex items-center gap-1 press-scale"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <StatTile
              value={isGuest ? 0 : user?.matchesTotal || 0}
              label="Matches Played"
              trend={isGuest ? 'Guest Mode' : `${user?.matchesTotal || 0} recorded`}
            />
            <StatTile
              value={isGuest ? 0 : user?.wins || 0}
              label="Matches Won"
              trend={
                user?.matchesTotal && user.matchesTotal > 0
                  ? `${Math.round(((user.wins || 0) / user.matchesTotal) * 100)}% Win Rate`
                  : 'No games yet'
              }
            />
            <StatTile
              value={isGuest ? '0 XP' : `${user?.xp || 0} XP`}
              label="Playmaker XP"
              trend={isGuest ? 'Sign in to earn' : 'Level progression'}
            />
            <StatTile
              value={userSkill}
              label="Skill Tier"
              trend="Verified Rating"
            />
          </div>
        </div>

        {/* 4. Preferred Sports (Phase 9 Standardized) */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5">
          <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block">
            Preferred Sports
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {userSports.map((sport) => (
              <div
                key={sport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C241E] border border-white/5 text-xs font-semibold text-[#F4F7F0]"
              >
                <SportIcon sport={sport} size={14} color="#C8FF2E" />
                <span>{sport}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Location Preferences & Playing Area */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block">
            Home Court Region
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F7F0]">
            <MapPin className="w-4 h-4 text-[#C8FF2E]" />
            <span>{userCity}</span>
          </div>
          <p className="text-[11px] text-[#A5B0A6]">
            Matches and court searches default to this area.
          </p>
        </div>

        {/* 6. Account Actions & Logout */}
        <div className="pt-2 space-y-2">
          {isGuest && onRequireAuth && (
            <button
              type="button"
              onClick={() => onRequireAuth('Join SportSync', 'Create an account to track your matches, earn XP, and unlock all features.')}
              className="w-full h-12 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] hover:bg-[#d4ff52] flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-[0_4px_16px_rgba(200,255,46,0.25)]"
            >
              <UserCheck className="w-4 h-4" />
              <span>Create Account or Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full h-12 rounded-2xl bg-[#141A15] text-[#F4F7F0] hover:bg-[#1C241E] border border-white/10 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
          >
            <Settings className="w-4 h-4 text-[#A5B0A6]" />
            <span>Account Settings</span>
          </button>

          {!isGuest && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full h-12 rounded-2xl bg-[#1C241E] text-[#FF5C5C] hover:bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of {APP_CONFIG.appName}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
