'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether Supabase environment variables are configured.
 * When false, the app shows empty/error states instead of fake data.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let _supabaseInstance: SupabaseClient | null = null;

/**
 * Client-side Supabase client (strict singleton).
 * Returns null if Supabase is not configured — callers must handle this.
 * Guarantees a single GoTrueClient instance in the same browser context.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!_supabaseInstance) {
    try {
      _supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('[Supabase] Failed to initialize client:', err);
      return null;
    }
  }

  return _supabaseInstance;
}

/**
 * Backwards-compatible singleton reference.
 * Ensures NO second GoTrueClient is ever created.
 */
export const supabase = (getSupabaseClient() || null) as unknown as SupabaseClient;
