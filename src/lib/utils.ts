import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export function getSportEmoji(sport: string): string {
  switch (sport.toLowerCase()) {
    case 'badminton':
      return '🏸';
    case 'pickleball':
      return '🥒';
    case 'basketball':
      return '🏀';
    case 'padel':
      return '🎾';
    case 'tennis':
      return '🎾';
    case 'volleyball':
      return '🏐';
    case 'table_tennis':
      return '🏓';
    default:
      return '⚡';
  }
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
