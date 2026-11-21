import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SERVICE_ROLE_KEY;

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;
  if (!url || !anonKey || anonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) return null;

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
}

/**
 * Admin client using Service Role key (bypasses RLS).
 * Only available on the server when SUPABASE_SERVICE_ROLE_KEY is set.
 * Returns null if not configured.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    supabaseServiceKey;

  if (!serviceKey || !url) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
