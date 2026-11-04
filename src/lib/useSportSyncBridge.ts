'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMatchiStore } from './store';
import {
  CommunityGame,
  Venue,
  Match,
  UserPredictionWager,
  BadgeItem,
  AvatarId,
  SportType,
} from '../mock/types';
import { SportType as DbSportType, SkillLevel } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { updatePlayerProfile } from './services/auth';
import { markSessionDeleted } from './services/sessions';
import { addNotification, resetNotificationCache } from './notifications';
import { isGameExpired, isSessionExpired, filterActiveGames } from './utils/gameExpiration';

export function getDeletedGameTombstones(): { ids: Set<string>; titles: Set<string> } {
  const ids = new Set<string>();
  const titles = new Set<string>();
  if (typeof window === 'undefined') return { ids, titles };
  try {
    const raw = localStorage.getItem('sportsync_deleted_game_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (typeof item === 'string') {
            ids.add(item);
            titles.add(item.trim().toLowerCase());
          } else if (item && typeof item === 'object') {
            if (item.id) ids.add(item.id);
            if (item.sessionId) ids.add(item.sessionId);
            if (item.title) titles.add(item.title.trim().toLowerCase());
          }
        });
      }
    }
  } catch {}
  return { ids, titles };
}

export function markGameDeleted(gameId: string, gameTitle?: string, sessionId?: string) {
  if (typeof window === 'undefined') return;
  try {
    const existingRaw = localStorage.getItem('sportsync_deleted_game_ids');
    const existing: Array<{ id: string; title?: string; sessionId?: string }> = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [
      ...existing.filter((item) => (typeof item === 'string' ? item !== gameId : item.id !== gameId)),
      { id: gameId, title: gameTitle?.trim().toLowerCase(), sessionId },
    ];
    localStorage.setItem('sportsync_deleted_game_ids', JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to mark game as deleted:', err);
  }
}

/**
 * Generate a cryptographically strong, collision-free unique game ID.
 */
export function generateUniqueGameId(prefix: string = 'cg'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const perfNow = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000) : 0;
  return `${prefix}_${timestamp}_${perfNow}_${randomSuffix}`;
}

