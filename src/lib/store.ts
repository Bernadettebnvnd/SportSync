'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Venue,
  Court,
  Session,
  QueueEntry,
  Match,
  Payment,
  Booking,
  EmptyCourtOpportunity,
  UserRole,
  UserMode,
  MatchFormat,
  PaymentMethod,
  PaymentCategory,
  SportType,
  SkillLevel,
  BookingStatus,
  FacilityInventorySource,
} from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getVenues, createVenueWithCourts } from './services/venues';
import { getPlayerBookings, getFacilityBookings, updateBookingStatus as updateDbBookingStatus } from './services/bookings';
import { getOpenPlaySessions, getSessionQueues, joinSessionQueue, createOpenPlaySession as createDbOpenPlaySession } from './services/sessions';
import { getCurrentUser, updatePlayerProfile, resetOnboardingForTesting } from './services/auth';

export const GUEST_USER: User = {
  id: '',
  email: '',
  full_name: 'Guest Player',
  nickname: 'Guest',
  role: 'player',
  active_mode: 'play',
  primary_sport: 'pickleball',
  preferred_sports: ['pickleball', 'badminton'],
  preferred_format: 'doubles',
  skill_level: 'all_levels',
  city: 'Metro Manila',
  onboarding_completed: false,
  has_completed_onboarding: false,
  matches_played: 0,
  matches_won: 0,
  win_streak: 0,
  highest_streak: 0,
  created_at: new Date().toISOString(),
};

interface AppState {
  currentUser: User;
  venues: Venue[];
  courts: Court[];
  sessions: Session[];
  queues: QueueEntry[];
  matches: Match[];
  payments: Payment[];
  bookings: Booking[];
  emptyOpportunities: EmptyCourtOpportunity[];
  isLoading: boolean;
  error: string | null;
}

