import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Server-side Supabase client for Route Handlers and Server Actions.
 * Optionally accepts an access token to impersonate a user session.
 * Returns null if Supabase is not configured.
 */
export function createServerClient(accessToken?: string): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;

  return createClient(supabaseUrl!, supabaseAnonKey!, {
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
  if (!supabaseServiceKey || !supabaseUrl) return null;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
