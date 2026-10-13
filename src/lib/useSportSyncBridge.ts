'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMatchiStore } from './store';
import {
  COMMUNITY_GAMES as DEFAULT_GAMES,
  VENUES as DEFAULT_VENUES,
  CURRENT_USER as DEFAULT_USER,
  MATCHES,
} from '../mock/mockData';
import {
  CommunityGame,
  Venue,
  Match,
  UserPredictionWager,
  BadgeItem,
  AvatarId,
  SportType,
} from '../mock/types';
import { SportType as DbSportType, SkillLevel, MatchFormat } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { updatePlayerProfile } from './services/auth';

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

export function useSportSyncBridge() {
  const store = useMatchiStore();

  // 1. Dynamic user profile with XP and Gamification
  const [userProfile, setUserProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sportsync_user_profile') || localStorage.getItem('sideline_user_profile');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore parsing error
        }
      }
    }
    const isAuthenticated = Boolean(store.currentUser.id && store.currentUser.email);
    return {
      ...DEFAULT_USER,
      name: isAuthenticated ? (store.currentUser.full_name || 'Player') : 'Guest',
      username: isAuthenticated ? (store.currentUser.nickname ? `@${store.currentUser.nickname.toLowerCase()}` : '@player') : '@guest',
      streakWeeks: store.currentUser.win_streak || 0,
      streakMultiplier: 1.0,
      predictionsCount: 0,
      predictionsWon: 0,
      matchesTotal: store.currentUser.matches_played || 0,
      wins: store.currentUser.matches_won || 0,
      isGuest: !isAuthenticated,
    };
  });

  // Persist userProfile to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_user_profile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  // Sync profile name when store user updates
  useEffect(() => {
    if (store.currentUser.full_name || store.currentUser.nickname) {
      setUserProfile((prev: typeof DEFAULT_USER & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number }) => ({
        ...prev,
        name: store.currentUser.full_name || prev.name,
        username: store.currentUser.nickname ? `@${store.currentUser.nickname.toLowerCase()}` : prev.username,
      }));
    }
  }, [store.currentUser.full_name, store.currentUser.nickname]);

  // 2. Dynamic Community Pickup Games
  const [games, setGames] = useState<CommunityGame[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sportsync_community_games') || localStorage.getItem('sideline_community_games');
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
      localStorage.setItem('sportsync_community_games', JSON.stringify(games));
    }
  }, [games]);

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

    const sourceVenues = store.venues && store.venues.length > 0 ? store.venues : [];

    const adaptedDbVenues: Venue[] = sourceVenues.map((dbV) => {
      const primaryCourt = dbV.courts?.[0];
      const primarySport = mapDbSportToUi(dbV.featured_sports?.[0] || primaryCourt?.sport);
      const calculatedPrice = primaryCourt?.hourly_rate_cents
        ? Math.round(primaryCourt.hourly_rate_cents / 100)
        : 450;
      const opHoursStr =
        dbV.operating_hours && typeof dbV.operating_hours === 'object'
          ? Object.values(dbV.operating_hours).join(' • ')
          : '06:00 AM - 11:00 PM';

      const allSportsForVenue = (dbV.featured_sports && dbV.featured_sports.length > 0
        ? dbV.featured_sports.map((s: string) => mapDbSportToUi(s))
        : [primarySport]
      ) as string[];

      // If courts specify other sports, include them
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

      return {
        id: dbV.id,
        name: dbV.name,
        sport: primarySport,
        city: dbV.city || 'Metro Manila',
        address: dbV.address,
        surface: primaryCourt?.floor_type || 'Competition Surface',
        isIndoor: primaryCourt?.is_indoor ?? true,
        pricePerHour: calculatedPrice,
        rating: dbV.rating || 4.9,
        reviewCount: dbV.review_count || 32,
        image: dbV.images?.[0] || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
        distanceMiles: 1.6,
        amenities: dbV.amenities || ['Air Conditioning', 'Free Parking', 'Shower Rooms', 'Pro Shop'],
        courtsCount: dbV.courts?.length || 2,
        availableSlots: ['08:00', '10:00', '14:00', '16:00', '18:00', '20:00'],
        isFavorite: favoriteVenueIds.includes(dbV.id),
        courts: dbV.courts || [],
        operatingHours: opHoursStr,
        phone: (dbV.payment_info as any)?.gcash_number || '0917-888-SYNC',
        featuredSports: allSportsForVenue,
        isVerified: dbV.is_verified ?? true,
      };
    });

    return adaptedDbVenues;
  }, [store.venues, favoriteVenueIds]);

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

      setUserProfile((prev: typeof DEFAULT_USER & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number }) => {
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
    [userProfile.streakMultiplier, userProfile.level, userProfile.levelTitle, userProfile.xp]
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
      const wagerId = `wag_${Date.now()}`;
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
        setUserProfile((prev: typeof DEFAULT_USER & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number }) => ({
          ...prev,
          xp: Math.max(0, prev.xp - params.stakeXp),
          predictionsCount: (prev.predictionsCount || 0) + 1,
        }));
      } else {
        awardXp(50, `voting on ${params.matchTitle} prediction`, { applyStreakMultiplier: true });
        setUserProfile((prev: typeof DEFAULT_USER & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number }) => ({
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
        const currentPoll = prev[params.matchId] || MATCHES.find((m) => m.id === params.matchId)?.prediction;
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
        const currentPoll = prev[matchId] || MATCHES.find((m) => m.id === matchId)?.prediction;
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
        setUserProfile((prev: typeof DEFAULT_USER & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number }) => ({
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
    [awardXp]
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
        return {
          success: true,
          earnedXp: xpRes.totalEarned,
          message: `Badge claimed! +${xpRes.totalEarned} XP awarded! 🏆`,
        };
      }

      return { success: false, message: 'Badge already claimed or not unlocked yet' };
    },
    [awardXp]
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

  // 14. Create Community Game (Persisting to Supabase + State)
  const createCommunityGame = useCallback(
    async (gameData: {
      sport: 'Football' | 'Basketball' | 'Tennis' | 'Pickleball' | 'Badminton' | 'Volleyball' | 'Billiards' | 'Darts' | string;
      title: string;
      date: string;
      locationName: string;
      playersCount: number;
      skillLevel: 'Casual' | 'Competitive' | 'Beginner' | 'Intermediate';
      pricePerPlayer: number;
      notes?: string;
    }) => {
      const newId = `cg_${Date.now()}`;
      const newGame: CommunityGame = {
        id: newId,
        sport: (gameData.sport as any) || 'Football',
        title: gameData.title,
        format: gameData.playersCount <= 4 ? '2v2 Doubles' : '5v5',
        skillLevel: (gameData.skillLevel as any) || 'Casual',
        date: gameData.date,
        time: '19:30',
        locationName: gameData.locationName,
        distance: '0.8 miles away',
        hostName: userProfile.name,
        hostAvatar: 'alex',
        spotsTotal: gameData.playersCount,
        spotsJoined: 1,
        pricePerPlayer: gameData.pricePerPlayer,
        notes: gameData.notes || 'Organized via SportSync Matchmaking',
        isPublic: true,
        members: [{ name: userProfile.name, avatar: 'alex' }],
      };

      setGames((prev) => [newGame, ...prev]);

      // Award host XP (+100 XP base × 1.5x = +150 XP)
      awardXp(100, 'hosting a new pickup match', { applyStreakMultiplier: true });

      // Unlock Squad Captain badge
      setBadges((prev) =>
        prev.map((b) => (b.id === 'squad_captain' ? { ...b, progress: 1, unlocked: true } : b))
      );

      // Store sync
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

        if (store.venues[0]) {
          await store.createOpenPlaySession({
            venueId: store.venues[0].id,
            title: gameData.title,
            description: gameData.notes || 'SportSync game',
            sport: matchingSport,
            courtIds: store.venues[0].courts?.map((c) => c.id) || [],
            startTime: '19:30',
            endTime: '21:00',
            feeCents: gameData.pricePerPlayer * 100,
            maxPlayers: gameData.playersCount,
            rotationFormat: 'king_of_the_court',
          });
        }
      } catch (err) {
        console.warn('[SportSyncBridge] Global open play session creation fallback handled:', err);
      }

      return newGame;
    },
    [userProfile.name, awardXp, store]
  );

  // 15. Join Community Game
  const joinCommunityGame = useCallback(
    (gameId: string) => {
      let joinedGame: CommunityGame | null = null;

      setGames((prev) =>
        prev.map((g) => {
          if (g.id === gameId) {
            const alreadyJoined = g.members.some((m) => m.name === userProfile.name);
            if (alreadyJoined) return g;
            joinedGame = {
              ...g,
              spotsJoined: Math.min(g.spotsTotal, g.spotsJoined + 1),
              members: [...g.members, { name: userProfile.name, avatar: 'alex' }],
            };
            return joinedGame;
          }
          return g;
        })
      );

      const xpResult = awardXp(30, 'joining a game roster', { applyStreakMultiplier: true });

      return {
        game: joinedGame,
        xpResult,
      };
    },
    [userProfile.name, awardXp]
  );

  // 16. Leave Community Game
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

      return {
        game: updatedGame,
        message: 'Successfully left game roster.',
      };
    },
    [userProfile.name]
  );

  // 17. Reserve Court / Venue Booking
  const createReservation = useCallback(
    (details: {
      venue: Venue;
      court: string;
      date: string;
      slot: string;
      price: number;
    }) => {
      const bookingId = `BK-${Math.floor(10000 + Math.random() * 90000)}`;
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

      // Award XP (+60 XP base × 1.5x = +90 XP)
      awardXp(60, 'reserving a verified court', { applyStreakMultiplier: true });

      try {
        store.createBooking({
          id: bookingId,
          booking_reference: bookingId,
          user_id: store.currentUser.id || 'sportsync_player',
          venue_id: details.venue.id,
          court_id: `${details.venue.id}_c1`,
          sport: 'tennis',
          booking_date: '2026-10-17',
          start_time: details.slot.split('–')[0]?.trim() || '10:00',
          end_time: details.slot.split('–')[1]?.trim() || '11:30',
          duration_minutes: 90,
          court_rate_cents: details.price * 100,
          booking_amount_cents: details.price * 100,
          platform_fee_cents: 0,
          total_amount_cents: details.price * 100,
          status: 'confirmed',
          payment_status: 'approved',
          created_at: new Date().toISOString(),
          venue: store.venues.find((v) => v.id === details.venue.id),
        });
      } catch (err) {
        console.warn('[SportSyncBridge] Global store createBooking warning handled:', err);
      }

      return newBooking;
    },
    [awardXp, store]
  );

  const cancelReservation = useCallback((bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    );
  }, []);

  // 18. Complete Onboarding
  const completeOnboarding = useCallback(
    async (prefs: {
      fullName: string;
      preferredSports: string[];
      skillLevel: string;
      preferredArea?: string;
      avatarUrl?: string;
    }) => {
      setUserProfile((prev: typeof DEFAULT_USER & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number; city?: string }) => ({
        ...prev,
        name: prefs.fullName || prev.name,
        city: prefs.preferredArea || prev.city || 'Metro Area',
        onboardingCompleted: true,
        isGuest: false,
      }));

      const mappedSports: DbSportType[] = prefs.preferredSports.map((s) => {
        const norm = s.toLowerCase();
        if (norm.includes('tennis')) return 'tennis';
        if (norm.includes('basket')) return 'basketball';
        if (norm.includes('padel')) return 'padel';
        if (norm.includes('badminton')) return 'badminton';
        if (norm.includes('volley')) return 'volleyball';
        return 'pickleball';
      });

      const primarySport: DbSportType = mappedSports[0] || 'pickleball';
      const skillLevelMap: Record<string, SkillLevel> = {
        beginner: 'beginner',
        casual: 'intermediate',
        intermediate: 'intermediate',
        competitive: 'advanced',
      };
      const mappedSkill: SkillLevel = skillLevelMap[prefs.skillLevel.toLowerCase()] || 'intermediate';

      try {
        await updatePlayerProfile({
          fullName: prefs.fullName,
          nickname: prefs.fullName.split(' ')[0],
          avatarUrl: prefs.avatarUrl,
          primarySport,
          preferredSports: mappedSports,
          preferredFormat: 'doubles',
          skillLevel: mappedSkill,
          city: prefs.preferredArea || 'Metro Area',
        });
      } catch (err) {
        console.warn('Profile update warning:', err);
      }

      awardXp(150, 'completing profile onboarding', { applyStreakMultiplier: true });
    },
    [awardXp]
  );

  return {
    store,
    userProfile,
    games,
    bookings,
    venues,
    matchPolls,
    wagers,
    badges,
    leaderboardPlayers,
    celebrationState,
    closeCelebration,
    toggleFavoriteVenue,
    createCommunityGame,
    joinCommunityGame,
    leaveCommunityGame,
    createReservation,
    cancelReservation,
    completeOnboarding,
    setAsGuest: () => {
      setUserProfile((prev: typeof DEFAULT_USER & { streakWeeks?: number; streakMultiplier?: number; predictionsCount?: number; predictionsWon?: number; city?: string }) => ({
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
      setUserProfile({
        ...DEFAULT_USER,
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
