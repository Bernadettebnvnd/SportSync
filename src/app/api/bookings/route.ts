/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { calculateBookingFees, generateBookingReference } from '@/lib/utils';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  verifySessionToken,
  serverGetUser,
  SanitizedUser,
  sanitizePhoneValue,
  isMissingColumnError,
  extractMissingColumn,
  isMissingTableError,
} from '@/lib/auth/serverAuth';

// In-memory resilient store for bookings when public.bookings is missing from schema cache
const fallbackBookingsStore = new Map<string, any>();

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

function isValidUuid(val?: string | null): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
}

const VALID_BOOKING_STATUSES = new Set([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'rejected',
  'no_show',
]);

async function enrichBookingsWithUsers(bookingsList: any[], dbClient: any): Promise<any[]> {
  if (!bookingsList || bookingsList.length === 0) return bookingsList;

  // Collect user IDs that need profile lookup from public.users
  const userIdsToLookup = Array.from(
    new Set(
      bookingsList
        .filter(
          (b: any) =>
            (!b.user || !b.user.email || !b.user.full_name || b.user.full_name === 'Customer') &&
            b.user_id &&
            isValidUuid(b.user_id)
        )
        .map((b: any) => b.user_id)
    )
  );

  const userMap = new Map<string, any>();
  if (userIdsToLookup.length > 0 && dbClient) {
    try {
      const orFilter = userIdsToLookup.map((id) => `id.eq.${id},auth_id.eq.${id}`).join(',');
      const { data: dbUsers } = await dbClient
        .from('users')
        .select('id, auth_id, full_name, nickname, email, phone, avatar_url')
        .or(orFilter);

      if (dbUsers && dbUsers.length > 0) {
        dbUsers.forEach((u: any) => {
          if (u.id) userMap.set(u.id, u);
          if (u.auth_id) userMap.set(u.auth_id, u);
        });
      }
    } catch (err) {
      console.warn('[BookingsAPI] Error querying users for booking enrichment:', err);
    }
  }

  return bookingsList.map((b: any) => {
    let customerName = b.user?.full_name || '';
    let customerEmail = b.user?.email || '';
    let customerPhone = sanitizePhoneValue(b.user?.phone) || '';

    // Check DB user match
    if (b.user_id && userMap.has(b.user_id)) {
      const u = userMap.get(b.user_id);
      if (!customerName || customerName === 'Customer') {
        customerName = u.full_name || u.nickname || (u.email ? u.email.split('@')[0] : '');
      }
      if (!customerEmail) customerEmail = u.email || '';
      if (!customerPhone) customerPhone = sanitizePhoneValue(u.phone) || '';
    }

    // Parse [CUSTOMER:Name|Email|Phone] from notes
    if (b.notes && typeof b.notes === 'string') {
      const match = b.notes.match(/\[CUSTOMER:(.*?)\|(.*?)\|(.*?)\]/);
      if (match) {
        if (!customerName || customerName === 'Customer') customerName = match[1];
        if (!customerEmail) customerEmail = match[2];
        if (!customerPhone) customerPhone = sanitizePhoneValue(match[3]) || '';
      }
    }

    // Default fallbacks
    customerName =
      customerName ||
      b.customer_name ||
      b.customerName ||
      (b.user_id ? `Player (${b.user_id.slice(0, 8)})` : 'Customer');
    customerEmail = customerEmail || b.customer_email || b.customerEmail || '';
    customerPhone =
      sanitizePhoneValue(customerPhone) ||
      sanitizePhoneValue(b.customer_phone) ||
      sanitizePhoneValue(b.customerPhone) ||
      '';

    b.user = {
      id: b.user_id || b.user?.id,
      full_name: customerName,
      email: customerEmail,
      phone: customerPhone,
      avatar_url: b.user?.avatar_url || '',
    };
    b.customer_name = customerName;
    b.customer_email = customerEmail;
    b.customer_phone = customerPhone;

    return b;
  });
}

