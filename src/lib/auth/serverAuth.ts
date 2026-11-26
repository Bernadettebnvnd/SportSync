/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import { UserRole } from '@/types';
import { isSupabaseConfigured, createAdminClient, createServerClient } from '@/lib/supabase/server';
import { validateRealEmailWithMx } from '@/lib/validation/emailValidator';

export interface SanitizedUser {
  id: string;
  auth_id?: string;
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
  phone?: string;
  onboarding_completed: boolean;
  created_at: string;
}

export type StoredUser = SanitizedUser;

function getSessionSecret(): string {
  const raw =
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_JWT_SECRET ||
    '';
  const cleaned = raw
    .split(/[\r\n]|\\n/)[0]
    .split('#')[0]
    .replace(/^["']|["']$/g, '')
    .trim();
  if (!cleaned) {
    throw new Error('Server configuration error: SESSION_SECRET environment variable is required.');
  }
  return cleaned;
}

/**
 * Strips any legacy `pwd_hash:...` prefix from a phone value so password hashes
 * are never exposed or retained in phone fields.
 */
export function sanitizePhoneValue(val?: string | null): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith('pwd_hash:')) {
    return trimmed;
  }
  const pipeIndex = trimmed.indexOf('|');
  if (pipeIndex !== -1) {
    const realPhone = trimmed.substring(pipeIndex + 1).trim();
    return realPhone && !realPhone.startsWith('pwd_hash:') ? realPhone : undefined;
  }
  return undefined;
}

export function createSessionToken(user: SanitizedUser): string {
  const secret = getSessionSecret();
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): { userId: string; email: string; role: UserRole } | null {
  try {
    const secret = getSessionSecret();
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

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

function isValidUuid(val?: string | null): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
}

export function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = String(err.code || '');
  return (
    code === '42P01' || // undefined_table in PostgreSQL
    code === 'PGRST200' ||
    code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    (msg.includes('schema cache') && (msg.includes('table') || !msg.includes('column')))
  );
}

export function isMissingColumnError(err: any): boolean {
  if (!err) return false;
  if (isMissingTableError(err)) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    (msg.includes('column') && (msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('could not find the'))) ||
    msg.includes('schema cache') ||
    msg.includes('could not find the')
  );
}

export function extractMissingColumn(err: any): string | null {
  if (!err || !err.message) return null;
  const match =
    err.message.match(/Could not find the '([^']+)' column/i) ||
    err.message.match(/column "?([^"\s]+)"? of relation/i) ||
    err.message.match(/column "?([^"\s]+)"? does not exist/i);
  return match ? match[1] : null;
}

