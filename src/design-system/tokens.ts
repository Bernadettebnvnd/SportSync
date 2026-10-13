/**
 * SportSync Design System Tokens
 * Strict color, typographic, elevation, and spacing tokens
 */

export const colors = {
  // Dark Base Canvas (Default)
  bgBase: '#0B0F0C',
  bgForest: '#0F2A22',
  surface1: '#141A15',
  surface2: '#1C241E',
  surface3: '#263028',
  strokeSubtle: 'rgba(255, 255, 255, 0.08)',
  strokeMedium: 'rgba(255, 255, 255, 0.16)',

  // Accents & Signals
  accentLime: '#C8FF2E',
  accentLimeInk: '#0B0F0C',
  accentPink: '#FF8FC7',
  accentClay: '#C8432B',
  liveRed: '#FF3B30',

  // Status Indicators
  winGreen: '#3DDC84',
  lossRed: '#FF5C5C',
  drawAmber: '#FFC247',

  // Typography Tones
  textPrimary: '#F4F7F0',
  textSecondary: '#A5B0A6',
  textTertiary: '#6F7B71',

  // Light Card & Venue Highlight (Ref C)
  lightSurface: '#F5F7F2',
  lightSurfaceInk: '#0B0F0C',
  lightSurfaceSecondary: '#4A554D',
} as const;

export const radii = {
  none: '0px',
  sm: '8px',
  md: '12px',
  input: '16px',
  tile: '20px',
  card: '28px',
  notch: '24px',
  full: '9999px',
} as const;

export const shadows = {
  limeGlow: '0 0 32px rgba(200, 255, 46, 0.25)',
  pinkGlow: '0 0 28px rgba(255, 143, 199, 0.22)',
  subtleCard: '0 8px 30px rgba(0, 0, 0, 0.35)',
  glassCard: '0 12px 40px rgba(0, 0, 0, 0.45)',
  floatingNav: '0 16px 48px rgba(0, 0, 0, 0.65)',
} as const;

export const typography = {
  fonts: {
    display: '"Sora", sans-serif',
    editorial: '"Instrument Serif", serif',
    body: '"Inter Tight", sans-serif',
    mono: 'monospace',
  },
  sizes: {
    display: { fontSize: '40px', lineHeight: '44px', fontWeight: '700' },
    h1: { fontSize: '32px', lineHeight: '38px', fontWeight: '700' },
    h2: { fontSize: '24px', lineHeight: '30px', fontWeight: '600' },
    h3: { fontSize: '20px', lineHeight: '26px', fontWeight: '600' },
    body: { fontSize: '16px', lineHeight: '24px', fontWeight: '400' },
    bodyMedium: { fontSize: '16px', lineHeight: '24px', fontWeight: '500' },
    bodyS: { fontSize: '14px', lineHeight: '20px', fontWeight: '400' },
    bodySMedium: { fontSize: '14px', lineHeight: '20px', fontWeight: '500' },
    caption: { fontSize: '12px', lineHeight: '16px', fontWeight: '500' },
    overline: { fontSize: '11px', lineHeight: '14px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' },
  },
} as const;
