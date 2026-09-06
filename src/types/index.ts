export type SportType =
  | 'badminton'
  | 'pickleball'
  | 'basketball'
  | 'padel'
  | 'tennis'
  | 'volleyball'
  | 'table_tennis';

export type MatchFormat = 'singles' | 'doubles' | 'mixed_doubles';

export type SkillLevel =
  | 'all_levels'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'competitive';

export type UserRole = 'player' | 'organizer' | 'venue_owner' | 'admin';

export type SessionType = 'open_play' | 'private_booking' | 'clinic' | 'tournament';

export type QueueStatus = 'waiting' | 'warming_up' | 'on_court' | 'completed' | 'cancelled';

export type MatchStatus = 'warmup' | 'in_progress' | 'completed' | 'cancelled';

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cash_at_venue';

export type PaymentMethod =
  | 'gcash'
  | 'maya'
  | 'grabpay'
  | 'bdo'
  | 'bpi'
  | 'unionbank'
  | 'cash';

export type PaymentCategory = 'ewallet' | 'bank_transfer' | 'cash';

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
  primary_sport: SportType;
  preferred_format?: MatchFormat;
  skill_level: SkillLevel;
  phone?: string;
  city: string;
  matches_played: number;
  matches_won: number;
  win_streak: number;
  highest_streak: number;
  banana_points: number;
  equipped_gear: EquippedGear;
  unlocked_gear: string[];
  created_at: string;
}

export interface Court {
  id: string;
  venue_id: string;
  name: string;
  sport: SportType;
  floor_type: string;
  hourly_rate_cents: number;
  is_indoor: boolean;
  is_active: boolean;
  supports_doubles: boolean;
  supports_singles: boolean;
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
  rating: number;
  review_count: number;
  courts?: Court[];
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
  session_id: string;
  session_title?: string;
  court_id?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  amount_cents: number;
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
