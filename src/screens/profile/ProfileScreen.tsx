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
  const userSports = user?.preferredSports || ['Badminton', 'Basketball', 'Volleyball'];
  const userSkill = user?.skillLevel || 'Intermediate';

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-32 select-none">
      {/* 1. Header with Settings Gear */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between shrink-0">
        <h1 className="font-display font-black text-xl tracking-tight text-[#F4F7F0]">
          Player Profile
        </h1>

        <button
          onClick={onOpenSettings}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pt-1 space-y-3.5">
        {/* 2. Hero Avatar & Playmaker Level & XP Ring */}
        <div className="p-4 rounded-3xl bg-[#0F2A22] border border-white/10 relative overflow-hidden flex flex-col gap-3 shadow-xl">
          {/* Subtle accent glow in top corner */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#C8FF2E]/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Avatar + Name on left, XP Progress Ring on right */}
          <div className="flex items-center justify-between gap-3 min-w-0 relative z-10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UserAvatar id={toAvatarId(user?.avatarId)} size={52} />
              <div className="min-w-0 flex-1">
                <h2 className="font-display font-black text-lg text-[#F4F7F0] truncate leading-snug">
                  {displayName}
                </h2>
                <span className="text-xs text-[#A5B0A6] block truncate">
                  {username}
                </span>
              </div>
            </div>

            {/* XP Progress Ring with visible SVG gauge */}
            <XpRing
              currentXp={isGuest ? 0 : user?.xp || 0}
              nextLevelXp={isGuest ? 500 : user?.xpNextLevel || 500}
              level={isGuest ? 1 : user?.level || 1}
              size={58}
            />
          </div>

          {/* Bottom Row: Level Badge, Streak, Location Badges */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 overflow-x-auto no-scrollbar relative z-10">
            <LevelBadge
              level={isGuest ? 1 : user?.level || 1}
              title={isGuest ? 'Guest Explorer' : user?.levelTitle || 'Rookie Starter'}
            />
            {!isGuest && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#141A15] border border-[#C8FF2E]/40 text-[#C8FF2E] text-[10px] font-bold whitespace-nowrap shrink-0">
                <Flame className="w-3 h-3 text-[#C8FF2E]" />
                <span>{user?.streakWeeks || 0}W Streak</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#141A15] border border-white/10 text-[#A5B0A6] text-[10px] font-medium whitespace-nowrap shrink-0">
              <MapPin className="w-3 h-3 text-[#C8FF2E]" />
              <span>{userCity}</span>
            </span>
          </div>
        </div>

        {/* 3. Performance Stats (Participation History) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
              Career Participation &amp; XP
            </h3>
            <button
              onClick={onOpenLeaderboard}
              className="text-xs text-[#C8FF2E] font-semibold flex items-center gap-1 press-scale hover:underline"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatTile
              value={isGuest ? 0 : user?.matchesTotal || 0}
              label="Matches Played"
              trend={isGuest ? 'Guest' : `${user?.matchesTotal || 0} rec.`}
            />
            <StatTile
              value={isGuest ? 0 : user?.wins || 0}
              label="Matches Won"
              trend={
                user?.matchesTotal && user.matchesTotal > 0
                  ? `${Math.round(((user.wins || 0) / user.matchesTotal) * 100)}% Win`
                  : '0% Wins'
              }
            />
            <StatTile
              value={isGuest ? '0 XP' : `${user?.xp || 0} XP`}
              label="Playmaker XP"
              trend={isGuest ? 'Sign in' : 'Progress'}
            />
            <StatTile
              value={userSkill}
              label="Skill Tier"
              trend="Verified"
            />
          </div>
        </div>

        {/* 4. Preferred Sports */}
        <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block">
              Preferred Sports
            </span>
            <span className="text-[10px] text-[#A5B0A6]">
              {userSports.length} active
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {userSports.map((sport) => (
              <div
                key={sport}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C241E] border border-white/5 text-xs font-semibold text-[#F4F7F0]"
              >
                <SportIcon sport={sport} size={13} color="#C8FF2E" />
                <span>{sport}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Location Preferences & Playing Area */}
        <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block">
            Home Court Region
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F7F0]">
            <MapPin className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
            <span>{userCity}</span>
          </div>
          <p className="text-[11px] text-[#A5B0A6]">
            Matches and court searches default to this area.
          </p>
        </div>

        {/* 6. Account Actions & Logout */}
        <div className="pt-1 space-y-2 pb-4">
          {isGuest && onRequireAuth && (
            <button
              type="button"
              onClick={() => onRequireAuth('Join SportSync', 'Create an account to track your matches, earn XP, and unlock all features.')}
              className="w-full h-11 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] hover:bg-[#d4ff52] flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-[0_4px_16px_rgba(200,255,46,0.25)]"
            >
              <UserCheck className="w-4 h-4" />
              <span>Create Account or Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full h-11 rounded-2xl bg-[#141A15] text-[#F4F7F0] hover:bg-[#1C241E] border border-white/10 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
          >
            <Settings className="w-4 h-4 text-[#A5B0A6]" />
            <span>Account Settings</span>
          </button>

          {!isGuest && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full h-11 rounded-2xl bg-[#1C241E] text-[#FF5C5C] hover:bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
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
