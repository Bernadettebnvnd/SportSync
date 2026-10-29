import crypto from 'crypto';
import { UserRole } from '@/types';
import { isSupabaseConfigured, createAdminClient, createServerClient } from '@/lib/supabase/server';

export interface SanitizedUser {
  id: string;
  email: string;
  full_name: string;
  nickname: string;
  avatar_url?: string;
  role: UserRole;
  primary_sport?: string;
  preferred_sports?: string[];
  preferred_format?: string;
  skill_level?: string;
  city?: string;
  onboarding_completed: boolean;
  created_at: string;
}

export type StoredUser = SanitizedUser;

// Generate simple HMAC session token
const SESSION_SECRET = process.env.SESSION_SECRET || 'sportsync-secure-session-key-2026';

export function createSessionToken(user: SanitizedUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): { userId: string; email: string; role: UserRole } | null {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (Date.now() > decoded.exp) return null;

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

// In-memory user store for development / offline MVP fallback when Supabase is not configured
const localDevUsers = new Map<string, { user: SanitizedUser; passwordHash: string }>();

// Pre-seed default test users for development testing
const initialPlayerUser: SanitizedUser = {
  id: 'usr_test_player_01',
  email: 'test.player@sportsync.ph',
  full_name: 'Test Player',
  nickname: 'Tester',
  role: 'player',
  primary_sport: 'pickleball',
  preferred_sports: ['pickleball', 'badminton'],
  preferred_format: 'doubles',
  skill_level: 'intermediate',
  city: 'Taguig City',
  onboarding_completed: true,
  created_at: new Date().toISOString(),
};
localDevUsers.set('test.player@sportsync.ph', {
  user: initialPlayerUser,
  passwordHash: crypto.createHash('sha256').update('password123').digest('hex'),
});

const initialOwnerUser: SanitizedUser = {
  id: 'usr_test_owner_01',
  email: 'owner@sportsync.ph',
  full_name: 'Venue Partner',
  nickname: 'Owner',
  role: 'venue_owner',
  primary_sport: 'badminton',
  preferred_sports: ['badminton', 'pickleball'],
  preferred_format: 'doubles',
  skill_level: 'advanced',
  city: 'Pasig City',
  onboarding_completed: true,
  created_at: new Date().toISOString(),
};
localDevUsers.set('owner@sportsync.ph', {
  user: initialOwnerUser,
  passwordHash: crypto.createHash('sha256').update('password123').digest('hex'),
});

export async function serverRegister(data: {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}): Promise<{ user: SanitizedUser; token: string }> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const assignedRole: UserRole = data.role === 'facility_owner' ? 'venue_owner' : 'player';

  // 1. Fallback for Local Development / Offline MVP when Supabase is not configured
  if (!isSupabaseConfigured) {
    const existing = localDevUsers.get(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }

    const localId = `usr_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sanitized: SanitizedUser = {
      id: localId,
      email: normalizedEmail,
      full_name: data.fullName.trim() || normalizedEmail.split('@')[0],
      nickname: normalizedEmail.split('@')[0],
      role: assignedRole,
      primary_sport: 'pickleball',
      preferred_sports: ['pickleball', 'badminton'],
      preferred_format: 'doubles',
      skill_level: 'intermediate',
      city: 'Metro Manila',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
    };

    localDevUsers.set(normalizedEmail, {
      user: sanitized,
      passwordHash: crypto.createHash('sha256').update(data.password).digest('hex'),
    });

    const token = createSessionToken(sanitized);
    return { user: sanitized, token };
  }

  // 2. Production Supabase Registration
  const admin = createAdminClient();
  const serverClient = createServerClient();
  const authClient = admin || serverClient;

  if (!authClient) {
    throw new Error('Supabase is configured, but failed to initialize an authentication client. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.');
  }

  let supaUserId: string | null = null;
  let supaCreatedAt: string = new Date().toISOString();

  if (admin) {
    const { data: supaUser, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName.trim(),
        role: assignedRole,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already') || error.status === 422) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }
      throw new Error(error.message);
    }

    if (supaUser?.user) {
      supaUserId = supaUser.user.id;
      supaCreatedAt = supaUser.user.created_at;
    }
  } else if (serverClient) {
    const { data: supaUser, error } = await serverClient.auth.signUp({
      email: normalizedEmail,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName.trim(),
          role: assignedRole,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already') || error.status === 422) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }
      throw new Error(error.message);
    }

    if (supaUser?.user) {
      supaUserId = supaUser.user.id;
      supaCreatedAt = supaUser.user.created_at;
    }
  }

  if (!supaUserId) {
    throw new Error('Failed to register user.');
  }

  const dbClient = admin || serverClient;
  if (dbClient) {
    try {
      const { data: existingUser } = await dbClient
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        await dbClient
          .from('users')
          .update({
            auth_id: supaUserId,
            full_name: data.fullName.trim() || normalizedEmail.split('@')[0],
            role: assignedRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);
      } else {
        await dbClient.from('users').insert({
          auth_id: supaUserId,
          email: normalizedEmail,
          full_name: data.fullName.trim() || normalizedEmail.split('@')[0],
          role: assignedRole,
          onboarding_completed: false,
          primary_sport: 'pickleball',
          preferred_sports: ['pickleball', 'badminton'],
          preferred_format: 'doubles',
          skill_level: 'intermediate',
          city: 'Metro Manila',
        });
      }
    } catch (dbErr) {
      console.warn('[ServerAuth] public.users upsert warning:', dbErr);
    }
  }

  const sanitized: SanitizedUser = {
    id: supaUserId,
    email: normalizedEmail,
    full_name: data.fullName.trim() || normalizedEmail.split('@')[0],
    nickname: normalizedEmail.split('@')[0],
    role: assignedRole,
    primary_sport: 'pickleball',
    preferred_sports: ['pickleball', 'badminton'],
    preferred_format: 'doubles',
    skill_level: 'intermediate',
    city: 'Metro Manila',
    onboarding_completed: false,
    created_at: supaCreatedAt,
  };

  const token = createSessionToken(sanitized);
  return { user: sanitized, token };
}

export async function serverLogin(data: {
  email: string;
  password: string;
}): Promise<{ user: SanitizedUser; token: string }> {
  const normalizedEmail = data.email.trim().toLowerCase();

  // 1. Fallback for Local Development / Offline MVP when Supabase is not configured
  if (!isSupabaseConfigured) {
    const record = localDevUsers.get(normalizedEmail);
    if (record) {
      const incomingHash = crypto.createHash('sha256').update(data.password).digest('hex');
      if (record.passwordHash && record.passwordHash !== incomingHash && data.password !== 'password123') {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }
      const token = createSessionToken(record.user);
      return { user: record.user, token };
    }

    // Auto-provision local developer account for testing if not yet explicitly registered
    const localId = `usr_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isOwner = normalizedEmail.includes('owner') || normalizedEmail.includes('venue');
    const autoUser: SanitizedUser = {
      id: localId,
      email: normalizedEmail,
      full_name: normalizedEmail.split('@')[0],
      nickname: normalizedEmail.split('@')[0],
      role: isOwner ? 'venue_owner' : 'player',
      primary_sport: 'pickleball',
      preferred_sports: ['pickleball', 'badminton'],
      preferred_format: 'doubles',
      skill_level: 'intermediate',
      city: 'Metro Manila',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
    };

    localDevUsers.set(normalizedEmail, {
      user: autoUser,
      passwordHash: crypto.createHash('sha256').update(data.password).digest('hex'),
    });

    const token = createSessionToken(autoUser);
    return { user: autoUser, token };
  }

  // 2. Production Supabase Login
  const supabase = createServerClient();
  const admin = createAdminClient();
  const authClient = supabase || admin;

  if (!authClient) {
    throw new Error('Supabase authentication client is not available.');
  }

  const { data: supaData, error } = await authClient.auth.signInWithPassword({
    email: normalizedEmail,
    password: data.password,
  });

  if (error || !supaData?.user) {
    throw new Error('Invalid email or password. Please verify your credentials.');
  }

  // Retrieve database profile from public.users table (match by auth_id or email)
  const dbClient = admin || supabase;
  let dbProfile: any = null;
  if (dbClient) {
    try {
      const { data: profile } = await dbClient
        .from('users')
        .select('*')
        .or(`auth_id.eq.${supaData.user.id},email.eq.${normalizedEmail}`)
        .maybeSingle();
      dbProfile = profile;

      // If found by email but auth_id is not yet linked, link it now
      if (dbProfile && (!dbProfile.auth_id || dbProfile.auth_id !== supaData.user.id)) {
        await dbClient
          .from('users')
          .update({ auth_id: supaData.user.id, updated_at: new Date().toISOString() })
          .eq('id', dbProfile.id);
        dbProfile.auth_id = supaData.user.id;
      }
    } catch (dbErr) {
      console.warn('[ServerAuth] Error loading profile from Supabase:', dbErr);
    }
  }

  const userMeta = supaData.user.user_metadata;
  const sanitized: SanitizedUser = {
    id: supaData.user.id,
    email: supaData.user.email || normalizedEmail,
    full_name: dbProfile?.full_name || userMeta?.full_name || normalizedEmail.split('@')[0],
    nickname: dbProfile?.nickname || userMeta?.full_name?.split(' ')[0] || normalizedEmail.split('@')[0],
    avatar_url: dbProfile?.avatar_url,
    role: (dbProfile?.role || (userMeta?.role === 'venue_owner' ? 'venue_owner' : 'player')) as UserRole,
    primary_sport: dbProfile?.primary_sport || 'pickleball',
    preferred_sports: dbProfile?.preferred_sports || ['pickleball', 'badminton'],
    preferred_format: dbProfile?.preferred_format || 'doubles',
    skill_level: dbProfile?.skill_level || 'intermediate',
    city: dbProfile?.city || 'Metro Manila',
    onboarding_completed: Boolean(dbProfile?.onboarding_completed ?? userMeta?.onboarding_completed),
    created_at: supaData.user.created_at,
  };

  const token = createSessionToken(sanitized);
  return { user: sanitized, token };
}

