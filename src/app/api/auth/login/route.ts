import { NextResponse } from 'next/server';
import { serverLogin } from '@/lib/auth/serverAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    // 1. Validation
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 }
      );
    }

    // 2. Perform Login
    const result = await serverLogin({
      email: email.trim(),
      password: password.trim(),
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Signed in successfully.',
        user: {
          ...result.user,
          fullName: result.user.full_name,
        },
        token: result.token,
      },
      { status: 200 }
    );

    // Set cookie for session persistence (supports middleware checks)
    response.cookies.set('sportsync-auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
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
    const message = err instanceof Error ? err.message : 'Authentication failed.';
    const status = message.includes('Invalid email or password') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
