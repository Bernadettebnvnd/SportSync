import { NextResponse } from 'next/server';
import { calculateBookingFees, generateBookingReference } from '@/lib/utils';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    const body = await request.json();
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

    // 2. Validate duration
    const duration = Math.max(30, Math.min(240, Number(durationMinutes) || 60));

    // Calculate end time
    const [startH, startM] = startTime.split(':').map(Number);
    const endTotalM = startH * 60 + startM + duration;
    const endH = Math.floor(endTotalM / 60);
    const endMin = endTotalM % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    if (!isSupabaseConfigured) {
      // In unconfigured dev environment, return structured response without DB persistence
      const hourlyRate = 45000;
      const fees = calculateBookingFees(hourlyRate, duration);
      const bookingRef = generateBookingReference();

      return NextResponse.json({
        success: true,
        booking: {
          bookingReference: bookingRef,
          venueId,
          courtId,
          sport,
          bookingDate,
          startTime,
          endTime,
          durationMinutes: duration,
          courtRateCents: hourlyRate,
          bookingAmountCents: fees.totalAmountCents,
          platformFeeCents: fees.platformFeeCents,
          facilityAmountCents: fees.facilityAmountCents,
          totalAmountCents: fees.totalAmountCents,
          paymentMethod,
          paymentCategory,
          referenceCode: referenceCode || bookingRef,
          notes,
          status: paymentCategory === 'cash' ? 'confirmed' : 'pending',
          paymentStatus: paymentCategory === 'cash' ? 'cash_at_venue' : 'pending',
        },
      });
    }

    // 3. Authenticate User
    const supabase = createServerClient(token);
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to reserve a court.' },
        { status: 401 }
      );
    }

    const authUserId = authData.user.id;

    // Look up or create public user record
    let { data: publicUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUserId)
      .maybeSingle();

    if (!publicUser) {
      // Create record if trigger didn't fire
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          auth_id: authUserId,
          email: authData.user.email || '',
          full_name: authData.user.user_metadata?.full_name || 'Player',
        })
        .select('id')
        .single();
      publicUser = newUser;
    }

    if (!publicUser) {
      return NextResponse.json({ error: 'Unable to resolve user profile.' }, { status: 500 });
    }

    // 4. Rate & Court Verification (Always query rate from database, never trust client input)
    const { data: court, error: courtError } = await supabase
      .from('courts')
      .select('id, venue_id, name, sport, hourly_rate_cents, is_active')
      .eq('id', courtId)
      .single();

    if (courtError || !court || !court.is_active) {
      return NextResponse.json(
        { error: 'The requested playing area is inactive or does not exist.' },
        { status: 404 }
      );
    }

    if (court.venue_id !== venueId) {
      return NextResponse.json(
        { error: 'Court does not belong to the specified venue.' },
        { status: 400 }
      );
    }

    const hourlyRate = court.hourly_rate_cents;
    const fees = calculateBookingFees(hourlyRate, duration);
    const bookingRef = generateBookingReference();

    // 5. Overlap / Availability Conflict Check
    const startIso = new Date(`${bookingDate}T${startTime}:00Z`).toISOString();
    const endIso = new Date(`${bookingDate}T${endTime}:00Z`).toISOString();

    const { data: existingBlocks } = await supabase
      .from('court_availability')
      .select('id')
      .eq('court_id', courtId)
      .or(`and(start_time.lte.${startIso},end_time.gt.${startIso}),and(start_time.lt.${endIso},end_time.gte.${endIso})`);

    if (existingBlocks && existingBlocks.length > 0) {
      return NextResponse.json(
        { error: 'This court slot has just been reserved by another player. Please select another time.' },
        { status: 409 }
      );
    }

    // 6. Database Insertion
    const isCash = paymentCategory === 'cash';
    const initialStatus = isCash ? 'confirmed' : 'pending';
    const initialPaymentStatus = isCash ? 'cash_at_venue' : 'pending';

    // Use admin client if available to ensure atomic reservation
    const dbClient = createAdminClient() || supabase;

    const { data: newBooking, error: bookingInsertError } = await dbClient
      .from('bookings')
      .insert({
        booking_reference: bookingRef,
        user_id: publicUser.id,
        venue_id: venueId,
        court_id: courtId,
        sport: court.sport || sport,
        booking_date: bookingDate,
        start_time: startIso,
        end_time: endIso,
        duration_minutes: duration,
        court_rate_cents: hourlyRate,
        booking_amount_cents: fees.totalAmountCents,
        platform_fee_cents: fees.platformFeeCents,
        total_amount_cents: fees.totalAmountCents,
        status: initialStatus,
        payment_status: initialPaymentStatus,
        payment_method: paymentMethod,
        reference_code: referenceCode || bookingRef,
        notes,
      })
      .select()
      .single();

    if (bookingInsertError || !newBooking) {
      console.error('Error inserting booking:', bookingInsertError);
      return NextResponse.json(
        { error: bookingInsertError?.message || 'Failed to record booking.' },
        { status: 500 }
      );
    }

    // Lock availability slot
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
      amount_cents: fees.totalAmountCents,
      payment_method: paymentMethod,
      reference_code: referenceCode || bookingRef,
      status: initialPaymentStatus,
      notes: `Court: ${court.name} | Date: ${bookingDate} ${startTime}`,
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: newBooking.id,
        bookingReference: bookingRef,
        venueId,
        courtId,
        courtName: court.name,
        sport: court.sport,
        bookingDate,
        startTime,
        endTime,
        durationMinutes: duration,
        totalAmountCents: fees.totalAmountCents,
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error processing reservation.';
    console.error('Booking API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
