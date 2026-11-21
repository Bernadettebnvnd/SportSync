import { NextResponse } from 'next/server';
import { calculateBookingFees, generateBookingReference } from '@/lib/utils';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { verifySessionToken, serverGetUser, SanitizedUser } from '@/lib/auth/serverAuth';

async function authenticateRequest(request: Request): Promise<SanitizedUser | null> {
  // 1. Check Bearer token in Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const verified = verifySessionToken(token);
      if (verified) {
        const user = await serverGetUser(verified.userId);
        if (user) return user;
      }
      if (isSupabaseConfigured) {
        const sb = createServerClient(token);
        if (sb) {
          const { data } = await sb.auth.getUser();
          if (data?.user?.id) {
            const user = await serverGetUser(data.user.id);
            if (user) return user;
          }
        }
      }
    }
  }

  // 2. Check Cookie header
  const cookieHeader = request.headers.get('cookie') || '';
  const match =
    cookieHeader.match(/sportsync-auth-token=([^;]+)/) ||
    cookieHeader.match(/sb-access-token=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    const verified = verifySessionToken(token);
    if (verified) {
      const user = await serverGetUser(verified.userId);
      if (user) return user;
    }
  }

  return null;
}

const VALID_BOOKING_STATUSES = new Set([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'rejected',
  'no_show',
]);

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 500 });
    }

    const dbClient = createAdminClient() || createServerClient();
    if (!dbClient) {
      return NextResponse.json({ error: 'Database client unavailable.' }, { status: 500 });
    }

    const url = new URL(request.url);
    const venueId = url.searchParams.get('venueId');
    const courtId = url.searchParams.get('courtId');
    const bookingDate = url.searchParams.get('date');
    const userId = url.searchParams.get('userId');
    const mine = url.searchParams.get('mine') === 'true';

    let targetUserId = userId;
    if (mine) {
      const user = await authenticateRequest(request);
      if (!user) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }
      targetUserId = user.id;
    }

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
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[BookingsAPI GET] Supabase query failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookings: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve bookings.';
    console.error('[BookingsAPI GET] Unexpected error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    // 1. Authenticate requester
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { bookingId, status, reason } = body as {
      bookingId?: string;
      status?: string;
      reason?: string;
    };

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: 'Missing required parameters (bookingId, status).' },
        { status: 400 }
      );
    }

    if (!VALID_BOOKING_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `Invalid booking status: ${status}` },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase is not configured on the server.' },
        { status: 500 }
      );
    }

    const dbClient = createAdminClient() || createServerClient();
    if (!dbClient) {
      return NextResponse.json(
        { error: 'Database client is not available.' },
        { status: 500 }
      );
    }

    // 2. Fetch the target booking
    const { data: currentBooking, error: fetchErr } = await dbClient
      .from('bookings')
      .select('*, venue:venues(id, name, owner_id), court:courts(id, name)')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr) {
      console.error('[BookingsAPI PATCH] Failed fetching booking:', fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!currentBooking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    // 3. Verify authorization: owner or facility_staff of the booking's venue (or player cancelling their own booking)
    const isPlayerSelfCancel =
      status === 'cancelled' && currentBooking.user_id === authUser.id;

    let isAuthorizedFacilityManager = Boolean(
      currentBooking.venue?.owner_id && currentBooking.venue.owner_id === authUser.id
    );

    if (!isAuthorizedFacilityManager && currentBooking.venue_id) {
      const { data: staffRow, error: staffErr } = await dbClient
        .from('facility_staff')
        .select('id, role')
        .eq('facility_id', currentBooking.venue_id)
        .eq('user_id', authUser.id)
        .limit(1)
        .maybeSingle();

      if (staffErr) {
        console.error('[BookingsAPI PATCH] facility_staff lookup failed:', staffErr);
        return NextResponse.json({ error: staffErr.message }, { status: 500 });
      }
      if (staffRow?.id) {
        isAuthorizedFacilityManager = true;
      }
    }

    if (!isAuthorizedFacilityManager && !isPlayerSelfCancel) {
      return NextResponse.json(
        { error: 'Forbidden: You are not authorized to manage bookings for this venue.' },
        { status: 403 }
      );
    }

    // 4. Handle court_availability locking / unlocking
    if (status === 'confirmed') {
      const { data: conflicts, error: conflictErr } = await dbClient
        .from('bookings')
        .select('id, booking_reference')
        .eq('court_id', currentBooking.court_id)
        .eq('booking_date', currentBooking.booking_date)
        .eq('status', 'confirmed')
        .neq('id', currentBooking.id)
        .or(
          `and(start_time.lte.${currentBooking.start_time},end_time.gt.${currentBooking.start_time}),and(start_time.lt.${currentBooking.end_time},end_time.gte.${currentBooking.end_time})`
        );

      if (conflictErr) {
        console.error('[BookingsAPI PATCH] Conflict check failed:', conflictErr);
        return NextResponse.json({ error: conflictErr.message }, { status: 500 });
      }

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          {
            error:
              'Cannot confirm: Court slot has already been booked by another confirmed reservation.',
          },
          { status: 409 }
        );
      }

      // Remove any stale lock for this booking first, then insert fresh lock
      const { error: cleanAvailErr } = await dbClient
        .from('court_availability')
        .delete()
        .eq('booking_id', currentBooking.id);

      if (cleanAvailErr) {
        console.error('[BookingsAPI PATCH] court_availability cleanup failed:', cleanAvailErr);
        return NextResponse.json({ error: cleanAvailErr.message }, { status: 500 });
      }

      const { error: lockErr } = await dbClient.from('court_availability').insert({
        court_id: currentBooking.court_id,
        start_time: currentBooking.start_time,
        end_time: currentBooking.end_time,
        block_type: 'booked',
        booking_id: currentBooking.id,
      });

      if (lockErr) {
        console.error('[BookingsAPI PATCH] court_availability lock failed:', lockErr);
        const statusCode = lockErr.code === '23P01' ? 409 : 500;
        return NextResponse.json(
          {
            error:
              lockErr.code === '23P01'
                ? 'Cannot confirm: Court slot overlaps with an existing locked reservation.'
                : lockErr.message,
          },
          { status: statusCode }
        );
      }
    } else if (status === 'rejected' || status === 'cancelled') {
      const { error: unlockErr } = await dbClient
        .from('court_availability')
        .delete()
        .eq('booking_id', bookingId);

      if (unlockErr) {
        console.error('[BookingsAPI PATCH] court_availability unlock failed:', unlockErr);
        return NextResponse.json({ error: unlockErr.message }, { status: 500 });
      }
    }

    // 5. Update booking status (and persist decline reason in notes when provided)
    const cleanReason = typeof reason === 'string' ? reason.trim() : '';
    const updatePayload: { status: string; updated_at: string; notes?: string } = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'rejected' && cleanReason) {
      const existingNotes = (currentBooking.notes || '').trim();
      updatePayload.notes = existingNotes
        ? `${existingNotes} | Declined: ${cleanReason}`
        : `Declined: ${cleanReason}`;
    }

    const { data: updatedBooking, error: updateErr } = await dbClient
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select('*, user:users(*), court:courts(*), venue:venues(*)')
      .single();

    if (updateErr || !updatedBooking) {
      console.error('[BookingsAPI PATCH] Booking update failed:', updateErr);
      return NextResponse.json(
        { error: updateErr?.message || 'Failed to update booking.' },
        { status: 500 }
      );
    }

    // 6. Insert persistent notification for the player on confirm / reject
    if ((status === 'confirmed' || status === 'rejected') && currentBooking.user_id) {
      const venueName = currentBooking.venue?.name || 'Venue';
      const courtName = currentBooking.court?.name || 'Court';
      const isConfirmed = status === 'confirmed';

      const { error: notifErr } = await dbClient.from('notifications').insert({
        user_id: currentBooking.user_id,
        type: 'booking',
        title: isConfirmed ? 'Booking Approved! 🎉' : 'Booking Request Declined',
        description: isConfirmed
          ? `${venueName} has confirmed your reservation for ${courtName} on ${currentBooking.booking_date} (${currentBooking.start_time} - ${currentBooking.end_time}). See you on the court!`
          : `Your booking request at ${venueName} for ${courtName} on ${currentBooking.booking_date} (${currentBooking.start_time}) was declined by the venue.${cleanReason ? ` Reason: ${cleanReason}` : ''}`,
        link_screen: 'my-bookings',
        metadata: {
          event: isConfirmed ? 'booking_approved' : 'booking_rejected',
          bookingId: currentBooking.id,
          reference: currentBooking.booking_reference,
          status,
          ...(cleanReason ? { reason: cleanReason } : {}),
        },
      });

      if (notifErr) {
        console.error('[BookingsAPI PATCH] Notification insert failed:', notifErr);
        return NextResponse.json({ error: notifErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      bookingId,
      status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update booking status.';
    console.error('[BookingsAPI PATCH] Unexpected error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate requester
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required to create a booking.' }, { status: 401 });
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 500 });
    }

    const dbClient = createAdminClient() || createServerClient();
    if (!dbClient) {
      return NextResponse.json(
        { error: 'Database client is not available.' },
        { status: 500 }
      );
    }

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

    if (!venueId || !courtId || !bookingDate || !startTime) {
      return NextResponse.json(
        { error: 'Missing required booking parameters (venueId, courtId, bookingDate, startTime).' },
        { status: 400 }
      );
    }

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

    const duration = Math.max(30, Math.min(240, Number(durationMinutes) || 60));
    const timeMatch = typeof startTime === 'string' ? startTime.trim().match(/^(\d{1,2}):(\d{2})$/) : null;
    if (!timeMatch) {
      return NextResponse.json(
        { error: 'Invalid startTime format. Expected HH:MM.' },
        { status: 400 }
      );
    }
    const startH = Number(timeMatch[1]);
    const startM = Number(timeMatch[2]);
    if (startH < 0 || startH > 23 || startM < 0 || startM > 59) {
      return NextResponse.json(
        { error: 'Invalid startTime hours or minutes.' },
        { status: 400 }
      );
    }
    const normalizedStartTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    const startDateTime = new Date(`${bookingDate}T${normalizedStartTime}:00Z`);
    if (Number.isNaN(startDateTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid bookingDate or startTime.' },
        { status: 400 }
      );
    }
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
    const startIso = startDateTime.toISOString();
    const endIso = endDateTime.toISOString();

    const bookingRef = generateBookingReference();
    const hourlyRate = 45000;

    const initialStatus = 'pending';
    const initialPaymentStatus = isCash
      ? 'cash_at_venue'
      : referenceCode && referenceCode.trim().length >= 6
      ? 'approved'
      : 'pending';
    const finalReference = (referenceCode || '').trim() || bookingRef;

    const { data: court, error: courtErr } = await dbClient
      .from('courts')
      .select('id, venue_id, name, sport, hourly_rate_cents, is_active')
      .eq('id', courtId)
      .maybeSingle();

    if (courtErr) {
      console.error('[BookingsAPI POST] Court lookup failed:', courtErr);
      return NextResponse.json({ error: courtErr.message }, { status: 500 });
    }

    const actualRate = court?.hourly_rate_cents || hourlyRate;
    const actualFees = calculateBookingFees(actualRate, duration);

    const { data: confirmedConflicts, error: conflictErr } = await dbClient
      .from('bookings')
      .select('id')
      .eq('court_id', courtId)
      .eq('booking_date', bookingDate)
      .eq('status', 'confirmed')
      .or(
        `and(start_time.lte.${startIso},end_time.gt.${startIso}),and(start_time.lt.${endIso},end_time.gte.${endIso})`
      );

    if (conflictErr) {
      console.error('[BookingsAPI POST] Conflict check failed:', conflictErr);
      return NextResponse.json({ error: conflictErr.message }, { status: 500 });
    }

    if (confirmedConflicts && confirmedConflicts.length > 0) {
      return NextResponse.json(
        {
          error:
            'This court slot has already been reserved by a confirmed booking. Please select another time.',
        },
        { status: 409 }
      );
    }

    const { data: newBooking, error: insertErr } = await dbClient
      .from('bookings')
      .insert({
        booking_reference: bookingRef,
        user_id: authUser.id,
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

    if (insertErr || !newBooking) {
      console.error('[BookingsAPI POST] Booking insert failed:', insertErr);
      return NextResponse.json(
        { error: insertErr?.message || 'Failed to create booking.' },
        { status: 500 }
      );
    }

    const { error: paymentErr } = await dbClient.from('payments').insert({
      booking_id: newBooking.id,
      court_id: courtId,
      user_id: authUser.id,
      amount_cents: actualFees.totalAmountCents,
      payment_method: normalizedMethod,
      reference_code: finalReference,
      status: initialPaymentStatus,
      notes: `Court reservation request: ${court?.name || courtId} | Date: ${bookingDate} ${startTime}`,
    });

    if (paymentErr) {
      console.error('[BookingsAPI POST] Payment insert failed:', paymentErr);
      return NextResponse.json({ error: paymentErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Booking request submitted. Awaiting venue confirmation.',
        booking: newBooking,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error processing reservation.';
    console.error('[BookingsAPI POST] Unexpected error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
