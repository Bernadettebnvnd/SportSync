/**
 * SportSync Global Application Configuration
 * Official Name: SportSync
 * Official Tagline: Find Players. Play Together.
 */
export const APP_CONFIG = {
  appName: 'SportSync',
  tagline: 'Find Players. Play Together.',
  version: '3.0.0',
  city: 'Metro Area',
  currency: '₱',
  heroMeta: 'Find Players. Complete Rosters. Play Together.',
} as const;

export type AppConfig = typeof APP_CONFIG;
