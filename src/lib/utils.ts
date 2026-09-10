import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MatchFormat, PaymentMethod } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
}

export function getSportDisplayName(sport: string): string {
  switch (sport.toLowerCase()) {
    case 'badminton':
      return 'Badminton';
    case 'pickleball':
      return 'Pickleball';
    case 'basketball':
      return 'Basketball';
    case 'padel':
      return 'Padel';
    case 'tennis':
      return 'Tennis';
    case 'volleyball':
      return 'Volleyball';
    case 'table_tennis':
      return 'Table Tennis';
    default:
      return sport;
  }
}

export function getFormatDisplayName(format: MatchFormat): string {
  switch (format) {
    case 'doubles':
      return 'Doubles (2v2)';
    case 'singles':
      return 'Singles (1v1)';
    case 'mixed_doubles':
      return 'Mixed Doubles (2v2)';
    default:
      return format;
  }
}

export function getPaymentMethodName(method: PaymentMethod): string {
  switch (method) {
    case 'gcash':
      return 'GCash';
    case 'maya':
      return 'Maya';
    case 'grabpay':
      return 'GrabPay';
    case 'bdo':
      return 'BDO Online';
    case 'bpi':
      return 'BPI Bank';
    case 'unionbank':
      return 'UnionBank';
    case 'cash':
      return 'Cash at Venue';
    default:
      return method;
  }
}

/**
 * Configurable Platform Fee Calculation
 * Example:
 * Total customer payment: ₱500 (50000 cents)
 * Platform fee: 5% (min ₱25, max ₱50)
 * Facility amount: ₱475
 */
export interface FeeCalculationConfig {
  feePercent?: number; // e.g., 0.05 (5%)
  minFeeCents?: number; // e.g., 2500 (₱25)
  maxFeeCents?: number; // e.g., 5000 (₱50)
}

export function calculateBookingFees(
  courtHourlyRateCents: number,
  durationMinutes: number = 60,
  config: FeeCalculationConfig = { feePercent: 0.06, minFeeCents: 2500, maxFeeCents: 6000 }
) {
  const courtSubtotalCents = Math.round(courtHourlyRateCents * (durationMinutes / 60));
  
  const rawFee = Math.round(courtSubtotalCents * (config.feePercent ?? 0.06));
  const platformFeeCents = Math.min(
    Math.max(rawFee, config.minFeeCents ?? 2500),
    config.maxFeeCents ?? 6000
  );

  const totalAmountCents = courtSubtotalCents;
  const facilityAmountCents = Math.max(0, totalAmountCents - platformFeeCents);

  return {
    courtSubtotalCents,
    platformFeeCents,
    facilityAmountCents,
    totalAmountCents,
  };
}

export function generateBookingReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MAT-${code}`;
}

export const SPORTS_CATALOG = [
  {
    id: 'pickleball',
    name: 'Pickleball',
    tagline: 'Dinking, fast kitchen rallies, and social play',
    defaultDurationMinutes: 60,
    surfaceTypes: ['Cushioned Acrylic', 'Polyurethane Indoor', 'Asphalt Hardcourt'],
    supportsDoubles: true,
    supportsSingles: true,
    accentColor: '#C87D43',
  },
  {
    id: 'badminton',
    name: 'Badminton',
    tagline: 'High-speed smashes, agile drops, and tournament Taraflex',
    defaultDurationMinutes: 60,
    surfaceTypes: ['BWF Taraflex Rubber', 'Hardwood Parquet', 'Vinyl Composite'],
    supportsDoubles: true,
    supportsSingles: true,
    accentColor: '#2D724E',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    tagline: 'Full-court runs, 3v3 pickups, and covered hardwood',
    defaultDurationMinutes: 60,
    surfaceTypes: ['Sprung Maple Hardwood', 'Outdoor Acrylic', 'Rubberized Court'],
    supportsDoubles: false,
    supportsSingles: false,
    accentColor: '#C87D43',
  },
  {
    id: 'tennis',
    name: 'Tennis',
    tagline: 'Classic baseline rallies, clay, and tournament hardcourts',
    defaultDurationMinutes: 60,
    surfaceTypes: ['Plexipave Hardcourt', 'Red Clay', 'Synthetic Turf'],
    supportsDoubles: true,
    supportsSingles: true,
    accentColor: '#E9C46A',
  },
  {
    id: 'padel',
    name: 'Padel',
    tagline: 'Panoramic glass enclosures, tactical wall rebounds & doubles',
    defaultDurationMinutes: 90,
    surfaceTypes: ['Mondo Supercourt Pro Turf', 'Textured Synthetic Grass'],
    supportsDoubles: true,
    supportsSingles: false,
    accentColor: '#1E4A32',
  },
] as const;

