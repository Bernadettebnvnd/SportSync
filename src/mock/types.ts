import { TeamCrestId } from '../illustrations/TeamCrests';
import { AvatarId } from '../illustrations/Avatars';
export type { AvatarId };

export type SportType = 'Football' | 'Basketball' | 'Tennis' | 'Padel' | 'Running';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  crestId: TeamCrestId;
  city: string;
  league: string;
  form: Array<'W' | 'D' | 'L'>;
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  teamId: string;
  avatarId: AvatarId;
  rating: number; // e.g. 8.6
  matches: number;
  goals: number;
  assists: number;
  cleanSheets?: number;
  stats: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defense: number;
    physical: number;
  };
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'sub';
  player: string;
  team: 'home' | 'away';
  detail?: string;
}

export interface Match {
  id: string;
  sport: SportType;
  leagueId: string;
  leagueName: string;
  matchday: string;
  homeTeam: Team;
  awayTeam: Team;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  minute?: number; // e.g. 58
  homeScore?: number;
  awayScore?: number;
  date: string; // e.g. 'Today', 'Tomorrow', '14 Oct'
  time: string; // e.g. '20:00'
  venueName: string;
  watchingCount: string; // e.g. '2.4K'
  possession?: { home: number; away: number }; // e.g. 58 / 42
  shots?: { home: number; away: number }; // e.g. 14 / 8
  shotsOnTarget?: { home: number; away: number }; // e.g. 6 / 3
  momentumData?: number[]; // Values between -50 (away) to +50 (home)
  events?: MatchEvent[];
  lineupHome?: Array<{ name: string; num: number; x: number; y: number; role: string }>;
  lineupAway?: Array<{ name: string; num: number; x: number; y: number; role: string }>;
  prediction?: {
    id?: string;
    question: string;
    status?: 'open' | 'settled';
    options: Array<{
      id: string;
      label: string;
      percentage: number;
      votesCount?: number;
      odds?: number;
    }>;
    settledOptionId?: string;
  };
}

export interface League {
  id: string;
  name: string;
  sport: SportType;
  country: string;
  standings: Array<{
    rank: number;
    team: Team;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    gd: number;
    points: number;
    form: Array<'W' | 'D' | 'L'>;
    zone?: 'champions' | 'europa' | 'relegation';
  }>;
  topScorers: Array<{
    player: string;
    team: string;
    goals: number;
    assists: number;
  }>;
}

export interface Venue {
  id: string;
  name: string;
  sport: SportType;
  city: string;
  address: string;
  surface: 'Clay' | 'Grass' | 'Hardcourt' | '3G Turf' | 'Panoramic Glass';
  isIndoor: boolean;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  image: string;
  isFavorite?: boolean;
  distanceMiles: number;
  amenities: string[];
  courtsCount: number;
  availableSlots: string[];
}

export interface CommunityGame {
  id: string;
  sport: SportType;
  title: string;
  format: '5v5' | '7v7' | '11v11' | '2v2 Doubles' | '3v3 Half-court';
  skillLevel: 'Beginner' | 'Casual' | 'Intermediate' | 'Competitive';
  date: string;
  time: string;
  locationName: string;
  distance: string;
  hostName: string;
  hostAvatar: AvatarId;
  spotsTotal: number;
  spotsJoined: number;
  pricePerPlayer: number;
  notes: string;
  isPublic: boolean;
  members: Array<{ name: string; avatar: AvatarId }>;
}

export interface Friend {
  id: string;
  name: string;
  username: string;
  avatarId: AvatarId;
  level: number;
  levelTitle: string;
  xp: number;
  activity: string; // e.g. "Joined 5v5 Sunset Match 10m ago"
  matchesWon: number;
  streak: number;
}

export interface UserPredictionWager {
  id: string;
  matchId: string;
  matchTitle: string;
  pollQuestion: string;
  optionId: string;
  optionLabel: string;
  stakeXp: number;
  odds: number;
  potentialWinXp: number;
  status: 'active' | 'won' | 'lost';
  placedAt: string;
  resolvedAt?: string;
  payoutXp?: number;
}

export interface BadgeItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  category: 'predictions' | 'matches' | 'community' | 'streaks';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  claimed: boolean;
  rewardXp: number;
  dateUnlocked?: string;
}