let globalState: AppState = {
  currentUser: GUEST_USER,
  venues: [],
  courts: [],
  sessions: [],
  queues: [],
  matches: [],
  payments: [],
  bookings: [],
  emptyOpportunities: [],
  isLoading: false,
  error: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function useMatchiStore() {
  const [, setTick] = useState(0);

  // Initial real-data fetching on mount
  useEffect(() => {
    let isMounted = true;

    async function initializeStore() {
      globalState.isLoading = true;
      notify();

      try {
        // 1. Fetch current authenticated user or check local storage
        if (typeof window !== 'undefined') {
          const storedCompleted = localStorage.getItem('matchi_onboarding_completed') === 'true';
          globalState.currentUser.onboarding_completed = storedCompleted;
          globalState.currentUser.has_completed_onboarding = storedCompleted;
          const storedName = localStorage.getItem('matchi_user_name');
          if (storedName) globalState.currentUser.full_name = storedName;
          const storedNickname = localStorage.getItem('matchi_user_nickname');
          if (storedNickname) globalState.currentUser.nickname = storedNickname;
        }

        const user = await getCurrentUser();
        if (isMounted && user) {
          globalState.currentUser = user;
        }

        // 2. Fetch real venues & courts
        const venues = await getVenues();
        if (isMounted) {
          globalState.venues = venues;
          globalState.courts = venues.flatMap((v) => v.courts || []);
        }

        // 3. Fetch real sessions
        const sessions = await getOpenPlaySessions();
        if (isMounted) {
          globalState.sessions = sessions;
        }

        // 4. If authenticated, fetch real bookings
        if (user && user.auth_id) {
          const bookings =
            user.role === 'venue_owner' || user.role === 'organizer'
              ? await getFacilityBookings()
              : await getPlayerBookings();
          if (isMounted) {
            globalState.bookings = bookings;
          }
        }
      } catch (err) {
        console.error('Error initializing store:', err);
        if (isMounted) {
          globalState.error = 'Failed to load initial marketplace data.';
        }
      } finally {
        if (isMounted) {
          globalState.isLoading = false;
          notify();
        }
      }
    }

    initializeStore();

    // Supabase Auth listener
    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const user = await getCurrentUser();
          if (isMounted && user) {
            globalState.currentUser = user;
            const bookings = await getPlayerBookings();
            globalState.bookings = bookings;
            notify();
          }
        } else {
          if (isMounted) {
            globalState.currentUser = GUEST_USER;
            globalState.bookings = [];
            notify();
          }
        }
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    const update = () => setTick((t) => t + 1);
    listeners.add(update);
    return () => {
      isMounted = false;
      listeners.delete(update);
    };
  }, []);

  // Reload venues from database
  const refreshVenues = useCallback(async () => {
    globalState.isLoading = true;
    notify();
    try {
      const venues = await getVenues();
      globalState.venues = venues;
      globalState.courts = venues.flatMap((v) => v.courts || []);
    } catch (err) {
      console.error('Failed to refresh venues:', err);
    } finally {
      globalState.isLoading = false;
      notify();
    }
  }, []);

  // Reload bookings from database
  const refreshBookings = useCallback(async () => {
    try {
      const bookings =
        globalState.currentUser.role === 'venue_owner' || globalState.currentUser.role === 'organizer'
          ? await getFacilityBookings()
          : await getPlayerBookings();
      globalState.bookings = bookings;
      notify();
    } catch (err) {
      console.error('Failed to refresh bookings:', err);
    }
  }, []);

  // Mode switching (PLAY vs MANAGE)
  const setActiveMode = useCallback((mode: UserMode) => {
    globalState = {
      ...globalState,
      currentUser: {
        ...globalState.currentUser,
        active_mode: mode,
      },
    };
    notify();
  }, []);

  const toggleMode = useCallback(() => {
    const current = globalState.currentUser.active_mode || 'play';
    const nextMode: UserMode = current === 'play' ? 'manage' : 'play';
    setActiveMode(nextMode);
  }, [setActiveMode]);

  // Backward-compatible role toggle
  const setUserRole = useCallback((role: UserRole) => {
    globalState = {
      ...globalState,
      currentUser: {
        ...globalState.currentUser,
        role,
        active_mode: role === 'venue_owner' || role === 'organizer' ? 'manage' : 'play',
      },
    };
    notify();
  }, []);

  const toggleRole = useCallback(() => {
    const isOwner = globalState.currentUser.role === 'venue_owner' || globalState.currentUser.role === 'organizer';
    const nextRole: UserRole = isOwner ? 'player' : 'venue_owner';
    setUserRole(nextRole);
  }, [setUserRole]);

  // Complete Player Onboarding
  const completePlayerOnboarding = useCallback(
    async (data: {
      fullName?: string;
      nickname?: string;
      preferredSports: SportType[];
      skillLevel: SkillLevel;
      city?: string;
      preferredFormat?: MatchFormat;
    }) => {
      const primarySport = data.preferredSports[0] || 'pickleball';

      if (globalState.currentUser.auth_id) {
        await updatePlayerProfile({
          fullName: data.fullName,
          nickname: data.nickname,
          primarySport,
          preferredSports: data.preferredSports,
          preferredFormat: data.preferredFormat || 'doubles',
          skillLevel: data.skillLevel,
          city: data.city || 'Metro Manila',
        });
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('matchi_onboarding_completed', 'true');
        if (data.fullName) localStorage.setItem('matchi_user_name', data.fullName);
        if (data.nickname) localStorage.setItem('matchi_user_nickname', data.nickname);
      }

      globalState = {
        ...globalState,
        currentUser: {
          ...globalState.currentUser,
          full_name: data.fullName || globalState.currentUser.full_name,
          nickname: data.nickname || globalState.currentUser.nickname,
          primary_sport: primarySport,
          preferred_sports: data.preferredSports,
          skill_level: data.skillLevel,
          city: data.city || globalState.currentUser.city,
          preferred_format: data.preferredFormat || 'doubles',
          onboarding_completed: true,
          has_completed_onboarding: true,
          active_mode: 'play',
        },
      };
      notify();
    },
    []
  );

  // Development-only onboarding reset
  const resetOnboardingState = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('matchi_onboarding_completed');
      localStorage.removeItem('matchi_user_name');
      localStorage.removeItem('matchi_user_nickname');
    }
    if (globalState.currentUser.auth_id) {
      await resetOnboardingForTesting();
    }
    globalState = {
      ...globalState,
      currentUser: {
        ...globalState.currentUser,
        onboarding_completed: false,
        has_completed_onboarding: false,
      },
    };
    notify();
  }, []);

  // Complete Facility Owner Onboarding
  const completeOwnerOnboarding = useCallback(
    async (data: {
      ownerName: string;
      ownerEmail: string;
      ownerPhone: string;
      facilityName: string;
      description: string;
      address: string;
      city: string;
      featuredSports: SportType[];
      courts: {
        name: string;
        sport: SportType;
        hourlyRateCents: number;
        floorType: string;
        courtType?: 'full' | 'half' | 'standard';
      }[];
      inventorySource: FacilityInventorySource;
    }) => {
      try {
        const result = await createVenueWithCourts(
          {
            name: data.facilityName,
            slug: data.facilityName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: data.description,
            address: data.address,
            city: data.city,
            latitude: 14.5828,
            longitude: 121.0664,
            operating_hours: { mon_sun: '06:00 - 23:00' },
            amenities: ['Air Conditioning', 'Free Parking', 'Shower Rooms', 'Pro Shop', 'Locker Rooms'],
            featured_sports: data.featuredSports,
            images: [],
            payment_info: { accepts_cash: true },
            review_count: 0,
            is_verified: true,
            inventory_source: data.inventorySource,
          },
          data.courts.map((c) => ({
            name: c.name,
            sport: c.sport,
            hourly_rate_cents: c.hourlyRateCents,
            floor_type: c.floorType,
            court_type: c.courtType || 'standard',
            is_indoor: true,
            is_active: true,
            supports_doubles: true,
            supports_singles: true,
          }))
        );

        if (result) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('matchi_onboarding_completed', 'true');
          }
          globalState.venues = [result.venue, ...globalState.venues];
          globalState.courts = [...result.courts, ...globalState.courts];
          globalState.currentUser = {
            ...globalState.currentUser,
            full_name: data.ownerName,
            email: data.ownerEmail,
            role: 'venue_owner',
            active_mode: 'manage',
            onboarding_completed: true,
            has_completed_onboarding: true,
          };
          notify();
          return result.venue;
        }
      } catch (err) {
        console.error('Owner onboarding failed:', err);
        throw err;
      }
    },
    []
  );

  // Create Booking
  const createBooking = useCallback(
    (newBooking: Booking) => {
      globalState = {
        ...globalState,
        bookings: [newBooking, ...globalState.bookings],
      };
      notify();
      return newBooking;
    },
    []
  );

  // Update Booking Status
  const updateBookingStatus = useCallback(
    async (bookingId: string, status: BookingStatus) => {
      await updateDbBookingStatus(bookingId, status);
      globalState = {
        ...globalState,
        bookings: globalState.bookings.map((b) =>
          b.id === bookingId ? { ...b, status } : b
        ),
      };
      notify();
    },
    []
  );

  // Open Play Session Creation
  const createOpenPlaySession = useCallback(
    async (data: {
      venueId: string;
      title: string;
      description: string;
      sport: SportType;
      courtIds: string[];
      startTime: string;
      endTime: string;
      feeCents: number;
      maxPlayers: number;
      rotationFormat: string;
      skillLevel?: SkillLevel;
    }) => {
      try {
        const newSession = await createDbOpenPlaySession({
          venue_id: data.venueId,
          title: data.title,
          description: data.description,
          sport: data.sport,
          session_type: 'open_play',
          skill_level: data.skillLevel || 'all_levels',
          allowed_formats: ['doubles', 'singles'],
          court_ids: data.courtIds,
          start_time: data.startTime,
          end_time: data.endTime,
          fee_cents: data.feeCents,
          max_players: data.maxPlayers,
          rotation_format: data.rotationFormat,
          status: 'active',
        });

        if (newSession) {
          globalState.sessions = [newSession, ...globalState.sessions];
          notify();
          return newSession;
        }
      } catch (err) {
        console.error('Failed to create open play session:', err);
        throw err;
      }
    },
    []
  );

  // Join Queue
  const joinQueue = useCallback(
    async (
      sessionId: string,
      partnerNames: string[] = [],
      format: MatchFormat = 'doubles',
      needsPartner = false
    ) => {
      try {
        const newEntry = await joinSessionQueue(sessionId, partnerNames, format, needsPartner);
        if (newEntry) {
          globalState.queues = [...globalState.queues, newEntry];
          notify();
          return newEntry;
        }
      } catch (err) {
        console.error('Failed to join queue:', err);
        throw err;
      }
    },
    []
  );

  const fetchSessionQueues = useCallback(async (sessionId: string) => {
    try {
      const queues = await getSessionQueues(sessionId);
      globalState.queues = queues;
      notify();
      return queues;
    } catch (err) {
      console.error('Failed to fetch queues:', err);
      return [];
    }
  }, []);

  const assignQueueToCourt = useCallback((queueId: string, courtId: string, courtName: string) => {
    globalState = {
      ...globalState,
      queues: globalState.queues.map((q) =>
        q.id === queueId
          ? {
              ...q,
              status: 'on_court',
              court_id: courtId,
              court_name: courtName,
              called_at: new Date().toISOString(),
              estimated_wait_minutes: 0,
            }
          : q
      ),
    };
    notify();
  }, []);

  return {
    currentUser: globalState.currentUser,
    venues: globalState.venues,
    courts: globalState.courts,
    sessions: globalState.sessions,
    queues: globalState.queues,
    matches: globalState.matches,
    payments: globalState.payments,
    bookings: globalState.bookings,
    emptyOpportunities: globalState.emptyOpportunities,
    isLoading: globalState.isLoading,
    error: globalState.error,
    activeMode: globalState.currentUser.active_mode || 'play',
    setActiveMode,
    toggleMode,
    setUserRole,
    toggleRole,
    refreshVenues,
    refreshBookings,
    completePlayerOnboarding,
    resetOnboardingState,
    completeOwnerOnboarding,
    createBooking,
    updateBookingStatus,
    createOpenPlaySession,
    joinQueue,
    fetchSessionQueues,
    assignQueueToCourt,
    submitPayment: (data: {
      sessionId?: string;
      courtId?: string;
      amountCents: number;
      paymentMethod: PaymentMethod;
      paymentCategory: PaymentCategory;
      referenceCode: string;
      receiptImageUrl?: string;
      cashVoucherCode?: string;
      notes?: string;
    }) => {
      const newPayment: Payment = {
        id: 'pay_' + Math.random().toString(36).substring(2, 9),
        session_id: data.sessionId,
        court_id: data.courtId,
        user_id: globalState.currentUser.id || 'usr_guest',
        user_name: globalState.currentUser.full_name,
        amount_cents: data.amountCents,
        payment_method: data.paymentMethod,
        payment_category: data.paymentCategory,
        reference_code: data.referenceCode,
        receipt_image_url: data.receiptImageUrl,
        cash_voucher_code: data.cashVoucherCode,
        status: data.paymentMethod === 'cash' ? 'cash_at_venue' : 'pending',
        notes: data.notes,
        created_at: new Date().toISOString(),
      };
      globalState = {
        ...globalState,
        payments: [newPayment, ...globalState.payments],
      };
      notify();
      return newPayment;
    },
    verifyPayment: (paymentId: string, status: 'approved' | 'rejected', rejectReason?: string) => {
      globalState = {
        ...globalState,
        payments: globalState.payments.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                status: status === 'approved' ? ('approved' as const) : ('rejected' as const),
                rejection_reason: rejectReason,
                verified_at: new Date().toISOString(),
                verified_by: globalState.currentUser.id || 'admin',
              }
            : p
        ),
      };
      notify();
    },
    leaveQueue: async (queueId: string) => {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('session_queues').delete().eq('id', queueId);
        } catch (err) {
          console.error('Error leaving queue:', err);
        }
      }
      globalState = {
        ...globalState,
        queues: globalState.queues.filter((q) => q.id !== queueId),
      };
      notify();
    },
    updateMatchScore: (matchId: string, scoreA: number, scoreB: number, isFinished: boolean) => {
      globalState = {
        ...globalState,
        matches: globalState.matches.map((m) =>
          m.id === matchId
            ? {
                ...m,
                score_a: scoreA,
                score_b: scoreB,
                status: isFinished ? ('completed' as const) : ('in_progress' as const),
                ended_at: isFinished ? new Date().toISOString() : m.ended_at,
                winner_team: isFinished
                  ? scoreA > scoreB
                    ? 'team_a'
                    : scoreB > scoreA
                    ? 'team_b'
                    : 'draw'
                  : undefined,
              }
            : m
        ),
      };
      notify();
    },
  };
}

export const useMonkeyStore = useMatchiStore;