export interface SportSyncBookingItem {
  id: string;
  venue: Venue;
  court: string;
  date: string;
  time: string;
  price: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

// Backward compatibility type alias
export type SidelineBookingItem = SportSyncBookingItem;

export const DEFAULT_BADGES: BadgeItem[] = [
  {
    id: 'oracle_vision',
    title: 'Oracle Vision',
    desc: 'Place 3 live match predictions in Match Center',
    icon: '🔮',
    category: 'predictions',
    progress: 2,
    maxProgress: 3,
    unlocked: false,
    claimed: false,
    rewardXp: 200,
  },
  {
    id: 'tactical_gambit',
    title: 'High Roller',
    desc: 'Wager 100+ XP on a live prediction with odds',
    icon: '🎲',
    category: 'predictions',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    claimed: false,
    rewardXp: 150,
  },
  {
    id: 'squad_captain',
    title: 'Squad Captain',
    desc: 'Host a community pickup match on the feed',
    icon: '👑',
    category: 'community',
    progress: 1,
    maxProgress: 1,
    unlocked: true,
    claimed: false,
    rewardXp: 250,
  },
  {
    id: 'streak_master',
    title: 'Streak Master',
    desc: 'Maintain a 4-week active playing streak (1.5x XP Boost)',
    icon: '🔥',
    category: 'streaks',
    progress: 4,
    maxProgress: 4,
    unlocked: true,
    claimed: true,
    rewardXp: 200,
  },
  {
    id: 'floodlight_warrior',
    title: 'Floodlight Warrior',
    desc: 'Play 5 evening games under floodlights',
    icon: '⚡',
    category: 'matches',
    progress: 5,
    maxProgress: 5,
    unlocked: true,
    claimed: true,
    rewardXp: 100,
  },
  {
    id: 'clay_specialist',
    title: 'Clay Specialist',
    desc: 'Win 3 tennis matches on clay court',
    icon: '🎾',
    category: 'matches',
    progress: 3,
    maxProgress: 3,
    unlocked: true,
    claimed: true,
    rewardXp: 150,
  },
  {
    id: 'century_club',
    title: 'Century Club',
    desc: 'Reach 8,000 career Playmaker XP',
    icon: '🏆',
    category: 'matches',
    progress: 7240,
    maxProgress: 8000,
    unlocked: false,
    claimed: false,
    rewardXp: 300,
  },
  {
    id: 'playmaker_elite',
    title: 'Playmaker Elite',
    desc: 'Reach Level 20 Master Playmaker status',
    icon: '🌟',
    category: 'matches',
    progress: 18,
    maxProgress: 20,
    unlocked: false,
    claimed: false,
    rewardXp: 500,
  },
];

export const SQUAD_FRIENDS_BASE: Array<{
  rank: number;
  name: string;
  username: string;
  avatar: 'leo' | 'elena' | 'martin' | 'marcus' | 'kai' | 'jordan' | 'alex';
  xp: number;
  level: number;
  color: string;
}> = [];

export function getLevelTitle(level: number): string {
  if (level < 5) return 'Rookie Starter';
  if (level < 10) return 'Squad Contender';
  if (level < 15) return 'Midfield Tactician';
  if (level < 20) return 'Playmaker Visionary';
  if (level < 25) return 'Master Playmaker';
  return 'Living Legend';
}

/**
 * Detects mock template games and legacy prototype records so they can be purged.
 */
export function isMockGame(game: Partial<CommunityGame> | null | undefined): boolean {
  if (!game) return true;

  const mockIds = new Set([
    'cg1', 'cg2', 'cg3', 'cg4', 'cg5', 'cg6', 'cg7', 'cg8',
    'sess_test_01', 'sess_test_02', 'game_test_01', 'game_test_02',
  ]);
  if (game.id && (mockIds.has(game.id) || game.id.startsWith('sess_test_') || game.id.startsWith('session_test_'))) {
    return true;
  }
  if (game.sessionId && (mockIds.has(game.sessionId) || game.sessionId.startsWith('sess_test_') || game.sessionId.startsWith('session_test_'))) {
    return true;
  }

  const mockTitles = [
    'friday night smash',
    'open play queuing',
    'dinking & rally',
    'pickleball social rotation',
    'pickleball doubles social',
    'king of court',
    'king of the court',
    'rally rotation',
    '5v5: sunset game',
    'sunday morning league prep',
    'clay doubles friendly',
    '3v3 half-court runs',
    'casual friday night 5v5',
  ];
  const titleLower = (game.title || '').toLowerCase().trim();
  if (mockTitles.some((t) => titleLower.includes(t))) return true;

  const mockLocations = [
    'the upper deck',
    'the upper deck sports center',
    'pickleball playground qc',
    'pickleball playground',
    'smash zone bgc',
    'padel club manila',
    'bgc turf',
    'kerry sports',
    'makati sports club',
    'spike zone',
    'star billiards',
    'the pitchway',
    'victoria park pitch',
    'clay court club kensington',
    'metro hoops shoreditch',
  ];
  const locLower = (game.locationName || '').toLowerCase().trim();
  if (mockLocations.some((l) => locLower.includes(l))) return true;

  return false;
}

/**
 * Formats session timestamps cleanly (e.g. "Today", "Active Now", "Tomorrow", "18:00").
 */
export function formatSessionDateTime(startTime?: string, status?: string): { date: string; time: string } {
  if (!startTime) {
    return { date: 'Today', time: '18:00' };
  }

  // Already a plain time string
  if (!startTime.includes('T') && !startTime.includes('-') && startTime.includes(':')) {
    return { date: 'Today', time: startTime };
  }

  try {
    const d = new Date(startTime);
    if (isNaN(d.getTime())) {
      return { date: 'Today', time: startTime };
    }

    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate();

    let dateStr = isToday
      ? 'Today'
      : isTomorrow
      ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (status === 'active' && !isToday && !isTomorrow) {
      dateStr = 'Active Now';
    }

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return { date: dateStr, time: timeStr };
  } catch {
    return { date: 'Today', time: startTime };
  }
}

/**
 * Normalizes rotation and match format for compact card badges.
 */
export function getShortFormat(rotationFormat?: string, sport?: string): string {
  if (!rotationFormat) {
    const sp = (sport || '').toLowerCase();
    if (sp.includes('badminton') || sp.includes('pickleball') || sp.includes('tennis') || sp.includes('padel')) {
      return 'Doubles';
    }
    if (sp.includes('basket')) return '3v3';
    return '5v5';
  }
  const rf = rotationFormat.toLowerCase();
  if (rf.includes('doubles')) return 'Doubles';
  if (rf.includes('singles')) return 'Singles';
  if (rf.includes('3v3')) return '3v3';
  if (rf.includes('5v5')) return '5v5';
  if (rf.includes('7v7')) return '7v7';
  if (rf.includes('king')) return 'King of Court';
  if (rf.includes('rally')) return 'Rally Rotation';
  if (rotationFormat.length > 14) return 'Open Play';
  return rotationFormat;
}

export const INITIAL_USER_PROFILE = {
  id: undefined as string | undefined,
  name: 'Guest Player',
  username: '@guest',
  avatarId: 'alex' as const,
  level: 1,
  levelTitle: 'Rookie Starter',
  xp: 0,
  xpNextLevel: 1000,
  city: 'Naga City',
  primarySport: 'football',
  preferredSports: ['Football', 'Basketball', 'Badminton'],
  skillLevel: 'Beginner',
  availability: 'Weekday Evenings & Weekends',
  onboardingCompleted: false,
  streakWeeks: 0,
  streakMultiplier: 1.0,
  predictionsCount: 0,
  predictionsWon: 0,
  matchesTotal: 0,
  wins: 0,
  goals: 0,
  assists: 0,
  winRate: '0%',
  mvpCount: 0,
  recentGames: [] as any[],
  favoriteTeams: [] as any[],
  isGuest: true,
};

export type SportSyncUserProfile = typeof INITIAL_USER_PROFILE;

export function formatSkillTier(rawSkill?: string): string {
  if (!rawSkill) return 'Beginner';
  const lower = rawSkill.toLowerCase().trim();
  if (lower === 'all_levels' || lower === 'all levels') return 'Beginner';
  if (lower === 'beginner') return 'Beginner';
  if (lower === 'casual') return 'Intermediate';
  if (lower === 'intermediate') return 'Intermediate';
  if (lower === 'advanced' || lower === 'competitive') return 'Advanced';
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function useSportSyncBridge() {
  const store = useMatchiStore();

  // 1. Dynamic user profile with XP and Gamification
  const [userProfile, setUserProfile] = useState(() => {
    const hasPendingOnboarding = typeof window !== 'undefined' && localStorage.getItem('sportsync_pending_onboarding') === 'true';
    const isStoreCompleted = !hasPendingOnboarding && Boolean(
      store.currentUser.onboarding_completed || store.currentUser.has_completed_onboarding
    );
    let localCompleted = false;
    if (typeof window !== 'undefined') {
      localCompleted = !hasPendingOnboarding && (
        localStorage.getItem('sportsync_onboarding_completed') === 'true' ||
        localStorage.getItem('matchi_onboarding_completed') === 'true'
      );
      const saved = localStorage.getItem('sportsync_user_profile') || localStorage.getItem('sideline_user_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const storedCity = localStorage.getItem('sportsync_user_city') || localStorage.getItem('sportsync_user_location');
          const storedSportsRaw = localStorage.getItem('sportsync_user_sports');
          let storedSports: string[] | null = null;
          if (storedSportsRaw) {
            try {
              const sp = JSON.parse(storedSportsRaw);
              if (Array.isArray(sp)) storedSports = sp.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
            } catch {}
          }
          const finalCity = 'Naga City';

          const hasStaleDefaultSports = parsed.preferredSports?.length === 2 &&
            parsed.preferredSports.includes('Pickleball') &&
            parsed.preferredSports.includes('Badminton');

          const finalSports = (storedSports && storedSports.length > 0 && hasStaleDefaultSports)
            ? storedSports
            : (store.currentUser.preferred_sports && store.currentUser.preferred_sports.length > 0 && hasStaleDefaultSports
              ? store.currentUser.preferred_sports.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              : (parsed.preferredSports || storedSports || ['Football']));

          const storedSkill = typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_skill') : null;
          const storedAvailability = typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_availability') : null;
          const finalSkill = formatSkillTier(storedSkill || parsed.skillLevel || store.currentUser.skill_level);
          const finalAvailability = parsed.availability || storedAvailability || store.currentUser.availability || 'Weekday Evenings & Weekends';

          return {
            ...parsed,
            city: finalCity,
            preferredSports: finalSports,
            primarySport: finalSports[0]?.toLowerCase() || parsed.primarySport || 'football',
            skillLevel: finalSkill,
            availability: finalAvailability,
            onboardingCompleted: Boolean(parsed.onboardingCompleted || isStoreCompleted || localCompleted),
          };
        } catch {
          // ignore parsing error
        }
      }
    }
    const isAuthenticated = Boolean(store.currentUser.id && store.currentUser.email);
    const completed = Boolean(isStoreCompleted || localCompleted);
    return {
      id: store.currentUser.id || store.currentUser.auth_id || (isAuthenticated ? 'usr_auth' : undefined),
      name: isAuthenticated ? (store.currentUser.full_name || 'Player') : 'Guest',
      username: isAuthenticated
        ? (store.currentUser.nickname ? `@${store.currentUser.nickname.toLowerCase()}` : `@${store.currentUser.email?.split('@')[0] || 'player'}`)
        : '@guest',
      avatarId: 'alex' as const,
      level: 1,
      levelTitle: getLevelTitle(1),
      xp: 0,
      xpNextLevel: 1000,
      city: (store.currentUser.city && store.currentUser.city.toLowerCase().includes('naga'))
        ? store.currentUser.city
        : 'Naga City',
      primarySport: store.currentUser.primary_sport || 'football',
      preferredSports: store.currentUser.preferred_sports && store.currentUser.preferred_sports.length > 0
        ? store.currentUser.preferred_sports.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        : ['Football'],
      skillLevel: formatSkillTier(
        (typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_skill') : null) || store.currentUser.skill_level
      ),
      availability: (typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_availability') : null) || store.currentUser.availability || 'Weekday Evenings & Weekends',
      onboardingCompleted: completed,
      streakWeeks: store.currentUser.win_streak || 0,
      streakMultiplier: 1.0,
      predictionsCount: 0,
      predictionsWon: 0,
      matchesTotal: store.currentUser.matches_played || 0,
      wins: store.currentUser.matches_won || 0,
      goals: 0,
      assists: 0,
      winRate: '0%',
      mvpCount: 0,
      recentGames: [],
      favoriteTeams: [],
      isGuest: !isAuthenticated,
    };
  });

  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;

  // Persist userProfile to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_user_profile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  // Sync complete profile when store user updates
  useEffect(() => {
    const isAuthenticated = Boolean(store.currentUser.id && store.currentUser.email);
    const hasPendingOnboarding = typeof window !== 'undefined' && localStorage.getItem('sportsync_pending_onboarding') === 'true';
    const isCompleted = !hasPendingOnboarding && Boolean(
      store.currentUser.onboarding_completed ||
      store.currentUser.has_completed_onboarding ||
      (!store.currentUser.id && typeof window !== 'undefined' && (
        localStorage.getItem('matchi_onboarding_completed') === 'true' ||
        localStorage.getItem('sportsync_onboarding_completed') === 'true'
      ))
    );

    if (isAuthenticated) {
      setUserProfile((prev: any) => ({
        ...prev,
        id: store.currentUser.id || store.currentUser.auth_id || prev.id,
        email: store.currentUser.email,
        name: store.currentUser.full_name || prev.name,
        username: store.currentUser.nickname
          ? `@${store.currentUser.nickname.toLowerCase()}`
          : (store.currentUser.email ? `@${store.currentUser.email.split('@')[0]}` : prev.username),
        role: store.currentUser.role || prev.role,
        city: 'Naga City',
        primarySport: store.currentUser.primary_sport || prev.primarySport || 'pickleball',
        preferredSports: store.currentUser.preferred_sports && store.currentUser.preferred_sports.length > 0
          ? store.currentUser.preferred_sports.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          : prev.preferredSports,
        skillLevel: (store.currentUser.skill_level && store.currentUser.skill_level !== 'all_levels')
          ? formatSkillTier(store.currentUser.skill_level)
          : (prev.skillLevel && prev.skillLevel !== 'All_levels' ? prev.skillLevel : formatSkillTier(typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_skill') || 'Beginner' : 'Beginner')),
        availability: store.currentUser.availability || prev.availability || (typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_availability') || 'Weekday Evenings & Weekends' : 'Weekday Evenings & Weekends'),
        onboardingCompleted: Boolean(isCompleted),
        matchesTotal: store.currentUser.matches_played ?? prev.matchesTotal,
        wins: store.currentUser.matches_won ?? prev.wins,
        streakWeeks: store.currentUser.win_streak ?? prev.streakWeeks,
        isGuest: false,
      }));
    }
  }, [
    store.currentUser.id,
    store.currentUser.auth_id,
    store.currentUser.email,
    store.currentUser.full_name,
    store.currentUser.nickname,
    store.currentUser.role,
    store.currentUser.city,
    store.currentUser.primary_sport,
    store.currentUser.preferred_sports,
    store.currentUser.skill_level,
    store.currentUser.onboarding_completed,
    store.currentUser.has_completed_onboarding,
    store.currentUser.matches_played,
    store.currentUser.matches_won,
    store.currentUser.win_streak,
  ]);

  // 2. Dynamic Community Pickup Games (real user-created & database sessions only)
  const [games, setGames] = useState<CommunityGame[]>(() => {
    const { ids: deletedIds, titles: deletedTitles } = getDeletedGameTombstones();
    const isGameDeleted = (g: CommunityGame) =>
      deletedIds.has(g.id) ||
      (g.sessionId ? deletedIds.has(g.sessionId) : false) ||
      deletedTitles.has(g.title.trim().toLowerCase());

    if (typeof window !== 'undefined') {
      localStorage.removeItem('sideline_community_games');
      const saved = localStorage.getItem('sportsync_community_games');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const seenIds = new Set<string>();
            const seenTitles = new Set<string>();
            const deduped: CommunityGame[] = [];
            parsed.forEach((g: any) => {
              if (!g || !g.id || isMockGame(g) || isGameExpired(g)) return;
              const normTitle = g.title ? g.title.trim().toLowerCase() : '';
              if (!isGameDeleted(g) && !seenIds.has(g.id) && (!normTitle || !seenTitles.has(normTitle))) {
                seenIds.add(g.id);
                if (normTitle) seenTitles.add(normTitle);
                deduped.push(g);
              }
            });
            if (deduped.length !== parsed.length) {
              localStorage.setItem('sportsync_community_games', JSON.stringify(deduped));
            }
            return deduped;
          }
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  const lastSerializedGamesRef = useRef<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cleanGames = games.filter((g) => !isMockGame(g) && !isGameExpired(g));
      const serialized = JSON.stringify(cleanGames);
      if (serialized !== lastSerializedGamesRef.current) {
        lastSerializedGamesRef.current = serialized;
        localStorage.setItem('sportsync_community_games', serialized);
      }
    }
  }, [games]);

  // Dynamic Matches initialized to empty array (no mock data fallback)
  const [matches, setMatches] = useState<Match[]>([]);

  // Sync store open play sessions into games feed (omits deleted / cancelled sessions and strictly prevents duplicates)
  useEffect(() => {
    if (store.sessions.length > 0) {
      const { ids: deletedIds, titles: deletedTitles } = getDeletedGameTombstones();
      setGames((prev) => {
        const cleanPrev = prev.filter((g) => {
          if (!g || !g.id || isMockGame(g)) return false;
          if (deletedIds.has(g.id) || (g.sessionId && deletedIds.has(g.sessionId)) || deletedTitles.has(g.title.trim().toLowerCase())) return false;
          if ((g as any).status === 'cancelled') return false;
          return true;
        });
        const seenIds = new Set(cleanPrev.map((g) => g.id));
        const seenSessionIds = new Set(cleanPrev.filter((g) => g.sessionId).map((g) => g.sessionId!));
        const seenTitles = new Set(cleanPrev.map((g) => g.title.trim().toLowerCase()));

        const updatedExisting = cleanPrev.map((g) => {
          const matchSession = store.sessions.find(
            (s) => s && (s.id === g.id || s.id === g.sessionId || (s.title && s.title.trim().toLowerCase() === g.title.trim().toLowerCase()))
          );
          if (matchSession) {
            if (matchSession.status === 'cancelled') return null;
            const isUserHost = Boolean(
              (userProfile.id && matchSession.host_id === userProfile.id) ||
              ((matchSession.host as any)?.auth_id && userProfile.id && (matchSession.host as any).auth_id === userProfile.id) ||
              (matchSession.host?.id && userProfile.id && matchSession.host.id === userProfile.id) ||
              (userProfile.name && matchSession.host?.full_name && matchSession.host.full_name.trim().toLowerCase() === userProfile.name.trim().toLowerCase()) ||
              (userProfile.name && matchSession.host_id && matchSession.host_id.trim().toLowerCase() === userProfile.name.trim().toLowerCase()) ||
              (userProfile.name && matchSession.description && matchSession.description.toLowerCase().includes(`[host:${userProfile.name.trim().toLowerCase()}]`)) ||
              (userProfile.name && g.hostName && g.hostName.trim().toLowerCase() === userProfile.name.trim().toLowerCase()) ||
              (userProfile.id && g.hostId && g.hostId === userProfile.id)
            );
            const resolvedHostName = isUserHost
              ? userProfile.name
              : (matchSession.host?.full_name || matchSession.host?.nickname || g.hostName || 'Match Organizer');
            const resolvedHostAvatar = (matchSession.host?.avatar_url as any) || g.hostAvatar || 'alex';
            const relevantQueues = [
              ...(matchSession.queues || []),
              ...store.queues.filter((q) => q.session_id === matchSession.id),
            ];

            const seenMemberIds = new Set<string>();
            const seenMemberNames = new Set<string>();

            const queueMembers: { id?: string; name: string; avatar: any }[] = [];
            relevantQueues.forEach((q) => {
              if ((q.status as string) === 'cancelled' || (q.status as string) === 'left') return;
              const qName = q.user?.full_name || q.user?.nickname || (q.partner_names && q.partner_names[0]) || '';
              const normQName = qName.trim().toLowerCase();
              const qId = q.user?.id || q.user_id;

              if (qId && seenMemberIds.has(qId)) return;
              if (normQName && seenMemberNames.has(normQName)) return;

              if (qId) seenMemberIds.add(qId);
              if (normQName) seenMemberNames.add(normQName);

              queueMembers.push({
                id: qId,
                name: qName || 'Participant',
                avatar: (q.user?.avatar_url as any) || 'alex',
              });
            });

            const mergedMembersMap = new Map<string, { id?: string; name: string; avatar: any }>();
            (g.members || []).forEach((m) => mergedMembersMap.set(m.id || m.name, m));
            queueMembers.forEach((m) => mergedMembersMap.set(m.id || m.name, m));
            const updatedMembers = Array.from(mergedMembersMap.values());
            const spotsJoined = Math.min(
              g.spotsTotal,
              Math.max(updatedMembers.length, matchSession.current_players_count || 0, g.spotsJoined)
            );

            return {
              ...g,
              hostName: resolvedHostName,
              hostAvatar: resolvedHostAvatar,
              hostId: matchSession.host_id || g.hostId,
              spotsJoined,
              members: updatedMembers,
            };
          }
          return g;
        }).filter(Boolean) as CommunityGame[];

        const added: CommunityGame[] = [];
        store.sessions.forEach((s) => {
          if (!s || !s.id) return;
          const venue = store.venues.find((v) => v.id === s.venue_id);
          if (isMockGame({ id: s.id, sessionId: s.id, title: s.title, locationName: venue?.name })) {
            return;
          }
          if (deletedIds.has(s.id) || deletedTitles.has(s.title.trim().toLowerCase()) || s.status === 'cancelled' || isSessionExpired(s)) {
            return;
          }
          const normTitle = s.title.trim().toLowerCase();
          if (seenIds.has(s.id) || seenSessionIds.has(s.id) || seenTitles.has(normTitle)) {
            return;
          }
          seenIds.add(s.id);
          seenSessionIds.add(s.id);
          seenTitles.add(normTitle);

          const hostMatch = s.description?.match(/\[HOST:(.*?)\]/i);
          const taggedHostName = hostMatch ? hostMatch[1].trim() : "";
          const isUserHost = Boolean(
            (userProfile.id && s.host_id === userProfile.id) ||
            ((s.host as any)?.auth_id && userProfile.id && (s.host as any).auth_id === userProfile.id) ||
            (s.host?.id && userProfile.id && s.host.id === userProfile.id) ||
            (userProfile.name && s.host?.full_name && s.host.full_name.trim().toLowerCase() === userProfile.name.trim().toLowerCase()) ||
            (userProfile.name && s.host_id && s.host_id.trim().toLowerCase() === userProfile.name.trim().toLowerCase()) ||
            (userProfile.name && taggedHostName && taggedHostName.toLowerCase() === userProfile.name.trim().toLowerCase())
          );
          const { date: formattedDate, time: formattedTime } = formatSessionDateTime(s.start_time, s.status);
          const shortFormat = getShortFormat(s.rotation_format, s.sport);
          const resolvedHostName = isUserHost
            ? userProfile.name
            : (s.host?.full_name || s.host?.nickname || (venue?.name ? `${venue.name} Host` : 'Match Organizer'));
          const resolvedHostAvatar = (s.host?.avatar_url as any) || 'alex';

          const relevantQueues = [
            ...(s.queues || []),
            ...store.queues.filter((q) => q.session_id === s.id),
          ];

          const seenMemberIds = new Set<string>();
          const seenMemberNames = new Set<string>();

          const queueMembers: { id?: string; name: string; avatar: any }[] = [];
          relevantQueues.forEach((q) => {
            if ((q.status as string) === 'cancelled' || (q.status as string) === 'left') return;
            const qName = q.user?.full_name || q.user?.nickname || (q.partner_names && q.partner_names[0]) || '';
            const normQName = qName.trim().toLowerCase();
            const qId = q.user?.id || q.user_id;

            if (qId && seenMemberIds.has(qId)) return;
            if (normQName && seenMemberNames.has(normQName)) return;

            if (qId) seenMemberIds.add(qId);
            if (normQName) seenMemberNames.add(normQName);

            queueMembers.push({
              id: qId,
              name: qName || 'Participant',
              avatar: (q.user?.avatar_url as any) || 'alex',
            });
          });

          const initialMembers = queueMembers;
          const initialSpotsJoined = Math.min(
            s.max_players || 12,
            initialMembers.length
          );

          added.push({
            id: s.id,
            sessionId: s.id,
            sport: (s.sport ? s.sport.charAt(0).toUpperCase() + s.sport.slice(1) : 'Pickleball') as any,
            title: s.title,
            format: (shortFormat || s.rotation_format || '5v5') as any,
            skillLevel: (s.skill_level === 'all_levels' ? 'Casual' : 'Competitive') as any,
            date: formattedDate || 'Today',
            time: formattedTime || s.start_time || '18:00',
            locationName: venue?.name || 'Verified Court Facility',
            locationDetails: s.location_details,
            distance: '0.9 km away',
            hostId: isUserHost ? userProfile.id : s.host_id,
            hostName: resolvedHostName,
            hostAvatar: resolvedHostAvatar,
            spotsTotal: s.max_players || 12,
            spotsJoined: initialSpotsJoined,
            pricePerPlayer: Math.round((s.fee_cents || 0) / 100),
            notes: s.description || 'Verified SportSync session',
            isPublic: s.visibility ? s.visibility !== 'Invite' : true,
            visibility: (s.visibility as any) || 'Public',
            inviteCode: s.invite_code,
            members: initialMembers,
          });
        });
        // Structural equality check: if nothing changed, bail out and return prev to halt render cascade
        if (added.length === 0 && cleanPrev.length === updatedExisting.length) {
          const isIdentical = cleanPrev.every((prevGame, idx) => {
            const nextGame = updatedExisting[idx];
            if (!nextGame || prevGame.id !== nextGame.id) return false;
            if (prevGame.spotsJoined !== nextGame.spotsJoined) return false;
            if (prevGame.hostName !== nextGame.hostName) return false;
            if (prevGame.hostAvatar !== nextGame.hostAvatar) return false;
            const prevMembers = prevGame.members || [];
            const nextMembers = nextGame.members || [];
            if (prevMembers.length !== nextMembers.length) return false;
            return prevMembers.every((pm, mIdx) => {
              const nm = nextMembers[mIdx];
              return nm && (pm.id || pm.name) === (nm.id || nm.name);
            });
          });
          if (isIdentical) {
            return prev;
          }
        }

        return added.length > 0 ? [...added, ...updatedExisting] : updatedExisting;
      });
    }
  }, [store.sessions, store.queues, store.venues, userProfile.id, userProfile.name]);

  const rosterSyncCacheRef = useRef<Map<string, { timestamp: number; notFound?: boolean }>>(new Map());

  const syncSessionRoster = useCallback(
    async (sessionIdOrCode: string, force = false) => {
      if (!sessionIdOrCode) return;
      const cleanKey = sessionIdOrCode.trim();
      if (!cleanKey) return;

      const now = Date.now();
      const cached = rosterSyncCacheRef.current.get(cleanKey);

      // Debounce & cache: if already marked notFound, or queried within 60 seconds, skip
      if (!force && cached) {
        if (cached.notFound) return;
        if (now - cached.timestamp < 60000) return;
      }

      rosterSyncCacheRef.current.set(cleanKey, { timestamp: now, notFound: false });

      try {
        const res = await fetch(`/api/invitations?code=${encodeURIComponent(cleanKey)}`);
        if (res.status === 404 || res.status === 410) {
          rosterSyncCacheRef.current.set(cleanKey, { timestamp: now, notFound: true });
          setGames((prev) => prev.filter((g) => g.id !== cleanKey && g.sessionId !== cleanKey && g.inviteCode?.toUpperCase() !== cleanKey.toUpperCase()));
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('sportsync_joined_games');
              if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                  localStorage.setItem('sportsync_joined_games', JSON.stringify(list.filter((id) => id !== cleanKey)));
                }
              }
            } catch {}
            try {
              const rawGames = localStorage.getItem('sportsync_community_games');
              if (rawGames) {
                const list = JSON.parse(rawGames);
                if (Array.isArray(list)) {
                  localStorage.setItem('sportsync_community_games', JSON.stringify(list.filter((g: any) => g.id !== cleanKey && g.sessionId !== cleanKey && g.inviteCode?.toUpperCase() !== cleanKey.toUpperCase())));
                }
              }
            } catch {}
            window.dispatchEvent(new CustomEvent('sportsync:game-deleted', { detail: { gameId: cleanKey, sessionId: cleanKey } }));
          }
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.deleted) {
            rosterSyncCacheRef.current.set(cleanKey, { timestamp: now, notFound: true });
            setGames((prev) => prev.filter((g) => g.id !== cleanKey && g.sessionId !== cleanKey && g.inviteCode?.toUpperCase() !== cleanKey.toUpperCase()));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sportsync:game-deleted', { detail: { gameId: cleanKey, sessionId: cleanKey } }));
            }
            return;
          }
          const remoteGame = (data.game || data.session) as CommunityGame | undefined;
          if (data.success && remoteGame) {
            let updatedMatch: CommunityGame | null = null;
            setGames((prev) =>
              prev.map((g) => {
                const isMatch =
                  g.id === remoteGame.id ||
                  (remoteGame.sessionId && (g.sessionId === remoteGame.sessionId || g.id === remoteGame.sessionId)) ||
                  (remoteGame.inviteCode && g.inviteCode && g.inviteCode.toUpperCase() === remoteGame.inviteCode.toUpperCase());
                if (!isMatch) return g;

                const combinedMembersMap = new Map<string, { id?: string; name: string; avatar: any }>();
                (remoteGame.members || []).forEach((m) => combinedMembersMap.set(m.id || m.name, m));
                const combinedMembers = Array.from(combinedMembersMap.values());
                const updatedSpots = combinedMembers.length;

                const updated = {
                  ...g,
                  hostName: remoteGame.hostName || g.hostName,
                  hostAvatar: remoteGame.hostAvatar || g.hostAvatar,
                  hostId: remoteGame.hostId || g.hostId,
                  spotsJoined: Math.min(g.spotsTotal, updatedSpots),
                  members: combinedMembers,
                };
                updatedMatch = updated;
                return updated;
              })
            );
            if (updatedMatch && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sportsync:roster-updated', { detail: { game: updatedMatch } }));
            }
            return;
          }
        }
      } catch {}

      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConfigured) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey);
          let dbSession: any = null;

          // 1. Query base session columns by ID if valid UUID
          if (isUuid) {
            try {
              const { data: byId } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', cleanKey)
                .maybeSingle();
              if (byId) dbSession = byId;
            } catch {}
          }

          // 2. Query by invite_code safely
          if (!dbSession) {
            try {
              const { data: byCode } = await supabase
                .from('sessions')
                .select('*')
                .eq('invite_code', cleanKey)
                .limit(1)
                .maybeSingle();
              if (byCode) dbSession = byCode;
            } catch {}
          }

          // 3. Fallback: Query by description tag
          if (!dbSession) {
            try {
              const { data: byDesc } = await supabase
                .from('sessions')
                .select('*')
                .ilike('description', `%${cleanKey}%`)
                .limit(1)
                .maybeSingle();
              if (byDesc) dbSession = byDesc;
            } catch {}
          }

          if (dbSession) {
            // Fetch host separately without broken foreign key joins
            let hostUser: any = null;
            if (dbSession.host_id) {
              try {
                const { data: u } = await supabase
                  .from('users')
                  .select('id, full_name, nickname, avatar_url')
                  .eq('id', dbSession.host_id)
                  .maybeSingle();
                if (u) hostUser = u;
              } catch {}
            }

            // Fetch venue separately
            let venueData: any = null;
            if (dbSession.venue_id) {
              try {
                const { data: v } = await supabase
                  .from('venues')
                  .select('id, name, address, city')
                  .eq('id', dbSession.venue_id)
                  .maybeSingle();
                if (v) venueData = v;
              } catch {}
            }

            // Fetch roster separately from queues, session_participants, or game_rosters
            let queueMembers: Array<{ id?: string; name: string; avatar: any }> = [];

            // Try queues table
            try {
              const { data: queueData } = await supabase
                .from('queues')
                .select('id, user_id, queue_number, status, partner_names, joined_at')
                .eq('session_id', dbSession.id)
                .neq('status', 'cancelled');

              if (Array.isArray(queueData) && queueData.length > 0) {
                const userIds = queueData.map((q: any) => q.user_id).filter(Boolean);
                const userProfilesMap = new Map<string, any>();
                if (userIds.length > 0) {
                  try {
                    const { data: userProfiles } = await supabase
                      .from('users')
                      .select('id, full_name, nickname, avatar_url')
                      .in('id', userIds);
                    if (Array.isArray(userProfiles)) {
                      userProfiles.forEach((up: any) => userProfilesMap.set(up.id, up));
                    }
                  } catch {}
                }

                queueMembers = queueData.map((q: any) => {
                  const prof = q.user_id ? userProfilesMap.get(q.user_id) : null;
                  return {
                    id: q.user_id,
                    name: prof?.full_name || prof?.nickname || (q.partner_names && q.partner_names[0]) || 'Player',
                    avatar: (prof?.avatar_url as any) || 'alex',
                  };
                });
              }
            } catch {}

            // Try session_participants if queues returned empty
            if (queueMembers.length === 0) {
              try {
                const { data: partData } = await supabase
                  .from('session_participants')
                  .select('*')
                  .eq('session_id', dbSession.id);

                if (Array.isArray(partData) && partData.length > 0) {
                  queueMembers = partData.map((p: any) => ({
                    id: p.user_id,
                    name: p.user_name || p.name || 'Player',
                    avatar: p.user_avatar || p.avatar || 'alex',
                  }));
                }
              } catch {}
            }

            // Try game_rosters if still empty
            if (queueMembers.length === 0) {
              try {
                const { data: rosterData } = await supabase
                  .from('game_rosters')
                  .select('*')
                  .eq('session_id', dbSession.id);

                if (Array.isArray(rosterData) && rosterData.length > 0) {
                  queueMembers = rosterData.map((r: any) => ({
                    id: r.user_id,
                    name: r.user_name || r.name || 'Player',
                    avatar: r.user_avatar || r.avatar || 'alex',
                  }));
                }
              } catch {}
            }

            const currentProfile = userProfileRef.current;
            const isUserHost = Boolean(
              (currentProfile.id && dbSession.host_id === currentProfile.id) ||
              (currentProfile.name && dbSession.host_id === currentProfile.name)
            );
            const resolvedHostName = isUserHost
              ? currentProfile.name
              : (hostUser?.full_name || hostUser?.nickname || 'Match Organizer');
            const resolvedHostAvatar = (hostUser?.avatar_url as any) || currentProfile.avatarId || 'alex';

            setGames((prev) =>
              prev.map((g) => {
                const isMatch =
                  g.id === dbSession.id ||
                  g.sessionId === dbSession.id ||
                  (dbSession.invite_code && g.inviteCode && g.inviteCode.toUpperCase() === dbSession.invite_code.toUpperCase());
                if (!isMatch) return g;

                const membersMap = new Map<string, { id?: string; name: string; avatar: any }>();
                queueMembers.forEach((m: any) => {
                  const key = m.id || m.name;
                  if (!membersMap.has(key)) membersMap.set(key, m);
                });
                const allMembers = Array.from(membersMap.values());
                const spotsJoined = allMembers.length;

                return {
                  ...g,
                  locationName: venueData?.name || g.locationName,
                  hostName: resolvedHostName,
                  hostAvatar: resolvedHostAvatar,
                  hostId: dbSession.host_id || g.hostId,
                  spotsJoined,
                  members: allMembers,
                };
              })
            );
          }
        } catch {}
      }
    },
    []
  );

  useEffect(() => {
    const supabase = getSupabaseClient();
    let channel: any = null;

    if (supabase && isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('sportsync-live-match-rosters')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'queues' },
            (payload: any) => {
              const sId = payload?.new?.session_id || payload?.old?.session_id;
              if (sId) {
                syncSessionRoster(sId, true);
              } else {
                setGames((currentGames) => {
                  currentGames.forEach((g) => {
                    const id = g.sessionId || g.id;
                    if (id) syncSessionRoster(id, true);
                  });
                  return currentGames;
                });
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sessions' },
            (payload: any) => {
              const isDelete = payload?.eventType === 'DELETE' || payload?.new?.status === 'cancelled';
              const sId = payload?.old?.id || payload?.new?.id;
              if (isDelete && sId) {
                setGames((prev) => prev.filter((g) => g.id !== sId && g.sessionId !== sId));
                if (typeof window !== 'undefined') {
                  try {
                    const raw = localStorage.getItem('sportsync_joined_games');
                    if (raw) {
                      const list = JSON.parse(raw);
                      if (Array.isArray(list)) {
                        localStorage.setItem('sportsync_joined_games', JSON.stringify(list.filter((id) => id !== sId)));
                      }
                    }
                  } catch {}
                  try {
                    const rawGames = localStorage.getItem('sportsync_community_games');
                    if (rawGames) {
                      const list = JSON.parse(rawGames);
                      if (Array.isArray(list)) {
                        localStorage.setItem('sportsync_community_games', JSON.stringify(list.filter((g: any) => g.id !== sId && g.sessionId !== sId)));
                      }
                    }
                  } catch {}
                  window.dispatchEvent(new CustomEvent('sportsync:game-deleted', { detail: { gameId: sId, sessionId: sId } }));
                }
              } else if (sId) {
                syncSessionRoster(sId, true);
              }
            }
          )
          .subscribe();
      } catch {}
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sportsync_community_games' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setGames(parsed);
          }
        } catch {}
      }
    };

    const handleCustomRoster = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.game) {
        setGames((prev) =>
          prev.map((g) => {
            if (
              g.id === detail.game.id ||
              (detail.game.sessionId && (g.sessionId === detail.game.sessionId || g.id === detail.game.sessionId)) ||
              (detail.game.inviteCode && g.inviteCode && g.inviteCode.toUpperCase() === detail.game.inviteCode.toUpperCase())
            ) {
              return detail.game;
            }
            return g;
          })
        );
      }
    };

    const handleGameDeleted = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const dId = detail?.gameId || detail?.sessionId;
      const dTitle = (detail?.title || '').trim().toLowerCase();
      if (dId || dTitle) {
        setGames((prev) =>
          prev.filter(
            (g) =>
              (!dId || (g.id !== dId && g.sessionId !== dId)) &&
              (!dTitle || g.title.trim().toLowerCase() !== dTitle)
          )
        );
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      window.addEventListener('sportsync:roster-updated', handleCustomRoster);
      window.addEventListener('sportsync:game-deleted', handleGameDeleted);
    }

    return () => {
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('sportsync:roster-updated', handleCustomRoster);
        window.removeEventListener('sportsync:game-deleted', handleGameDeleted);
      }
    };
  }, [syncSessionRoster]);

  // 3. Dynamic Bookings
  const [bookings, setBookings] = useState<SportSyncBookingItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sportsync_my_bookings') || localStorage.getItem('sideline_my_bookings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_my_bookings', JSON.stringify(bookings));
    }
  }, [bookings]);

  // 4. Dynamic Badges
  const [badges, setBadges] = useState<BadgeItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sportsync_user_badges') || localStorage.getItem('sideline_user_badges');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_BADGES;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_user_badges', JSON.stringify(badges));
    }
  }, [badges]);

  // 5. Dynamic Match Polls
  const [matchPolls, setMatchPolls] = useState<Record<string, Match['prediction']>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sportsync_match_polls') || localStorage.getItem('sideline_match_polls');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return {};
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_match_polls', JSON.stringify(matchPolls));
    }
  }, [matchPolls]);

  // 6. User Wagers
  const [wagers, setWagers] = useState<UserPredictionWager[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sportsync_user_wagers') || localStorage.getItem('sideline_user_wagers');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_user_wagers', JSON.stringify(wagers));
    }
  }, [wagers]);

  // 7. Dynamic Venues
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>([]);

  const venues = useMemo<Venue[]>(() => {
    const mapDbSportToUi = (s?: string): SportType => {
      if (!s) return 'Pickleball';
      const lower = s.toLowerCase();
      if (lower.includes('badminton')) return 'Badminton';
      if (lower.includes('pickle')) return 'Pickleball';
      if (lower.includes('basket')) return 'Basketball';
      if (lower.includes('foot') || lower.includes('futsal')) return 'Football';
      if (lower.includes('tennis')) return 'Tennis';
      if (lower.includes('volley')) return 'Volleyball';
      if (lower.includes('dart')) return 'Darts';
      if (lower.includes('billiard') || lower.includes('pool')) return 'Billiards';
      return 'Pickleball';
    };

    const sourceVenues = (store.venues || []).filter((v: any) => {
      const c = (v.city || '').toLowerCase();
      const a = (v.address || '').toLowerCase();
      const n = (v.name || '').toLowerCase();
      return c.includes('naga') || a.includes('naga') || a.includes('camarines') || n.includes('naga');
    });

    const adaptedDbVenues: Venue[] = sourceVenues.map((dbV) => {
      const primaryCourt = dbV.courts?.[0];
      const primarySport = mapDbSportToUi(dbV.featured_sports?.[0] || primaryCourt?.sport);
      const minCourtPrice = dbV.courts && dbV.courts.length > 0
        ? Math.min(...dbV.courts.map((c: any) => c.hourly_rate_cents || 45000))
        : 45000;
      const calculatedPrice = primaryCourt?.hourly_rate_cents
        ? Math.round(primaryCourt.hourly_rate_cents / 100)
        : Math.round(minCourtPrice / 100);
      const opHoursStr =
        dbV.operating_hours && typeof dbV.operating_hours === 'object'
          ? Object.values(dbV.operating_hours).join(' • ')
          : '06:00 AM - 11:00 PM';

      const allSportsForVenue = (dbV.featured_sports && dbV.featured_sports.length > 0
        ? dbV.featured_sports.map((s: string) => mapDbSportToUi(s))
        : [primarySport]
      ) as string[];

      // If courts specify other sports, include them so players can find courts by sport
      if (dbV.courts && dbV.courts.length > 0) {
        dbV.courts.forEach((c: any) => {
          if (c.sport) {
            const mapped = mapDbSportToUi(c.sport);
            if (!allSportsForVenue.includes(mapped)) {
              allSportsForVenue.push(mapped);
            }
          }
        });
      }

      // Dynamic realistic distance in km within Naga City pilot market
      const vAddrLower = (dbV.address || '').toLowerCase();
      const vNameLower = (dbV.name || '').toLowerCase();

      let computedDistance = 1.2;
      if (vNameLower.includes('metro naga') || vAddrLower.includes('cbd')) {
        computedDistance = 1.1;
      } else if (vNameLower.includes('pacol') || vAddrLower.includes('pacol')) {
        computedDistance = 3.2;
      } else if (vAddrLower.includes('magsaysay') || vNameLower.includes('magsaysay')) {
        computedDistance = 0.8;
      } else {
        computedDistance = 1.4;
      }

      return {
        id: dbV.id,
        name: dbV.name,
        sport: primarySport,
        city: dbV.city || 'Naga City',
        address: dbV.address,
        surface: primaryCourt?.floor_type || 'Competition Surface',
        isIndoor: primaryCourt?.is_indoor ?? true,
        pricePerHour: calculatedPrice,
        rating: dbV.rating || 4.9,
        reviewCount: dbV.review_count || 32,
        image: dbV.images?.[0] || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
        distanceMiles: computedDistance,
        amenities: dbV.amenities || ['Air Conditioning', 'Free Parking', 'Shower Rooms', 'Pro Shop'],
        courtsCount: dbV.courts?.length || 0,
        availableSlots: ['08:00', '10:00', '14:00', '16:00', '18:00', '20:00'],
        isFavorite: favoriteVenueIds.includes(dbV.id),
        courts: dbV.courts || [],
        operatingHours: opHoursStr,
        phone: (dbV.payment_info as any)?.gcash_number || '0917-888-SYNC',
        featuredSports: allSportsForVenue,
        isVerified: dbV.is_verified ?? true,
        latitude: dbV.latitude,
        longitude: dbV.longitude,
      };
    });

    return adaptedDbVenues;
  }, [store.venues, store.currentUser.city, favoriteVenueIds]);

  const toggleFavoriteVenue = useCallback((venueId: string) => {
    setFavoriteVenueIds((prev) =>
      prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId]
    );
  }, []);

  // 8. Celebration Modals State
  const [celebrationState, setCelebrationState] = useState<{
    type: 'level_up' | 'wager_won' | 'badge_claimed' | null;
    data: any;
  }>({
    type: null,
    data: null,
  });

  const closeCelebration = useCallback(() => {
    setCelebrationState({ type: null, data: null });
  }, []);

  // 9. Award Playmaker XP with Streak Multiplier & Level Progression
  const awardXp = useCallback(
    (
      amount: number,
      reason: string,
      options?: { applyStreakMultiplier?: boolean }
    ) => {
      const applyMultiplier = options?.applyStreakMultiplier ?? true;
      const multiplier = applyMultiplier ? (userProfile.streakMultiplier || 1.5) : 1;
      const bonusXp = Math.round(amount * (multiplier - 1));
      const totalEarned = amount + bonusXp;

      let leveledUp = false;
      let newLevel = userProfile.level;
      let newTitle = userProfile.levelTitle;
      const oldLevel = userProfile.level;

      setUserProfile((prev: SportSyncUserProfile & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number }) => {
        let currentLevel = prev.level;
        let currentXp = prev.xp + totalEarned;
        let nextLevelCap = prev.xpNextLevel;

        while (currentXp >= nextLevelCap) {
          leveledUp = true;
          currentLevel += 1;
          currentXp -= nextLevelCap;
          nextLevelCap = Math.round(nextLevelCap * 1.25);
        }

        newLevel = currentLevel;
        newTitle = getLevelTitle(currentLevel);

        return {
          ...prev,
          level: currentLevel,
          levelTitle: newTitle,
          xp: currentXp,
          xpNextLevel: nextLevelCap,
        };
      });

      // Update badge milestones dynamically
      setBadges((prevBadges) =>
        prevBadges.map((b) => {
          if (b.id === 'century_club') {
            const nextProg = Math.min(b.maxProgress, userProfile.xp + totalEarned);
            const isUnlocked = nextProg >= b.maxProgress;
            return {
              ...b,
              progress: nextProg,
              unlocked: isUnlocked || b.unlocked,
            };
          }
          if (b.id === 'playmaker_elite') {
            const isUnlocked = newLevel >= b.maxProgress;
            return {
              ...b,
              progress: Math.min(b.maxProgress, newLevel),
              unlocked: isUnlocked || b.unlocked,
            };
          }
          return b;
        })
      );

      if (leveledUp) {
        setCelebrationState({
          type: 'level_up',
          data: {
            oldLevel,
            newLevel,
            newTitle,
            rewardReason: reason,
          },
        });

        addNotification({
          type: 'achievement',
          title: `Level Up! Reached Level ${newLevel}`,
          desc: `Congratulations! You unlocked the title "${newTitle}". Keep playing to climb the ranks!`,
          linkScreen: 'leaderboard',
          recipientId: userProfile.id,
          recipientName: userProfile.name,
          meta: {
            event: 'level_up',
            newLevel,
            newTitle,
          },
        });
      }

      const message = leveledUp
        ? `🎉 LEVEL UP! You reached Level ${newLevel} (${newTitle})! (+${totalEarned} XP)`
        : applyMultiplier && bonusXp > 0
        ? `+${totalEarned} XP earned (${amount} base + ${bonusXp} 1.5x Streak Boost! 🔥)`
        : `+${totalEarned} Playmaker XP earned: ${reason}`;

      return {
        leveledUp,
        newLevel,
        oldLevel,
        newTitle,
        baseAmount: amount,
        multiplierBonus: bonusXp,
        totalEarned,
        message,
      };
    },
    [userProfile.streakMultiplier, userProfile.level, userProfile.levelTitle, userProfile.xp, userProfile.id, userProfile.name]
  );

  // 10. Place Prediction Vote / Wager
  const placePredictionWager = useCallback(
    (params: {
      matchId: string;
      matchTitle: string;
      pollQuestion: string;
      optionId: string;
      optionLabel: string;
      stakeXp: number;
      odds: number;
    }) => {
      const wagerId = generateUniqueGameId('wag');
      const potentialWinXp =
        params.stakeXp === 0
          ? 0
          : Math.round(params.stakeXp * params.odds * (userProfile.streakMultiplier || 1.5));

      if (params.stakeXp > 0) {
        if (userProfile.xp < params.stakeXp) {
          return {
            success: false,
            message: `Insufficient XP balance (${userProfile.xp} XP available, needed ${params.stakeXp} XP)`,
          };
        }
        setUserProfile((prev: SportSyncUserProfile & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number }) => ({
          ...prev,
          xp: Math.max(0, prev.xp - params.stakeXp),
          predictionsCount: (prev.predictionsCount || 0) + 1,
        }));
      } else {
        awardXp(50, `voting on ${params.matchTitle} prediction`, { applyStreakMultiplier: true });
        setUserProfile((prev: SportSyncUserProfile & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number }) => ({
          ...prev,
          predictionsCount: (prev.predictionsCount || 0) + 1,
        }));
      }

      const newWager: UserPredictionWager = {
        id: wagerId,
        matchId: params.matchId,
        matchTitle: params.matchTitle,
        pollQuestion: params.pollQuestion,
        optionId: params.optionId,
        optionLabel: params.optionLabel,
        stakeXp: params.stakeXp,
        odds: params.odds,
        potentialWinXp,
        status: 'active',
        placedAt: 'Just now',
      };

      setWagers((prev) => [newWager, ...prev]);

      setMatchPolls((prev) => {
        const currentPoll = prev[params.matchId];
        if (!currentPoll) return prev;

        const updatedOptions = currentPoll.options.map((opt) => {
          const isChosen = opt.id === params.optionId;
          const prevVotes = opt.votesCount || 100;
          const newVotes = prevVotes + (isChosen ? (params.stakeXp > 0 ? 15 : 5) : 2);
          return {
            ...opt,
            votesCount: newVotes,
          };
        });

        const totalVotes = updatedOptions.reduce((acc, o) => acc + (o.votesCount || 0), 0);
        const optionsWithPercentage = updatedOptions.map((opt) => ({
          ...opt,
          percentage: Math.round(((opt.votesCount || 0) / totalVotes) * 100),
        }));

        return {
          ...prev,
          [params.matchId]: {
            ...currentPoll,
            options: optionsWithPercentage,
          },
        };
      });

      setBadges((prev) =>
        prev.map((b) => {
          if (b.id === 'oracle_vision') {
            const nextProg = Math.min(b.maxProgress, b.progress + 1);
            return {
              ...b,
              progress: nextProg,
              unlocked: nextProg >= b.maxProgress ? true : b.unlocked,
            };
          }
          if (b.id === 'tactical_gambit' && params.stakeXp >= 100) {
            return {
              ...b,
              progress: 1,
              unlocked: true,
            };
          }
          return b;
        })
      );

      return {
        success: true,
        wager: newWager,
        message:
          params.stakeXp === 0
            ? `Vote locked in! +75 Playmaker XP awarded to your balance! 🔮`
            : `Wager placed! Staked ${params.stakeXp} XP @ ${params.odds}x. Potential Payout: +${potentialWinXp} XP 🎯`,
      };
    },
    [userProfile.xp, userProfile.streakMultiplier, awardXp]
  );

  // 11. Resolve Match Prediction Poll & Settle Wagers
  const resolveMatchPoll = useCallback(
    (matchId: string, winningOptionId: string) => {
      const wonWagers: UserPredictionWager[] = [];
      let totalPayout = 0;

      setMatchPolls((prev) => {
        const currentPoll = prev[matchId];
        if (!currentPoll) return prev;
        return {
          ...prev,
          [matchId]: {
            ...currentPoll,
            status: 'settled',
            settledOptionId: winningOptionId,
          },
        };
      });

      setWagers((prev) =>
        prev.map((w) => {
          if (w.matchId === matchId && w.status === 'active') {
            const isWinner = w.optionId === winningOptionId;
            if (isWinner) {
              const payout = w.stakeXp > 0 ? w.potentialWinXp : 120;
              totalPayout += payout;
              const wonWager: UserPredictionWager = {
                ...w,
                status: 'won',
                payoutXp: payout,
                resolvedAt: 'Just now',
              };
              wonWagers.push(wonWager);
              return wonWager;
            } else {
              return {
                ...w,
                status: 'lost',
                resolvedAt: 'Just now',
              };
            }
          }
          return w;
        })
      );

      if (wonWagers.length > 0) {
        awardXp(totalPayout, `winning live prediction wager on ${wonWagers[0].optionLabel}`, {
          applyStreakMultiplier: false,
        });
        setUserProfile((prev: SportSyncUserProfile & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number }) => ({
          ...prev,
          predictionsWon: (prev.predictionsWon || 0) + 1,
        }));
        setCelebrationState({
          type: 'wager_won',
          data: {
            matchTitle: wonWagers[0].matchTitle,
            optionLabel: wonWagers[0].optionLabel,
            payoutXp: totalPayout,
            stakeXp: wonWagers[0].stakeXp,
          },
        });

        addNotification({
          type: 'wager',
          title: 'Prediction Wager Won!',
          desc: `Your call on "${wonWagers[0].matchTitle}" paid out +${totalPayout} Playmaker XP!`,
          linkScreen: 'scores',
          recipientId: userProfile.id,
          recipientName: userProfile.name,
          meta: {
            event: 'wager_won',
            matchTitle: wonWagers[0].matchTitle,
            payoutXp: totalPayout,
          },
        });
        return {
          won: true,
          payoutXp: totalPayout,
          message: `🎯 PREDICTION WON! Payout of +${totalPayout} XP awarded to your balance!`,
        };
      } else {
        awardXp(20, `effort points for prediction participation`, { applyStreakMultiplier: false });
        return {
          won: false,
          payoutXp: 0,
          message: `Prediction resolved. Tough break on this call, but +20 XP effort points added!`,
        };
      }
    },
    [awardXp, userProfile.id, userProfile.name]
  );

  // 12. Claim Badge Reward
  const claimBadge = useCallback(
    (badgeId: string) => {
      let claimedItem: BadgeItem | null = null;

      setBadges((prev) =>
        prev.map((b) => {
          if (b.id === badgeId && b.unlocked && !b.claimed) {
            claimedItem = { ...b, claimed: true };
            return claimedItem;
          }
          return b;
        })
      );

      if (claimedItem) {
        const item = claimedItem as BadgeItem;
        const xpRes = awardXp(item.rewardXp, `unlocking badge: ${item.title}`, {
          applyStreakMultiplier: true,
        });
        setCelebrationState({
          type: 'badge_claimed',
          data: {
            badge: item,
            earnedXp: xpRes.totalEarned,
            multiplierBonus: xpRes.multiplierBonus,
          },
        });

        addNotification({
          type: 'achievement',
          title: `Achievement Claimed: ${item.title}`,
          desc: `You claimed "${item.title}" (+${xpRes.totalEarned} XP)!`,
          linkScreen: 'leaderboard',
          recipientId: userProfile.id,
          recipientName: userProfile.name,
          meta: {
            event: 'badge_claimed',
            badgeId: item.id,
            badgeTitle: item.title,
          },
        });
        return {
          success: true,
          earnedXp: xpRes.totalEarned,
          message: `Badge claimed! +${xpRes.totalEarned} XP awarded! 🏆`,
        };
      }

      return { success: false, message: 'Badge already claimed or not unlocked yet' };
    },
    [awardXp, userProfile.id, userProfile.name]
  );

  // 13. Dynamic Leaderboard Players
  const leaderboardPlayers = useMemo(() => {
    const me = {
      rank: 4,
      name: `${userProfile.name} (You)`,
      username: userProfile.username,
      avatar: (userProfile.avatarId || 'alex') as AvatarId,
      xp: userProfile.xp + (userProfile.level - 18) * 2000,
      level: userProfile.level,
      isMe: true,
      color: '#C8FF2E',
    };

    const combined = [...SQUAD_FRIENDS_BASE, me].sort((a, b) => b.xp - a.xp);

    return combined.map((player, idx) => ({
      ...player,
      rank: idx + 1,
    }));
  }, [userProfile.name, userProfile.username, userProfile.avatarId, userProfile.xp, userProfile.level]);

  // 14. Create Community Game
  const createCommunityGame = useCallback(
    async (gameData: {
      sport: string;
      title: string;
      date: string;
      time?: string;
      formattedDate?: string;
      locationName: string;
      locationDetails?: string;
      playersCount: number;
      skillLevel: 'Casual' | 'Competitive' | 'Beginner' | 'Intermediate';
      pricePerPlayer: number;
      notes?: string;
      coordinates?: [number, number];
      visibility?: 'Public' | 'Friends' | 'Invite';
      inviteCode?: string;
      invitedPlayers?: Array<{ id: string; name: string; avatarId?: AvatarId }>;
    }) => {
      let assignedId = generateUniqueGameId();
      let createdSessionId: string | undefined = undefined;

      const distanceStr = gameData.locationName.toLowerCase().includes('naga')
        ? 'Naga City • 0.5 km away'
        : '0.8 km away';

      let displayDate = gameData.date || 'Today';
      let displayTime = gameData.time || '18:00';
      if (displayDate.includes('(') && displayDate.includes(')')) {
        const match = displayDate.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          displayDate = match[1].trim();
          if (!gameData.time) displayTime = match[2].trim();
        }
      }

      const formatStr = getShortFormat(undefined, gameData.sport) || (gameData.playersCount <= 4 ? '2v2 Doubles' : '5v5');
      const userAvatar = (userProfile.avatarId || 'alex') as AvatarId;
      const userName = userProfile.name || 'Player';

      const finalInviteCode = gameData.inviteCode || Math.random().toString(36).substring(2, 8).toUpperCase();

      const now = new Date();
      let startYear = now.getFullYear();
      let startMonth = now.getMonth();
      let startDay = now.getDate();
      const dNorm = (displayDate || '').trim().toLowerCase();
      if (dNorm === 'tomorrow') {
        const tom = new Date(now);
        tom.setDate(now.getDate() + 1);
        startYear = tom.getFullYear();
        startMonth = tom.getMonth();
        startDay = tom.getDate();
      } else if (dNorm && dNorm !== 'today') {
        const parsed = new Date(displayDate);
        if (!isNaN(parsed.getTime())) {
          startYear = parsed.getFullYear();
          startMonth = parsed.getMonth();
          startDay = parsed.getDate();
        }
      }
      let startH = 18;
      let startM = 0;
      if (displayTime) {
        const parts = displayTime.trim().split(':');
        if (parts.length >= 2) {
          const ph = parseInt(parts[0], 10);
          const pm = parseInt(parts[1], 10);
          if (!isNaN(ph)) startH = ph;
          if (!isNaN(pm)) startM = pm;
        }
      }
      const startIso = new Date(startYear, startMonth, startDay, startH, startM, 0).toISOString();
      const endIso = new Date(new Date(startIso).getTime() + 2 * 60 * 60 * 1000).toISOString();

      let newGame: CommunityGame = {
        id: assignedId,
        sessionId: createdSessionId,
        sport: (gameData.sport as any) || 'Badminton',
        title: gameData.title,
        format: formatStr as any,
        skillLevel: (gameData.skillLevel as any) || 'Casual',
        date: displayDate,
        time: displayTime,
        locationName: gameData.locationName,
        locationDetails: gameData.locationDetails,
        distance: distanceStr,
        hostId: userProfile.id,
        hostName: userName,
        hostAvatar: userAvatar,
        spotsTotal: gameData.playersCount,
        spotsJoined: 0,
        pricePerPlayer: gameData.pricePerPlayer,
        notes: gameData.notes || 'Organized via SportSync Matchmaking',
        isPublic: gameData.visibility ? gameData.visibility !== 'Invite' : true,
        visibility: gameData.visibility || 'Public',
        inviteCode: finalInviteCode,
        invitedPlayers: gameData.invitedPlayers || [],
        members: [],
        coordinates: gameData.coordinates,
      };

      try {
        const sportNorm = gameData.sport.toLowerCase();
        const matchingSport: DbSportType =
          sportNorm.includes('basket')
            ? 'basketball'
            : sportNorm.includes('tennis')
            ? 'tennis'
            : sportNorm.includes('badminton')
            ? 'badminton'
            : sportNorm.includes('volley')
            ? 'volleyball'
            : 'pickleball';

        const targetVenue =
          store.venues.find((v) =>
            v.name.toLowerCase().includes(gameData.locationName.toLowerCase())
          ) || store.venues[0];

        if (targetVenue) {
          const createdSession = await store.createOpenPlaySession({
            venueId: targetVenue.id,
            title: gameData.title,
            description: `${gameData.notes || 'SportSync community game'}${finalInviteCode ? ` [INVITE:${finalInviteCode.toUpperCase()}]` : ''} [HOST:${userName}]`,
            sport: matchingSport,
            courtIds: targetVenue.courts?.map((c) => c.id) || [],
            startTime: startIso,
            endTime: endIso,
            feeCents: gameData.pricePerPlayer * 100,
            maxPlayers: gameData.playersCount,
            rotationFormat: formatStr,
            skillLevel: (gameData.skillLevel?.toLowerCase() as SkillLevel) || 'all_levels',
            hostId: userProfile.id,
            visibility: gameData.visibility,
            inviteCode: finalInviteCode,
            locationDetails: gameData.locationDetails,
          });
          if (createdSession?.id) {
            newGame.sessionId = createdSession.id;
            newGame.id = createdSession.id;
            createdSessionId = createdSession.id;
            assignedId = createdSession.id;
          }
        }
      } catch (sessErr) {
        console.warn('Error creating open play session:', sessErr);
      }

      if (typeof window !== 'undefined') {
        try {
          const res = await fetch('/api/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: newGame, action: 'create_game' }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.game) {
              newGame = {
                ...newGame,
                ...data.game,
                hostId: userProfile.id || data.game.hostId,
                hostName: userName || data.game.hostName,
                hostAvatar: userAvatar || data.game.hostAvatar,
                inviteCode: finalInviteCode,
              };
              if (!newGame.sessionId && data.session?.id) {
                newGame.sessionId = data.session.id;
                newGame.id = data.session.id;
              }
            }
          }
        } catch {}
      }
      try { store.refreshSessions?.(); } catch {}

      setGames((prev) => {
        const normTitle = newGame.title.trim().toLowerCase();
        const filtered = prev
          .filter((g) => !isMockGame(g))
          .filter(
            (g) =>
              g.id !== newGame.id &&
              (!newGame.sessionId || g.sessionId !== newGame.sessionId) &&
              g.title.trim().toLowerCase() !== normTitle
          );
        return [newGame, ...filtered];
      });

      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sportsync_community_games');
          const list = raw ? JSON.parse(raw) : [];
          const updated = [
            newGame,
            ...list.filter((g: any) => g.id !== newGame.id && (!newGame.sessionId || g.sessionId !== newGame.sessionId)),
          ];
          localStorage.setItem('sportsync_community_games', JSON.stringify(updated));
        } catch {}
      }

      if (typeof window !== 'undefined' && gameData.inviteCode) {
        try {
          const existing = localStorage.getItem('sportsync_unlocked_invites');
          const list = existing ? JSON.parse(existing) : [];
          if (!list.includes(gameData.inviteCode.toUpperCase())) {
            list.push(gameData.inviteCode.toUpperCase());
            localStorage.setItem('sportsync_unlocked_invites', JSON.stringify(list));
          }
        } catch {}
      }

      if (gameData.invitedPlayers && gameData.invitedPlayers.length > 0) {
        addNotification({
          id: `notif_invites_sent_${newGame.id}`,
          type: 'match',
          title: `Invitations Sent (${gameData.invitedPlayers.length})`,
          desc: `Invited ${gameData.invitedPlayers.map((p) => p.name).join(', ')} to your match: ${gameData.title}.`,
          linkScreen: 'social-home',
          recipientId: userProfile.id,
          recipientName: userProfile.name,
          meta: {
            event: 'invitations_sent',
            gameId: newGame.id,
            gameTitle: gameData.title,
          },
        });

        // Notify each invited player individually
        gameData.invitedPlayers.forEach((p) => {
          if (!p.name) return;
          addNotification({
            id: `notif_invite_${newGame.id}_${p.name.replace(/\s+/g, '_')}`,
            type: 'match',
            title: 'Match Invitation',
            desc: `${userProfile.name} invited you to join their game, ${gameData.title}.`,
            linkScreen: 'social-home',
            recipientId: p.id,
            recipientName: p.name,
            meta: {
              event: 'match_invitation',
              gameId: newGame.id,
              gameTitle: gameData.title,
              hostName: userProfile.name,
              hostId: userProfile.id,
            },
          });
        });
      }

      // Award host XP (+100 XP base × 1.5x = +150 XP)
      awardXp(100, 'hosting a new pickup match', { applyStreakMultiplier: true });

      // Unlock Squad Captain badge
      setBadges((prev) =>
        prev.map((b) => (b.id === 'squad_captain' ? { ...b, progress: 1, unlocked: true } : b))
      );

      // Real-time Notification strictly for the creating host
      if (userProfile.id && !userProfile.isGuest && userProfile.name !== 'Guest Player') {
        addNotification({
          id: `notif_hosted_${newGame.id}`,
          type: 'match',
          title: `Match Hosted: ${gameData.title}`,
          desc: `Your ${gameData.sport} game at ${gameData.locationName} is now live and accepting players.`,
          linkScreen: 'social-home',
          recipientId: userProfile.id,
          recipientName: userProfile.name,
          meta: {
            event: 'game_created',
            gameId: newGame.id,
            gameTitle: gameData.title,
            sport: gameData.sport,
            location: gameData.locationName,
          },
        });
      }

      return newGame;
    },
    [userProfile.id, userProfile.name, userProfile.avatarId, awardXp, store]
  );

  // 15. Check if current user is the host of a game
  const isGameHost = useCallback(
    (game?: CommunityGame | null): boolean => {
      if (!game) return false;
      const isGuest = userProfile.isGuest || !userProfile.id || userProfile.name === 'Guest Player';
      if (isGuest && !game.hostId) {
        return game.hostName === userProfile.name;
      }
      if (game.hostId && userProfile.id && game.hostId === userProfile.id) return true;
      if (
        userProfile.name &&
        game.hostName &&
        game.hostName.trim().toLowerCase() === userProfile.name.trim().toLowerCase()
      ) {
        return true;
      }
      if (
        userProfile.username &&
        game.hostName &&
        game.hostName.trim().toLowerCase() === userProfile.username.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    },
    [userProfile.id, userProfile.name, userProfile.username, userProfile.isGuest]
  );

  // 16. Update Hosted Community Game
  const updateCommunityGame = useCallback(
    async (
      gameId: string,
      updates: {
        title?: string;
        sport?: string;
        date?: string;
        time?: string;
        locationName?: string;
        locationDetails?: string;
        skillLevel?: 'Beginner' | 'Casual' | 'Intermediate' | 'Competitive';
        spotsTotal?: number;
        pricePerPlayer?: number;
        notes?: string;
        coordinates?: [number, number];
      }
    ): Promise<{ success: boolean; game?: CommunityGame; error?: string }> => {
      const targetGame = games.find((g) => g.id === gameId);
      if (!targetGame) {
        return { success: false, error: 'Game not found.' };
      }

      if (!isGameHost(targetGame)) {
        return { success: false, error: 'Unauthorized: You can only edit games you created.' };
      }

      const updatedGame: CommunityGame = {
        ...targetGame,
        title: updates.title !== undefined ? updates.title : targetGame.title,
        sport: updates.sport !== undefined ? (updates.sport as any) : targetGame.sport,
        date: updates.date !== undefined ? updates.date : targetGame.date,
        time: updates.time !== undefined ? updates.time : targetGame.time,
        locationName: updates.locationName !== undefined ? updates.locationName : targetGame.locationName,
        locationDetails: updates.locationDetails !== undefined ? updates.locationDetails : targetGame.locationDetails,
        skillLevel: updates.skillLevel !== undefined ? updates.skillLevel : targetGame.skillLevel,
        spotsTotal: updates.spotsTotal !== undefined ? updates.spotsTotal : targetGame.spotsTotal,
        pricePerPlayer: updates.pricePerPlayer !== undefined ? updates.pricePerPlayer : targetGame.pricePerPlayer,
        notes: updates.notes !== undefined ? updates.notes : targetGame.notes,
        coordinates: updates.coordinates !== undefined ? updates.coordinates : targetGame.coordinates,
        distance:
          updates.locationName && updates.locationName.toLowerCase().includes('naga')
            ? 'Naga City • 0.5 km away'
            : targetGame.distance,
      };

      if (updates.spotsTotal !== undefined) {
        updatedGame.format = updates.spotsTotal <= 4 ? '2v2 Doubles' : '5v5';
        if (updatedGame.spotsJoined > updatedGame.spotsTotal) {
          updatedGame.spotsJoined = updatedGame.spotsTotal;
        }
      }

      setGames((prev) => {
        const matchIdx = prev.findIndex((g) => g.id === gameId || (updatedGame.sessionId && g.sessionId === updatedGame.sessionId));
        if (matchIdx >= 0) {
          const next = [...prev];
          next[matchIdx] = updatedGame;
          return next;
        }
        return [updatedGame, ...prev];
      });

      // Save to localStorage immediately
      if (typeof window !== 'undefined') {
        const storedGames = localStorage.getItem('sportsync_community_games');
        if (storedGames) {
          try {
            const parsed = JSON.parse(storedGames);
            if (Array.isArray(parsed)) {
              const nextStored = parsed.map((g: any) => (g.id === gameId ? updatedGame : g));
              localStorage.setItem('sportsync_community_games', JSON.stringify(nextStored));
            }
          } catch {}
        }
      }

      // Sync to database / sessions
      try {
        const idForDb = targetGame.sessionId || gameId;
        await store.updateOpenPlaySession(idForDb, {
          title: updatedGame.title,
          description: updatedGame.notes,
          max_players: updatedGame.spotsTotal,
          fee_cents: updatedGame.pricePerPlayer * 100,
          start_time: updatedGame.time,
        });
      } catch (err) {
        console.warn('[SportSyncBridge] Session update fallback handled:', err);
      }

      if (typeof window !== 'undefined' && updatedGame.inviteCode) {
        try {
          await fetch('/api/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: updatedGame }),
          });
        } catch {}
      }

      // Notify joined players that the host updated the game
      const nonHostMembers = (targetGame.members || []).filter((m) => {
        const isHostMember = Boolean(
          (targetGame.hostId && m.id && m.id === targetGame.hostId) ||
          (targetGame.hostName && m.name && m.name.trim().toLowerCase() === targetGame.hostName.trim().toLowerCase())
        );
        return !isHostMember;
      });

      nonHostMembers.forEach((m) => {
        if (!m.name) return;
        addNotification({
          id: `notif_update_${gameId}_${m.name.replace(/\s+/g, '_')}_${Date.now()}`,
          type: 'match',
          title: 'Game Details Updated',
          desc: `${targetGame.hostName || 'The host'} updated details for ${updatedGame.title}.`,
          linkScreen: 'match-detail',
          recipientId: m.id,
          recipientName: m.name,
          meta: {
            event: 'game_updated',
            gameId: updatedGame.id,
            gameTitle: updatedGame.title,
            hostName: targetGame.hostName,
          },
        });
      });

      return { success: true, game: updatedGame };
    },
    [games, isGameHost, store]
  );

  // 17. Delete Hosted Community Game and clean up related participation / booking records
  // 17. Delete Hosted Community Game and clean up related participation / booking records
  const deleteCommunityGame = useCallback(
    async (gameId: string): Promise<{ success: boolean; error?: string }> => {
      const targetGame = games.find((g) => g.id === gameId || (g.sessionId && g.sessionId === gameId));
      if (!targetGame) {
        return { success: false, error: 'Game not found.' };
      }

      if (!isGameHost(targetGame)) {
        return { success: false, error: 'Unauthorized: You can only delete games you created.' };
      }

      const { ids: deletedIds, titles: deletedTitles } = getDeletedGameTombstones();
      // Prevent duplicate processing if deletion request is repeated
      if (deletedIds.has(targetGame.id) || (targetGame.sessionId && deletedIds.has(targetGame.sessionId))) {
        return { success: true };
      }

      const sessionIdToDelete = targetGame.sessionId || (targetGame.id.startsWith('session_') || targetGame.id.includes('-') ? targetGame.id : undefined);
      const titleToDelete = targetGame.title;
      const normTitle = titleToDelete.trim().toLowerCase();
      const supabase = getSupabaseClient();

      // 1. Retrieve the list of participants BEFORE deleting the game and related records
      const participantsMap = new Map<string, { id?: string; name: string }>();

      // Extract participants from game members (excluding host)
      if (Array.isArray(targetGame.members)) {
        targetGame.members.forEach((m) => {
          if (!m || !m.name) return;
          const isHostMember = Boolean(
            (targetGame.hostName && m.name.trim().toLowerCase() === targetGame.hostName.trim().toLowerCase()) ||
            (targetGame.hostId && m.id && m.id === targetGame.hostId)
          );
          if (!isHostMember) {
            participantsMap.set(m.name.trim().toLowerCase(), { id: m.id, name: m.name });
          }
        });
      }

      // Also retrieve participants from Supabase queues if linked to a database session
      if (supabase && isSupabaseConfigured && sessionIdToDelete) {
        try {
          const { data: queueEntries } = await supabase
            .from('queues')
            .select('id, user_id, partner_names, user:users(id, full_name, nickname)')
            .eq('session_id', sessionIdToDelete);

          if (queueEntries) {
            queueEntries.forEach((qe: any) => {
              const pName = qe.user?.full_name || qe.user?.nickname || qe.partner_names?.[0];
              const pId = qe.user?.id || qe.user_id;
              if (pName) {
                const isHostQueue = Boolean(
                  (targetGame.hostName && pName.trim().toLowerCase() === targetGame.hostName.trim().toLowerCase()) ||
                  (targetGame.hostId && pId && pId === targetGame.hostId)
                );
                if (!isHostQueue) {
                  participantsMap.set(pName.trim().toLowerCase(), { id: pId, name: pName });
                }
              }
            });
          }
        } catch (err) {
          console.warn('[SportSyncBridge] Could not query participants from database before deletion:', err);
        }
      }

      const affectedParticipants = Array.from(participantsMap.values());

      // 2. Prepare individual notifications for each affected player who joined
      const deletionNotifs = affectedParticipants.map((p) => {
        const dedupeKey = `delete_game_${targetGame.id}_${p.name.trim().toLowerCase()}`;
        const desc = `The host has deleted ${titleToDelete}, a game you joined.`;
        return {
          id: `notif_del_${targetGame.id}_${p.name.replace(/\s+/g, '_')}`,
          type: 'match' as const,
          title: 'Game Deleted',
          desc,
          linkScreen: 'social-home',
          recipientName: p.name,
          recipientId: p.id,
          meta: {
            event: 'game_deleted',
            gameId: targetGame.id,
            gameTitle: titleToDelete,
            recipientName: p.name,
            dedupeKey,
          },
        };
      });

      // 3. Ensure the notification is saved in Supabase BEFORE the game and its related records are deleted
      if (supabase && isSupabaseConfigured && deletionNotifs.length > 0) {
        try {
          await supabase.from('notifications').insert(
            deletionNotifs.map((n) => ({
              user_id: n.recipientId && n.recipientId.length === 36 ? n.recipientId : null,
              user_identifier: n.recipientName,
              type: n.type,
              title: n.title,
              description: n.desc,
              link_screen: n.linkScreen,
              metadata: n.meta,
            }))
          );
        } catch (e) {
          console.warn('[SportSyncBridge] Supabase notification batch insert before deletion notice:', e);
        }
      }

      // 4. Deliver notifications immediately to client notification system
      deletionNotifs.forEach((n) => addNotification(n));

      // 5. Mark in permanent tombstone storage (both ID and title) to prevent reappearance
      markGameDeleted(targetGame.id, titleToDelete, targetGame.sessionId);
      if (sessionIdToDelete) {
        markSessionDeleted(sessionIdToDelete, titleToDelete);
      } else {
        markSessionDeleted(targetGame.id, titleToDelete);
      }

      // 6. Remove the deleted game from affected players' joined games and dashboards
      setGames((prev) =>
        prev.filter((g) => {
          if (g.id === targetGame.id) return false;
          if (targetGame.sessionId && (g.id === targetGame.sessionId || g.sessionId === targetGame.sessionId)) return false;
          if (g.title.trim().toLowerCase() === normTitle) return false;
          return true;
        })
      );

      // 7. Remove from localStorage sportsync_community_games and participation / bookings
      if (typeof window !== 'undefined') {
        const storedGames = localStorage.getItem('sportsync_community_games');
        if (storedGames) {
          try {
            const parsed = JSON.parse(storedGames);
            if (Array.isArray(parsed)) {
              const nextStored = parsed.filter((g: any) => {
                if (g.id === targetGame.id) return false;
                if (targetGame.sessionId && (g.id === targetGame.sessionId || g.sessionId === targetGame.sessionId)) return false;
                if (g.title && g.title.trim().toLowerCase() === normTitle) return false;
                return true;
              });
              localStorage.setItem('sportsync_community_games', JSON.stringify(nextStored));
            }
          } catch {}
        }

        try {
          const rawJoined = localStorage.getItem('sportsync_joined_games');
          if (rawJoined) {
            const list = JSON.parse(rawJoined);
            if (Array.isArray(list)) {
              localStorage.setItem(
                'sportsync_joined_games',
                JSON.stringify(list.filter((id) => id !== targetGame.id && id !== targetGame.sessionId && id !== targetGame.inviteCode?.toUpperCase()))
              );
            }
          }
        } catch {}

        const storedBookings = localStorage.getItem('sportsync_my_bookings');
        if (storedBookings) {
          try {
            const parsedBookings = JSON.parse(storedBookings);
            if (Array.isArray(parsedBookings)) {
              const nextBookings = parsedBookings.filter((b: any) => {
                if (b.gameId === targetGame.id || b.sessionId === targetGame.id) return false;
                if (targetGame.sessionId && (b.gameId === targetGame.sessionId || b.sessionId === targetGame.sessionId)) return false;
                if (b.venue?.name === targetGame.locationName && b.date === targetGame.date) return false;
                return true;
              });
              localStorage.setItem('sportsync_my_bookings', JSON.stringify(nextBookings));
              setBookings(nextBookings);
            }
          } catch {}
        }

        try {
          window.dispatchEvent(
            new CustomEvent('sportsync:game-deleted', {
              detail: {
                gameId: targetGame.id,
                sessionId: targetGame.sessionId,
                title: titleToDelete,
              },
            })
          );
        } catch {}
      }

      try {
        await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_game',
            gameId: targetGame.id,
            sessionId: targetGame.sessionId,
            inviteCode: targetGame.inviteCode,
          }),
        });
      } catch {}

      // 8. Clean up database records and store sessions permanently
      try {
        const idForDb = sessionIdToDelete || targetGame.id;
        await store.deleteOpenPlaySession(idForDb, titleToDelete);
      } catch (err) {
        console.warn('[SportSyncBridge] Session deletion fallback handled:', err);
      }

      return { success: true };
    },
    [games, isGameHost, store]
  );

  // 18. Join Community Game with host notification and Supabase persistence
  const joinCommunityGame = useCallback(
    async (gameId: string, preloadedGame?: CommunityGame): Promise<{
      success: boolean;
      game?: CommunityGame;
      xpResult?: any;
      alreadyParticipant?: boolean;
      message?: string;
      error?: string;
    }> => {
      const targetGame = games.find((g) => g.id === gameId) || preloadedGame;
      if (!targetGame) {
        return { success: false, message: 'Game not found.' };
      }

      const userName = userProfile.name || 'Player';

      if (targetGame.visibility === 'Invite' || !targetGame.isPublic) {
        const isHost = Boolean(
          (targetGame.hostName && userName && targetGame.hostName.trim().toLowerCase() === userName.trim().toLowerCase()) ||
          (targetGame.hostId && userProfile.id && targetGame.hostId === userProfile.id)
        );
        const isDirectlyInvited = Boolean(
          targetGame.invitedPlayers?.some(
            (ip) =>
              (ip.name && userName && ip.name.trim().toLowerCase() === userName.trim().toLowerCase()) ||
              (ip.id && userProfile.id && ip.id === userProfile.id)
          )
        );
        let hasUnlockedToken = false;
        if (typeof window !== 'undefined' && targetGame.inviteCode) {
          try {
            const raw = localStorage.getItem('sportsync_unlocked_invites');
            const unlockedList: string[] = raw ? JSON.parse(raw) : [];
            hasUnlockedToken =
              unlockedList.includes(targetGame.inviteCode.toUpperCase()) ||
              unlockedList.includes(targetGame.id);
          } catch {}
        }

        if (!isHost && !isDirectlyInvited && !hasUnlockedToken) {
          return {
            success: false,
            message: 'This is an invite-only game. You can only join if the host has invited you.',
          };
        }
      }

      // 1. Check if user is already a participant
      const isAlreadyParticipant = targetGame.members.some(
        (m) =>
          (userName && m.name.trim().toLowerCase() === userName.trim().toLowerCase()) ||
          (userProfile.id && m.id && m.id === userProfile.id)
      );

      if (isAlreadyParticipant) {
        // Do not notify the host if the player is already a participant
        return {
          success: false,
          alreadyParticipant: true,
          message: 'You have already joined this match roster.',
        };
      }

      // 2. Check if roster is full
      if (targetGame.spotsJoined >= targetGame.spotsTotal) {
        return {
          success: false,
          message: 'This game roster is already full.',
        };
      }

      // 3. Save the join operation in Supabase before generating host notification
      const supabase = getSupabaseClient();
      const isUuid = (val?: string) =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      let sessionIdForDb: string | undefined = undefined;
      if (targetGame.sessionId && isUuid(targetGame.sessionId)) {
        sessionIdForDb = targetGame.sessionId;
      } else if (isUuid(targetGame.id)) {
        sessionIdForDb = targetGame.id;
      }

      if (supabase && isSupabaseConfigured && !sessionIdForDb) {
        try {
          const { data: dbSession } = await supabase
            .from('sessions')
            .select('id')
            .ilike('title', targetGame.title.trim())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (dbSession?.id && isUuid(dbSession.id)) {
            sessionIdForDb = dbSession.id;
          }
        } catch {}
      }

      if (supabase && isSupabaseConfigured && sessionIdForDb) {
        try {
          let userDbId = userProfile.id;
          if (!userDbId || userDbId === 'usr_auth' || userDbId.startsWith('usr_')) {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user?.id) {
              const { data: pubUser } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', authData.user.id)
                .maybeSingle();
              if (pubUser?.id) userDbId = pubUser.id;
            }
          }

          if (!userDbId || userDbId.startsWith('usr_')) {
            const { data: anyUser } = await supabase
              .from('users')
              .select('id')
              .limit(1)
              .maybeSingle();
            if (anyUser?.id) userDbId = anyUser.id;
          }

          if (userDbId && isUuid(userDbId)) {
            const nextSpots = targetGame.spotsJoined + 1;
            const nowIso = new Date().toISOString();
            let joinRecorded = false;
            let alreadyJoined = false;

            // 1. Try session_participants table with required columns (session_id, user_id, status, joined_at)
            try {
              const { error: partErr } = await supabase
                .from('session_participants')
                .insert({
                  session_id: sessionIdForDb,
                  user_id: userDbId,
                  status: 'joined',
                  joined_at: nowIso,
                });

              if (!partErr) {
                joinRecorded = true;
              } else if (
                partErr.code === '23505' ||
                partErr.message?.toLowerCase().includes('duplicate') ||
                partErr.message?.toLowerCase().includes('unique')
              ) {
                alreadyJoined = true;
                joinRecorded = true;
              }
            } catch {}

            // 2. Try game_rosters table with required columns (session_id, user_id, status, joined_at)
            if (!joinRecorded) {
              try {
                const { error: rosterErr } = await supabase
                  .from('game_rosters')
                  .insert({
                    session_id: sessionIdForDb,
                    user_id: userDbId,
                    status: 'joined',
                    joined_at: nowIso,
                  });

                if (!rosterErr) {
                  joinRecorded = true;
                } else if (
                  rosterErr.code === '23505' ||
                  rosterErr.message?.toLowerCase().includes('duplicate') ||
                  rosterErr.message?.toLowerCase().includes('unique')
                ) {
                  alreadyJoined = true;
                  joinRecorded = true;
                }
              } catch {}
            }

            // 3. Try queues table
            if (!joinRecorded) {
              try {
                const { error: queueErr } = await supabase.from('queues').insert({
                  session_id: sessionIdForDb,
                  user_id: userDbId,
                  queue_number: nextSpots,
                  group_size: 1,
                  match_format: 'doubles',
                  status: 'waiting',
                  partner_names: [userName],
                  joined_at: nowIso,
                });

                if (!queueErr) {
                  joinRecorded = true;
                } else if (
                  queueErr.code === '23505' ||
                  queueErr.message?.toLowerCase().includes('duplicate') ||
                  queueErr.message?.toLowerCase().includes('unique') ||
                  queueErr.message?.toLowerCase().includes('already exists')
                ) {
                  alreadyJoined = true;
                  joinRecorded = true;
                } else {
                  console.warn('[SportSyncBridge] Queue write info:', queueErr.message);
                }
              } catch (qEx: any) {
                console.warn('[SportSyncBridge] Queue write exception:', qEx);
              }
            }

            if (alreadyJoined) {
              return {
                success: false,
                alreadyParticipant: true,
                message: 'You have already joined this match roster.',
              };
            }

            // Update current players count in session
            try {
              await supabase
                .from('sessions')
                .update({ current_players_count: nextSpots, updated_at: nowIso })
                .eq('id', sessionIdForDb);
            } catch {}
          }
        } catch (dbErr: any) {
          console.warn('[SportSyncBridge] Join operation note:', dbErr?.message);
        }
      }

      // 4. Update local game state
      const userAvatar = (userProfile.avatarId || 'alex') as AvatarId;
      const alreadyHasMember = targetGame.members.some(
        (m) =>
          (userName && m.name.trim().toLowerCase() === userName.trim().toLowerCase()) ||
          (userProfile.id && m.id && m.id === userProfile.id)
      );
      const nextMembers = alreadyHasMember
        ? targetGame.members
        : [...targetGame.members, { name: userName, avatar: userAvatar, id: userProfile.id }];

      const updatedGame: CommunityGame = {
        ...targetGame,
        spotsJoined: Math.min(targetGame.spotsTotal, Math.max(nextMembers.length, targetGame.spotsJoined + (alreadyHasMember ? 0 : 1))),
        members: nextMembers,
      };

      setGames((prev) => {
        const matchIdx = prev.findIndex(
          (g) => g.id === gameId || (updatedGame.sessionId && g.sessionId === updatedGame.sessionId) || (updatedGame.inviteCode && g.inviteCode && g.inviteCode.toUpperCase() === updatedGame.inviteCode.toUpperCase())
        );
        if (matchIdx >= 0) {
          const next = [...prev];
          next[matchIdx] = {
            ...next[matchIdx],
            ...updatedGame,
            members: nextMembers,
            spotsJoined: Math.min(targetGame.spotsTotal, Math.max(nextMembers.length, next[matchIdx].spotsJoined + (alreadyHasMember ? 0 : 1))),
          };
          return next;
        }
        return [updatedGame, ...prev];
      });

      if (typeof window !== 'undefined') {
        try {
          const storedGames = localStorage.getItem('sportsync_community_games');
          if (storedGames) {
            const parsed = JSON.parse(storedGames);
            if (Array.isArray(parsed)) {
              const nextStored = parsed.map((g: any) => (g.id === gameId ? updatedGame : g));
              localStorage.setItem('sportsync_community_games', JSON.stringify(nextStored));
            }
          }
        } catch {}
      }

      if (typeof window !== 'undefined') {
        try {
          const apiRes = await fetch('/api/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'accept',
              game: updatedGame,
              inviteCode: targetGame.inviteCode,
              participant: {
                id: userProfile.id,
                name: userName,
                avatar: userAvatar,
                email: (userProfile as any).email,
              },
            }),
          });
          const apiData = await apiRes.json();
          if (!apiRes.ok || !apiData.success) {
            return {
              success: false,
              error: apiData.error || 'Failed to accept invitation.',
              message: apiData.error || 'Failed to accept invitation.',
            };
          }
        } catch (e: any) {
          console.warn('[SportSyncBridge] API invitation acceptance call warning:', e);
        }

        try {
          const raw = localStorage.getItem('sportsync_joined_games');
          const list: string[] = raw ? JSON.parse(raw) : [];
          if (!list.includes(targetGame.id)) list.push(targetGame.id);
          if (targetGame.sessionId && !list.includes(targetGame.sessionId)) list.push(targetGame.sessionId);
          if (targetGame.inviteCode && !list.includes(targetGame.inviteCode.toUpperCase())) list.push(targetGame.inviteCode.toUpperCase());
          localStorage.setItem('sportsync_joined_games', JSON.stringify(list));
        } catch {}

        try {
          window.dispatchEvent(new CustomEvent('sportsync:roster-updated', { detail: { game: updatedGame } }));
        } catch {}
      }

      // 5. Notify the Host When a Player Joins Their Game
      // Example notification: "John Doe joined your game, Basketball Match."
      const hostName = targetGame.hostName;
      const hostId = targetGame.hostId;
      const gameTitle = targetGame.title;

      const isHostSelf = Boolean(
        (hostName && userName && hostName.trim().toLowerCase() === userName.trim().toLowerCase()) ||
        (hostId && userProfile.id && hostId === userProfile.id)
      );

      if (!isHostSelf) {
        const dedupeKey = `join_${targetGame.id}_${userName.trim().toLowerCase()}`;
        const hostNotifDesc = `${userName} joined your game, ${gameTitle}.`;

        addNotification({
          id: `notif_join_${targetGame.id}_${userName.replace(/\s+/g, '_')}`,
          type: 'match',
          title: 'Player Joined Your Game',
          desc: hostNotifDesc,
          linkScreen: 'social-home',
          recipientName: hostName,
          recipientId: hostId,
          meta: {
            event: 'player_joined',
            gameId: targetGame.id,
            gameTitle,
            joiningPlayerName: userName,
            hostName,
            hostId,
            dedupeKey,
          },
        });

        // Also persist host notification to Supabase if configured
        if (supabase && isSupabaseConfigured) {
          try {
            await supabase.from('notifications').insert({
              user_id: hostId && hostId.length === 36 ? hostId : null,
              user_identifier: hostName,
              type: 'match',
              title: 'Player Joined Your Game',
              description: hostNotifDesc,
              link_screen: 'social-home',
              metadata: {
                event: 'player_joined',
                game_id: targetGame.id,
                game_title: gameTitle,
                joining_player_name: userName,
              },
            });
          } catch (e) {
            console.warn('[SportSyncBridge] Supabase notification insert notice:', e);
          }
        }
      }

      // 6. Notify the joining player
      addNotification({
        id: `notif_joined_${targetGame.id}_${userProfile.id || userName.replace(/\s+/g, '_')}`,
        type: 'match',
        title: 'Match Roster Confirmed',
        desc: `You joined "${gameTitle}". Spot reserved!`,
        linkScreen: 'match-detail',
        recipientId: userProfile.id,
        recipientName: userName,
        meta: {
          event: 'match_joined',
          gameId: targetGame.id,
          gameTitle,
        },
      });

      const xpResult = awardXp(30, 'joining a game roster', { applyStreakMultiplier: true });

      return {
        success: true,
        game: updatedGame,
        xpResult,
      };
    },
    [games, userProfile.name, userProfile.id, userProfile.avatarId, awardXp]
  );

  const addExternalGame = useCallback((game: CommunityGame) => {
    if (!game || !game.id) return;
    setGames((prev) => {
      const idx = prev.findIndex(
        (g) => g.id === game.id || (game.inviteCode && g.inviteCode === game.inviteCode)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...game };
        return copy;
      }
      return [game, ...prev];
    });
  }, []);

  const acceptGameInvitation = useCallback(
    async (inviteCode: string): Promise<{ success: boolean; game?: CommunityGame; message?: string }> => {
      const cleanCode = inviteCode.trim().toUpperCase();
      let targetGame = games.find(
        (g) => (g.inviteCode && g.inviteCode.toUpperCase() === cleanCode) || g.id === cleanCode
      );

      if (!targetGame && typeof window !== 'undefined') {
        try {
          const res = await fetch(`/api/invitations?code=${encodeURIComponent(cleanCode)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.game) {
              targetGame = data.game;
              addExternalGame(data.game);
            }
          }
        } catch {}
      }

      if (!targetGame) {
        return { success: false, message: 'Invitation not found.' };
      }

      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sportsync_unlocked_invites');
          const list: string[] = raw ? JSON.parse(raw) : [];
          if (!list.includes(cleanCode)) list.push(cleanCode);
          if (targetGame.inviteCode && !list.includes(targetGame.inviteCode.toUpperCase())) {
            list.push(targetGame.inviteCode.toUpperCase());
          }
          if (!list.includes(targetGame.id)) list.push(targetGame.id);
          localStorage.setItem('sportsync_unlocked_invites', JSON.stringify(list));
        } catch {}
      }

      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sportsync_joined_games');
          const list: string[] = raw ? JSON.parse(raw) : [];
          if (!list.includes(targetGame.id)) list.push(targetGame.id);
          if (targetGame.sessionId && !list.includes(targetGame.sessionId)) list.push(targetGame.sessionId);
          if (cleanCode && !list.includes(cleanCode)) list.push(cleanCode);
          if (targetGame.inviteCode && !list.includes(targetGame.inviteCode.toUpperCase())) list.push(targetGame.inviteCode.toUpperCase());
          localStorage.setItem('sportsync_joined_games', JSON.stringify(list));
        } catch {}
      }

      const joinResult = await joinCommunityGame(targetGame.id, targetGame);

      if (joinResult.success && joinResult.game) {
        try { store.refreshSessions?.(); } catch {}
        return {
          success: true,
          game: joinResult.game,
          message: 'Invitation accepted! You have joined the match roster.',
        };
      }

      if (joinResult.alreadyParticipant) {
        return {
          success: true,
          game: targetGame,
          message: 'You have already accepted this invitation.',
        };
      }

      return {
        success: false,
        message: joinResult.message || 'Failed to accept invitation.',
      };
    },
    [games, joinCommunityGame, addExternalGame]
  );

  const declineGameInvitation = useCallback(
    (inviteCode: string): void => {
      const cleanCode = inviteCode.trim().toUpperCase();
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sportsync_unlocked_invites');
          const list: string[] = raw ? JSON.parse(raw) : [];
          const next = list.filter((c) => c !== cleanCode);
          localStorage.setItem('sportsync_unlocked_invites', JSON.stringify(next));
        } catch {}
      }
    },
    []
  );

  const removeParticipantFromGame = useCallback(
    async (
      gameId: string,
      participant: { id?: string; name: string }
    ): Promise<{ success: boolean; game?: CommunityGame; error?: string }> => {
      const targetGame = games.find((g) => g.id === gameId);
      if (!targetGame) {
        return { success: false, error: 'Game not found.' };
      }

      if (!isGameHost(targetGame)) {
        return { success: false, error: 'Unauthorized: Only the host can remove players.' };
      }

      const isHostSelf = Boolean(
        (participant.id && targetGame.hostId && participant.id === targetGame.hostId) ||
        (participant.name && targetGame.hostName && participant.name.trim().toLowerCase() === targetGame.hostName.trim().toLowerCase())
      );
      if (isHostSelf) {
        return { success: false, error: 'Cannot remove the host organizer.' };
      }

      try {
        const res = await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'remove_participant',
            game: targetGame,
            participantId: participant.id,
            participantName: participant.name,
            hostId: userProfile.id,
            hostName: userProfile.name,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to remove player from database.' };
        }

        const updatedGame: CommunityGame = data.game || {
          ...targetGame,
          spotsJoined: Math.max(1, targetGame.spotsJoined - 1),
          members: targetGame.members.filter(
            (m) => (participant.id ? m.id !== participant.id : m.name.trim().toLowerCase() !== participant.name.trim().toLowerCase())
          ),
        };

        setGames((prev) => prev.map((g) => (g.id === gameId ? updatedGame : g)));

        if (typeof window !== 'undefined') {
          try {
            const storedGames = localStorage.getItem('sportsync_community_games');
            if (storedGames) {
              const parsed = JSON.parse(storedGames);
              if (Array.isArray(parsed)) {
                const nextStored = parsed.map((g: any) => (g.id === gameId ? updatedGame : g));
                localStorage.setItem('sportsync_community_games', JSON.stringify(nextStored));
              }
            }
          } catch {}

          try {
            window.dispatchEvent(new CustomEvent('sportsync:roster-updated', { detail: { game: updatedGame } }));
          } catch {}
        }

        return { success: true, game: updatedGame };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to remove player.' };
      }
    },
    [games, isGameHost, userProfile.id, userProfile.name]
  );

  const toggleHostParticipation = useCallback(
    async (
      gameId: string,
      participate: boolean
    ): Promise<{ success: boolean; game?: CommunityGame; error?: string }> => {
      const targetGame = games.find((g) => g.id === gameId);
      if (!targetGame) {
        return { success: false, error: 'Game not found.' };
      }

      if (!isGameHost(targetGame)) {
        return { success: false, error: 'Unauthorized: Only the host can toggle participation.' };
      }

      try {
        const res = await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle_host_participation',
            game: targetGame,
            hostId: userProfile.id,
            hostName: userProfile.name,
            hostAvatar: userProfile.avatarId || 'alex',
            participate,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to update participation.' };
        }

        const updatedGame: CommunityGame = data.game || {
          ...targetGame,
          spotsJoined: participate
            ? Math.min(targetGame.spotsTotal, targetGame.spotsJoined + 1)
            : Math.max(0, targetGame.spotsJoined - 1),
          members: participate
            ? [
                { id: userProfile.id, name: userProfile.name, avatar: (userProfile.avatarId || 'alex') as any },
                ...targetGame.members.filter((m) => m.id !== userProfile.id && m.name.trim().toLowerCase() !== userProfile.name.trim().toLowerCase()),
              ]
            : targetGame.members.filter((m) => m.id !== userProfile.id && m.name.trim().toLowerCase() !== userProfile.name.trim().toLowerCase()),
        };

        setGames((prev) => prev.map((g) => (g.id === gameId ? updatedGame : g)));

        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('sportsync_joined_games');
            let list: string[] = raw ? JSON.parse(raw) : [];
            if (participate) {
              if (!list.includes(targetGame.id)) list.push(targetGame.id);
              if (targetGame.sessionId && !list.includes(targetGame.sessionId)) list.push(targetGame.sessionId);
            } else {
              list = list.filter((id) => id !== targetGame.id && id !== targetGame.sessionId);
            }
            localStorage.setItem('sportsync_joined_games', JSON.stringify(list));
          } catch {}

          try {
            const storedGames = localStorage.getItem('sportsync_community_games');
            if (storedGames) {
              const parsed = JSON.parse(storedGames);
              if (Array.isArray(parsed)) {
                const nextStored = parsed.map((g: any) => (g.id === gameId ? updatedGame : g));
                localStorage.setItem('sportsync_community_games', JSON.stringify(nextStored));
              }
            }
          } catch {}

          try {
            window.dispatchEvent(new CustomEvent('sportsync:roster-updated', { detail: { game: updatedGame } }));
          } catch {}
        }

        return { success: true, game: updatedGame };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to toggle participation.' };
      }
    },
    [games, isGameHost, userProfile.id, userProfile.name, userProfile.avatarId]
  );

  // 19. Leave Community Game
  const leaveCommunityGame = useCallback(
    (gameId: string) => {
      let updatedGame: CommunityGame | null = null;

      setGames((prev) =>
        prev.map((g) => {
          if (g.id === gameId) {
            const isMember = g.members.some((m) => m.name === userProfile.name);
            if (!isMember) return g;
            updatedGame = {
              ...g,
              spotsJoined: Math.max(1, g.spotsJoined - 1),
              members: g.members.filter((m) => m.name !== userProfile.name),
            };
            return updatedGame;
          }
          return g;
        })
      );

      if (updatedGame) {
        const leftGame = updatedGame as CommunityGame;
        addNotification({
          id: `notif_left_${gameId}_${userProfile.id || userProfile.name.replace(/\s+/g, '_')}`,
          type: 'match',
          title: 'Left Match Roster',
          desc: `You have left ${leftGame.title || 'the game'}. Your spot was reopened for other players.`,
          linkScreen: 'social-home',
          recipientId: userProfile.id,
          recipientName: userProfile.name,
          meta: {
            event: 'left_match',
            gameId,
          },
        });

        // Also notify the host that a player left
        if (leftGame.hostName && leftGame.hostName !== userProfile.name) {
          addNotification({
            id: `notif_member_left_${gameId}_${userProfile.name.replace(/\s+/g, '_')}`,
            type: 'match',
            title: 'Player Left Game Lineup',
            desc: `${userProfile.name} left your game, ${leftGame.title}. Their spot is now open.`,
            linkScreen: 'social-home',
            recipientId: leftGame.hostId,
            recipientName: leftGame.hostName,
            meta: {
              event: 'member_left',
              gameId,
              leavingPlayerName: userProfile.name,
            },
          });
        }
      }

      return {
        game: updatedGame,
        message: 'Successfully left game roster.',
      };
    },
    [userProfile.name, userProfile.id]
  );

  // 17. Reserve Court / Venue Booking
  const createReservation = useCallback(
    (details: {
      venue: Venue;
      court: string;
      date: string;
      slot: string;
      price: number;
      bookingReference?: string;
    }) => {
      const bookingId = details.bookingReference || `BK-${Math.floor(10000 + Math.random() * 90000)}`;
      const newBooking: SportSyncBookingItem = {
        id: bookingId,
        venue: details.venue,
        court: details.court,
        date: details.date,
        time: details.slot,
        price: details.price,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      setBookings((prev) => [newBooking, ...prev]);

      // Real-time notification for court reservation
      addNotification({
        id: `notif_bk_${bookingId}`,
        type: 'booking',
        title: 'Court Booking Confirmed',
        desc: `${details.venue.name}: ${details.court} reserved for ${details.date} at ${details.slot}.`,
        linkScreen: 'my-bookings',
        recipientId: userProfile.id,
        recipientName: userProfile.name,
        meta: {
          event: 'court_reserved',
          bookingId,
          venueName: details.venue.name,
          court: details.court,
          date: details.date,
          slot: details.slot,
        },
      });

      // Award XP (+60 XP base × 1.5x = +90 XP)
      awardXp(60, 'reserving a verified court', { applyStreakMultiplier: true });

      try {
        const venueObj = store.venues.find((v) => v.id === details.venue.id) || details.venue;
        store.createBooking({
          id: bookingId,
          booking_reference: bookingId,
          user_id: store.currentUser.id || 'sportsync_player',
          user: {
            id: store.currentUser.id || 'sportsync_player',
            full_name: store.currentUser.full_name || userProfile.name,
            email: store.currentUser.email || '',
          } as any,
          venue_id: details.venue.id,
          court_id: `${details.venue.id}_c1`,
          sport: (details.venue as any)?.sport || 'pickleball',
          booking_date: '2026-10-17',
          start_time: details.slot.split('–')[0]?.trim() || details.slot.split('-')[0]?.trim() || '10:00',
          end_time: details.slot.split('–')[1]?.trim() || details.slot.split('-')[1]?.trim() || '11:30',
          duration_minutes: 90,
          court_rate_cents: details.price * 100,
          booking_amount_cents: details.price * 100,
          platform_fee_cents: 0,
          total_amount_cents: details.price * 100,
          status: 'confirmed',
          payment_status: 'approved',
          created_at: new Date().toISOString(),
          venue: venueObj as any,
          court: {
            id: `${details.venue.id}_c1`,
            name: details.court,
          } as any,
        });
      } catch (err) {
        console.warn('[SportSyncBridge] Global store createBooking warning handled:', err);
      }

      return newBooking;
    },
    [awardXp, store, userProfile.id, userProfile.name]
  );

  const cancelReservation = useCallback((bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    );
    addNotification({
      id: `notif_cancel_${bookingId}`,
      type: 'booking',
      title: 'Booking Cancelled',
      desc: 'Your court reservation was cancelled. Full refund issued.',
      linkScreen: 'my-bookings',
      recipientId: userProfile.id,
      recipientName: userProfile.name,
      meta: {
        event: 'booking_cancelled',
        bookingId,
      },
    });
  }, [userProfile.id, userProfile.name]);

  // 18. Complete Onboarding
  const completeOnboarding = useCallback(
    async (prefs: {
      fullName: string;
      preferredSports: string[];
      skillLevel: string;
      preferredArea?: string;
      availability?: string;
      avatarUrl?: string;
    }) => {
      const cleanCity = prefs.preferredArea
        ? prefs.preferredArea.replace(/\s*\(Pilot Area\)/i, '').trim()
        : 'Naga City';
      const formattedSports = prefs.preferredSports.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
      const cleanSkill = formatSkillTier(prefs.skillLevel);
      const cleanAvailability = prefs.availability || 'Weekday Evenings & Weekends';

      setUserProfile((prev: any) => ({
        ...prev,
        name: prefs.fullName || prev.name,
        city: cleanCity,
        primarySport: (prefs.preferredSports[0] || 'football').toLowerCase(),
        preferredSports: formattedSports,
        skillLevel: cleanSkill,
        availability: cleanAvailability,
        onboardingCompleted: true,
        isGuest: false,
      }));

      const mappedSports: DbSportType[] = prefs.preferredSports.map((s) => {
        const norm = s.toLowerCase();
        if (norm.includes('foot') || norm.includes('soccer')) return 'football';
        if (norm.includes('basket')) return 'basketball';
        if (norm.includes('badminton')) return 'badminton';
        if (norm.includes('volley')) return 'volleyball';
        if (norm.includes('tennis') && !norm.includes('table')) return 'tennis';
        if (norm.includes('table')) return 'table_tennis';
        if (norm.includes('padel')) return 'padel';
        if (norm.includes('billiards') || norm.includes('pool')) return 'billiards';
        if (norm.includes('darts')) return 'darts';
        if (norm.includes('pickle')) return 'pickleball';
        return 'football';
      });

      const primarySport: DbSportType = mappedSports[0] || 'football';
      const skillLevelMap: Record<string, SkillLevel> = {
        beginner: 'beginner',
        casual: 'intermediate',
        intermediate: 'intermediate',
        competitive: 'advanced',
        advanced: 'advanced',
      };
      const mappedSkill: SkillLevel = skillLevelMap[cleanSkill.toLowerCase()] || 'beginner';

      try {
        await updatePlayerProfile({
          fullName: prefs.fullName,
          nickname: prefs.fullName.split(' ')[0],
          avatarUrl: prefs.avatarUrl,
          primarySport,
          preferredSports: mappedSports,
          preferredFormat: 'doubles',
          skillLevel: mappedSkill,
          city: prefs.preferredArea || 'Naga City',
        });
      } catch (err) {
        console.warn('Profile update warning:', err);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('sportsync_user_skill', cleanSkill.toLowerCase());
        localStorage.setItem('sportsync_user_availability', cleanAvailability);
        localStorage.setItem('sportsync_onboarding_completed', 'true');
        localStorage.setItem('matchi_onboarding_completed', 'true');
      }

      try {
        await store.completePlayerOnboarding({
          fullName: prefs.fullName,
          nickname: prefs.fullName.split(' ')[0],
          preferredSports: mappedSports,
          skillLevel: mappedSkill,
          city: prefs.preferredArea || 'Naga City',
          preferredFormat: 'doubles',
          availability: cleanAvailability,
        });
      } catch (e) {
        console.warn('Store completePlayerOnboarding error:', e);
      }

      awardXp(150, 'completing profile onboarding', { applyStreakMultiplier: true });
    },
    [awardXp, store]
  );

  return {
    store,
    userProfile,
    games: filterActiveGames(games, store.sessions),
    matches,
    setMatches,
    bookings,
    venues,
    courts: venues.flatMap((v) => v.courts || []),
    matchPolls,
    wagers,
    badges,
    leaderboardPlayers,
    celebrationState,
    closeCelebration,
    toggleFavoriteVenue,
    createCommunityGame,
    updateCommunityGame,
    deleteCommunityGame,
    isGameHost,
    joinCommunityGame,
    removeParticipantFromGame,
    toggleHostParticipation,
    leaveCommunityGame,
    addExternalGame,
    acceptGameInvitation,
    declineGameInvitation,
    syncSessionRoster,
    createReservation,
    cancelReservation,
    completeOnboarding,
    setAsGuest: () => {
      setUserProfile((prev: SportSyncUserProfile & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number; city?: string }) => ({
        ...prev,
        name: 'Guest Player',
        username: '@guest',
        isGuest: true,
      }));
    },
    awardXp,
    placePredictionWager,
    resolveMatchPoll,
    claimBadge,
    logout: async () => {
      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConfigured) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('Sign out error:', err);
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sportsync_user_profile');
        localStorage.removeItem('sportsync_user_role');
        localStorage.removeItem('sportsync_user_email');
        localStorage.removeItem('sportsync_onboarding_completed');
        localStorage.removeItem('matchi_onboarding_completed');
      }
      resetNotificationCache();
      setUserProfile({
        ...INITIAL_USER_PROFILE,
        name: 'Guest Player',
        username: '@guest',
        isGuest: true,
        level: 1,
        xp: 0,
        matchesTotal: 0,
        wins: 0,
      });
    },
  };
}

// Backward-compatible hook alias
export const useSidelineBridge = useSportSyncBridge;
