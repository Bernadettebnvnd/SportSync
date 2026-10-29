import { NextResponse } from 'next/server';
import { serverRegister } from '@/lib/auth/serverAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, fullName, role } = body;

    // 1. Validation
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address (e.g. player@example.com).' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 2. Perform Registration
    const result = await serverRegister({
      email: email.trim(),
      password: password.trim(),
      fullName: (fullName || '').trim(),
      role: role || 'player',
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Account registered successfully.',
        user: {
          ...result.user,
          fullName: result.user.full_name,
        },
        token: result.token,
      },
      { status: 201 }
    );

    // Set cookie for session persistence (supports middleware checks)
    response.cookies.set('sportsync-auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Also set sb-access-token cookie for middleware compatibility
    response.cookies.set('sb-access-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed.';
    const status = message.includes('already exists') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
