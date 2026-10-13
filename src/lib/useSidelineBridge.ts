'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMatchiStore } from './store';
import {
  COMMUNITY_GAMES as DEFAULT_GAMES,
  VENUES as DEFAULT_VENUES,
  CURRENT_USER as DEFAULT_USER,
} from '../mock/mockData';
import { CommunityGame, Venue, Match } from '../mock/types';
import { SportType } from '../types';

export interface SidelineBookingItem {
  id: string;
  venue: Venue;
  court: string;
  date: string;
  time: string;
  price: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

const DEFAULT_BOOKINGS: SidelineBookingItem[] = [
  {
    id: 'BK-89421',
    venue: DEFAULT_VENUES[0],
    court: 'Court 2 (Clay)',
    date: 'Sat, 17 Oct',
    time: '10:00 – 11:30 AM',
    price: 54,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'BK-88930',
    venue: DEFAULT_VENUES[1],
    court: 'Pitch 4 (3G Turf)',
    date: 'Wed, 21 Oct',
    time: '19:00 – 20:00',
    price: 55,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
];

export function useSidelineBridge() {
  const store = useMatchiStore();

  // Dynamic user profile with XP and Gamification
  const [userProfile, setUserProfile] = useState(() => {
    return {
      ...DEFAULT_USER,
      name: store.currentUser.full_name || DEFAULT_USER.name,
      username: store.currentUser.nickname ? `@${store.currentUser.nickname.toLowerCase()}` : DEFAULT_USER.username,
    };
  });

  // Sync profile when store user updates
  useEffect(() => {
    if (store.currentUser.full_name || store.currentUser.nickname) {
      setUserProfile((prev) => ({
        ...prev,
        name: store.currentUser.full_name || prev.name,
        username: store.currentUser.nickname ? `@${store.currentUser.nickname.toLowerCase()}` : prev.username,
      }));
    }
  }, [store.currentUser.full_name, store.currentUser.nickname]);

  // Dynamic Community Pickup Games
  const [games, setGames] = useState<CommunityGame[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sideline_community_games');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore parsing error
        }
      }
    }
    return DEFAULT_GAMES;
  });

  // Persist games to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sideline_community_games', JSON.stringify(games));
    }
  }, [games]);

  // Dynamic Bookings
  const [bookings, setBookings] = useState<SidelineBookingItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sideline_my_bookings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore parsing error
        }
      }
    }
    return DEFAULT_BOOKINGS;
  });

  // Persist bookings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sideline_my_bookings', JSON.stringify(bookings));
    }
  }, [bookings]);

  // Dynamic Venues (merging default mock venues with any created in store)
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>([]);

  const venues = useMemo<Venue[]>(() => {
    const adaptedDbVenues: Venue[] = store.venues.map((dbV) => ({
      id: dbV.id,
      name: dbV.name,
      sport: 'Football',
      city: dbV.city || 'Metro Area',
      address: dbV.address,
      surface: '3G Turf',
      isIndoor: true,
      pricePerHour: 45,
      rating: dbV.rating || 4.9,
      reviewCount: dbV.review_count || 12,
      image: dbV.images?.[0] || DEFAULT_VENUES[0].image,
      distanceMiles: 1.8,
      amenities: dbV.amenities || ['Parking', 'Changing Rooms', 'Floodlights'],
      courtsCount: dbV.courts?.length || 2,
      availableSlots: ['10:00', '14:00', '18:00'],
      isFavorite: favoriteVenueIds.includes(dbV.id),
    }));

    return [
      ...DEFAULT_VENUES.map((v) => ({
        ...v,
        isFavorite: favoriteVenueIds.includes(v.id) || v.isFavorite,
      })),
      ...adaptedDbVenues.filter((dv) => !DEFAULT_VENUES.some((mv) => mv.id === dv.id)),
    ];
  }, [store.venues, favoriteVenueIds]);

  // Toggle favorite venue
  const toggleFavoriteVenue = useCallback((venueId: string) => {
    setFavoriteVenueIds((prev) =>
      prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId]
    );
  }, []);

  // Award Playmaker XP
  const awardXp = useCallback((amount: number, reason: string): { leveledUp: boolean; newLevel: number; message: string } => {
    let leveledUp = false;
    let newLevel = userProfile.level;

    setUserProfile((prev) => {
      const nextXp = prev.xp + amount;
      if (nextXp >= prev.xpNextLevel) {
        leveledUp = true;
        newLevel = prev.level + 1;
        return {
          ...prev,
          level: newLevel,
          xp: nextXp - prev.xpNextLevel,
          xpNextLevel: Math.round(prev.xpNextLevel * 1.3),
        };
      }
      return {
        ...prev,
        xp: nextXp,
      };
    });

    const message = leveledUp
      ? `🎉 LEVEL UP! You reached Level ${newLevel}! (+${amount} XP for ${reason})`
      : `+${amount} Playmaker XP earned: ${reason}`;

    return { leveledUp, newLevel, message };
  }, [userProfile.level]);

  // Create Community Match
  const createCommunityGame = useCallback(
    async (gameData: {
      sport: 'Football' | 'Basketball' | 'Tennis';
      title: string;
      date: string;
      locationName: string;
      playersCount: number;
      skillLevel: 'Casual' | 'Competitive';
      pricePerPlayer: number;
      notes?: string;
    }) => {
      const newId = `cg_${Date.now()}`;
      const newGame: CommunityGame = {
        id: newId,
        sport: gameData.sport,
        title: gameData.title,
        format: gameData.playersCount <= 4 ? '2v2 Doubles' : '5v5',
        skillLevel: gameData.skillLevel === 'Casual' ? 'Casual' : 'Competitive',
        date: gameData.date,
        time: '19:30',
        locationName: gameData.locationName,
        distance: '0.8 miles away',
        hostName: userProfile.name,
        hostAvatar: 'alex',
        spotsTotal: gameData.playersCount,
        spotsJoined: 1,
        pricePerPlayer: gameData.pricePerPlayer,
        notes: gameData.notes || 'Organized via SIDELINE Community Engine',
        isPublic: true,
        members: [{ name: userProfile.name, avatar: 'alex' }],
      };

      setGames((prev) => [newGame, ...prev]);

      // Award host XP (+100 XP)
      awardXp(100, 'hosting a new pickup match');

      // Bridge to global store open play session if possible
      try {
        const matchingSport: SportType =
          gameData.sport === 'Football'
            ? 'pickleball' // mapped fallback for database enum
            : gameData.sport === 'Basketball'
            ? 'basketball'
            : 'tennis';

        if (store.venues[0]) {
          await store.createOpenPlaySession({
            venueId: store.venues[0].id,
            title: gameData.title,
            description: gameData.notes || 'SIDELINE pickup game',
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
        console.warn('[SidelineBridge] Global open play session creation fallback handled:', err);
      }

      return newGame;
    },
    [userProfile.name, awardXp, store]
  );

  // Join Community Match
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

      // Award participant XP (+30 XP)
      const xpResult = awardXp(30, 'joining a pickup game');

      return {
        game: joinedGame,
        xpResult,
      };
    },
    [userProfile.name, awardXp]
  );

  // Reserve a Court / Venue Booking
  const createReservation = useCallback(
    (details: {
      venue: Venue;
      court: string;
      date: string;
      slot: string;
      price: number;
    }) => {
      const bookingId = `BK-${Math.floor(10000 + Math.random() * 90000)}`;
      const newBooking: SidelineBookingItem = {
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

      // Award XP (+60 XP for court booking)
      awardXp(60, 'reserving a verified court');

      // Sync with global store createBooking
      try {
        store.createBooking({
          id: bookingId,
          booking_reference: bookingId,
          user_id: store.currentUser.id || 'sideline_player',
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
        console.warn('[SidelineBridge] Global store createBooking warning handled:', err);
      }

      return newBooking;
    },
    [awardXp, store]
  );

  // Cancel Booking
  const cancelReservation = useCallback((bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    );
  }, []);

  // Complete Onboarding / Profile setup
  const completeOnboarding = useCallback(
    async (prefs: {
      fullName: string;
      preferredSports: string[];
      skillLevel: string;
    }) => {
      setUserProfile((prev) => ({
        ...prev,
        name: prefs.fullName || prev.name,
      }));

      const mappedSports: SportType[] = prefs.preferredSports.map((s) => {
        if (s.toLowerCase().includes('tennis')) return 'tennis';
        if (s.toLowerCase().includes('basket')) return 'basketball';
        if (s.toLowerCase().includes('padel')) return 'padel';
        return 'pickleball';
      });

      await store.completePlayerOnboarding({
        fullName: prefs.fullName,
        nickname: prefs.fullName.split(' ')[0],
        preferredSports: mappedSports,
        skillLevel: 'intermediate',
        city: 'Metro Area',
      });

      awardXp(150, 'completing profile onboarding');
    },
    [store, awardXp]
  );

  return {
    store,
    userProfile,
    games,
    bookings,
    venues,
    toggleFavoriteVenue,
    createCommunityGame,
    joinCommunityGame,
    createReservation,
    cancelReservation,
    completeOnboarding,
    awardXp,
  };
}
