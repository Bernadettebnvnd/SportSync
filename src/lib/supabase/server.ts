import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function cleanEnvString(val?: string | null): string {
  if (!val) return '';
  const firstLine = val.split(/[\r\n]|\\n/)[0].trim();
  const withoutComment = firstLine.split('#')[0].trim();
  return withoutComment.replace(/^["']|["']$/g, '').trim();
}

const supabaseUrl = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseServiceKey = cleanEnvString(
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SERVICE_ROLE_KEY
);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('xyzcompany.supabase.co') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
);

/**
 * Server-side Supabase client for Route Handlers and Server Actions.
 * Optionally accepts an access token to impersonate a user session.
 * Returns null if Supabase is not configured.
 */
export function createServerClient(accessToken?: string): SupabaseClient | null {
  const url = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_URL) || supabaseUrl;
  const anonKey = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || supabaseAnonKey;
  if (!url || !anonKey || anonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) return null;

  try {
    return createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    });
  } catch (err) {
    console.warn('[Supabase Server] Failed initializing server client:', err);
    return null;
  }
}

/**
 * Admin client using Service Role key (bypasses RLS).
 * Only available on the server when SUPABASE_SERVICE_ROLE_KEY is set.
 * Returns null if not configured.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_URL) || supabaseUrl;
  const serviceKey = cleanEnvString(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    supabaseServiceKey
  );

  if (!serviceKey || !url) return null;

  try {
    return createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.warn('[Supabase Server] Failed initializing admin client:', err);
    return null;
  }
}