async function getAuthorizedVenueIdsForUser(
  dbClient: any,
  authUser: SanitizedUser
): Promise<Set<string>> {
  const venueIds = new Set<string>();
  const candidateUserIds = [authUser.id, authUser.auth_id].filter((id): id is string =>
    isValidUuid(id)
  );

  if (!dbClient || candidateUserIds.length === 0) {
    return venueIds;
  }

  try {
    const ownerOr = candidateUserIds.map((id) => `owner_id.eq.${id}`).join(',');
    const { data: ownedVenues } = await dbClient
      .from('venues')
      .select('id')
      .or(ownerOr);
    if (Array.isArray(ownedVenues)) {
      ownedVenues.forEach((v: any) => {
        if (v?.id) venueIds.add(v.id);
      });
    }
  } catch {}

  try {
    const staffOr = candidateUserIds.map((id) => `user_id.eq.${id}`).join(',');
    const { data: staffRows } = await dbClient
      .from('facility_staff')
      .select('facility_id')
      .or(staffOr);
    if (Array.isArray(staffRows)) {
      staffRows.forEach((s: any) => {
        if (s?.facility_id) venueIds.add(s.facility_id);
      });
    }
  } catch {}

  return venueIds;
}

export async function GET(request: Request) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

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
    const requestedUserId = url.searchParams.get('userId');
    const mine = url.searchParams.get('mine') === 'true';

    const isAdmin = String((authUser as any).role || '') === 'admin';
    const selfIds = new Set(
      [authUser.id, authUser.auth_id].filter((id): id is string => Boolean(id))
    );

    if (requestedUserId && !isAdmin && !selfIds.has(requestedUserId)) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot view bookings belonging to another user.' },
        { status: 403 }
      );
    }

    const authorizedVenueIds = isAdmin
      ? new Set<string>()
      : await getAuthorizedVenueIdsForUser(dbClient, authUser);

    if (venueId && isValidUuid(venueId) && !isAdmin && !mine && !authorizedVenueIds.has(venueId)) {
      return NextResponse.json(
        { error: 'Forbidden: You are not authorized to view bookings for this venue.' },
        { status: 403 }
      );
    }

    const targetUserId = mine ? authUser.id : requestedUserId;

    let query = dbClient
      .from('bookings')
      .select(
        '*, user:users(id, auth_id, full_name, nickname, email, phone, avatar_url), court:courts(*), venue:venues(*)'
      )
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (venueId && isValidUuid(venueId)) {
      query = query.eq('venue_id', venueId);
    }
    if (courtId && isValidUuid(courtId)) {
      query = query.eq('court_id', courtId);
    }
    if (bookingDate) {
      query = query.eq('booking_date', bookingDate);
    }
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const filterAuthorizedBookings = (list: any[]) => {
      if (isAdmin) return list;
      return list.filter((b: any) => {
        if (b?.user_id && selfIds.has(b.user_id)) return true;
        if (!mine && b?.venue_id && authorizedVenueIds.has(b.venue_id)) return true;
        if (!mine && b?.venue?.owner_id && selfIds.has(b.venue.owner_id)) return true;
        return false;
      });
    };

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[BookingsAPI GET] bookings table not in schema cache; returning matching fallback bookings');
        const rawFallback = Array.from(fallbackBookingsStore.values()).filter((b) => {
          if (venueId && b.venue_id !== venueId) return false;
          if (courtId && b.court_id !== courtId) return false;
          if (bookingDate && b.booking_date !== bookingDate) return false;
          if (targetUserId && b.user_id !== targetUserId) return false;
          return true;
        });
        const scopedFallback = filterAuthorizedBookings(rawFallback);
        const enrichedFallback = await enrichBookingsWithUsers(scopedFallback, dbClient);
        return NextResponse.json({ success: true, bookings: enrichedFallback });
      }
      console.error('[BookingsAPI GET] Supabase query failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const scopedData = filterAuthorizedBookings(data || []);
    const enriched = await enrichBookingsWithUsers(scopedData, dbClient);
    return NextResponse.json({ success: true, bookings: enriched });
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
    let currentBooking: any = null;
    const { data: fetchedBooking, error: fetchErr } = await dbClient
      .from('bookings')
      .select('*, venue:venues(id, name, owner_id), court:courts(id, name)')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr && !isMissingTableError(fetchErr)) {
      console.error('[BookingsAPI PATCH] Failed fetching booking:', fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    currentBooking = fetchedBooking || fallbackBookingsStore.get(bookingId);

    if (!currentBooking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    // 3. Verify authorization: owner or facility_staff of the booking's venue (or player cancelling their own booking)
    const isPlayerSelfCancel =
      status === 'cancelled' &&
      (currentBooking.user_id === authUser.id ||
        (authUser.auth_id && currentBooking.user_id === authUser.auth_id));

    const roleStr = String((authUser as any).role || '');
    const isAdmin = roleStr === 'admin';

    let isAuthorizedFacilityManager = Boolean(
      isAdmin ||
      (currentBooking.venue?.owner_id && currentBooking.venue.owner_id === authUser.id) ||
      (authUser.auth_id && currentBooking.venue?.owner_id === authUser.auth_id)
    );

    if (!isAuthorizedFacilityManager && currentBooking.venue_id) {
      try {
        const { data: vRow } = await dbClient
          .from('venues')
          .select('id, owner_id')
          .eq('id', currentBooking.venue_id)
          .maybeSingle();

        if (
          vRow &&
          (vRow.owner_id === authUser.id ||
            (authUser.auth_id && vRow.owner_id === authUser.auth_id))
        ) {
          isAuthorizedFacilityManager = true;
        }
      } catch (venueErr) {
        console.warn('[BookingsAPI PATCH] Error checking venue ownership:', venueErr);
      }
    }

    if (!isAuthorizedFacilityManager && currentBooking.venue_id) {
      try {
        const candidateStaffIds = [authUser.id, authUser.auth_id].filter((id): id is string =>
          isValidUuid(id)
        );
        if (candidateStaffIds.length > 0) {
          const { data: staffRow, error: staffErr } = await dbClient
            .from('facility_staff')
            .select('id, role')
            .eq('facility_id', currentBooking.venue_id)
            .in('user_id', candidateStaffIds)
            .limit(1)
            .maybeSingle();

          if (staffErr) {
            if (isMissingTableError(staffErr)) {
              console.warn('[BookingsAPI PATCH] facility_staff table not in schema cache; skipping staff lookup');
            } else {
              console.warn('[BookingsAPI PATCH] facility_staff lookup notice:', staffErr.message);
            }
          } else if (staffRow?.id) {
            isAuthorizedFacilityManager = true;
          }
        }
      } catch (staffCatchErr) {
        console.warn('[BookingsAPI PATCH] facility_staff query exception:', staffCatchErr);
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

      if (conflictErr && !isMissingTableError(conflictErr)) {
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

      if (cleanAvailErr && !isMissingTableError(cleanAvailErr)) {
        console.error('[BookingsAPI PATCH] court_availability cleanup failed:', cleanAvailErr);
      }

      const { error: lockErr } = await dbClient.from('court_availability').insert({
        court_id: currentBooking.court_id,
        start_time: currentBooking.start_time,
        end_time: currentBooking.end_time,
        block_type: 'booked',
        booking_id: currentBooking.id,
      });

      if (lockErr && !isMissingTableError(lockErr)) {
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

      if (unlockErr && !isMissingTableError(unlockErr)) {
        console.error('[BookingsAPI PATCH] court_availability unlock failed:', unlockErr);
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

    let updatedBooking: any = null;
    const { data: dbUpdated, error: updateErr } = await dbClient
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select(
        '*, user:users(id, auth_id, full_name, nickname, email, phone, avatar_url), court:courts(*), venue:venues(*)'
      )
      .maybeSingle();

    if (dbUpdated) {
      updatedBooking = dbUpdated;
    } else if (updateErr && isMissingTableError(updateErr)) {
      console.warn('[BookingsAPI PATCH] bookings table missing from schema cache; updating fallback store');
      updatedBooking = {
        ...currentBooking,
        ...updatePayload,
      };
    } else if (updateErr) {
      console.error('[BookingsAPI PATCH] Booking update failed:', updateErr);
      return NextResponse.json(
        { error: updateErr?.message || 'Failed to update booking.' },
        { status: 500 }
      );
    } else {
      updatedBooking = { ...currentBooking, ...updatePayload };
    }

    if (updatedBooking?.user?.phone) {
      updatedBooking.user.phone = sanitizePhoneValue(updatedBooking.user.phone) || '';
    }
    if (updatedBooking?.customer_phone) {
      updatedBooking.customer_phone = sanitizePhoneValue(updatedBooking.customer_phone) || '';
    }

    fallbackBookingsStore.set(bookingId, updatedBooking);

    // 6. Notify the player on confirm / reject
    let notifItem: any = null;
    if (status === 'confirmed' || status === 'rejected') {
      try {
        const venueName = currentBooking.venue?.name || 'Sports Venue';
        const courtName = currentBooking.court?.name || 'Court';
        const isConfirmed = status === 'confirmed';

        // 6a. Resolve player user details
        let targetUserId: string | null = isValidUuid(currentBooking.user_id) ? currentBooking.user_id : null;
        let targetUserName = currentBooking.customer_name || currentBooking.user?.full_name || '';

        if (currentBooking.user_id) {
          const { data: pUser } = await dbClient
            .from('users')
            .select('id, auth_id, full_name, nickname, email')
            .or(`id.eq.${currentBooking.user_id},auth_id.eq.${currentBooking.user_id}`)
            .limit(1)
            .maybeSingle();

          if (pUser) {
            targetUserId = pUser.id || targetUserId;
            targetUserName = pUser.full_name || pUser.nickname || targetUserName;
          }
        }

        // Parse customer name from notes if needed
        if ((!targetUserName || targetUserName === 'Customer') && currentBooking.notes) {
          const match = currentBooking.notes.match(/\[CUSTOMER:(.*?)\|(.*?)\|(.*?)\]/);
          if (match && match[1]) {
            targetUserName = match[1].trim();
          }
        }

        targetUserName = targetUserName || 'Player';

        // 6b. Construct notification item
        const notifTitle = isConfirmed ? 'Court Booking Confirmed 🎉' : 'Court Booking Declined';
        const scheduleStr = currentBooking.booking_date
          ? `${currentBooking.booking_date} (${currentBooking.start_time || ''}${currentBooking.end_time ? ` - ${currentBooking.end_time}` : ''})`.trim()
          : '';

        const notifDesc = isConfirmed
          ? `Your reservation for ${courtName} at ${venueName} on ${scheduleStr} has been accepted by the faculty. See you on the court!`
          : `Your reservation request for ${courtName} at ${venueName} on ${scheduleStr} was declined by the faculty.${cleanReason ? ` Reason: ${cleanReason}` : ''}`;

        const dedupeKey = `booking_${status}_${currentBooking.id}`;
        const notifId = `notif_bk_${status}_${currentBooking.id}`;

        notifItem = {
          id: notifId,
          type: 'booking',
          title: notifTitle,
          desc: notifDesc,
          time: 'Just now',
          timestamp: Date.now(),
          read: false,
          linkScreen: 'my-bookings',
          recipientId: targetUserId,
          recipientName: targetUserName,
          senderName: venueName,
          meta: {
            event: isConfirmed ? 'booking_confirmed' : 'booking_declined',
            bookingId: currentBooking.id,
            bookingReference: currentBooking.booking_reference,
            reference: currentBooking.booking_reference,
            venueId: currentBooking.venue_id,
            venueName,
            courtName,
            schedule: scheduleStr,
            bookingDate: currentBooking.booking_date,
            startTime: currentBooking.start_time,
            endTime: currentBooking.end_time,
            status,
            recipientId: targetUserId,
            recipientName: targetUserName,
            hostName: venueName,
            dedupeKey,
            ...(cleanReason ? { reason: cleanReason } : {}),
          },
        };

        // 6c. Persist to public.notifications or fallback to public.users
        let tableSaved = false;
        try {
          const { error: notifErr } = await dbClient.from('notifications').insert({
            id: isValidUuid(notifId) ? notifId : undefined,
            user_id: targetUserId,
            user_identifier: targetUserName || targetUserId || null,
            type: 'booking',
            title: notifItem.title,
            description: notifItem.desc,
            read: false,
            link_screen: 'my-bookings',
            metadata: notifItem.meta,
            created_at: new Date().toISOString(),
          });

          if (!notifErr) {
            tableSaved = true;
          } else if (notifErr.code === '23505' || notifErr.message?.includes('duplicate key')) {
            tableSaved = true;
          }
        } catch {}

        if (!tableSaved && targetUserId) {
          try {
            const { data: uRow } = await dbClient
              .from('users')
              .select('id, equipped_gear')
              .or(`id.eq.${targetUserId},auth_id.eq.${targetUserId}`)
              .limit(1)
              .maybeSingle();

            if (uRow?.id) {
              const currentGear = typeof uRow.equipped_gear === 'object' && uRow.equipped_gear ? uRow.equipped_gear : {};
              const existingNotifs = Array.isArray((currentGear as any)._sportsync_notifications)
                ? (currentGear as any)._sportsync_notifications
                : [];

              if (!existingNotifs.some((n: any) => n.id === notifItem.id || (n.meta?.dedupeKey && n.meta.dedupeKey === notifItem.meta.dedupeKey))) {
                const updated = [notifItem, ...existingNotifs].slice(0, 50);
                await dbClient
                  .from('users')
                  .update({
                    equipped_gear: { ...currentGear, _sportsync_notifications: updated },
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', uRow.id);
              }
            }
          } catch {}
        }

        // 6d. Broadcast over Supabase Realtime so the player gets notified live
        const targetChannels = [
          ...(targetUserId ? [`sportsync-notifs-${targetUserId}`] : []),
          ...(targetUserName && targetUserName !== 'Player' ? [`sportsync-notifs-${targetUserName.toLowerCase().replace(/\s+/g, '_')}`] : []),
        ];

        for (const chName of targetChannels) {
          try {
            const ch = dbClient.channel(chName);
            await ch.send({
              type: 'broadcast',
              event: 'new_notification',
              payload: notifItem,
            });
          } catch (bcErr) {
            console.warn('[BookingsAPI PATCH] Realtime broadcast warning:', bcErr);
          }
        }
      } catch (notifCatchErr) {
        console.warn('[BookingsAPI PATCH] Player notification dispatch notice:', notifCatchErr);
      }
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      bookingId,
      status,
      notification: notifItem,
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
      customerName,
      customerEmail,
      customerPhone,
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

    // Robust resolution of venueId and courtId to prevent UUID syntax errors (22P02)
    let resolvedVenueId: string | null = isValidUuid(venueId) ? venueId : null;
    let resolvedCourtId: string | null = isValidUuid(courtId) ? courtId : null;

    if (!resolvedVenueId && typeof courtId === 'string' && courtId.includes('_')) {
      const prefix = courtId.split('_')[0];
      if (isValidUuid(prefix)) {
        resolvedVenueId = prefix;
      }
    }

    if (!resolvedVenueId && typeof venueId === 'string' && venueId.trim()) {
      const cleanVenueId = venueId.trim();
      const { data: matchedVenue } = await dbClient
        .from('venues')
        .select('id')
        .or(`slug.eq.${cleanVenueId},name.ilike.${cleanVenueId}`)
        .maybeSingle();
      if (matchedVenue?.id && isValidUuid(matchedVenue.id)) {
        resolvedVenueId = matchedVenue.id;
      }
    }

    let court: any = null;
    if (resolvedCourtId) {
      const { data, error } = await dbClient
        .from('courts')
        .select('id, venue_id, name, sport, hourly_rate_cents, is_active')
        .eq('id', resolvedCourtId)
        .maybeSingle();
      if (!error && data) {
        court = data;
        if (!resolvedVenueId && court.venue_id && isValidUuid(court.venue_id)) {
          resolvedVenueId = court.venue_id;
        }
      }
    }

    if (!court && resolvedVenueId) {
      const { data: venueCourts, error: vcErr } = await dbClient
        .from('courts')
        .select('id, venue_id, name, sport, hourly_rate_cents, is_active')
        .eq('venue_id', resolvedVenueId)
        .order('created_at', { ascending: true });

      if (!vcErr && venueCourts && venueCourts.length > 0) {
        let courtIdx = 0;
        const cMatch = typeof courtId === 'string' ? courtId.match(/_c(\d+)$/i) : null;
        if (cMatch) {
          const parsedIdx = parseInt(cMatch[1], 10) - 1;
          if (parsedIdx >= 0 && parsedIdx < venueCourts.length) {
            courtIdx = parsedIdx;
          }
        }
        court = venueCourts[courtIdx] || venueCourts[0];
        resolvedCourtId = court.id;
      } else {
        // Fallback: If venue exists in DB but has no courts created yet, create Court 1
        const { data: newCourt, error: ncErr } = await dbClient
          .from('courts')
          .insert({
            venue_id: resolvedVenueId,
            name: 'Court 1',
            sport: sport || 'pickleball',
            hourly_rate_cents: hourlyRate,
            is_active: true,
          })
          .select('id, venue_id, name, sport, hourly_rate_cents, is_active')
          .maybeSingle();
        if (!ncErr && newCourt) {
          court = newCourt;
          resolvedCourtId = newCourt.id;
        }
      }
    }

    if (!court || !resolvedCourtId || !resolvedVenueId) {
      return NextResponse.json(
        { error: 'The selected court facility could not be found or verified.' },
        { status: 400 }
      );
    }

    const actualRate = court?.hourly_rate_cents || hourlyRate;
    const actualFees = calculateBookingFees(actualRate, duration);

    let hasConflict = false;
    const { data: confirmedConflicts, error: conflictErr } = await dbClient
      .from('bookings')
      .select('id')
      .eq('court_id', resolvedCourtId)
      .eq('booking_date', bookingDate)
      .eq('status', 'confirmed')
      .or(
        `and(start_time.lte.${startIso},end_time.gt.${startIso}),and(start_time.lt.${endIso},end_time.gte.${endIso})`
      );

    if (conflictErr) {
      if (isMissingTableError(conflictErr)) {
        console.warn('[BookingsAPI POST] bookings table not in schema cache, skipping DB conflict check');
      } else {
        console.error('[BookingsAPI POST] Conflict check failed:', conflictErr);
        return NextResponse.json({ error: conflictErr.message }, { status: 500 });
      }
    } else if (confirmedConflicts && confirmedConflicts.length > 0) {
      hasConflict = true;
    }

    if (!hasConflict) {
      const inMemConflict = Array.from(fallbackBookingsStore.values()).some(
        (b) =>
          b.court_id === resolvedCourtId &&
          b.booking_date === bookingDate &&
          b.status === 'confirmed' &&
          ((b.start_time <= startIso && b.end_time > startIso) ||
           (b.start_time < endIso && b.end_time >= endIso))
      );
      if (inMemConflict) {
        hasConflict = true;
      }
    }

    if (hasConflict) {
      return NextResponse.json(
        {
          error:
            'This court slot has already been reserved by a confirmed booking. Please select another time.',
        },
        { status: 409 }
      );
    }

    let venueData: any = null;
    if (resolvedVenueId) {
      const { data: v } = await dbClient
        .from('venues')
        .select('id, name, address, city, images, sports, owner_id')
        .eq('id', resolvedVenueId)
        .maybeSingle();
      if (v) {
        venueData = v;
      }
    }

    const resolvedCustomerName =
      (customerName || '').trim() ||
      (authUser.full_name || '').trim() ||
      (authUser.email ? authUser.email.split('@')[0] : '') ||
      'Customer';

    const resolvedCustomerEmail =
      (customerEmail || '').trim() ||
      (authUser.email || '').trim();

    const resolvedCustomerPhone =
      sanitizePhoneValue(customerPhone) ||
      sanitizePhoneValue(authUser.phone) ||
      '';

    const customerTag = `[CUSTOMER:${resolvedCustomerName}|${resolvedCustomerEmail}|${resolvedCustomerPhone}]`;
    const finalNotes = notes && notes.trim() ? `${notes.trim()} ${customerTag}` : customerTag;

    const bookingRecord: Record<string, any> = {
      booking_reference: bookingRef,
      user_id: authUser.id,
      venue_id: resolvedVenueId,
      court_id: resolvedCourtId,
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
      notes: finalNotes,
    };

    let newBooking: any = null;
    let insertErr: any = null;

    // First attempt insert (select '*' only to avoid missing-relation errors)
    const insertResult = await dbClient
      .from('bookings')
      .insert(bookingRecord)
      .select('*')
      .maybeSingle();

    newBooking = insertResult.data;
    insertErr = insertResult.error;

    // If missing column error, strip missing columns in a loop and retry
    const retryBookingRecord = { ...bookingRecord };
    while (insertErr && isMissingColumnError(insertErr)) {
      const missingCol = extractMissingColumn(insertErr);
      if (missingCol && missingCol in retryBookingRecord) {
        console.warn(`[BookingsAPI POST] Column '${missingCol}' missing from bookings table; retrying without it...`);
        delete retryBookingRecord[missingCol];
        const retryResult = await dbClient
          .from('bookings')
          .insert(retryBookingRecord)
          .select('*')
          .maybeSingle();
        insertErr = retryResult.error;
        if (retryResult.data) {
          newBooking = retryResult.data;
          break;
        }
      } else {
        break;
      }
    }

    // If bookings table is missing from schema cache, synthesize resilient fallback booking
    if (!newBooking && insertErr && isMissingTableError(insertErr)) {
      console.warn('[BookingsAPI POST] bookings table not in schema cache; creating resilient fallback booking object');
      newBooking = {
        id: crypto.randomUUID(),
        ...bookingRecord,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      insertErr = null;
    }

    if (insertErr || !newBooking) {
      console.error('[BookingsAPI POST] Booking insert failed:', insertErr);
      return NextResponse.json(
        { error: insertErr?.message || 'Failed to create booking.' },
        { status: 500 }
      );
    }

    // Attach enriched court, venue, and user so client components have full entity data
    newBooking.court = newBooking.court || court || { id: resolvedCourtId, name: 'Court 1', sport: sport || 'pickleball' };
    newBooking.venue = newBooking.venue || venueData || { id: resolvedVenueId, name: 'Verified Sports Court' };
    newBooking.user = {
      id: authUser.id,
      full_name: resolvedCustomerName,
      email: resolvedCustomerEmail,
      phone: resolvedCustomerPhone,
      avatar_url: authUser.avatar_url || '',
    };
    newBooking.customer_name = resolvedCustomerName;
    newBooking.customer_email = resolvedCustomerEmail;
    newBooking.customer_phone = resolvedCustomerPhone;

    // Keep in server-side memory store
    fallbackBookingsStore.set(newBooking.id, newBooking);

    // Payments insert (gracefully resilient if table/column missing)
    const { error: paymentErr } = await dbClient.from('payments').insert({
      booking_id: newBooking.id,
      court_id: resolvedCourtId,
      user_id: authUser.id,
      amount_cents: actualFees.totalAmountCents,
      payment_method: normalizedMethod,
      reference_code: finalReference,
      status: initialPaymentStatus,
      notes: `Court reservation request: ${court?.name || resolvedCourtId} | Date: ${bookingDate} ${startTime}`,
    });

    if (paymentErr) {
      if (isMissingTableError(paymentErr) || isMissingColumnError(paymentErr)) {
        console.warn('[BookingsAPI POST] payments table/column not in schema cache; continuing gracefully:', paymentErr.message);
      } else {
        console.error('[BookingsAPI POST] Payment record insert failed:', paymentErr);
      }
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
