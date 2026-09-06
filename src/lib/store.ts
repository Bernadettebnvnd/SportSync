'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Venue,
  Session,
  QueueEntry,
  Match,
  Payment,
  UserRole,
  MatchFormat,
  PaymentMethod,
  PaymentCategory,
} from '@/types';
import {
  INITIAL_CURRENT_USER,
  INITIAL_VENUES,
  INITIAL_SESSIONS,
  INITIAL_QUEUES,
  INITIAL_MATCHES,
  INITIAL_PAYMENTS,
} from './mockData';

interface AppState {
  currentUser: User;
  venues: Venue[];
  sessions: Session[];
  queues: QueueEntry[];
  matches: Match[];
  payments: Payment[];
}

const STORAGE_KEY = 'matchi_app_state_v3';

type Listener = () => void;
const listeners = new Set<Listener>();

function loadInitialState(): AppState {
  if (typeof window === 'undefined') {
    return {
      currentUser: INITIAL_CURRENT_USER,
      venues: INITIAL_VENUES,
      sessions: INITIAL_SESSIONS,
      queues: INITIAL_QUEUES,
      matches: INITIAL_MATCHES,
      payments: INITIAL_PAYMENTS,
    };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse saved state from localStorage', e);
  }

  return {
    currentUser: INITIAL_CURRENT_USER,
    venues: INITIAL_VENUES,
    sessions: INITIAL_SESSIONS,
    queues: INITIAL_QUEUES,
    matches: INITIAL_MATCHES,
    payments: INITIAL_PAYMENTS,
  };
}

let globalState: AppState = loadInitialState();

function notify() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(globalState));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }
  listeners.forEach((l) => l());
}

