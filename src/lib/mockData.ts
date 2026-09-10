/**
 * Test Fixtures & Seed Definitions (Isolated for automated testing only)
 * NOTE: Production application code must NEVER use these objects as runtime fallbacks.
 */

import { User, Venue, Court, Session, Booking } from '@/types';

export const TEST_USER: User = {
  id: 'usr_test_player_01',
  email: 'test.player@matchi.ph',
  full_name: 'Test Player',
  nickname: 'Tester',
  role: 'player',
  active_mode: 'play',
  email_verified: true,
  primary_sport: 'pickleball',
  preferred_sports: ['pickleball', 'badminton'],
  preferred_format: 'doubles',
  skill_level: 'intermediate',
  city: 'Taguig City',
  matches_played: 10,
  matches_won: 7,
  win_streak: 2,
  highest_streak: 4,
  created_at: new Date().toISOString(),
};

export const TEST_COURTS: Court[] = [
  {
    id: 'court_test_01',
    venue_id: 'venue_test_01',
    name: 'Court 1 (Pickle Pro)',
    sport: 'pickleball',
    floor_type: 'Pro Acrylic Cushion',
    hourly_rate_cents: 50000,
    is_indoor: true,
    is_active: true,
    supports_doubles: true,
    supports_singles: true,
  },
  {
    id: 'court_test_02',
    venue_id: 'venue_test_01',
    name: 'Court 2 (Yonex BWF)',
    sport: 'badminton',
    floor_type: 'BWF Taraflex Rubber',
    hourly_rate_cents: 45000,
    is_indoor: true,
    is_active: true,
    supports_doubles: true,
    supports_singles: true,
  },
];

export const TEST_VENUES: Venue[] = [
  {
    id: 'venue_test_01',
    name: 'The Upper Deck Sports Center',
    slug: 'upper-deck-pasig',
    description: 'Premier multi-sports lifestyle hub in Ortigas/Pasig.',
    address: '1 Ortigas Ave cor C5, Pasig, Metro Manila',
    city: 'Pasig City',
    latitude: 14.5828,
    longitude: 121.0664,
    operating_hours: { mon_sun: '06:00 AM - 12:00 MN' },
    amenities: ['Air Conditioning', 'Free Parking', 'Shower Rooms', 'Pro Shop', 'Locker Rooms'],
    featured_sports: ['badminton', 'pickleball'],
    images: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'],
    payment_info: { accepts_cash: true },
    review_count: 14,
    rating: 4.9,
    courts: TEST_COURTS,
  },
];

// Backwards-compatible aliases for test runners
export const INITIAL_CURRENT_USER = TEST_USER;
export const INITIAL_VENUES = TEST_VENUES;
export const INITIAL_COURTS = TEST_COURTS;
export const INITIAL_SESSIONS: Session[] = [];
export const INITIAL_QUEUES = [];
export const INITIAL_MATCHES = [];
export const INITIAL_PAYMENTS = [];
export const INITIAL_BOOKINGS: Booking[] = [];
export const INITIAL_EMPTY_COURT_OPPORTUNITIES = [];
export const GEAR_STORE_ITEMS = [];
