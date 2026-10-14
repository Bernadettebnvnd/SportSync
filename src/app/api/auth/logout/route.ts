import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  
  response.cookies.delete('sportsync-auth-token');
  response.cookies.delete('sb-access-token');

  return response;
}
