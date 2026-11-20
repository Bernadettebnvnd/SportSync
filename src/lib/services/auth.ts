import { User, SportType, MatchFormat, SkillLevel, UserRole } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Fetch the currently authenticated user with their profile from Supabase.
 * Returns null if unauthenticated or Supabase is unconfigured.
 */
export async function getCurrentUser(): Promise<User | null> {
  // If user has explicitly logged out, do not restore previous session
  if (typeof window !== 'undefined' && localStorage.getItem('sportsync_logged_out') === 'true') {
    return null;
  }

  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const authUser = authData.user;
        const normalizedEmail = (authUser.email || '').trim().toLowerCase();

        // 1. Retrieve the profile using the authenticated user's actual Supabase user ID (auth_id)
        let { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authUser.id)
          .maybeSingle();

        // 2. Fallback: check if public.users.id equals the auth user ID
        if (!profile) {
          const { data: profileById } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
          profile = profileById;
        }

        // 3. Fallback: match by email if auth_id was not yet linked
        if (!profile && normalizedEmail) {
          const { data: fallbackProfile } = await supabase
            .from('users')
            .select('*')
            .ilike('email', normalizedEmail)
            .order('onboarding_completed', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          profile = fallbackProfile;

          // If found by email, link auth_id immediately so future lookups succeed directly
          if (profile && !profile.auth_id) {
            supabase
              .from('users')
              .update({ auth_id: authUser.id, updated_at: new Date().toISOString() })
              .eq('id', profile.id)
              .then(() => {}, () => {});
            profile.auth_id = authUser.id;
          }
        }

        const meta = authUser.user_metadata || {};
        const effectiveSports = (Array.isArray(profile?.preferred_sports) && profile.preferred_sports.length > 0)
          ? profile.preferred_sports
          : (Array.isArray(meta.preferred_sports) && meta.preferred_sports.length > 0
              ? meta.preferred_sports
              : (profile?.primary_sport ? [profile.primary_sport] : ['football']));
        const effectiveCity = profile?.city || meta.city || '';
        const effectivePrimarySport = profile?.primary_sport || meta.primary_sport || effectiveSports[0] || 'football';
        const effectiveSkill = profile?.skill_level || meta.skill_level || 'intermediate';

        const isExplicitlyComplete = Boolean(
          profile?.onboarding_completed === true ||
          profile?.onboarding_completed === 'true' ||
          profile?.has_completed_onboarding === true ||
          meta.onboarding_completed === true ||
          meta.onboarding_completed === 'true' ||
          meta.has_completed_onboarding === true
        );

        const isOwner =
          profile?.role === 'venue_owner' ||
          profile?.role === 'organizer' ||
          meta.role === 'venue_owner' ||
          meta.role === 'organizer';

        // Check whether existing player profile has required setup fields filled
        const hasRequiredPlayerFields = !isOwner && Boolean(
          profile &&
          profile.full_name &&
          !['Player', 'Guest Player', 'Guest', 'SportSync Player', 'Google Player'].includes(profile.full_name.trim()) &&
          ((Array.isArray(profile.preferred_sports) && profile.preferred_sports.length > 0) || profile.primary_sport) &&
          Boolean(profile.city || profile.skill_level)
        );

        const hasRequiredOwnerFields = isOwner && Boolean(
          profile &&
          profile.full_name &&
          !['Player', 'Guest Player', 'Guest', 'SportSync Player', 'Google Player'].includes(profile.full_name.trim()) &&
          Boolean(profile.city || profile.phone)
        );

        const isUserComplete = isExplicitlyComplete || hasRequiredPlayerFields || hasRequiredOwnerFields;

        if (isUserComplete) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('sportsync_onboarding_completed', 'true');
            localStorage.setItem('matchi_onboarding_completed', 'true');
            localStorage.removeItem('sportsync_pending_onboarding');
          }
          if (profile?.id && profile.onboarding_completed !== true) {
            supabase
              .from('users')
              .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
              .eq('id', profile.id)
              .then(() => {}, () => {});
          }
        }

        if (!profile) {
          return {
            id: authUser.id,
            auth_id: authUser.id,
            email: authUser.email || '',
            full_name: meta.full_name || authUser.email?.split('@')[0] || 'Player',
            nickname: meta.nickname || authUser.email?.split('@')[0] || 'Player',
            role: (meta.role as UserRole) || 'player',
            primary_sport: effectivePrimarySport,
            preferred_sports: effectiveSports,
            preferred_format: meta.preferred_format || 'doubles',
            skill_level: effectiveSkill,
            city: effectiveCity,

            matches_played: 0,
            matches_won: 0,
            win_streak: 0,
            highest_streak: 0,
            email_verified: Boolean(authUser.email_confirmed_at),
            onboarding_completed: isUserComplete,
            has_completed_onboarding: isUserComplete,
            created_at: authUser.created_at,
          };
        }

        return {
          ...profile,
          id: profile.auth_id || profile.id || authUser.id,
          auth_id: profile.auth_id || authUser.id,
          full_name: profile.full_name || meta.full_name || 'Player',
          nickname: profile.nickname || meta.nickname || 'Player',
          primary_sport: effectivePrimarySport,
          preferred_sports: effectiveSports,
          preferred_format: profile.preferred_format || meta.preferred_format || 'doubles',
          skill_level: effectiveSkill,
          city: effectiveCity,

          email_verified: Boolean(authUser.email_confirmed_at),
          onboarding_completed: isUserComplete,
          has_completed_onboarding: isUserComplete,
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
            city: json.user.city || 'Naga City',
            matches_played: 0,
            matches_won: 0,
            win_streak: 0,
            highest_streak: 0,
            email_verified: true,
            created_at: json.user.created_at,
            onboarding_completed: Boolean(json.user.onboarding_completed ?? json.user.has_completed_onboarding ?? false),
            has_completed_onboarding: Boolean(json.user.onboarding_completed ?? json.user.has_completed_onboarding ?? false),
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
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: data.fullName,
              nickname: data.nickname,
              avatar_url: data.avatarUrl,
              primary_sport: data.primarySport,
              preferred_sports: data.preferredSports,
              preferred_format: data.preferredFormat,
              skill_level: data.skillLevel,
              city: data.city,
              onboarding_completed: true,
            },
          });
        } catch {}


        let { error } = await supabase
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
          const retry = await supabase
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
            .eq('id', authData.user.id);
          error = retry.error;
        }

        if (!error) {
          clientSuccess = true;
        }
      }
    } catch (err) {
      console.warn('Direct client profile update notice:', err);
    }
  }

  // Always mirror updated city to local cache for instant persistence across reloads
  if (typeof window !== 'undefined') {
    if (data.city) {
      localStorage.setItem('sportsync_user_city', data.city);
    }
    const saved = localStorage.getItem('sportsync_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        localStorage.setItem(
          'sportsync_user_profile',
          JSON.stringify({
            ...parsed,
            name: data.fullName || parsed.name,
            city: data.city || parsed.city || '',
          })
        );
      } catch {}
    }
  }

  // Always sync with the server profile endpoint to ensure database & session persistence
  if (typeof window !== 'undefined') {
    try {
      const storedId = localStorage.getItem('sportsync_user_id') || localStorage.getItem('matchi_user_id');
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: storedId,
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
 * Update faculty onboarding preferences and completion status in Supabase.
 */
export async function updateFacultyProfile(data: {
  fullName?: string;
  phone?: string;
  city?: string;
}): Promise<boolean> {
  let clientSuccess = false;
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: data.fullName,
              phone: data.phone,
              city: data.city || 'Naga City',
              role: 'venue_owner',
              onboarding_completed: true,
              has_completed_onboarding: true,
            },
          });
        } catch {}

        let { error } = await supabase
          .from('users')
          .update({
            full_name: data.fullName,
            phone: data.phone,
            city: data.city || 'Naga City',
            role: 'venue_owner',
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('auth_id', authData.user.id);

        if (error) {
          const retry = await supabase
            .from('users')
            .update({
              full_name: data.fullName,
              phone: data.phone,
              city: data.city || 'Naga City',
              role: 'venue_owner',
              onboarding_completed: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', authData.user.id);
          error = retry.error;
        }

        if (!error) {
          clientSuccess = true;
        }
      }
    } catch (err) {
      console.warn('Direct client faculty profile update notice:', err);
    }
  }

  // Always sync with the server profile endpoint to ensure database & session persistence
  if (typeof window !== 'undefined') {
    try {
      const storedId = localStorage.getItem('sportsync_user_id') || localStorage.getItem('matchi_user_id');
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: storedId,
          fullName: data.fullName,
          full_name: data.fullName,
          phone: data.phone,
          role: 'venue_owner',
          city: data.city || 'Naga City',
          onboardingCompleted: true,
          onboarding_completed: true,
        }),
      });

      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.warn('Failed to call /api/auth/profile for faculty:', err);
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
