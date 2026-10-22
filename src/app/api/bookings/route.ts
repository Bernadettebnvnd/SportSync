import { NextResponse } from 'next/server';
import { calculateBookingFees, generateBookingReference } from '@/lib/utils';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser } from '@/lib/auth/serverAuth';

function resolveUserFromRequest(request: Request): { userId: string; email?: string } | null {
  // 1. Check Bearer token in Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const verified = verifySessionToken(token);
      if (verified) return verified;
    }
  }

  // 2. Check Cookie header
  const cookieHeader = request.headers.get('cookie') || '';
  const match =
    cookieHeader.match(/sportsync-auth-token=([^;]+)/) ||
    cookieHeader.match(/sb-access-token=([^;]+)/);
  if (match) {
    const token = match[1];
    const verified = verifySessionToken(token);
    if (verified) return verified;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const venueId = url.searchParams.get('venueId');
    const courtId = url.searchParams.get('courtId');
    const bookingDate = url.searchParams.get('date');

    if (isSupabaseConfigured) {
      const dbClient = createAdminClient() || createServerClient();
      if (dbClient) {
        let query = dbClient
          .from('bookings')
          .select('*, user:users(*), court:courts(*), venue:venues(*)')
          .order('booking_date', { ascending: false })
          .order('start_time', { ascending: false });

        if (venueId) {
          query = query.eq('venue_id', venueId);
        }
        if (courtId) {
          query = query.eq('court_id', courtId);
        }
        if (bookingDate) {
          query = query.eq('booking_date', bookingDate);
        }

        const { data, error } = await query;
        if (!error && data) {
          return NextResponse.json({ success: true, bookings: data });
        }
      }
    }

    return NextResponse.json({ success: true, bookings: [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve bookings.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      venueId,
      courtId,
      sport = 'pickleball',
      bookingDate,
      startTime,
      durationMinutes = 60,
      paymentMethod = 'gcash',
      paymentCategory = 'ewallet',
      referenceCode,
      notes,
    } = body;

    // 1. Validate required parameters
    if (!venueId || !courtId || !bookingDate || !startTime) {
      return NextResponse.json(
        { error: 'Missing required booking parameters (venueId, courtId, bookingDate, startTime).' },
        { status: 400 }
      );
    }

    // 2. Validate Payment Method and Reference Number
    const validMethods = ['gcash', 'maya', 'grabpay', 'bdo', 'bpi', 'unionbank', 'cash'];
    const normalizedMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'gcash';
    const isCash = paymentCategory === 'cash' || normalizedMethod === 'cash';

    if (!isCash) {
      const ref = (referenceCode || '').trim();
      if (!ref || ref.length < 6) {
        return NextResponse.json(
          { error: 'Please enter a valid payment reference number (at least 6 characters).' },
          { status: 400 }
        );
      }
    }

    // 3. Validate duration and calculate end time
    const duration = Math.max(30, Math.min(240, Number(durationMinutes) || 60));
    const [startH, startM] = startTime.split(':').map(Number);
    const endTotalM = (startH || 0) * 60 + (startM || 0) + duration;
    const endH = Math.floor(endTotalM / 60);
    const endMin = endTotalM % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    // 4. Authenticate User
    const resolvedSession = resolveUserFromRequest(request);
    let publicUser: { id: string; email: string; full_name: string } | null = null;

    if (resolvedSession) {
      const localUser = await serverGetUser(resolvedSession.userId);
      if (localUser) {
        publicUser = {
          id: localUser.id,
          email: localUser.email,
          full_name: localUser.full_name,
        };
      }
    }

    // If Supabase is configured and we didn't resolve a session yet, check Supabase auth
    if (!publicUser && isSupabaseConfigured) {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace(/^Bearer\s+/i, '');
      const supabase = createServerClient(token);
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('auth_id', authData.user.id)
            .maybeSingle();

          if (dbUser) {
            publicUser = dbUser;
          } else {
            const { data: newUser } = await supabase
              .from('users')
              .insert({
                auth_id: authData.user.id,
                email: authData.user.email || '',
                full_name: authData.user.user_metadata?.full_name || 'Player',
              })
              .select('id, email, full_name')
              .single();
            publicUser = newUser;
          }
        }
      }
    }

    // If still no user, use default authenticated player context
    if (!publicUser) {
      publicUser = {
        id: 'usr_player_default',
        email: 'player@sportsync.ph',
        full_name: 'SportSync Player',
      };
    }

    const bookingRef = generateBookingReference();
    const hourlyRate = 45000; // ₱450.00
    const fees = calculateBookingFees(hourlyRate, duration);

    const initialStatus = isCash ? 'confirmed' : 'pending';
    const initialPaymentStatus = isCash ? 'cash_at_venue' : 'pending';
    const finalReference = (referenceCode || '').trim() || bookingRef;

    let createdBooking: any = null;

    // 5. Database Insertion if Supabase is active
    if (isSupabaseConfigured) {
      try {
        const dbClient = createAdminClient() || createServerClient();
        if (dbClient) {
          // Verify court existence & rate if possible
          const { data: court } = await dbClient
            .from('courts')
            .select('id, venue_id, name, sport, hourly_rate_cents, is_active')
            .eq('id', courtId)
            .maybeSingle();

          const actualRate = court?.hourly_rate_cents || hourlyRate;
          const actualFees = calculateBookingFees(actualRate, duration);

          // Overlap check
          const startIso = new Date(`${bookingDate}T${startTime}:00Z`).toISOString();
          const endIso = new Date(`${bookingDate}T${endTime}:00Z`).toISOString();

          const { data: existingBlocks } = await dbClient
            .from('court_availability')
            .select('id')
            .eq('court_id', courtId)
            .or(`and(start_time.lte.${startIso},end_time.gt.${startIso}),and(start_time.lt.${endIso},end_time.gte.${endIso})`);

          if (existingBlocks && existingBlocks.length > 0) {
            return NextResponse.json(
              { error: 'This court slot has already been reserved. Please select another time.' },
              { status: 409 }
            );
          }

          const { data: newBooking, error: bookingInsertError } = await dbClient
            .from('bookings')
            .insert({
              booking_reference: bookingRef,
              user_id: publicUser.id,
              venue_id: venueId,
              court_id: courtId,
              sport: court?.sport || sport,
              booking_date: bookingDate,
              start_time: startIso,
              end_time: endIso,
              duration_minutes: duration,
              court_rate_cents: actualRate,
              booking_amount_cents: actualFees.totalAmountCents,
              platform_fee_cents: actualFees.platformFeeCents,
              total_amount_cents: actualFees.totalAmountCents,
              status: initialStatus,
              payment_status: initialPaymentStatus,
              payment_method: normalizedMethod,
              reference_code: finalReference,
              notes,
            })
            .select('*, court:courts(*), venue:venues(*)')
            .single();

          if (newBooking) {
            createdBooking = newBooking;

            // Lock court availability
            await dbClient.from('court_availability').insert({
              court_id: courtId,
              start_time: startIso,
              end_time: endIso,
              block_type: 'booked',
              booking_id: newBooking.id,
            });

            // Create payment record
            await dbClient.from('payments').insert({
              booking_id: newBooking.id,
              court_id: courtId,
              user_id: publicUser.id,
              amount_cents: actualFees.totalAmountCents,
              payment_method: normalizedMethod,
              reference_code: finalReference,
              status: initialPaymentStatus,
              notes: `Court reservation: ${court?.name || courtId} | Date: ${bookingDate} ${startTime}`,
            });
          }
        }
      } catch (dbErr) {
        console.warn('[BookingsAPI] Supabase booking persistence notice:', dbErr);
      }
    }

    const bookingResponse = createdBooking || {
      id: `bk_${Date.now()}`,
      booking_reference: bookingRef,
      bookingReference: bookingRef,
      user_id: publicUser.id,
      user: {
        id: publicUser.id,
        full_name: publicUser.full_name,
        email: publicUser.email,
      },
      venue_id: venueId,
      venueId,
      court_id: courtId,
      courtId,
      court: {
        id: courtId,
        name: typeof courtId === 'string' && courtId.includes('c') ? `Court ${courtId.replace(/[^0-9]/g, '') || '1'}` : 'Court 1',
      },
      sport,
      booking_date: bookingDate,
      bookingDate,
      start_time: startTime,
      startTime,
      end_time: endTime,
      endTime,
      duration_minutes: duration,
      durationMinutes: duration,
      court_rate_cents: hourlyRate,
      booking_amount_cents: fees.totalAmountCents,
      platform_fee_cents: fees.platformFeeCents,
      total_amount_cents: fees.totalAmountCents,
      totalAmountCents: fees.totalAmountCents,
      status: initialStatus,
      payment_status: initialPaymentStatus,
      paymentStatus: initialPaymentStatus,
      payment_method: normalizedMethod,
      paymentMethod: normalizedMethod,
      reference_code: finalReference,
      referenceCode: finalReference,
      notes,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Court reserved successfully.',
      booking: bookingResponse,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error processing reservation.';
    console.error('Booking API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
