/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Clock, Calendar, Check, Users, ArrowRight } from 'lucide-react';
import { Venue, AvatarId } from '../../mock/types';
import { DateStrip, generateUpcomingDates, DateItem } from '../../design-system/components/DateStrip';
import { Stepper } from '../../design-system/components/SegmentedControl';
import { Button } from '../../design-system/components/Button';
import { UserAvatar } from '../../illustrations/Avatars';
import { APP_CONFIG } from '../../config/appConfig';
import { useMatchiStore } from '../../lib/store';
import { extractSlotMinutes } from '../../lib/services/bookings';

interface BookingFlowScreenProps {
  venue: Venue;
  onBack: () => void;
  onProceedToPayment: (details: {
    date: string;
    formattedDate: string;
    slot: string;
    duration: number;
    court: string;
    totalPrice: number;
  }) => void;
}

export const BookingFlowScreen: React.FC<BookingFlowScreenProps> = ({
  venue,
  onBack,
  onProceedToPayment,
}) => {
  const { bookings, currentUser } = useMatchiStore();
  const [availablePlayers, setAvailablePlayers] = useState<
    Array<{ id: string; name: string; avatarId: AvatarId }>
  >([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/players?excludeSelf=true', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { players: [] }))
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.players) ? data.players : [];
        const filtered = list.filter((p: { id?: string; name?: string }) => {
          if (currentUser?.id && p.id === currentUser.id) return false;
          if (
            currentUser?.full_name &&
            p.name &&
            p.name.trim().toLowerCase() === currentUser.full_name.trim().toLowerCase()
          ) {
            return false;
          }
          return true;
        });
        setAvailablePlayers(
          filtered.map((p: { id: string; name: string; avatarId?: string }) => ({
            id: p.id,
            name: p.name,
            avatarId: (p.avatarId || 'alex') as AvatarId,
          }))
        );
      })
      .catch(() => {
        if (active) setAvailablePlayers([]);
      })
      .finally(() => {
        if (active) setIsLoadingPlayers(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.full_name]);
  const [upcomingDates] = useState<DateItem[]>(() => generateUpcomingDates(14));
  const [selectedDateId, setSelectedDateId] = useState<string>(() => upcomingDates[0]?.id || new Date().toISOString().split('T')[0]);
  const [selectedDateItem, setSelectedDateItem] = useState<DateItem>(() => upcomingDates[0]);

  const courts = venue.courts && venue.courts.length > 0
    ? venue.courts.map((c) => c.name)
    : ['Court 1'];
  const [selectedCourt, setSelectedCourt] = useState(courts[0] || 'Court 1');

  const selectedDateStr = selectedDateItem?.fullDate || selectedDateId;
  const [durationHours, setDurationHours] = useState(1.5);
  const [remoteAvailabilityBookings, setRemoteAvailabilityBookings] = useState<
    Array<{
      id?: string;
      venue_id?: string;
      court_id?: string;
      booking_date?: string;
      start_time?: string;
      end_time?: string;
      duration_minutes?: number;
      status?: string;
      court?: { id?: string; name?: string; is_active?: boolean };
    }>
  >([]);
  const [remoteCourtBlocks, setRemoteCourtBlocks] = useState<
    Array<{
      court_id?: string;
      start_time?: string;
      end_time?: string;
    }>
  >([]);

  const selectedCourtObj = useMemo(() => {
    return (venue.courts || []).find((c) => c.name === selectedCourt || c.id === selectedCourt);
  }, [venue.courts, selectedCourt]);

  useEffect(() => {
    let active = true;
    const courtIdParam = selectedCourtObj?.id ? `&courtId=${encodeURIComponent(selectedCourtObj.id)}` : '';
    fetch(
      `/api/bookings?availability=true&venueId=${encodeURIComponent(venue.id)}${courtIdParam}&date=${encodeURIComponent(selectedDateStr)}`,
      { credentials: 'include', cache: 'no-store' }
    )
      .then((res) => (res.ok ? res.json() : { bookings: [], blocks: [] }))
      .then((data) => {
        if (!active) return;
        setRemoteAvailabilityBookings(Array.isArray(data?.bookings) ? data.bookings : []);
        setRemoteCourtBlocks(Array.isArray(data?.blocks) ? data.blocks : []);
      })
      .catch(() => {
        if (active) {
          setRemoteAvailabilityBookings([]);
          setRemoteCourtBlocks([]);
        }
      });
    return () => {
      active = false;
    };
  }, [venue.id, selectedCourtObj?.id, selectedDateStr]);

  // Real confirmed reservation intervals [startMins, endMins) (pending requests do NOT block slots)
  const lockedIntervals = useMemo(() => {
    const intervals: Array<{ startMins: number; endMins: number }> = [];
    const combinedBookings = [...bookings, ...remoteAvailabilityBookings];
    const seenIds = new Set<string>();

    combinedBookings.forEach((b) => {
      if (b.id && seenIds.has(b.id)) return;
      if (b.id) seenIds.add(b.id);

      const matchesVenue =
        b.venue_id === venue.id ||
        b.venue_id === (venue as { slug?: string }).slug ||
        (selectedCourtObj?.id && b.court_id === selectedCourtObj.id);
      const matchesDate = b.booking_date === selectedDateStr || b.booking_date === selectedDateId;
      const matchesCourt =
        (selectedCourtObj?.id && b.court_id === selectedCourtObj.id) ||
        !b.court?.name ||
        b.court?.name === selectedCourt ||
        (b as { courtName?: string }).courtName === selectedCourt;
      const isConfirmed = b.status === 'confirmed' || b.status === 'completed';

      if (matchesVenue && matchesDate && matchesCourt && isConfirmed) {
        const startMins = extractSlotMinutes(b.start_time, false);
        if (startMins !== null) {
          const endMins =
            extractSlotMinutes(b.end_time, true, startMins, b.duration_minutes || 60) ??
            startMins + (Number(b.duration_minutes) || 60);
          intervals.push({
            startMins,
            endMins: endMins > startMins ? endMins : startMins + (Number(b.duration_minutes) || 60),
          });
        }
      }
    });

    remoteCourtBlocks.forEach((blk) => {
      if (selectedCourtObj?.id && blk.court_id && blk.court_id !== selectedCourtObj.id) return;
      if (blk.start_time && String(blk.start_time).includes('T') && !String(blk.start_time).startsWith(selectedDateStr)) {
        return;
      }
      const startMins = extractSlotMinutes(blk.start_time, false);
      if (startMins !== null) {
        const endMins = extractSlotMinutes(blk.end_time, true, startMins, 60) ?? startMins + 60;
        intervals.push({
          startMins,
          endMins: endMins > startMins ? endMins : startMins + 60,
        });
      }
    });

    return intervals;
  }, [
    bookings,
    remoteAvailabilityBookings,
    remoteCourtBlocks,
    venue,
    selectedDateStr,
    selectedDateId,
    selectedCourt,
    selectedCourtObj,
  ]);

  const rawTimeSlots = [
    { time: '08:30', price: venue.pricePerHour },
    { time: '10:00', price: venue.pricePerHour, isPeak: true },
    { time: '11:30', price: venue.pricePerHour },
    { time: '13:00', price: venue.pricePerHour },
    { time: '15:30', price: venue.pricePerHour },
    { time: '17:00', price: venue.pricePerHour },
    { time: '18:30', price: venue.pricePerHour + 8, isPeak: true },
    { time: '20:00', price: venue.pricePerHour + 8, isPeak: true },
  ];

  // Restrict past time slots if booking for today
  const now = new Date();
  const isSelectedDateToday = selectedDateItem?.isToday ?? false;
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const isSelectedCourtClosed = (selectedCourtObj as { is_active?: boolean } | undefined)?.is_active === false;
  const requestedDurationMins = Math.round((durationHours || 1) * 60);

  const timeSlots = rawTimeSlots.map((slot) => {
    const [h, m] = slot.time.split(':').map(Number);
    const slotStartMins = h * 60 + m;
    const slotEndMins = slotStartMins + requestedDurationMins;
    const isPastSlot = isSelectedDateToday && (h < currentHour || (h === currentHour && m <= currentMin));
    const isBooked =
      isSelectedCourtClosed ||
      lockedIntervals.some((iv) => slotStartMins < iv.endMins && slotEndMins > iv.startMins);
    return {
      ...slot,
      isPast: isPastSlot,
      status: isPastSlot ? 'past' : isBooked ? 'booked' : 'available',
    };
  });

  // Pick first available future slot
  const defaultSlot = timeSlots.find((s) => s.status === 'available')?.time || '18:30';
  const [selectedSlot, setSelectedSlot] = useState(defaultSlot);

  // If date or court changes, ensure slot isn't a past or booked slot
  React.useEffect(() => {
    const isCurrentSlotInvalid = timeSlots.some((s) => s.time === selectedSlot && (s.status === 'past' || s.status === 'booked'));
    if (isCurrentSlotInvalid) {
      const nextAvailable = timeSlots.find((s) => s.status === 'available');
      if (nextAvailable) setSelectedSlot(nextAvailable.time);
    }
  }, [selectedDateId, isSelectedDateToday, selectedCourt, lockedIntervals.length, durationHours]);

  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);

  const toggleFriend = (id: string) => {
    if (invitedFriends.includes(id)) {
      setInvitedFriends(invitedFriends.filter((f) => f !== id));
    } else {
      setInvitedFriends([...invitedFriends, id]);
    }
  };

  const calculatedTotal = Math.round(venue.pricePerHour * durationHours);

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-32 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header with Venue & Location */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center flex-1 px-2">
          <h1 className="font-display font-black text-base text-[#F4F7F0] truncate">
            {venue.name}
          </h1>
          <p className="text-[11px] text-[#A5B0A6] flex items-center justify-center gap-1 truncate">
            <span className="text-[#C8FF2E]">📍</span>
            <span>{venue.address || venue.city || 'Naga City'}</span>
          </p>
        </div>

        <div className="w-9" />
      </div>

      <div className="space-y-6">
        {/* 2. Circular Date Selection Chips (Ref C) */}
        <div>
          <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
            1. Select Date
          </label>
          <DateStrip
            dates={upcomingDates}
            selectedId={selectedDateId}
            onSelect={(id, item) => {
              setSelectedDateId(id);
              if (item) {
                setSelectedDateItem(item);
              } else {
                const found = upcomingDates.find((d) => d.id === id);
                if (found) setSelectedDateItem(found);
              }
            }}
            variant="circular-booking"
          />
        </div>

        {/* 3. Court Selection */}
        <div>
          <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
            2. Choose Court
          </label>
          <div className="grid grid-cols-2 gap-2">
            {courts.map((court) => (
              <button
                key={court}
                onClick={() => setSelectedCourt(court)}
                className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border text-left transition-all press-scale ${selectedCourt === court
                    ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] shadow-sm'
                    : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:text-white'
                  }`}
              >
                {court}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Time Slots Grid (Available / Booked / Peak Pricing / Passed) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
              3. Time Slot
            </label>
            <span className="text-[10px] text-[#A5B0A6]">
              ⚡ Peak evening lights: +₱80
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((slot) => {
              const isSelected = selectedSlot === slot.time;
              const isBooked = slot.status === 'booked';
              const isPast = slot.isPast;
              const isDisabled = isBooked || isPast;

              return (
                <button
                  key={slot.time}
                  disabled={isDisabled}
                  onClick={() => setSelectedSlot(slot.time)}
                  className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center border transition-all ${isDisabled
                      ? 'bg-[#141A15] opacity-35 border-transparent cursor-not-allowed text-[#6F7B71]'
                      : isSelected
                        ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold shadow-[0_0_14px_rgba(200,255,46,0.25)]'
                        : 'bg-[#1C241E] border-white/5 text-[#F4F7F0] hover:border-white/20'
                    }`}
                >
                  <span className="text-xs font-display">{slot.time}</span>
                  <span className={`text-[9px] ${isSelected ? 'text-[#0B0F0C]/80' : 'text-[#A5B0A6]'}`}>
                    {isPast ? 'Passed' : isBooked ? 'Booked' : slot.isPeak ? 'Peak' : 'Std'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Duration Stepper */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between">
          <div>
            <span className="font-display font-bold text-sm text-[#F4F7F0] block">
              Session Duration
            </span>
            <span className="text-xs text-[#A5B0A6]">60 min, 90 min or 120 min</span>
          </div>
          <Stepper
            value={durationHours}
            onChange={setDurationHours}
            min={1}
            max={3}
            step={0.5}
            unit="hrs"
          />
        </div>

        {/* 6. Invite Friends (Hitting Partners) */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5">
          <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
            Invite Friends to Court
          </label>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {isLoadingPlayers ? (
              <span className="text-[11px] text-[#A5B0A6] py-1">Loading players...</span>
            ) : availablePlayers.length === 0 ? (
              <span className="text-[11px] text-[#A5B0A6] py-1">
                No other players found yet &mdash; share an invite link instead.
              </span>
            ) : (
              availablePlayers.slice(0, 8).map((f) => {
                const isInvited = invitedFriends.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFriend(f.id)}
                    className={`p-2 rounded-2xl border flex flex-col items-center shrink-0 transition-all ${isInvited
                        ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                        : 'bg-[#141A15] border-white/5 text-[#A5B0A6]'
                      }`}
                  >
                    <div className="relative">
                      <UserAvatar id={f.avatarId} name={f.name} size={30} />
                      {isInvited && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] mt-1 truncate max-w-[50px]">{f.name.split(' ')[0]}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 7. Price Breakdown */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2 text-xs">
          <div className="flex justify-between text-[#A5B0A6]">
            <span>Court Fee ({durationHours} hrs × ₱{venue.pricePerHour})</span>
            <span>₱{calculatedTotal}</span>
          </div>
          <div className="flex justify-between text-[#A5B0A6]">
            <span>Booking & Lighting Fee</span>
            <span className="text-[#3DDC84]">Free included</span>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between font-display font-bold text-sm text-[#F4F7F0]">
            <span>Total Amount Due</span>
            <span className="text-[#C8FF2E] text-base">₱{calculatedTotal}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Pill CTA "Booking Now" with Trailing Arrow (Ref C) */}
      <div className="sticky bottom-0 w-full z-40 p-4 bg-[#0B0F0C]/95 backdrop-blur-2xl border-t border-white/10 mt-6">
        <Button
          variant="pill-arrow"
          onClick={() => {
            const matchedCourtObj = venue.courts?.find((c) => c.name === selectedCourt);
            onProceedToPayment({
              date: selectedDateItem?.fullDate || selectedDateId,
              formattedDate: selectedDateItem?.formatted || selectedDateId,
              slot: selectedSlot,
              duration: durationHours,
              court: selectedCourt,
              courtId: matchedCourtObj?.id || venue.courts?.[0]?.id,
              totalPrice: calculatedTotal,
            } as any);
          }}
        >
          Booking Now • ₱{calculatedTotal}
        </Button>
      </div>
    </div>
  );
};
