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

        const meta = authUser.user_metadata || {};
        const effectiveSports = (meta.preferred_sports && meta.preferred_sports.length > 0)
          ? meta.preferred_sports
          : (profile?.preferred_sports || ['football']);
        const effectiveCity = meta.city || profile?.city || 'Naga City';
        const effectivePrimarySport = meta.primary_sport || profile?.primary_sport || (effectiveSports[0] || 'football');
        const effectiveSkill = meta.skill_level || profile?.skill_level || 'intermediate';

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
            onboarding_completed: Boolean(meta.onboarding_completed === true),
            has_completed_onboarding: Boolean(meta.onboarding_completed === true),
            created_at: authUser.created_at,
          };
        }

        return {
          ...profile,
          id: profile.auth_id || authUser.id,
          auth_id: profile.auth_id || authUser.id,
          full_name: profile.full_name || meta.full_name || 'Player',
          nickname: profile.nickname || meta.nickname || 'Player',
          primary_sport: effectivePrimarySport,
          preferred_sports: effectiveSports,
          preferred_format: profile.preferred_format || meta.preferred_format || 'doubles',
          skill_level: effectiveSkill,
          city: effectiveCity,

          email_verified: Boolean(authUser.email_confirmed_at),
          onboarding_completed: Boolean(profile.onboarding_completed ?? meta.onboarding_completed ?? false),
          has_completed_onboarding: Boolean(profile.onboarding_completed ?? meta.onboarding_completed ?? false),
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
            city: json.user.city || '',
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


        const userUpdatePayload: any = {
          full_name: data.fullName,
          nickname: data.nickname,
          avatar_url: data.avatarUrl,
          primary_sport: data.primarySport,
          preferred_sports: data.preferredSports,
          preferred_format: data.preferredFormat,
          skill_level: data.skillLevel,
          city: data.city,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('users')
          .update(userUpdatePayload)
          .or(`auth_id.eq.${authData.user.id},email.eq.${authData.user.email}`);

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

/**
 * Synchronize the browser Supabase client with the authenticated user's session.
 * Ensures client-side calls to Supabase (like createVenueWithCourts) run with a valid Supabase user session.
 */
export async function syncSupabaseClientSession(
  session?: { access_token?: string; refresh_token?: string } | null,
  credentials?: { email?: string; password?: string }
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured) return false;

  // 1. Try to set session directly from tokens
  if (session?.access_token) {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
      });
      if (!error) return true;
      console.warn('[Auth] supabase.auth.setSession error:', error.message);
    } catch (e) {
      console.warn('[Auth] Exception during setSession:', e);
    }
  }

  // 2. Fallback to client-side sign-in if credentials provided
  if (credentials?.email && credentials?.password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password.trim(),
      });
      if (!error && data?.session) return true;
      if (error) {
        console.warn('[Auth] Direct client signInWithPassword notice:', error.message);
      }
    } catch (e) {
      console.warn('[Auth] Exception during client signInWithPassword:', e);
    }
  }

  return false;
}

export interface RegisterAccountParams {
  email: string;
  password: string;
  fullName: string;
  role: 'facility_owner' | 'player' | 'venue_owner';
  city?: string;
}

export interface AuthAccountResult {
  user: User;
  token: string;
  session?: any;
}

/**
 * Unified registration helper used across AuthModal, AuthScreen, and /onboarding.
 * Performs validation, server registration, session synchronization with browser Supabase,
 * state persistence in local storage, and store user hydration.
 */