function parsePreferredSports(rawSports: unknown): string[] {
  if (Array.isArray(rawSports)) {
    return rawSports.filter((s): s is string => typeof s === 'string' && Boolean(s.trim()));
  }
  if (typeof rawSports === 'string' && rawSports.trim()) {
    try {
      const parsed = JSON.parse(rawSports);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return rawSports
        .replace(/[{}]/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/**
 * Evaluates whether a user profile already exists and has completed setup.
 * Existing users with complete required fields (or explicit completion flag)
 * proceed directly to their dashboard.
 */
export async function isProfileCompleteInDb(
  dbClient: any,
  profile: any,
  authMetadata: any,
  role?: string
): Promise<boolean> {
  if (
    profile?.onboarding_completed === true ||
    profile?.onboarding_completed === 'true' ||
    profile?.has_completed_onboarding === true ||
    authMetadata?.onboarding_completed === true ||
    authMetadata?.onboarding_completed === 'true' ||
    authMetadata?.has_completed_onboarding === true
  ) {
    return true;
  }

  const effectiveRole = role || profile?.role || authMetadata?.role;

  // 2. If venue owner / faculty, check if they already have registered venues or staff profile
  if (
    effectiveRole === 'venue_owner' ||
    effectiveRole === 'organizer' ||
    effectiveRole === 'facility_owner' ||
    effectiveRole === 'faculty'
  ) {
    if (dbClient) {
      try {
        const candidateUuids = [profile?.id, profile?.auth_id, authMetadata?.sub, authMetadata?.id]
          .filter((id): id is string => isValidUuid(id));

        if (candidateUuids.length > 0) {
          const query = candidateUuids.map((id) => `owner_id.eq.${id}`).join(',');
          const { count } = await dbClient
            .from('venues')
            .select('*', { count: 'exact', head: true })
            .or(query);
          if (count && count > 0) {
            if (profile?.id && profile?.onboarding_completed !== true) {
              dbClient
                .from('users')
                .update({ onboarding_completed: true, role: 'venue_owner', updated_at: new Date().toISOString() })
                .eq('id', profile.id)
                .then(() => {}, () => {});
            }
            return true;
          }

          const staffQuery = candidateUuids.map((id) => `user_id.eq.${id}`).join(',');
          const { count: staffCount } = await dbClient
            .from('facility_staff')
            .select('*', { count: 'exact', head: true })
            .or(staffQuery);
          if (staffCount && staffCount > 0) {
            if (profile?.id && profile?.onboarding_completed !== true) {
              dbClient
                .from('users')
                .update({ onboarding_completed: true, role: 'venue_owner', updated_at: new Date().toISOString() })
                .eq('id', profile.id)
                .then(() => {}, () => {});
            }
            return true;
          }
        }

        const candidateEmail = profile?.email || authMetadata?.email;
        if (candidateEmail) {
          const { count: emailCount } = await dbClient
            .from('venues')
            .select('*', { count: 'exact', head: true })
            .ilike('description', `%${candidateEmail}%`);
          if (emailCount && emailCount > 0) {
            if (profile?.id && profile?.onboarding_completed !== true) {
              dbClient
                .from('users')
                .update({ onboarding_completed: true, role: 'venue_owner', updated_at: new Date().toISOString() })
                .eq('id', profile.id)
                .then(() => {}, () => {});
            }
            return true;
          }
        }
      } catch (venueErr) {
        console.warn('[ServerAuth] Venue owner completion verification notice:', venueErr);
      }
    }

    return false;
  }

  // Explicit false in DB always means onboarding has NOT been completed yet
  if (profile?.onboarding_completed === false || profile?.onboarding_completed === 'false') {
    return false;
  }

  // 3. For legacy player rows where onboarding_completed is NULL/undefined,
  // require non-default preferred_sports AND an explicit skill_level saved via onboarding.
  // Never auto-flip onboarding_completed here; new/Google accounts must complete Interest Check.
  const fullName = (profile?.full_name || authMetadata?.full_name || '').trim();
  const isGenericName =
    !fullName ||
    fullName.toLowerCase() === 'player' ||
    fullName.toLowerCase() === 'guest player' ||
    fullName.toLowerCase() === 'guest' ||
    fullName.toLowerCase() === 'sportsync player' ||
    fullName.toLowerCase() === 'google player';

  const parsedSports = parsePreferredSports(profile?.preferred_sports || authMetadata?.preferred_sports);
  const isDbDefaultSports =
    parsedSports.length === 2 &&
    parsedSports.includes('pickleball') &&
    parsedSports.includes('badminton');
  const hasExplicitSports =
    (parsedSports.length > 0 && !isDbDefaultSports) ||
    Boolean(profile?.primary_sport || authMetadata?.primary_sport);
  const rawSkill = String(profile?.skill_level || authMetadata?.skill_level || '').trim().toLowerCase();
  const hasExplicitSkill = Boolean(rawSkill && rawSkill !== 'all_levels');

  if (!isGenericName && hasExplicitSports && hasExplicitSkill) {
    return true;
  }

  return false;
}

/**
 * Ensures a canonical public.users row exists for the given Supabase Auth user,
 * forcing id = authUserId and auth_id = authUserId for new rows, or linking auth_id
 * to an existing row and returning its canonical public.users row.
 */
async function upsertCanonicalPublicUser(
  dbClient: any,
  params: {
    authUserId: string;
    email: string;
    fullName: string;
    role: UserRole;
    city?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    onboardingCompleted?: boolean;
    overwriteOnboarding?: boolean;
  }
): Promise<any> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim() || normalizedEmail.split('@')[0];
  const nickname = cleanName.split(' ')[0] || normalizedEmail.split('@')[0];

  // 1. Look up existing public.users row by id, auth_id, or email
  let existingRow: any = null;
  const { data: byAuthOrId } = await dbClient
    .from('users')
    .select('*')
    .or(`id.eq.${params.authUserId},auth_id.eq.${params.authUserId}`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byAuthOrId) {
    existingRow = byAuthOrId;
  } else {
    const { data: byEmail } = await dbClient
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail) {
      existingRow = byEmail;
    }
  }

  if (existingRow) {
    const updateData: Record<string, any> = {
      auth_id: params.authUserId,
      updated_at: new Date().toISOString(),
    };
    if (cleanName && (!existingRow.full_name || existingRow.full_name === 'Player' || params.overwriteOnboarding)) {
      updateData.full_name = cleanName;
      updateData.nickname = existingRow.nickname || nickname;
    }
    if (params.avatarUrl && !existingRow.avatar_url) {
      updateData.avatar_url = params.avatarUrl;
    }
    const cleanExistingPhone = sanitizePhoneValue(existingRow.phone);
    const cleanInputPhone = sanitizePhoneValue(params.phone);
    if (typeof existingRow.phone === 'string' && existingRow.phone.startsWith('pwd_hash:')) {
      updateData.phone = cleanInputPhone || cleanExistingPhone || null;
    } else if (cleanInputPhone && !cleanExistingPhone) {
      updateData.phone = cleanInputPhone;
    }
    if (params.overwriteOnboarding) {
      updateData.role = params.role;
      updateData.onboarding_completed = Boolean(params.onboardingCompleted);
    }

    let { data: updated, error: updateErr } = await dbClient
      .from('users')
      .update(updateData)
      .eq('id', existingRow.id)
      .select('*')
      .maybeSingle();

    if (updateErr && isMissingColumnError(updateErr)) {
      const sanitizedUpdate = { ...updateData };
      const missing = extractMissingColumn(updateErr);
      if (missing) delete sanitizedUpdate[missing];
      delete sanitizedUpdate.onboarding_completed;
      delete sanitizedUpdate.has_completed_onboarding;
      delete sanitizedUpdate.preferred_format;
      delete sanitizedUpdate.preferred_sports;
      delete sanitizedUpdate.primary_sport;
      delete sanitizedUpdate.skill_level;
      delete sanitizedUpdate.city;
      const retry = await dbClient
        .from('users')
        .update(sanitizedUpdate)
        .eq('id', existingRow.id)
        .select('*')
        .maybeSingle();
      updated = retry.data;
      updateErr = retry.error;
    }

    if (updateErr) {
      console.warn('[ServerAuth] Warning updating existing public.users row:', updateErr);
    }
    return updated || { ...existingRow, ...updateData };
  }

  // 2. Insert new public.users row with id === authUserId AND auth_id === authUserId
  const newPayload: Record<string, any> = {
    id: params.authUserId,
    auth_id: params.authUserId,
    email: normalizedEmail,
    full_name: cleanName,
    nickname,
    role: params.role,
  };
  if (params.avatarUrl) newPayload.avatar_url = params.avatarUrl;
  if (params.city) newPayload.city = params.city;
  const cleanPhone = sanitizePhoneValue(params.phone);
  if (cleanPhone) newPayload.phone = cleanPhone;
  newPayload.onboarding_completed = Boolean(params.onboardingCompleted);
  if (!params.onboardingCompleted) {
    newPayload.preferred_sports = [];
  }

  let { data: inserted, error: insertErr } = await dbClient
    .from('users')
    .upsert(newPayload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (insertErr && isMissingColumnError(insertErr)) {
    console.warn('[ServerAuth] Missing column detected on public.users upsert, retrying with minimal fields:', insertErr.message);
    const sanitizedPayload = { ...newPayload };
    const missing = extractMissingColumn(insertErr);
    if (missing) delete sanitizedPayload[missing];
    delete sanitizedPayload.onboarding_completed;
    delete sanitizedPayload.has_completed_onboarding;
    delete sanitizedPayload.preferred_format;
    delete sanitizedPayload.preferred_sports;
    delete sanitizedPayload.primary_sport;
    delete sanitizedPayload.skill_level;
    delete sanitizedPayload.city;

    let retry = await dbClient
      .from('users')
      .upsert(sanitizedPayload, { onConflict: 'id' })
      .select('*')
      .maybeSingle();

    if (retry.error && isMissingColumnError(retry.error)) {
      // Ultra-minimal core fallback
      const corePayload: Record<string, any> = {
        id: params.authUserId,
        email: normalizedEmail,
        full_name: cleanName,
        role: params.role,
      };
      retry = await dbClient
        .from('users')
        .upsert(corePayload, { onConflict: 'id' })
        .select('*')
        .maybeSingle();
    }

    inserted = retry.data;
    insertErr = retry.error;
  }

  if (insertErr) {
    console.warn('[ServerAuth] Warning inserting canonical public.users row:', insertErr);
    // Never throw a hard blocking error: returning newPayload allows user registration & login to proceed smoothly
    return newPayload;
  }

  return inserted || newPayload;
}

export async function serverRegister(data: {
  email: string;
  password: string;
  fullName: string;
  role?: string;
  city?: string;
}): Promise<{ user: SanitizedUser; token: string }> {
  const emailValidation = await validateRealEmailWithMx(data.email);
  if (!emailValidation.isValid) {
    throw new Error(emailValidation.error || 'Please provide a real, valid email address. Fake or disposable accounts are restricted.');
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const normalizedEmail = emailValidation.normalizedEmail || data.email.trim().toLowerCase();
  const cleanPassword = data.password.trim();
  const cleanName = data.fullName.trim() || normalizedEmail.split('@')[0];
  const isFacilityRole =
    data.role === 'facility_owner' ||
    data.role === 'faculty' ||
    data.role === 'facility' ||
    data.role === 'faculty_owner' ||
    data.role === 'venue_owner';
  const assignedRole: UserRole = isFacilityRole ? 'venue_owner' : 'player';
  const registrationCity = data.city ? data.city.trim() : 'Naga City';

  const admin = createAdminClient();
  const serverClient = createServerClient();

  if (!serverClient && !admin) {
    throw new Error('Supabase authentication client could not be initialized. Please check your environment variables.');
  }

  let supaUserId: string | null = null;
  let supaCreatedAt: string = new Date().toISOString();
  let sessionAccessToken: string | undefined = undefined;

  const signUpClient = serverClient || admin!;
  const { data: supaUser, error } = await signUpClient.auth.signUp({
    email: normalizedEmail,
    password: cleanPassword,
    options: {
      data: {
        full_name: cleanName,
        role: assignedRole,
        city: registrationCity || undefined,
        onboarding_completed: false,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already') || error.status === 422) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }
    if (error.message.toLowerCase().includes('rate limit') || error.status === 429) {
      throw new Error('Email registration rate limit reached. Please wait a moment and try again, or continue with Google.');
    }
    throw new Error(error.message);
  }

  if (!supaUser?.user?.id) {
    throw new Error('Registration failed: no user returned from Supabase.');
  }

  // In Supabase, if a user already exists and confirm email is enabled, identities array is empty
  if (Array.isArray(supaUser.user.identities) && supaUser.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Please log in instead.');
  }

  supaUserId = supaUser.user.id;
  supaCreatedAt = supaUser.user.created_at;
  sessionAccessToken = supaUser.session?.access_token;

  const dbClient = admin || createServerClient(sessionAccessToken) || serverClient;
  if (!dbClient) {
    throw new Error('Database client unavailable after registration.');
  }

  const dbProfile = await upsertCanonicalPublicUser(dbClient, {
    authUserId: supaUserId,
    email: normalizedEmail,
    fullName: cleanName,
    role: assignedRole,
    city: registrationCity,
    onboardingCompleted: false,
    overwriteOnboarding: true,
  });

  const canonicalId = dbProfile?.id || supaUserId;

  const sanitized: SanitizedUser = {
    id: canonicalId,
    auth_id: supaUserId,
    email: normalizedEmail,
    full_name: cleanName,
    nickname: cleanName.split(' ')[0] || normalizedEmail.split('@')[0],
    role: assignedRole,
    primary_sport: undefined,
    preferred_sports: [],
    preferred_format: undefined,
    skill_level: undefined,
    city: registrationCity || undefined,
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
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  const cleanPassword = (data.password || '').trim();

  const supabase = createServerClient();
  const admin = createAdminClient();
  const authClient = supabase || admin;

  if (!authClient) {
    throw new Error('Supabase authentication client is not available.');
  }

  // Authenticate strictly against Supabase Auth (signInWithPassword)
  let { data: supaData, error } = await authClient.auth.signInWithPassword({
    email: normalizedEmail,
    password: cleanPassword,
  });

  // Retry once with untrimmed password if trailing whitespace was intentional
  if (error && cleanPassword !== data.password) {
    const rawRetry = await authClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: data.password,
    });
    if (!rawRetry.error && rawRetry.data?.user) {
      supaData = rawRetry.data;
      error = null;
    }
  }

  if (error || !supaData?.user) {
    if (error?.message?.toLowerCase().includes('not confirmed')) {
      throw new Error('Your email address has not been confirmed yet. Please check your inbox.');
    }
    throw new Error('Invalid email or password. Please verify your credentials.');
  }

  const authUser = supaData.user;
  const userMeta = authUser.user_metadata || {};
  const authenticatedServerClient = createServerClient(supaData.session?.access_token);
  const dbClient = admin || authenticatedServerClient || supabase;

  let dbProfile: any = null;
  if (dbClient) {
    dbProfile = await upsertCanonicalPublicUser(dbClient, {
      authUserId: authUser.id,
      email: authUser.email || normalizedEmail,
      fullName: userMeta?.full_name || normalizedEmail.split('@')[0],
      role: (userMeta?.role === 'venue_owner' || userMeta?.role === 'facility_owner' ? 'venue_owner' : 'player') as UserRole,
      city: userMeta?.city || null,
      avatarUrl: userMeta?.avatar_url || null,
      onboardingCompleted: Boolean(userMeta?.onboarding_completed === true),
      overwriteOnboarding: false,
    });
  }

  const resolvedOnboardingCompleted = await isProfileCompleteInDb(
    dbClient,
    dbProfile,
    userMeta,
    dbProfile?.role || userMeta?.role
  );

  const parsedDbSports = parsePreferredSports(dbProfile?.preferred_sports || userMeta?.preferred_sports);
  const canonicalUserId = dbProfile?.id || authUser.id;

  const sanitized: SanitizedUser = {
    id: canonicalUserId,
    auth_id: authUser.id,
    email: authUser.email || normalizedEmail,
    full_name: dbProfile?.full_name || userMeta?.full_name || normalizedEmail.split('@')[0],
    nickname: dbProfile?.nickname || userMeta?.full_name?.split(' ')[0] || normalizedEmail.split('@')[0],
    avatar_url: dbProfile?.avatar_url || userMeta?.avatar_url,
    role: (dbProfile?.role || (userMeta?.role === 'venue_owner' ? 'venue_owner' : 'player')) as UserRole,
    primary_sport: dbProfile?.primary_sport || userMeta?.primary_sport || undefined,
    preferred_sports: parsedDbSports.length > 0 ? parsedDbSports : (dbProfile?.primary_sport ? [dbProfile.primary_sport] : []),
    preferred_format: dbProfile?.preferred_format || userMeta?.preferred_format || undefined,
    skill_level: dbProfile?.skill_level || userMeta?.skill_level || undefined,
    city: dbProfile?.city || userMeta?.city || undefined,
    phone: sanitizePhoneValue(dbProfile?.phone),
    onboarding_completed: resolvedOnboardingCompleted,
    created_at: dbProfile?.created_at || authUser.created_at,
  };

  const token = createSessionToken(sanitized);
  return { user: sanitized, token };
}

export async function serverGetUser(userId: string): Promise<SanitizedUser | null> {
  if (!isSupabaseConfigured || !userId) {
    return null;
  }

  try {
    const db = createAdminClient() || createServerClient();
    if (!db) return null;

    let supaUser: any = null;

    if (isValidUuid(userId)) {
      // 1. Check by canonical public.users.id or auth_id
      const { data } = await db
        .from('users')
        .select('*')
        .or(`id.eq.${userId},auth_id.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      supaUser = data;
    } else if (userId.includes('@')) {
      const { data: byEmail } = await db
        .from('users')
        .select('*')
        .ilike('email', userId.trim().toLowerCase())
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      supaUser = byEmail;
    }

    const admin = createAdminClient();
    let authMetadata: any = null;
    const targetAuthId = supaUser?.auth_id || (isValidUuid(userId) ? userId : null);

    if (admin && targetAuthId) {
      try {
        const { data: authData } = await admin.auth.admin.getUserById(targetAuthId);
        authMetadata = authData?.user?.user_metadata || null;
        if (!supaUser && authData?.user) {
          supaUser = await upsertCanonicalPublicUser(db, {
            authUserId: authData.user.id,
            email: authData.user.email || '',
            fullName: authMetadata?.full_name || authData.user.email?.split('@')[0] || 'Player',
            role: (authMetadata?.role === 'venue_owner' ? 'venue_owner' : 'player') as UserRole,
            city: authMetadata?.city || null,
            avatarUrl: authMetadata?.avatar_url || null,
            onboardingCompleted: Boolean(authMetadata?.onboarding_completed === true),
            overwriteOnboarding: false,
          });
        }
      } catch {}
    }

    if (supaUser) {
      const primarySport = supaUser.primary_sport || authMetadata?.primary_sport || undefined;
      const parsedSports = parsePreferredSports(
        supaUser.preferred_sports && supaUser.preferred_sports.length > 0
          ? supaUser.preferred_sports
          : authMetadata?.preferred_sports
      );
      const city = supaUser.city || authMetadata?.city || undefined;
      const skillLevel = supaUser.skill_level || authMetadata?.skill_level || undefined;

      const isCompleted = await isProfileCompleteInDb(
        db,
        supaUser,
        authMetadata,
        supaUser.role
      );

      // Scrub any legacy pwd_hash: stored in public.users.phone
      if (typeof supaUser.phone === 'string' && supaUser.phone.startsWith('pwd_hash:')) {
        const cleanedPhone = sanitizePhoneValue(supaUser.phone) || null;
        db.from('users')
          .update({ phone: cleanedPhone, updated_at: new Date().toISOString() })
          .eq('id', supaUser.id)
          .then(() => {}, () => {});
      }

      return {
        id: supaUser.id,
        auth_id: supaUser.auth_id || supaUser.id,
        email: supaUser.email,
        full_name: supaUser.full_name || authMetadata?.full_name || supaUser.email.split('@')[0],
        nickname: supaUser.nickname || authMetadata?.nickname || supaUser.full_name?.split(' ')[0] || supaUser.email.split('@')[0],
        avatar_url: supaUser.avatar_url || authMetadata?.avatar_url,
        role: supaUser.role as UserRole,
        primary_sport: primarySport,
        preferred_sports: parsedSports,
        preferred_format: supaUser.preferred_format || authMetadata?.preferred_format || undefined,
        skill_level: skillLevel,
        city,
        phone: sanitizePhoneValue(supaUser.phone),
        onboarding_completed: isCompleted,
        created_at: supaUser.created_at,
      };
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
    role?: string;
    phone?: string;
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
  if (!isSupabaseConfigured || !userId) {
    return null;
  }

  const resolvedFullName = data.fullName || data.full_name;
  const resolvedNickname = data.nickname;
  const resolvedAvatarUrl = data.avatarUrl || data.avatar_url;
  const resolvedPrimarySport = data.primarySport || data.primary_sport;
  const resolvedPreferredSports = data.preferredSports || data.preferred_sports;
  const resolvedPreferredFormat = data.preferredFormat || data.preferred_format;
  const resolvedCity = data.city;
  const resolvedSkillLevel = data.skillLevel || data.skill_level;
  const rawOnboardingCompleted = data.onboardingCompleted ?? data.onboarding_completed;

  try {
    const db = createAdminClient() || createServerClient();
    if (!db) return null;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (rawOnboardingCompleted !== undefined) updatePayload.onboarding_completed = rawOnboardingCompleted;
    if (data.role) updatePayload.role = data.role;
    if (data.phone !== undefined) {
      updatePayload.phone = sanitizePhoneValue(data.phone) || null;
    }
    if (resolvedFullName) updatePayload.full_name = resolvedFullName;
    if (resolvedNickname) updatePayload.nickname = resolvedNickname;
    if (resolvedAvatarUrl) updatePayload.avatar_url = resolvedAvatarUrl;
    if (resolvedPrimarySport) updatePayload.primary_sport = resolvedPrimarySport;
    if (resolvedPreferredSports) updatePayload.preferred_sports = resolvedPreferredSports;
    if (resolvedPreferredFormat) updatePayload.preferred_format = resolvedPreferredFormat;
    if (resolvedCity !== undefined) updatePayload.city = resolvedCity;
    if (resolvedSkillLevel) updatePayload.skill_level = resolvedSkillLevel;

    // 1. Update Supabase Auth user_metadata if admin client is available
    const admin = createAdminClient();
    if (admin && isValidUuid(userId)) {
      try {
        const metaUpdate: Record<string, any> = {};
        if (resolvedFullName !== undefined) metaUpdate.full_name = resolvedFullName;
        if (resolvedNickname !== undefined) metaUpdate.nickname = resolvedNickname;
        if (resolvedAvatarUrl !== undefined) metaUpdate.avatar_url = resolvedAvatarUrl;
        if (data.role !== undefined) metaUpdate.role = data.role;
        if (data.phone !== undefined) metaUpdate.phone = data.phone;
        if (resolvedPrimarySport !== undefined) metaUpdate.primary_sport = resolvedPrimarySport;
        if (resolvedPreferredSports !== undefined) metaUpdate.preferred_sports = resolvedPreferredSports;
        if (resolvedPreferredFormat !== undefined) metaUpdate.preferred_format = resolvedPreferredFormat;
        if (resolvedCity !== undefined) metaUpdate.city = resolvedCity;
        if (resolvedSkillLevel !== undefined) metaUpdate.skill_level = resolvedSkillLevel;
        if (rawOnboardingCompleted !== undefined) {
          metaUpdate.onboarding_completed = rawOnboardingCompleted;
          metaUpdate.has_completed_onboarding = rawOnboardingCompleted;
        }

        if (Object.keys(metaUpdate).length > 0) {
          await admin.auth.admin.updateUserById(userId, {
            user_metadata: metaUpdate,
          });
        }
      } catch (metaErr) {
        console.warn('[ServerAuth] user_metadata update notice:', metaErr);
      }
    }

    // 2. Update public.users table (match by id or auth_id)
    let updatedUser: any = null;
    let error: any = null;

    if (isValidUuid(userId)) {
      const res = await db
        .from('users')
        .update(updatePayload)
        .or(`id.eq.${userId},auth_id.eq.${userId}`)
        .select('*')
        .maybeSingle();
      updatedUser = res.data;
      error = res.error;
    } else if (userId.includes('@')) {
      const res = await db
        .from('users')
        .update(updatePayload)
        .ilike('email', userId.trim().toLowerCase())
        .select('*')
        .maybeSingle();
      updatedUser = res.data;
      error = res.error;
    }

    // Handle enum constraint or missing column fallback
    if (error && isValidUuid(userId)) {
      console.warn('[ServerAuth] public.users direct update warning:', error.message);
      const DB_ENUM_SPORTS = ['badminton', 'pickleball', 'basketball', 'padel', 'tennis', 'volleyball', 'table_tennis'];
      const safePrimary = DB_ENUM_SPORTS.includes((resolvedPrimarySport || '').toLowerCase()) ? resolvedPrimarySport : 'pickleball';
      const safePreferred = (resolvedPreferredSports || []).filter((s) => DB_ENUM_SPORTS.includes(s.toLowerCase()));

      const fallbackPayload: Record<string, any> = {
        ...updatePayload,
        primary_sport: safePrimary,
        preferred_sports: safePreferred.length > 0 ? safePreferred : ['pickleball'],
      };

      if (isMissingColumnError(error)) {
        const missing = extractMissingColumn(error);
        if (missing) delete fallbackPayload[missing];
        delete fallbackPayload.onboarding_completed;
        delete fallbackPayload.has_completed_onboarding;
        delete fallbackPayload.preferred_format;
        delete fallbackPayload.preferred_sports;
        delete fallbackPayload.primary_sport;
        delete fallbackPayload.skill_level;
      }

      const retryRes = await db
        .from('users')
        .update(fallbackPayload)
        .or(`id.eq.${userId},auth_id.eq.${userId}`)
        .select('*')
        .maybeSingle();

      if (retryRes.data) {
        updatedUser = retryRes.data;
      }
    }

    const finalUser = await serverGetUser(updatedUser?.id || userId);
    if (finalUser) {
      return {
        ...finalUser,
        full_name: resolvedFullName || finalUser.full_name,
        nickname: resolvedNickname || finalUser.nickname,
        city: resolvedCity || finalUser.city,
        primary_sport: resolvedPrimarySport || finalUser.primary_sport,
        preferred_sports: resolvedPreferredSports || finalUser.preferred_sports,
        skill_level: resolvedSkillLevel || finalUser.skill_level,
        onboarding_completed: rawOnboardingCompleted !== undefined ? rawOnboardingCompleted : finalUser.onboarding_completed,
      };
    }

    if (updatedUser) {
      return {
        id: updatedUser.id,
        auth_id: updatedUser.auth_id || updatedUser.id,
        email: updatedUser.email,
        full_name: resolvedFullName || updatedUser.full_name,
        nickname: resolvedNickname || updatedUser.nickname,
        avatar_url: resolvedAvatarUrl || updatedUser.avatar_url,
        role: updatedUser.role as UserRole,
        primary_sport: resolvedPrimarySport || updatedUser.primary_sport,
        preferred_sports: resolvedPreferredSports || updatedUser.preferred_sports,
        preferred_format: resolvedPreferredFormat || updatedUser.preferred_format,
        skill_level: resolvedSkillLevel || updatedUser.skill_level,
        city: resolvedCity || updatedUser.city,
        onboarding_completed: Boolean(updatedUser.onboarding_completed),
        created_at: updatedUser.created_at,
      };
    }
  } catch (err) {
    console.warn('[ServerAuth] Supabase update warning:', err);
  }

  return null;
}

/**
 * Synchronize a verified Google OAuth / SSO authenticated user with public.users.
 * Requires a verified Supabase access token; never accepts unverified payloads.
 */
export async function serverSyncOAuthUser(data: {
  authId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  provider?: string;
  accessToken?: string;
  authMetadata?: Record<string, unknown> | null;
  intendedRole?: string;
}): Promise<{ user: SanitizedUser; token: string; isComplete: boolean }> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (!data.accessToken || typeof data.accessToken !== 'string' || !data.accessToken.trim()) {
    throw new Error('Unauthorized: Verified OAuth access token is required.');
  }

  const admin = createAdminClient();
  const authedServerClient = createServerClient(data.accessToken.trim());
  const verifyClient = authedServerClient || admin;
  if (!verifyClient) {
    throw new Error('Authentication verification client is not available.');
  }

  const { data: authData, error: authErr } = await verifyClient.auth.getUser(data.accessToken.trim());
  if (authErr || !authData?.user || !isValidUuid(authData.user.id) || !authData.user.email) {
    throw new Error('Unauthorized: Invalid or expired OAuth access token.');
  }

  const verifiedUser = authData.user;
  const targetAuthId = verifiedUser.id;
  const normalizedEmail = (verifiedUser.email || '').trim().toLowerCase();

  const emailValidation = await validateRealEmailWithMx(normalizedEmail);
  if (!emailValidation.isValid) {
    throw new Error(emailValidation.error || 'OAuth email domain is invalid or restricted.');
  }

  const dbClient = admin || authedServerClient;
  if (!dbClient) {
    throw new Error('Database client is not available for OAuth synchronization.');
  }

  const verifiedMeta = (verifiedUser.user_metadata || data.authMetadata || {}) as Record<string, unknown>;
  const verifiedFullName =
    (verifiedMeta.full_name || verifiedMeta.name || data.fullName || '').toString().trim() ||
    normalizedEmail.split('@')[0];
  const verifiedAvatarUrl =
    (verifiedMeta.avatar_url || verifiedMeta.picture || data.avatarUrl || '').toString().trim() ||
    undefined;

  // Check if profile already existed before upsert (preserving existing role & completion state)
  let preExisting: {
    id?: string;
    onboarding_completed?: boolean | string | null;
    role?: string | null;
  } | null = null;
  const { data: preExistingById } = await dbClient
    .from('users')
    .select('*')
    .or(`id.eq.${targetAuthId},auth_id.eq.${targetAuthId}`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (preExistingById) {
    preExisting = preExistingById;
  } else {
    const { data: preExistingByEmail } = await dbClient
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (preExistingByEmail) {
      preExisting = preExistingByEmail;
    }
  }

  const isIntendedOwner =
    data.intendedRole === 'facility_owner' ||
    data.intendedRole === 'venue_owner' ||
    data.intendedRole === 'organizer' ||
    data.intendedRole === 'owner' ||
    data.intendedRole === 'facility';
  const defaultNewUserRole: UserRole = isIntendedOwner ? 'venue_owner' : 'player';
  const resolvedUserRole: UserRole = (preExisting?.role || defaultNewUserRole) as UserRole;

  if (!preExisting && isIntendedOwner && admin) {
    try {
      await admin.auth.admin.updateUserById(targetAuthId, {
        user_metadata: {
          ...verifiedMeta,
          role: 'venue_owner',
        },
      });
    } catch {}
  }

  const dbProfile = await upsertCanonicalPublicUser(dbClient, {
    authUserId: targetAuthId,
    email: normalizedEmail,
    fullName: verifiedFullName,
    role: resolvedUserRole,
    avatarUrl: verifiedAvatarUrl || null,
    onboardingCompleted: Boolean(preExisting?.onboarding_completed === true),
    overwriteOnboarding: false,
  });

  const isComplete = !preExisting
    ? false
    : Boolean(dbProfile?.onboarding_completed === true) ||
      (await isProfileCompleteInDb(dbClient, dbProfile, verifiedMeta, dbProfile?.role));

  const canonicalId = dbProfile?.id || targetAuthId;
  const parsedSports = parsePreferredSports(dbProfile?.preferred_sports);

  const sanitized: SanitizedUser = {
    id: canonicalId,
    auth_id: dbProfile?.auth_id || targetAuthId,
    email: normalizedEmail,
    full_name: dbProfile?.full_name || verifiedFullName,
    nickname: dbProfile?.nickname || verifiedFullName.split(' ')[0] || normalizedEmail.split('@')[0],
    avatar_url: dbProfile?.avatar_url || verifiedAvatarUrl,
    role: (dbProfile?.role || 'player') as UserRole,
    primary_sport: dbProfile?.primary_sport || undefined,
    preferred_sports: parsedSports,
    preferred_format: dbProfile?.preferred_format || undefined,
    skill_level: dbProfile?.skill_level || undefined,
    city: dbProfile?.city || undefined,
    phone: sanitizePhoneValue(dbProfile?.phone),
    onboarding_completed: isComplete,
    created_at: dbProfile?.created_at || new Date().toISOString(),
  };

  const token = createSessionToken(sanitized);
  return { user: sanitized, token, isComplete };
}

/**
 * Synchronize a verified Google Identity Services ID Token user.
 * Validates the ID token directly with Google's public tokeninfo endpoint.
 */
export async function serverSyncGoogleIdTokenUser(data: {
  googleIdToken: string;
  intendedRole?: string;
}): Promise<{ user: SanitizedUser; token: string; isComplete: boolean }> {
  if (!data.googleIdToken || typeof data.googleIdToken !== 'string') {
    throw new Error('Google authentication requires a valid Google ID token.');
  }

  // Verify ID token with Google's public tokeninfo endpoint
  const resp = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(data.googleIdToken)}`
  );
  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(errBody.error_description || errBody.error || 'Invalid or expired Google authentication credential.');
  }

  const tokenInfo = await resp.json();
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (tokenInfo.iss && !validIssuers.includes(String(tokenInfo.iss))) {
    throw new Error('Invalid Google authentication token issuer.');
  }

  const expectedGoogleClientId = (
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    ''
  )
    .split(/[\r\n]|\\n/)[0]
    .split('#')[0]
    .replace(/^["']|["']$/g, '')
    .trim();

  if (!expectedGoogleClientId || expectedGoogleClientId === 'placeholder') {
    throw new Error('Server configuration error: Google Client ID is not configured.');
  }
  if (tokenInfo.aud !== expectedGoogleClientId) {
    throw new Error('Google authentication token audience mismatch.');
  }

  const normalizedEmail = (tokenInfo.email || '').trim().toLowerCase();
  if (!normalizedEmail || (tokenInfo.email_verified !== 'true' && tokenInfo.email_verified !== true)) {
    throw new Error('Google account email is not verified.');
  }

  const emailValidation = await validateRealEmailWithMx(normalizedEmail);
  if (!emailValidation.isValid) {
    throw new Error(emailValidation.error || 'Google email domain is invalid or restricted.');
  }

  const googleSub = tokenInfo.sub;
  const googleFullName = (tokenInfo.name || tokenInfo.given_name || normalizedEmail.split('@')[0]).trim();
  const googleAvatarUrl = (tokenInfo.picture || '').trim() || undefined;

  const admin = createAdminClient();
  const dbClient = admin || createServerClient();
  if (!dbClient) {
    throw new Error('Database service is unavailable.');
  }

  let preExisting: {
    id?: string;
    auth_id?: string;
    onboarding_completed?: boolean | string | null;
    role?: string | null;
  } | null = null;

  const { data: preExistingByEmail } = await dbClient
    .from('users')
    .select('*')
    .ilike('email', normalizedEmail)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (preExistingByEmail) {
    preExisting = preExistingByEmail;
  }

  let authUserId = preExisting?.auth_id || preExisting?.id;

  if (!authUserId && admin) {
    try {
      const { data: newUser } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          full_name: googleFullName,
          avatar_url: googleAvatarUrl,
          provider: 'google',
          google_sub: googleSub,
        },
      });
      if (newUser?.user?.id) {
        authUserId = newUser.user.id;
      }
    } catch (e) {
      console.warn('[Google Auth] Create auth user note:', e);
    }
  }

  if (!authUserId) {
    authUserId = crypto.randomUUID();
  }

  const isIntendedOwner =
    data.intendedRole === 'facility_owner' ||
    data.intendedRole === 'venue_owner' ||
    data.intendedRole === 'organizer' ||
    data.intendedRole === 'owner' ||
    data.intendedRole === 'facility';
  const defaultNewUserRole: UserRole = isIntendedOwner ? 'venue_owner' : 'player';
  const resolvedUserRole: UserRole = (preExisting?.role || defaultNewUserRole) as UserRole;

  const dbProfile = await upsertCanonicalPublicUser(dbClient, {
    authUserId,
    email: normalizedEmail,
    fullName: googleFullName,
    role: resolvedUserRole,
    avatarUrl: googleAvatarUrl || null,
    onboardingCompleted: Boolean(preExisting?.onboarding_completed === true),
    overwriteOnboarding: false,
  });

  const isComplete = !preExisting
    ? false
    : Boolean(dbProfile?.onboarding_completed === true) ||
      (await isProfileCompleteInDb(dbClient, dbProfile, tokenInfo, dbProfile?.role));

  const canonicalId = dbProfile?.id || authUserId;
  const parsedSports = parsePreferredSports(dbProfile?.preferred_sports);

  const sanitized: SanitizedUser = {
    id: canonicalId,
    auth_id: dbProfile?.auth_id || authUserId,
    email: normalizedEmail,
    full_name: dbProfile?.full_name || googleFullName,
    nickname: dbProfile?.nickname || googleFullName.split(' ')[0] || normalizedEmail.split('@')[0],
    avatar_url: dbProfile?.avatar_url || googleAvatarUrl,
    role: (dbProfile?.role || 'player') as UserRole,
    primary_sport: dbProfile?.primary_sport || undefined,
    preferred_sports: parsedSports,
    preferred_format: dbProfile?.preferred_format || undefined,
    skill_level: dbProfile?.skill_level || undefined,
    city: dbProfile?.city || undefined,
    phone: sanitizePhoneValue(dbProfile?.phone),
    onboarding_completed: isComplete,
    created_at: dbProfile?.created_at || new Date().toISOString(),
  };

  const token = createSessionToken(sanitized);
  return { user: sanitized, token, isComplete };
}
