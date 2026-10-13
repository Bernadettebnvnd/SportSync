export type SportType =
  | 'badminton'
  | 'pickleball'
  | 'basketball'
  | 'padel'
  | 'tennis'
  | 'volleyball'
  | 'football'
  | 'billiards'
  | 'darts'
  | 'other'
  | 'table_tennis';

export interface Sport {
  id: SportType;
  name: string;
  iconName: string;
  description: string;
  defaultDurationMinutes: number;
  supportsDoubles: boolean;
  supportsSingles: boolean;
  surfaceTypes: string[];
}

export type MatchFormat = 'singles' | 'doubles' | 'mixed_doubles';

export type SkillLevel =
  | 'all_levels'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'competitive';

export type UserRole = 'player' | 'organizer' | 'venue_owner' | 'admin';

export type UserMode = 'play' | 'manage';

export type SessionType = 'open_play' | 'private_booking' | 'clinic' | 'tournament';

export type QueueStatus = 'waiting' | 'warming_up' | 'on_court' | 'completed' | 'cancelled';

export type MatchStatus = 'warmup' | 'in_progress' | 'completed' | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'cash_at_venue';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentMethod =
  | 'gcash'
  | 'maya'
  | 'grabpay'
  | 'bdo'
  | 'bpi'
  | 'unionbank'
  | 'cash';

export type PaymentCategory = 'ewallet' | 'bank_transfer' | 'cash';

export type FacilityInventorySource =
  | 'manual'
  | 'imported'
  | 'external_link'
  | 'api'
  | 'partner';

export interface EquippedGear {
  headband: string;
  racket: string;
  outfit: string;
}

export interface User {
  id: string;
  auth_id?: string;
  email: string;
  full_name: string;
  nickname: string;
  avatar_url?: string;
  role: UserRole;
  active_mode?: UserMode;
  email_verified?: boolean;
  onboarding_completed?: boolean;
  has_completed_onboarding?: boolean;
  primary_sport: SportType;
  preferred_sports?: SportType[];
  preferred_format?: MatchFormat;
  skill_level: SkillLevel;
  phone?: string;
  city: string;
  matches_played: number;
  matches_won: number;
  win_streak: number;
  highest_streak: number;
  banana_points?: number;
  equipped_gear?: EquippedGear;
  unlocked_gear?: string[];
  sport_locked?: boolean;
  created_at: string;
}

export interface Court {
  id: string;
  venue_id: string;
  name: string;
  sport: SportType;
  floor_type: string;
  surface?: string;
  court_type?: 'full' | 'half' | 'standard';
  capacity?: number;
  hourly_rate_cents: number;
  is_indoor: boolean;
  is_active: boolean;
  supports_doubles: boolean;
  supports_singles: boolean;
  operating_schedule?: Record<string, string>;
}

export interface VenuePaymentInfo {
  // E-Wallets
  gcash_number?: string;
  gcash_name?: string;
  gcash_qr_url?: string;
  maya_number?: string;
  maya_name?: string;
  maya_qr_url?: string;
  grabpay_number?: string;

  // Banks
  bdo_account_number?: string;
  bdo_account_name?: string;
  bpi_account_number?: string;
  bpi_account_name?: string;
  unionbank_account_number?: string;
  unionbank_account_name?: string;
  instapay_qr_url?: string;

  // Cash at Venue
  accepts_cash: boolean;
}

export interface Venue {
  id: string;
  owner_id?: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  operating_hours: {
    mon_fri?: string;
    sat_sun?: string;
    mon_sun?: string;
  };
  amenities: string[];
  featured_sports: SportType[];
  images: string[];
  payment_info: VenuePaymentInfo;
  rating?: number;
  review_count: number;
  is_verified?: boolean;
  inventory_source?: FacilityInventorySource;
  external_booking_url?: string;
  place_id?: string;
  created_at?: string;
  updated_at?: string;
  courts?: Court[];
}

export interface DiscoveredFacility {
  id: string;
  name: string;
  sport: SportType;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  is_platform: false;
  source: 'openstreetmap';
  category?: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  user_id: string;
  user?: User;
  venue_id: string;
  venue?: Venue;
  court_id: string;
  court?: Court;
  sport: SportType;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // ISO or HH:MM
  end_time: string;
  duration_minutes: number;
  court_rate_cents: number;
  booking_amount_cents: number;
  platform_fee_cents: number;
  total_amount_cents: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_id?: string;
  payment_method?: PaymentMethod;
  notes?: string;
  created_at: string;
}

export interface CourtAvailabilitySlot {
  time: string; // e.g. "07:00"
  endTime: string; // e.g. "08:00"
  isAvailable: boolean;
  courtId: string;
  courtName: string;
  hourlyRateCents: number;
  sport: SportType;
}

export interface EmptyCourtOpportunity {
  date: string;
  courtId: string;
  courtName: string;
  sport: SportType;
  hoursUnbooked: number;
  timeRange: string;
  potentialRevenueCents: number;
}

export interface Review {
  id: string;
  venue_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  booking_id?: string;
  rating: number; // 1.0 - 5.0
  comment: string;
  verified_booking: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  venue_id: string;
  venue?: Venue;
  host_id?: string;
  title: string;
  description: string;
  sport: SportType;
  session_type: SessionType;
  skill_level: SkillLevel;
  allowed_formats: MatchFormat[];
  court_ids: string[];
  court_names?: string[];
  start_time: string;
  end_time: string;
  fee_cents: number;
  max_players: number;
  current_players_count: number;
  rotation_format: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface QueueEntry {
  id: string;
  session_id: string;
  user_id: string;
  user?: User;
  court_id?: string;
  court_name?: string;
  queue_number: number;
  group_size: number;
  match_format: MatchFormat;
  partner_names: string[];
  needs_partner: boolean;
  status: QueueStatus;
  estimated_wait_minutes: number;
  joined_at: string;
  called_at?: string;
}

export interface Match {
  id: string;
  session_id?: string;
  court_id?: string;
  court_name: string;
  sport: SportType;
  match_format: MatchFormat;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  team_a_names: string[];
  team_b_names: string[];
  score_a: number;
  score_b: number;
  target_points: number;
  winner_team?: 'team_a' | 'team_b' | 'draw';
  status: MatchStatus;
  started_at: string;
  ended_at?: string;
}

export interface Payment {
  id: string;
  session_id?: string;
  session_title?: string;
  booking_id?: string;
  court_id?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  amount_cents: number;
  platform_fee_cents?: number;
  facility_amount_cents?: number;
  payout_status?: 'unpaid' | 'pending_payout' | 'paid_out';
  payment_method: PaymentMethod;
  payment_category: PaymentCategory;
  reference_code: string;
  receipt_image_url?: string;
  cash_voucher_code?: string;
  status: PaymentStatus;
  notes?: string;
  rejection_reason?: string;
  created_at: string;
  verified_at?: string;
  verified_by?: string;
}

