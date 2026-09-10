import { User, SportType, MatchFormat, SkillLevel, UserRole } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Fetch the currently authenticated user with their profile from Supabase.
 * Returns null if unauthenticated or Supabase is unconfigured.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return null;

    const authUser = authData.user;
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (!profile) {
      // User is authenticated in auth.users, return basic profile
      return {
        id: authUser.id,
        auth_id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Player',
        nickname: authUser.email?.split('@')[0] || 'Player',
        role: (authUser.user_metadata?.role as UserRole) || 'player',
        primary_sport: 'pickleball',
        skill_level: 'intermediate',
        city: 'Metro Manila',
        matches_played: 0,
        matches_won: 0,
        win_streak: 0,
        highest_streak: 0,
        email_verified: Boolean(authUser.email_confirmed_at),
        created_at: authUser.created_at,
      };
    }

    return {
      ...profile,
      email_verified: Boolean(authUser.email_confirmed_at),
    };
  } catch (err) {
    console.error('Error getting current user:', err);
    return null;
  }
}

/**
 * Check whether the current user has facility owner or manager capabilities.
 */
export async function checkIsOwnerOrStaff(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return false;

    // Check user role in public.users
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', authData.user.id)
      .maybeSingle();

    if (userProfile?.role === 'venue_owner' || userProfile?.role === 'organizer' || userProfile?.role === 'admin') {
      return true;
    }

    // Check if user is linked in facility_staff
    if (userProfile?.id) {
      const { count } = await supabase
        .from('facility_staff')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id);

      if (count && count > 0) return true;
    }

    return false;
  } catch (err) {
    console.error('Error checking staff authorization:', err);
    return false;
  }
}

/**
 * Update player onboarding preferences in Supabase profile.
 */
export async function updatePlayerProfile(data: {
  fullName?: string;
  nickname?: string;
  avatarUrl?: string;
  primarySport: SportType;
  preferredSports: SportType[];
  preferredFormat: MatchFormat;
  skillLevel: SkillLevel;
  city: string;
}): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return false;

    const { error } = await supabase
      .from('users')
      .update({
        full_name: data.fullName,
        nickname: data.nickname,
        avatar_url: data.avatarUrl,
        primary_sport: data.primarySport,
        preferred_sports: data.preferredSports,
        preferred_format: data.preferredFormat,
        skill_level: data.skillLevel,
        city: data.city,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_id', authData.user.id);

    if (error) {
      console.error('Error updating player profile:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to update player profile:', err);
    return false;
  }
}

/**
 * Development-only helper to reset onboarding completion state.
 */
export async function resetOnboardingForTesting(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return false;

    const { error } = await supabase
      .from('users')
      .update({
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_id', authData.user.id);

    if (error) {
      console.error('Error resetting onboarding status:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to reset onboarding status:', err);
    return false;
  }
}
