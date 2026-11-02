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
  Crown,
  Edit2,
  X,
  Check,
  Loader2,
  Moon,
  Sun,
  Bell,
} from 'lucide-react';
import { UserAvatar, toAvatarId } from '../../illustrations/Avatars';
import { StatTile, LevelBadge, XpRing, RatingChip } from '../../design-system/components/StatTile';
import { SportIcon } from '../../illustrations/SportIcons';
import { APP_CONFIG } from '../../config/appConfig';
import { CommunityGame } from '../../mock/types';
import { useNotifications } from '../../lib/notifications';

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
  hostedGames?: CommunityGame[];
  isLightMode?: boolean;
  onToggleTheme?: () => void;
  onOpenNotifications?: () => void;
  onSelectGame?: (game: CommunityGame) => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  onLogout?: () => void;
  onRequireAuth?: (title?: string, message?: string) => void;
  onUpdatePreferences?: (prefs: {
    city?: string;
    preferredSports?: string[];
    skillLevel?: string;
  }) => Promise<void> | void;
  onEditPreferences?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  hostedGames = [],
  isLightMode = false,
  onToggleTheme,
  onOpenNotifications,
  onSelectGame,
  onOpenSettings,
  onOpenLeaderboard,
  onLogout,
  onRequireAuth,
  onUpdatePreferences,
  onEditPreferences,
}) => {
  const isGuest = !user?.id || user?.isGuest || user?.name === 'Guest';
  const displayName = isGuest ? 'Guest Player' : user?.name || 'Player';
  const username = isGuest ? '@guest' : user?.username || '@player';
  const { unreadCount } = useNotifications(user?.name || user?.id ? { id: user?.id, name: user?.name } : undefined);

  // Local state for instant optimistic updates
  const [localCity, setLocalCity] = React.useState(user?.city || 'Naga City');
  const [localSports, setLocalSports] = React.useState<string[]>(
    user?.preferredSports && user.preferredSports.length > 0 ? user.preferredSports : ['Football']
  );
  const [localSkill, setLocalSkill] = React.useState(user?.skillLevel || 'Intermediate');
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = React.useState(false);

  // Edit modal draft state
  const [draftCity, setDraftCity] = React.useState(user?.city || 'Naga City');
  const [draftSports, setDraftSports] = React.useState<string[]>(
    user?.preferredSports && user.preferredSports.length > 0 ? user.preferredSports : ['Football']
  );
  const [draftSkill, setDraftSkill] = React.useState(user?.skillLevel || 'Intermediate');

  React.useEffect(() => {
    if (user?.city) {
      setLocalCity(user.city);
      setDraftCity(user.city);
    }
    if (user?.preferredSports && user.preferredSports.length > 0) {
      setLocalSports(user.preferredSports);
      setDraftSports(user.preferredSports);
    }
    if (user?.skillLevel) {
      setLocalSkill(user.skillLevel);
      setDraftSkill(user.skillLevel);
    }
  }, [user?.city, user?.preferredSports, user?.skillLevel]);

  const userCity = localCity || 'Naga City';
  const userSports = localSports.length > 0 ? localSports : ['Football'];
  const userSkill = localSkill || 'Intermediate';

  const AVAILABLE_SPORTS = [
    'Football',
    'Basketball',
    'Badminton',
    'Volleyball',
    'Pickleball',
    'Tennis',
    'Billiards',
    'Darts',
    'Padel',
  ];

  const LOCATION_OPTIONS = [
    'Naga City',
    'Metro Manila',
    'BGC, Taguig City',
    'Makati City',
    'Pasig & Ortigas',
    'Quezon City',
    'Mandaluyong',
    'Cebu City',
    'Davao City',
  ];

  const SKILL_LEVELS = ['Beginner', 'Casual', 'Intermediate', 'Advanced'];

  const toggleDraftSport = (sport: string) => {
    if (draftSports.includes(sport)) {
      if (draftSports.length > 1) {
        setDraftSports(draftSports.filter((s) => s !== sport));
      }
    } else {
      setDraftSports([...draftSports, sport]);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    setLocalSports(draftSports);
    setLocalCity(draftCity);
    setLocalSkill(draftSkill);

    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_user_city', draftCity);
      localStorage.setItem('sportsync_user_location', draftCity);
      localStorage.setItem('sportsync_user_sports', JSON.stringify(draftSports.map((s) => s.toLowerCase())));
      localStorage.setItem('sportsync_user_skill', draftSkill.toLowerCase());

      const saved = localStorage.getItem('sportsync_user_profile') || localStorage.getItem('sideline_user_profile');
      let parsed: any = {};
      if (saved) {
        try { parsed = JSON.parse(saved); } catch {}
      }
      const updatedProfile = {
        ...parsed,
        city: draftCity,
        preferredSports: draftSports,
        primarySport: (draftSports[0] || 'football').toLowerCase(),
        skillLevel: draftSkill,
        onboardingCompleted: true,
      };
      localStorage.setItem('sportsync_user_profile', JSON.stringify(updatedProfile));
      localStorage.setItem('sideline_user_profile', JSON.stringify(updatedProfile));
    }

    if (onUpdatePreferences) {
      await onUpdatePreferences({
        city: draftCity,
        preferredSports: draftSports,
        skillLevel: draftSkill,
      });
    }

    setIsSavingPrefs(false);
    setIsEditModalOpen(false);
  };

  const uniqueHostedGames = React.useMemo(() => {
    const seen = new Set<string>();
    return hostedGames.filter((hg) => {
      if (!hg || !hg.id || seen.has(hg.id)) return false;
      seen.add(hg.id);
      return true;
    });
  }, [hostedGames]);

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-32 select-none">
      {/* 1. Header with Settings Gear */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between shrink-0">
        <h1 className="font-display font-black text-xl tracking-tight text-[#F4F7F0]">
          Player Profile
        </h1>

        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-[#F4F7F0] flex items-center justify-center transition-colors press-scale"
              aria-label={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isLightMode ? (
                <Moon className="w-4 h-4 text-[#0F1612]" />
              ) : (
                <Sun className="w-4 h-4 text-[#C8FF2E]" />
              )}
            </button>
          )}

          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-[#F4F7F0] flex items-center justify-center transition-colors press-scale"
              aria-label="View notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_#C8FF2E]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-1 space-y-3.5">
        {/* 2. Hero Avatar & Playmaker Level & XP Ring */}
        <div className="p-4 rounded-3xl bg-[#0F2A22] border border-white/10 relative overflow-hidden flex flex-col gap-3 shadow-xl">
          {/* Subtle accent glow in top corner */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#C8FF2E]/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Avatar + Name on left, XP Progress Ring on right */}
          <div className="flex items-center justify-between gap-3 min-w-0 relative z-10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UserAvatar name={displayName} size={52} />
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#A5B0A6]">
                {userSports.length} active
              </span>
              <button
                type="button"
                onClick={() => onEditPreferences ? onEditPreferences() : setIsEditModalOpen(true)}
                className="text-[11px] font-bold text-[#C8FF2E] hover:underline flex items-center gap-1 press-scale"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>
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

        {/* 5. Hosted Games (Host Management Overview) */}
        {uniqueHostedGames.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#141A15] border border-[#C8FF2E]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#C8FF2E] tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>Hosted Games ({uniqueHostedGames.length})</span>
              </span>
              <span className="text-[10px] text-[#A5B0A6]">Host Management</span>
            </div>
            <div className="space-y-2">
              {uniqueHostedGames.map((hg) => (
                <div
                  key={hg.id}
                  onClick={() => onSelectGame?.(hg)}
                  className="p-2.5 rounded-xl bg-[#1C241E] hover:bg-[#253028] border border-white/5 flex items-center justify-between cursor-pointer transition-all press-scale"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-xs text-[#F4F7F0] block truncate">{hg.title}</span>
                    <span className="text-[10px] text-[#A5B0A6] block truncate">
                      {hg.sport} • {hg.date} • {hg.spotsJoined}/{hg.spotsTotal} spots
                    </span>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#C8FF2E]/15 text-[#C8FF2E] font-bold border border-[#C8FF2E]/30 shrink-0">
                    Manage / Delete &rarr;
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Location Preferences & Playing Area */}
        <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block">
              Home Court Region
            </span>
            <button
              type="button"
              onClick={() => onEditPreferences ? onEditPreferences() : setIsEditModalOpen(true)}
              className="text-[11px] font-bold text-[#C8FF2E] hover:underline flex items-center gap-1 press-scale"
            >
              <Edit2 className="w-3 h-3" />
              <span>Change</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F7F0]">
            <MapPin className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
            <span>{userCity}</span>
          </div>
          <p className="text-[11px] text-[#A5B0A6]">
            Matches and court searches default to this area.
          </p>
        </div>

        {/* 7. Theme Preference Card */}
        {onToggleTheme && (
          <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1C241E] flex items-center justify-center text-[#C8FF2E]">
                {isLightMode ? <Sun className="w-4 h-4 text-[#E29B24]" /> : <Moon className="w-4 h-4 text-[#C8FF2E]" />}
              </div>
              <div>
                <span className="text-xs font-bold text-[#F4F7F0] block leading-tight">
                  {isLightMode ? 'Light Canvas Active' : 'Dark Floodlight Active'}
                </span>
                <span className="text-[10px] text-[#A5B0A6]">
                  {isLightMode ? 'Clean daylight contrast' : 'Night stadium pitch view'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all press-scale ${
                isLightMode
                  ? 'bg-[#1C241E] text-[#0F1612] hover:bg-[#DDE3D9]'
                  : 'bg-[#C8FF2E] text-[#0B0F0C] hover:bg-[#bbee26]'
              }`}
            >
              {isLightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{isLightMode ? 'Switch to Dark' : 'Switch to Light'}</span>
            </button>
          </div>
        )}

        {/* 8. Account Actions & Logout */}
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
            onClick={() => onEditPreferences ? onEditPreferences() : setIsEditModalOpen(true)}
            className="w-full h-11 rounded-2xl bg-[#141A15] text-[#C8FF2E] hover:bg-[#1C241E] border border-[#C8FF2E]/30 flex items-center justify-center gap-2 text-xs font-bold transition-all press-scale shadow-[0_0_14px_rgba(200,255,46,0.12)]"
          >
            <Sparkles className="w-4 h-4 text-[#C8FF2E]" />
            <span>Edit Playing Preferences (Sports &amp; City)</span>
          </button>

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

      {/* Quick Edit Preferences Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#141A15] border border-white/10 p-5 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C8FF2E]" />
                <h3 className="font-display font-black text-base text-[#F4F7F0]">
                  Edit Playing Preferences
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Preferred Sports */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                Preferred Sports ({draftSports.length} selected)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_SPORTS.map((sport) => {
                  const isSelected = draftSports.includes(sport);
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => toggleDraftSport(sport)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-[0_0_10px_rgba(200,255,46,0.2)]'
                          : 'bg-[#0B0F0C] border-white/10 text-[#A5B0A6] hover:text-[#F4F7F0]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <SportIcon sport={sport} size={14} color={isSelected ? '#C8FF2E' : '#A5B0A6'} />
                        <span className="truncate">{sport}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-[#C8FF2E] shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Home Court Region / City */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                Home Court Region
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LOCATION_OPTIONS.map((loc) => {
                  const isSelected = draftCity === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setDraftCity(loc)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-[0_0_10px_rgba(200,255,46,0.2)]'
                          : 'bg-[#0B0F0C] border-white/10 text-[#A5B0A6] hover:text-[#F4F7F0]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3 h-3 text-[#C8FF2E] shrink-0" />
                        <span className="truncate">{loc}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-[#C8FF2E] shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Skill Level */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                Skill Tier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SKILL_LEVELS.map((lvl) => {
                  const isSelected = draftSkill === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDraftSkill(lvl)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        isSelected
                          ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                          : 'bg-[#0B0F0C] border-white/10 text-[#A5B0A6]'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 h-10 rounded-xl bg-[#1C241E] text-xs font-semibold text-[#A5B0A6] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingPrefs}
                onClick={handleSavePreferences}
                className="flex-1 h-10 rounded-xl bg-[#C8FF2E] text-xs font-bold text-[#0B0F0C] hover:bg-[#d4ff52] transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_14px_rgba(200,255,46,0.3)]"
              >
                {isSavingPrefs ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Preferences</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
