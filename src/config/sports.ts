/**
 * SportSync Standardized Sport Categories
 * Strictly ordered per specification:
 * 1. All
 * 2. Basketball
 * 3. Badminton
 * 4. Volleyball
 * 5. Football
 * 6. Pickleball
 * 7. Tennis
 * 8. Billiards
 * 9. Darts
 * 10. Other
 */

export const STANDARDIZED_SPORTS = [
  'All',
  'Basketball',
  'Badminton',
  'Volleyball',
  'Football',
  'Pickleball',
  'Tennis',
  'Billiards',
  'Darts',
  'Other',
] as const;

export type StandardSport = (typeof STANDARDIZED_SPORTS)[number];

export const PRIMARY_SPORTS = [
  'Basketball',
  'Badminton',
  'Volleyball',
  'Football',
  'Pickleball',
  'Tennis',
  'Billiards',
  'Darts',
  'Other',
] as const;

export type PrimarySport = (typeof PRIMARY_SPORTS)[number];

export const SPORT_DISPLAY_NAMES: Record<string, string> = {
  basketball: 'Basketball',
  badminton: 'Badminton',
  volleyball: 'Volleyball',
  football: 'Football',
  pickleball: 'Pickleball',
  tennis: 'Tennis',
  billiards: 'Billiards',
  darts: 'Darts',
  other: 'Other',
};

export function normalizeSportName(sport: string): PrimarySport {
  const s = (sport || '').toLowerCase().trim();
  if (s.includes('basket')) return 'Basketball';
  if (s.includes('badmin')) return 'Badminton';
  if (s.includes('volley')) return 'Volleyball';
  if (s.includes('foot') || s.includes('soccer')) return 'Football';
  if (s.includes('pickle')) return 'Pickleball';
  if (s.includes('tennis') || s.includes('padel')) return 'Tennis';
  if (s.includes('billiard') || s.includes('pool')) return 'Billiards';
  if (s.includes('dart')) return 'Darts';
  return 'Other';
}