export async function registerAccount(
  params: RegisterAccountParams,
  setAuthenticatedUser: (user: Partial<User>) => void
): Promise<AuthAccountResult> {
  const trimmedEmail = (params.email || '').trim().toLowerCase();
  const cleanPassword = (params.password || '').trim();
  const cleanFullName = (params.fullName || '').trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (!cleanPassword || cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  if (!cleanFullName) {
    throw new Error(
      params.role === 'facility_owner' || params.role === 'venue_owner'
        ? 'Please enter contact / owner name.'
        : 'Please enter your full name.'
    );
  }

  const isFacility = params.role === 'facility_owner' || params.role === 'venue_owner';
  const roleForApi = isFacility ? 'facility_owner' : 'player';
  const assignedRole: UserRole = isFacility ? 'venue_owner' : 'player';

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: trimmedEmail,
      password: cleanPassword,
      fullName: cleanFullName,
      role: roleForApi,
      city: params.city?.trim() || undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed.');
  }

  // Synchronize browser Supabase client session so database operations run with a valid Supabase user
  await syncSupabaseClientSession(data.session, {
    email: trimmedEmail,
    password: cleanPassword,
  });

  const registeredUser: User = {
    id: data.user.id,
    auth_id: data.user.id,
    email: data.user.email,
    full_name: data.user.full_name || cleanFullName,
    nickname: data.user.nickname || cleanFullName.split(' ')[0],
    avatar_url: data.user.avatar_url,
    role: assignedRole,
    primary_sport: data.user.primary_sport || (isFacility ? 'pickleball' : 'football'),
    preferred_sports: data.user.preferred_sports || (isFacility ? ['pickleball', 'badminton'] : ['football']),
    preferred_format: (data.user.preferred_format as MatchFormat) || 'doubles',
    skill_level: (data.user.skill_level as SkillLevel) || 'intermediate',
    city: data.user.city || params.city || 'Metro Manila',
    matches_played: 0,
    matches_won: 0,
    win_streak: 0,
    highest_streak: 0,
    email_verified: true,
    onboarding_completed: true,
    has_completed_onboarding: true,
    created_at: data.user.created_at || new Date().toISOString(),
  };

  setAuthenticatedUser(registeredUser);

  if (typeof window !== 'undefined') {
    localStorage.setItem('sportsync_user_id', data.user.id);
    localStorage.setItem('sportsync_user_email', data.user.email);
    localStorage.setItem('sportsync_user_role', assignedRole);
    localStorage.setItem('sportsync_user_name', data.user.full_name || cleanFullName);
    localStorage.removeItem('sportsync_pending_onboarding');
    localStorage.setItem('matchi_onboarding_completed', 'true');
    localStorage.setItem('sportsync_onboarding_completed', 'true');
    localStorage.removeItem('sportsync_user_profile');
    localStorage.removeItem('sportsync_user_city');
    localStorage.removeItem('sportsync_user_sports');
  }

  return {
    user: registeredUser,
    token: data.token,
    session: data.session,
  };
}

/**
 * Unified login helper used across AuthModal and AuthScreen.
 */
export async function loginAccount(
  params: { email: string; password: string },
  setAuthenticatedUser: (user: Partial<User>) => void
): Promise<AuthAccountResult> {
  const trimmedEmail = (params.email || '').trim().toLowerCase();
  const cleanPassword = (params.password || '').trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (!cleanPassword || cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: trimmedEmail,
      password: cleanPassword,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Login failed. Please check credentials.');
  }

  await syncSupabaseClientSession(data.session, {
    email: trimmedEmail,
    password: cleanPassword,
  });

  const isFacility = data.user.role === 'venue_owner' || data.user.role === 'organizer' || data.user.role === 'facility_owner';
  const assignedRole: UserRole = isFacility ? 'venue_owner' : (data.user.role || 'player');
  const isOnboarded = Boolean(data.user.onboarding_completed);

  const loggedInUser: User = {
    id: data.user.id,
    auth_id: data.user.id,
    email: data.user.email,
    full_name: data.user.full_name,
    nickname: data.user.nickname,
    avatar_url: data.user.avatar_url,
    role: assignedRole,
    primary_sport: data.user.primary_sport || 'pickleball',
    preferred_sports: data.user.preferred_sports || ['pickleball', 'badminton'],
    preferred_format: (data.user.preferred_format as MatchFormat) || 'doubles',
    skill_level: (data.user.skill_level as SkillLevel) || 'intermediate',
    city: data.user.city || 'Metro Manila',
    matches_played: data.user.matches_played || 0,
    matches_won: data.user.matches_won || 0,
    win_streak: data.user.win_streak || 0,
    highest_streak: data.user.highest_streak || 0,
    email_verified: true,
    onboarding_completed: true,
    has_completed_onboarding: true,
    created_at: data.user.created_at || new Date().toISOString(),
  };

  setAuthenticatedUser(loggedInUser);

  if (typeof window !== 'undefined') {
    localStorage.setItem('sportsync_user_id', data.user.id);
    localStorage.setItem('sportsync_user_email', data.user.email);
    localStorage.setItem('sportsync_user_role', assignedRole);
    if (data.user.full_name) localStorage.setItem('sportsync_user_name', data.user.full_name);

    localStorage.removeItem('sportsync_pending_onboarding');
    localStorage.setItem('matchi_onboarding_completed', 'true');
    localStorage.setItem('sportsync_onboarding_completed', 'true');
  }

  return {
    user: loggedInUser,
    token: data.token,
    session: data.session,
  };
}
