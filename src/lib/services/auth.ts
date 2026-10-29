import { User, SportType, MatchFormat, SkillLevel, UserRole } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Fetch the currently authenticated user with their profile from Supabase.
 * Returns null if unauthenticated or Supabase is unconfigured.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const authUser = authData.user;
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`)
          .maybeSingle();

        if (!profile) {
          return {
            id: authUser.id,
            auth_id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Player',
            nickname: authUser.email?.split('@')[0] || 'Player',
            role: (authUser.user_metadata?.role as UserRole) || 'player',
            primary_sport: 'pickleball',
            preferred_sports: ['pickleball', 'badminton'],
            preferred_format: 'doubles',
            skill_level: 'intermediate',
            city: 'Metro Manila',
            matches_played: 0,
            matches_won: 0,
            win_streak: 0,
            highest_streak: 0,
            email_verified: Boolean(authUser.email_confirmed_at),
            onboarding_completed: true,
            has_completed_onboarding: true,
            created_at: authUser.created_at,
          };
        }

        return {
          ...profile,
          id: profile.auth_id || authUser.id,
          auth_id: profile.auth_id || authUser.id,
          primary_sport: profile.primary_sport || 'pickleball',
          preferred_sports: profile.preferred_sports || ['pickleball', 'badminton'],
          preferred_format: profile.preferred_format || 'doubles',
          skill_level: profile.skill_level || 'intermediate',
          city: profile.city || 'Metro Manila',
          email_verified: Boolean(authUser.email_confirmed_at),
          onboarding_completed: true,
          has_completed_onboarding: true,
        };
      }
    } catch (err) {
      console.warn('Error fetching Supabase user session:', err);
    }
  }

  // Check server session endpoint via /api/auth/me
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json?.user) {
          return {
            id: json.user.id,
            auth_id: json.user.id,
            email: json.user.email,
            full_name: json.user.full_name,
            nickname: json.user.nickname,
            avatar_url: json.user.avatar_url,
            role: json.user.role,
            primary_sport: json.user.primary_sport || 'pickleball',
            preferred_sports: json.user.preferred_sports || ['pickleball', 'badminton'],
            preferred_format: json.user.preferred_format || 'doubles',
            skill_level: json.user.skill_level || 'intermediate',
            city: json.user.city || 'Metro Manila',
            matches_played: 0,
            matches_won: 0,
            win_streak: 0,
            highest_streak: 0,
            email_verified: true,
            created_at: json.user.created_at,
            onboarding_completed: true,
            has_completed_onboarding: true,
          };
        }
      }
    } catch (err) {
      console.warn('Error fetching /api/auth/me:', err);
    }
  }

  return null;
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
  let clientSuccess = false;
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
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
          .or(`auth_id.eq.${authData.user.id},email.eq.${authData.user.email}`);

        if (!error) {
          clientSuccess = true;
        }
      }
    } catch (err) {
      console.warn('Direct client profile update notice:', err);
    }
  }

  // Always sync with the server profile endpoint to ensure database & session persistence
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: data.fullName,
          nickname: data.nickname,
          avatarUrl: data.avatarUrl,
          primarySport: data.primarySport,
          preferredSports: data.preferredSports,
          preferredFormat: data.preferredFormat,
          skillLevel: data.skillLevel,
          city: data.city,
          onboardingCompleted: true,
        }),
      });

      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.warn('Failed to call /api/auth/profile:', err);
    }
  }

  return clientSuccess;
}

/**
 * Development-only helper to reset onboarding completion state.
 */
export async function resetOnboardingForTesting(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await supabase
          .from('users')
          .update({
            onboarding_completed: false,
            updated_at: new Date().toISOString(),
          })
          .eq('auth_id', authData.user.id);
      }
    } catch (err) {
      console.warn('Supabase reset warning:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ onboardingCompleted: false }),
      });
    } catch {}
  }

  return true;
}
