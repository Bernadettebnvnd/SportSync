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
    if (admin) {
      const { data: supaUser, error } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.fullName.trim(),
          role: data.role === 'facility_owner' ? 'venue_owner' : 'player',
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already') || error.status === 422) {
          throw new Error('An account with this email already exists. Please log in instead.');
        }
        throw new Error(error.message);
      }

      if (supaUser?.user) {
        const sanitized: SanitizedUser = {
          id: supaUser.user.id,
          email: supaUser.user.email || normalizedEmail,
          full_name: data.fullName.trim(),
          nickname: normalizedEmail.split('@')[0],
          role: (data.role === 'facility_owner' ? 'venue_owner' : 'player') as UserRole,
          onboarding_completed: false,
          created_at: supaUser.user.created_at,
        };
        const token = createSessionToken(sanitized);
        return { user: sanitized, token };
      }
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
        const userMeta = supaData.user.user_metadata;
        const sanitized: SanitizedUser = {
          id: supaData.user.id,
          email: supaData.user.email || normalizedEmail,
          full_name: userMeta?.full_name || normalizedEmail.split('@')[0],
          nickname: normalizedEmail.split('@')[0],
          role: (userMeta?.role === 'venue_owner' ? 'venue_owner' : 'player') as UserRole,
          onboarding_completed: Boolean(userMeta?.onboarding_completed),
          created_at: supaData.user.created_at,
        };
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
  const users = readLocalUsers();
  const user = users.find((u) => u.id === userId);
  return user ? sanitizeUser(user) : null;
}
