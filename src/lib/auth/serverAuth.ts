import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { UserRole } from '@/types';
import { isSupabaseConfigured, createAdminClient, createServerClient } from '@/lib/supabase/server';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  full_name: string;
  role: UserRole;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SanitizedUser {
  id: string;
  email: string;
  full_name: string;
  nickname: string;
  role: UserRole;
  onboarding_completed: boolean;
  created_at: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
  }
}

function readLocalUsers(): StoredUser[] {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw) as StoredUser[];
  } catch (err) {
    console.error('[ServerAuth] Error reading users file:', err);
    return [];
  }
}

function writeLocalUsers(users: StoredUser[]): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function sanitizeUser(user: StoredUser): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    nickname: user.email.split('@')[0],
    role: user.role,
    onboarding_completed: user.onboarding_completed,
    created_at: user.created_at,
  };
}

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

export async function serverRegister(data: {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}): Promise<{ user: SanitizedUser; token: string }> {
  const normalizedEmail = data.email.trim().toLowerCase();

  // If Supabase is real and configured, sync with Supabase
  if (isSupabaseConfigured) {
    const admin = createAdminClient();
    const serverClient = createServerClient();
    const assignedRole: UserRole = data.role === 'facility_owner' ? 'venue_owner' : 'player';

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

    if (supaUserId) {
      const dbClient = admin || serverClient;
      if (dbClient) {
        try {
          await dbClient.from('users').upsert(
            {
              auth_id: supaUserId,
              email: normalizedEmail,
              full_name: data.fullName.trim() || normalizedEmail.split('@')[0],
              role: assignedRole,
              onboarding_completed: false,
            },
            { onConflict: 'auth_id' }
          );
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
        onboarding_completed: false,
        created_at: supaCreatedAt,
      };

      // Also persist locally to keep session lookup resilient
      const users = readLocalUsers();
      const existingIdx = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(data.password, salt);
      const localEntry: StoredUser = {
        id: supaUserId,
        email: normalizedEmail,
        passwordHash,
        salt,
        full_name: sanitized.full_name,
        role: assignedRole,
        onboarding_completed: false,
        created_at: supaCreatedAt,
        updated_at: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        users[existingIdx] = localEntry;
      } else {
        users.push(localEntry);
      }
      writeLocalUsers(users);

      const token = createSessionToken(sanitized);
      return { user: sanitized, token };
    }
  }

  // Local persistent database fallback
  const users = readLocalUsers();
  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists. Please log in instead.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(data.password, salt);
  const assignedRole: UserRole = data.role === 'facility_owner' ? 'venue_owner' : 'player';

  const newUser: StoredUser = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: normalizedEmail,
    passwordHash,
    salt,
    full_name: data.fullName.trim() || normalizedEmail.split('@')[0],
    role: assignedRole,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  users.push(newUser);
  writeLocalUsers(users);

  const sanitized = sanitizeUser(newUser);
  const token = createSessionToken(sanitized);

  return { user: sanitized, token };
}

export async function serverLogin(data: {
  email: string;
  password: string;
}): Promise<{ user: SanitizedUser; token: string }> {
  const normalizedEmail = data.email.trim().toLowerCase();

  // If Supabase is real and configured
  if (isSupabaseConfigured) {
    const supabase = createServerClient();
    if (supabase) {
      const { data: supaData, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: data.password,
      });

      if (error) {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }

      if (supaData?.user) {
        // Retrieve database profile from public.users table
        let dbProfile: any = null;
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', supaData.user.id)
            .maybeSingle();
          dbProfile = profile;
        } catch {}

        const userMeta = supaData.user.user_metadata;
        const sanitized: SanitizedUser = {
          id: supaData.user.id,
          email: supaData.user.email || normalizedEmail,
          full_name: dbProfile?.full_name || userMeta?.full_name || normalizedEmail.split('@')[0],
          nickname: dbProfile?.nickname || userMeta?.full_name?.split(' ')[0] || normalizedEmail.split('@')[0],
          role: (dbProfile?.role || userMeta?.role === 'venue_owner' ? 'venue_owner' : 'player') as UserRole,
          onboarding_completed: Boolean(dbProfile?.onboarding_completed ?? userMeta?.onboarding_completed),
          created_at: supaData.user.created_at,
        };

        // Cache or sync local user entry
        const users = readLocalUsers();
        const existingIdx = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = hashPassword(data.password, salt);
        const localEntry: StoredUser = {
          id: supaData.user.id,
          email: normalizedEmail,
          passwordHash,
          salt,
          full_name: sanitized.full_name,
          role: sanitized.role,
          onboarding_completed: sanitized.onboarding_completed,
          created_at: supaData.user.created_at,
          updated_at: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          users[existingIdx] = localEntry;
        } else {
          users.push(localEntry);
        }
        writeLocalUsers(users);

        const token = createSessionToken(sanitized);
        return { user: sanitized, token };
      }
    }
  }

  // Local persistent database validation
  const users = readLocalUsers();
  const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    throw new Error('Invalid email or password. Please verify your credentials.');
  }

  const computedHash = hashPassword(data.password, user.salt);
  if (computedHash !== user.passwordHash) {
    throw new Error('Invalid email or password. Please verify your credentials.');
  }

  const sanitized = sanitizeUser(user);
  const token = createSessionToken(sanitized);

  return { user: sanitized, token };
}

export async function serverGetUser(userId: string): Promise<SanitizedUser | null> {
  if (isSupabaseConfigured) {
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
            role: supaUser.role as UserRole,
            onboarding_completed: Boolean(supaUser.onboarding_completed),
            created_at: supaUser.created_at,
          };
        }
      }
    } catch (err) {
      console.warn('[ServerAuth] Supabase lookup error in serverGetUser:', err);
    }
  }

  const users = readLocalUsers();
  const user = users.find((u) => u.id === userId);
  return user ? sanitizeUser(user) : null;
}

export async function serverUpdateUserProfile(
  userId: string,
  data: {
    fullName?: string;
    nickname?: string;
    primarySport?: string;
    preferredSports?: string[];
    city?: string;
    skillLevel?: string;
    onboardingCompleted?: boolean;
  }
): Promise<SanitizedUser | null> {
  if (isSupabaseConfigured) {
    try {
      const db = createAdminClient() || createServerClient();
      if (db) {
        await db
          .from('users')
          .update({
            full_name: data.fullName,
            nickname: data.nickname,
            primary_sport: data.primarySport,
            preferred_sports: data.preferredSports,
            city: data.city,
            skill_level: data.skillLevel,
            onboarding_completed: data.onboardingCompleted ?? true,
            updated_at: new Date().toISOString(),
          })
          .or(`auth_id.eq.${userId},id.eq.${userId}`);
      }
    } catch (err) {
      console.warn('[ServerAuth] Supabase update warning:', err);
    }
  }

  const users = readLocalUsers();
  const userIdx = users.findIndex((u) => u.id === userId);
  if (userIdx >= 0) {
    users[userIdx] = {
      ...users[userIdx],
      full_name: data.fullName || users[userIdx].full_name,
      onboarding_completed: data.onboardingCompleted ?? true,
      updated_at: new Date().toISOString(),
    };
    writeLocalUsers(users);
    return sanitizeUser(users[userIdx]);
  }

  return null;
}