export async function serverGetUser(userId: string): Promise<SanitizedUser | null> {
  if (!isSupabaseConfigured) {
    for (const record of localDevUsers.values()) {
      if (record.user.id === userId) {
        return record.user;
      }
    }
    if (userId === 'usr_test_player_01') {
      return initialPlayerUser;
    }
    if (userId === 'usr_test_owner_01') {
      return initialOwnerUser;
    }
    return null;
  }

  try {
    const db = createAdminClient() || createServerClient();
    if (db) {
      const { data: supaUser } = await db
        .from('users')
        .select('*')
        .or(`auth_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle();

      if (supaUser) {
        return {
          id: supaUser.auth_id || supaUser.id,
          email: supaUser.email,
          full_name: supaUser.full_name || supaUser.email.split('@')[0],
          nickname: supaUser.nickname || supaUser.full_name?.split(' ')[0] || supaUser.email.split('@')[0],
          avatar_url: supaUser.avatar_url,
          role: supaUser.role as UserRole,
          primary_sport: supaUser.primary_sport || 'pickleball',
          preferred_sports: supaUser.preferred_sports || ['pickleball', 'badminton'],
          preferred_format: supaUser.preferred_format || 'doubles',
          skill_level: supaUser.skill_level || 'intermediate',
          city: supaUser.city || 'Metro Manila',
          onboarding_completed: Boolean(supaUser.onboarding_completed),
          created_at: supaUser.created_at,
        };
      }

      const admin = createAdminClient();
      if (admin) {
        const { data: authData } = await admin.auth.admin.getUserById(userId);
        if (authData?.user) {
          const u = authData.user;
          return {
            id: u.id,
            email: u.email || '',
            full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Player',
            nickname: u.user_metadata?.full_name?.split(' ')[0] || u.email?.split('@')[0] || 'Player',
            avatar_url: u.user_metadata?.avatar_url,
            role: (u.user_metadata?.role as UserRole) || 'player',
            primary_sport: 'pickleball',
            preferred_sports: ['pickleball', 'badminton'],
            preferred_format: 'doubles',
            skill_level: 'intermediate',
            city: 'Metro Manila',
            onboarding_completed: Boolean(u.user_metadata?.onboarding_completed),
            created_at: u.created_at,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[ServerAuth] Supabase lookup error in serverGetUser:', err);
  }

  return null;
}

export async function serverUpdateUserProfile(
  userId: string,
  data: {
    fullName?: string;
    full_name?: string;
    nickname?: string;
    avatarUrl?: string;
    avatar_url?: string;
    primarySport?: string;
    primary_sport?: string;
    preferredSports?: string[];
    preferred_sports?: string[];
    preferredFormat?: string;
    preferred_format?: string;
    city?: string;
    skillLevel?: string;
    skill_level?: string;
    onboardingCompleted?: boolean;
    onboarding_completed?: boolean;
  }
): Promise<SanitizedUser | null> {
  const resolvedFullName = data.fullName || data.full_name;
  const resolvedNickname = data.nickname;
  const resolvedAvatarUrl = data.avatarUrl || data.avatar_url;
  const resolvedPrimarySport = data.primarySport || data.primary_sport;
  const resolvedPreferredSports = data.preferredSports || data.preferred_sports;
  const resolvedPreferredFormat = data.preferredFormat || data.preferred_format;
  const resolvedCity = data.city;
  const resolvedSkillLevel = data.skillLevel || data.skill_level;
  const resolvedOnboardingCompleted = data.onboardingCompleted ?? data.onboarding_completed ?? true;

  if (!isSupabaseConfigured) {
    for (const [email, record] of localDevUsers.entries()) {
      if (record.user.id === userId) {
        const updated: SanitizedUser = {
          ...record.user,
          full_name: resolvedFullName || record.user.full_name,
          nickname: resolvedNickname || record.user.nickname,
          avatar_url: resolvedAvatarUrl || record.user.avatar_url,
          primary_sport: resolvedPrimarySport || record.user.primary_sport,
          preferred_sports: resolvedPreferredSports || record.user.preferred_sports,
          preferred_format: resolvedPreferredFormat || record.user.preferred_format,
          city: resolvedCity || record.user.city,
          skill_level: resolvedSkillLevel || record.user.skill_level,
          onboarding_completed: resolvedOnboardingCompleted,
        };
        localDevUsers.set(email, { ...record, user: updated });
        return updated;
      }
    }

    const dummyUser: SanitizedUser = {
      id: userId,
      email: `${userId}@sportsync.ph`,
      full_name: resolvedFullName || 'Player',
      nickname: resolvedNickname || 'Player',
      avatar_url: resolvedAvatarUrl,
      role: 'player',
      primary_sport: resolvedPrimarySport || 'pickleball',
      preferred_sports: resolvedPreferredSports || ['pickleball', 'badminton'],
      preferred_format: resolvedPreferredFormat || 'doubles',
      skill_level: resolvedSkillLevel || 'intermediate',
      city: resolvedCity || 'Metro Manila',
      onboarding_completed: resolvedOnboardingCompleted,
      created_at: new Date().toISOString(),
    };
    localDevUsers.set(dummyUser.email, {
      user: dummyUser,
      passwordHash: '',
    });
    return dummyUser;
  }

  try {
    const db = createAdminClient() || createServerClient();
    if (db) {
      const updatePayload: Record<string, any> = {
        onboarding_completed: resolvedOnboardingCompleted,
        updated_at: new Date().toISOString(),
      };
      if (resolvedFullName) updatePayload.full_name = resolvedFullName;
      if (resolvedNickname) updatePayload.nickname = resolvedNickname;
      if (resolvedAvatarUrl) updatePayload.avatar_url = resolvedAvatarUrl;
      if (resolvedPrimarySport) updatePayload.primary_sport = resolvedPrimarySport;
      if (resolvedPreferredSports) updatePayload.preferred_sports = resolvedPreferredSports;
      if (resolvedPreferredFormat) updatePayload.preferred_format = resolvedPreferredFormat;
      if (resolvedCity) updatePayload.city = resolvedCity;
      if (resolvedSkillLevel) updatePayload.skill_level = resolvedSkillLevel;

      const { data: updatedUser, error } = await db
        .from('users')
        .update(updatePayload)
        .or(`auth_id.eq.${userId},id.eq.${userId}`)
        .select('*')
        .maybeSingle();

      if (!error && updatedUser) {
        return {
          id: updatedUser.auth_id || updatedUser.id,
          email: updatedUser.email,
          full_name: updatedUser.full_name || updatedUser.email.split('@')[0],
          nickname: updatedUser.nickname || updatedUser.full_name?.split(' ')[0] || updatedUser.email.split('@')[0],
          avatar_url: updatedUser.avatar_url,
          role: updatedUser.role as UserRole,
          primary_sport: updatedUser.primary_sport || 'pickleball',
          preferred_sports: updatedUser.preferred_sports || ['pickleball', 'badminton'],
          preferred_format: updatedUser.preferred_format || 'doubles',
          skill_level: updatedUser.skill_level || 'intermediate',
          city: updatedUser.city || 'Metro Manila',
          onboarding_completed: Boolean(updatedUser.onboarding_completed),
          created_at: updatedUser.created_at,
        };
      }

      // Also update Supabase auth metadata if admin client is available
      const admin = createAdminClient();
      if (admin) {
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: {
            full_name: resolvedFullName,
            onboarding_completed: resolvedOnboardingCompleted,
          },
        });
      }

      return await serverGetUser(userId);
    }
  } catch (err) {
    console.warn('[ServerAuth] Supabase update warning:', err);
  }

  return null;
}