export function useMonkeyStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          globalState = JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    const update = () => setTick((t) => t + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const setUserRole = useCallback((role: UserRole) => {
    globalState = {
      ...globalState,
      currentUser: {
        ...globalState.currentUser,
        role,
      },
    };
    notify();
  }, []);

  const toggleRole = useCallback(() => {
    const nextRole = globalState.currentUser.role === 'player' ? 'organizer' : 'player';
    setUserRole(nextRole);
  }, [setUserRole]);

  const joinQueue = useCallback(
    (
      sessionId: string,
      partnerNames: string[] = [],
      format: MatchFormat = 'doubles',
      needsPartner = false
    ) => {
      const existing = globalState.queues.find(
        (q) => q.session_id === sessionId && q.user_id === globalState.currentUser.id
      );
      if (existing) return existing;

      const sessionQueues = globalState.queues.filter((q) => q.session_id === sessionId);
      const nextQueueNumber = sessionQueues.length + 1;
      const waitMinutes = (sessionQueues.filter((q) => q.status === 'waiting').length + 1) * 8;

      const groupSize = format === 'doubles' ? (partnerNames.length > 0 ? 2 : 1) : 1;

      const newEntry: QueueEntry = {
        id: `q_entry_${Date.now()}`,
        session_id: sessionId,
        user_id: globalState.currentUser.id,
        user: globalState.currentUser,
        queue_number: nextQueueNumber,
        group_size: groupSize,
        match_format: format,
        partner_names: partnerNames,
        needs_partner: needsPartner,
        status: 'waiting',
        estimated_wait_minutes: waitMinutes,
        joined_at: new Date().toISOString(),
      };

      globalState = {
        ...globalState,
        queues: [...globalState.queues, newEntry],
        sessions: globalState.sessions.map((s) =>
          s.id === sessionId
            ? { ...s, current_players_count: s.current_players_count + groupSize }
            : s
        ),
      };
      notify();
      return newEntry;
    },
    []
  );

  const leaveQueue = useCallback((queueId: string) => {
    const entry = globalState.queues.find((q) => q.id === queueId);
    if (!entry) return;

    globalState = {
      ...globalState,
      queues: globalState.queues.filter((q) => q.id !== queueId),
      sessions: globalState.sessions.map((s) =>
        s.id === entry.session_id
          ? { ...s, current_players_count: Math.max(0, s.current_players_count - entry.group_size) }
          : s
      ),
    };
    notify();
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

  const updateMatchScore = useCallback(
    (matchId: string, scoreA: number, scoreB: number, isFinished = false) => {
      globalState = {
        ...globalState,
        matches: globalState.matches.map((m) => {
          if (m.id !== matchId) return m;
          const winner = isFinished
            ? scoreA > scoreB
              ? 'team_a'
              : scoreB > scoreA
              ? 'team_b'
              : 'draw'
            : undefined;
          return {
            ...m,
            score_a: scoreA,
            score_b: scoreB,
            status: isFinished ? 'completed' : 'in_progress',
            winner_team: winner,
            ended_at: isFinished ? new Date().toISOString() : m.ended_at,
          };
        }),
      };

      if (isFinished) {
        const match = globalState.matches.find((m) => m.id === matchId);
        if (match && match.team_a_player_ids.includes(globalState.currentUser.id)) {
          const userWon = scoreA > scoreB;
          const newStreak = userWon ? globalState.currentUser.win_streak + 1 : 0;
          globalState = {
            ...globalState,
            currentUser: {
              ...globalState.currentUser,
              matches_played: globalState.currentUser.matches_played + 1,
              matches_won: userWon
                ? globalState.currentUser.matches_won + 1
                : globalState.currentUser.matches_won,
              win_streak: newStreak,
              highest_streak: Math.max(globalState.currentUser.highest_streak, newStreak),
              banana_points: globalState.currentUser.banana_points + (userWon ? 45 : 15),
            },
          };
        }
      }

      notify();
    },
    []
  );

  const submitPayment = useCallback(
    (data: {
      sessionId: string;
      courtId?: string;
      amountCents: number;
      paymentMethod: PaymentMethod;
      paymentCategory: PaymentCategory;
      referenceCode: string;
      receiptImageUrl?: string;
      cashVoucherCode?: string;
      notes?: string;
    }) => {
      const session = globalState.sessions.find((s) => s.id === data.sessionId);
      const isCash = data.paymentCategory === 'cash';

      const newPayment: Payment = {
        id: `pay_${Date.now()}`,
        session_id: data.sessionId,
        session_title: session ? session.title : 'Court Booking',
        court_id: data.courtId,
        user_id: globalState.currentUser.id,
        user_name: globalState.currentUser.full_name,
        user_avatar: globalState.currentUser.avatar_url,
        amount_cents: data.amountCents,
        payment_method: data.paymentMethod,
        payment_category: data.paymentCategory,
        reference_code: data.referenceCode,
        receipt_image_url: data.receiptImageUrl,
        cash_voucher_code: data.cashVoucherCode,
        status: isCash ? 'cash_at_venue' : 'pending',
        notes: data.notes || (isCash ? 'Cash payment upon arrival at venue' : 'Online verification pending'),
        created_at: new Date().toISOString(),
      };

      globalState = {
        ...globalState,
        payments: [newPayment, ...globalState.payments],
      };
      notify();
      return newPayment;
    },
    []
  );

  const verifyPayment = useCallback(
    (paymentId: string, status: 'approved' | 'rejected', reason?: string) => {
      globalState = {
        ...globalState,
        payments: globalState.payments.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                status,
                rejection_reason: reason,
                verified_at: new Date().toISOString(),
                verified_by: globalState.currentUser.full_name,
              }
            : p
        ),
      };
      notify();
    },
    []
  );

  const equipGear = useCallback((gearType: 'headband' | 'racket' | 'outfit', gearId: string) => {
    globalState = {
      ...globalState,
      currentUser: {
        ...globalState.currentUser,
        equipped_gear: {
          ...globalState.currentUser.equipped_gear,
          [gearType]: gearId,
        },
      },
    };
    notify();
  }, []);

  const unlockGear = useCallback((gearId: string, cost: number) => {
    if (globalState.currentUser.banana_points < cost) return false;
    if (globalState.currentUser.unlocked_gear.includes(gearId)) return true;

    globalState = {
      ...globalState,
      currentUser: {
        ...globalState.currentUser,
        banana_points: globalState.currentUser.banana_points - cost,
        unlocked_gear: [...globalState.currentUser.unlocked_gear, gearId],
      },
    };
    notify();
    return true;
  }, []);

  const resetData = useCallback(() => {
    globalState = {
      currentUser: INITIAL_CURRENT_USER,
      venues: INITIAL_VENUES,
      sessions: INITIAL_SESSIONS,
      queues: INITIAL_QUEUES,
      matches: INITIAL_MATCHES,
      payments: INITIAL_PAYMENTS,
    };
    notify();
  }, []);

  return {
    currentUser: globalState.currentUser,
    venues: globalState.venues,
    sessions: globalState.sessions,
    queues: globalState.queues,
    matches: globalState.matches,
    payments: globalState.payments,
    setUserRole,
    toggleRole,
    joinQueue,
    leaveQueue,
    assignQueueToCourt,
    updateMatchScore,
    submitPayment,
    verifyPayment,
    equipGear,
    unlockGear,
    resetData,
  };
}
