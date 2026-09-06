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
