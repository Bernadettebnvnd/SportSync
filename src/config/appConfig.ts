/**
 * SIDELINE Global Application Configuration
 * To rename the application, update the `appName` property here.
 */
export const APP_CONFIG = {
  appName: 'SIDELINE',
  tagline: 'Gather your friends. Play more.',
  version: '2.4.0',
  city: 'London / Metro',
  currency: '£',
  heroMeta: 'Stadium floodlights at night meets Sunday league with friends.',
} as const;

export type AppConfig = typeof APP_CONFIG;
