'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useMatchiStore } from '@/lib/store';
import { getVenueById } from '@/lib/services/venues';
import { getCourtDailyAvailability } from '@/lib/services/bookings';
import { BookingModal } from '@/components/payments/BookingModal';
import { SportCourtVisualizer } from '@/components/explore/SportCourtVisualizer';
import { VenueMap } from '@/components/explore/VenueMap';
import { Venue, Court, Session, SportType, CourtAvailabilitySlot } from '@/types';
import { formatCurrency, getSportDisplayName } from '@/lib/utils';
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  Sparkles,
  Share2,
  CreditCard,
  ShieldCheck,
  Compass,
  AlertCircle,
  Navigation,
} from 'lucide-react';

interface VenuePageProps {
  params: Promise<{ id: string }>;
}

export default function VenueDetailPage({ params }: VenuePageProps) {
  const { id } = use(params);
  const { sessions } = useMatchiStore();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoadingVenue, setIsLoadingVenue] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected date state
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSportTab, setSelectedSportTab] = useState<SportType | 'all'>('all');

  // Slots availability state (courtId -> slots)
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, CourtAvailabilitySlot[]>>({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Booking modal trigger states
  const [selectedCourt, setSelectedCourt] = useState<Court | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('14:00');
  const [selectedSession, setSelectedSession] = useState<Session | undefined>();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Date buttons (Today, Tomorrow, +2 days, +3 days)
  const [dateOptions] = useState(() => {
    const today = new Date();
    const baseTime = today.getTime();
    return [
      {
        label: 'Today',
        value: today.toISOString().split('T')[0],
        dayName: today.toLocaleDateString('en-US', { weekday: 'short' }),
      },
      {
        label: 'Tomorrow',
        value: new Date(baseTime + 86400000).toISOString().split('T')[0],
        dayName: new Date(baseTime + 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
      },
      {
        label: new Date(baseTime + 172800000).toLocaleDateString('en-US', { weekday: 'short' }),
        value: new Date(baseTime + 172800000).toISOString().split('T')[0],
        dayName: new Date(baseTime + 172800000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
      {
        label: new Date(baseTime + 259200000).toLocaleDateString('en-US', { weekday: 'short' }),
        value: new Date(baseTime + 259200000).toISOString().split('T')[0],
        dayName: new Date(baseTime + 259200000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
    ];
  });

  // Fetch venue from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchVenue() {
      setIsLoadingVenue(true);
      setLoadError(null);
      try {
        const v = await getVenueById(id);
        if (isMounted) {
          setVenue(v);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load facility information.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingVenue(false);
        }
      }
    }

    fetchVenue();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Compute availability slots whenever venue, selectedDate, or courts change
  useEffect(() => {
    if (!venue || !venue.courts || venue.courts.length === 0) return;

    let isMounted = true;
    async function loadAvailability() {
      setIsLoadingSlots(true);
      const newMap: Record<string, CourtAvailabilitySlot[]> = {};

      try {
        for (const court of venue!.courts || []) {
          const slots = await getCourtDailyAvailability(
            court.id,
            court.name,
            court.sport,
            court.hourly_rate_cents,
            selectedDate
          );
          newMap[court.id] = slots;
        }
        if (isMounted) {
          setAvailabilityMap(newMap);
        }
      } catch (err) {
        console.error('Failed to load court availability:', err);
      } finally {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
      }
    }

    loadAvailability();
    return () => {
      isMounted = false;
    };
  }, [venue, selectedDate]);

  // Handle loading state
  if (isLoadingVenue) {
    return (
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-6 w-32 animate-pulse bg-[#E8E5DF] rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 sm:h-96 rounded-3xl animate-pulse bg-[#E8E5DF]" />
          <div className="h-96 rounded-3xl animate-pulse bg-[#E8E5DF]" />
        </div>
      </div>
    );
  }

  // Handle not found state (No fake fallback data!)
  if (!venue || loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-dashed border-[#E8E5DF] bg-white p-10 sm:p-14 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1A241E]">
            Facility Not Found
          </h2>
          <p className="text-xs sm:text-sm text-[#65756B] max-w-md mx-auto leading-relaxed">
            The requested sports facility does not exist or may have updated its listing.
          </p>
          <div className="pt-2">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Browse All Facilities</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const courts = venue.courts || [];
  const filteredCourts = courts.filter((c) =>
    selectedSportTab === 'all' ? true : c.sport === selectedSportTab
  );

  const venueSessions = sessions.filter((s) => s.venue_id === venue.id);

  const handleBookSlot = (court: Court, timeSlot: string) => {
    setSelectedCourt(court);
    setSelectedTimeSlot(timeSlot);
    setSelectedSession(undefined);
    setIsBookingModalOpen(true);
  };

  const handleJoinSession = (session: Session) => {
    setSelectedSession(session);
    setSelectedCourt(undefined);
    setIsBookingModalOpen(true);
  };

  const hasVerifiedRating = typeof venue.rating === 'number' && venue.review_count > 0;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-10">
      {/* Navigation breadcrumb */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65756B] hover:text-[#2D724E] transition-colors py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Facilities</span>
      </Link>

      {/* Hero Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Main Banner */}
        <div className="lg:col-span-2 relative h-72 sm:h-96 rounded-3xl overflow-hidden shadow-xs border border-[#E8E5DF] bg-[#1E4A32]">
          {venue.images && venue.images[0] ? (
            <img
              src={venue.images[0]}
              alt={venue.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/70 p-6 text-center">
              <Compass className="w-12 h-12 mb-2 text-[#E9C46A]" />
              <span className="font-bold text-base text-white">{venue.name}</span>
              <span className="text-xs text-emerald-100">{venue.city}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Details Overlay */}
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {venue.featured_sports?.map((sport) => (
                <span
                  key={sport}
                  className="inline-flex items-center rounded-lg bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold"
                >
                  {getSportDisplayName(sport)}
                </span>
              ))}
              {venue.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#2D724E]/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-white">
                  <ShieldCheck className="w-3 h-3 text-[#E9C46A]" />
                  Verified Facility Partner
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {venue.name}
            </h1>

            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-200 mt-1">
              <MapPin className="w-4 h-4 text-[#E9C46A] shrink-0" />
              <span>{venue.address}</span>
            </p>
          </div>
        </div>

        {/* Facility Summary Card */}
        <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {hasVerifiedRating ? (
                <div className="flex items-center gap-1.5">
                  <Star className="w-5 h-5 fill-[#E9C46A] text-[#E9C46A]" />
                  <span className="text-lg font-black text-[#1A241E]">{venue.rating?.toFixed(1)}</span>
                  <span className="text-xs text-[#65756B]">({venue.review_count} verified reviews)</span>
                </div>
              ) : (
                <div className="text-xs text-[#65756B] italic">
                  Ratings will appear after verified activity
                </div>
              )}

              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="rounded-full p-2 text-[#65756B] hover:bg-[#FAF8F5] transition-colors"
                title="Share Court"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-[#65756B]">
                Operating Hours
              </h3>
              <p className="mt-1 text-xs sm:text-sm font-bold text-[#1A241E] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#2D724E]" />
                {venue.operating_hours?.mon_sun || venue.operating_hours?.mon_fri || '06:00 AM - 11:00 PM Daily'}
              </p>
            </div>

            {/* Amenities */}
            {venue.amenities && venue.amenities.length > 0 && (
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-wider text-[#65756B]">
                  Amenities &amp; Features
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {venue.amenities.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#FAF8F5] border border-[#E8E5DF] px-2.5 py-1 text-[11px] font-semibold text-[#1A241E]"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#2D724E]" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Supported Payments */}
            <div className="rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-3 space-y-1">
              <div className="text-xs font-black text-[#1A241E] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#2D724E]" />
                Direct Facility Payments
              </div>
              <p className="text-[11px] text-[#65756B] leading-relaxed">
                GCash, Maya, Online Bank Transfer, or Cash at the facility desk.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (courts.length > 0) {
                handleBookSlot(courts[0], '14:00');
              }
            }}
            className="w-full py-3 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-xs transition-all active:scale-[0.98] text-center min-h-[46px]"
          >
            Reserve Court &rarr;
          </button>
        </div>
      </div>

      {/* Sport-Aware Visual Presentation (Apple Sports Inspired) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E]">
            Court Specifications &bull; Sport-Aware Presentation
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venue.featured_sports?.map((sport) => (
            <SportCourtVisualizer
              key={sport}
              sport={sport}
              courtName={`${venue.name} &bull; ${getSportDisplayName(sport)}`}
              floorType={sport === 'badminton' ? 'BWF Taraflex Rubber Mat' : 'Cushioned Tournament Surface'}
            />
          ))}
        </div>
      </div>

      {/* Date & Time Slot Availability Explorer */}
      <div className="space-y-5 rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E5DF] pb-4">
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#2D724E]">
              Court Availability
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#1A241E]">
              Available Playing Areas &amp; Hourly Slots
            </h2>
            <p className="text-xs text-[#65756B] mt-0.5">
              Select a date and click an available slot to initiate reservation.
            </p>
          </div>

          {/* Date Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {dateOptions.map((opt) => {
              const isSelected = selectedDate === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedDate(opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center min-w-[76px] ${
                    isSelected
                      ? 'bg-[#2D724E] text-white shadow-xs'
                      : 'bg-[#FAF8F5] border border-[#E8E5DF] text-[#1A241E] hover:border-[#2D724E]'
                  }`}
                >
                  <span className="text-[10px] opacity-80">{opt.label}</span>
                  <span className="text-xs font-black">{opt.dayName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sport Filter Tabs */}
        {venue.featured_sports && venue.featured_sports.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#65756B]">Filter Sport:</span>
            <button
              type="button"
              onClick={() => setSelectedSportTab('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedSportTab === 'all'
                  ? 'bg-[#1A241E] text-white'
                  : 'bg-[#FAF8F5] text-[#65756B] hover:text-[#1A241E]'
              }`}
            >
              All Sports
            </button>
            {venue.featured_sports.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSportTab(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedSportTab === s
                    ? 'bg-[#2D724E] text-white'
                    : 'bg-[#FAF8F5] text-[#65756B] hover:text-[#1A241E]'
                }`}
              >
                {getSportDisplayName(s)}
              </button>
            ))}
          </div>
        )}

        {/* Playing Areas & Real Slots */}
        {courts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E8E5DF] bg-[#FAF8F5] p-8 text-center text-xs text-[#65756B]">
            This facility hasn&apos;t added any playing areas yet.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCourts.map((court) => {
              const courtSlots = availabilityMap[court.id] || [];

              return (
                <div
                  key={court.id}
                  className="rounded-2xl border border-[#E8E5DF] bg-[#FAF8F5] p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm sm:text-base text-[#1A241E]">
                          {court.name}
                        </h3>
                        <span className="text-[10px] font-black text-[#2D724E] bg-[#EBF4EE] px-2 py-0.5 rounded-md uppercase">
                          {getSportDisplayName(court.sport)}
                        </span>
                      </div>
                      <p className="text-xs text-[#65756B] mt-0.5">
                        {court.floor_type} &bull; Capacity: {court.capacity || 4} players &bull;{' '}
                        {court.is_indoor ? 'Indoor Covered' : 'Outdoor'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-[#2D724E]">
                        {formatCurrency(court.hourly_rate_cents)}
                      </span>
                      <span className="text-[10px] text-[#65756B] block">per court hour</span>
                    </div>
                  </div>

                  {/* Available Slots Grid */}
                  <div>
                    <span className="text-[11px] font-bold text-[#65756B] block mb-2">
                      Available Slots ({selectedDate}):
                    </span>
                    {isLoadingSlots ? (
                      <div className="flex items-center gap-2 text-xs text-[#65756B] py-2">
                        <span>Checking real-time slot availability...</span>
                      </div>
                    ) : courtSlots.length === 0 ? (
                      <div className="text-xs text-[#65756B] py-2">
                        No availability records for this date.
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {courtSlots.map((slot) => {
                          const isBooked = !slot.isAvailable;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={isBooked}
                              onClick={() => handleBookSlot(court, slot.time)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isBooked
                                  ? 'bg-[#E8E5DF] text-[#8C877D] cursor-not-allowed line-through opacity-60'
                                  : 'bg-white hover:bg-[#2D724E] hover:text-white border border-[#E8E5DF] text-[#1A241E] shadow-xs active:scale-95'
                              }`}
                              title={isBooked ? 'Slot unavailable' : `Book slot at ${slot.time}`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Facility Location Map */}
      {venue.latitude && venue.longitude && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#C87D43]">
                Location &amp; Access
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#1A241E]">
                How to Get There
              </h2>
              <p className="text-xs text-[#65756B] mt-0.5">{venue.address}</p>
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}#map=16/${venue.latitude}/${venue.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-[#2D724E] hover:bg-[#FAF8F5] transition-all shadow-xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Open in OSM</span>
            </a>
          </div>

          <VenueMap
            venues={[venue]}
            selectedVenueId={venue.id}
            singleVenueMode={true}
            initialCenter={[venue.latitude, venue.longitude]}
            initialZoom={15}
            heightClass="h-64 sm:h-80"
            showSearch={false}
          />
        </div>
      )}

      {/* Open Play Sessions Section */}
      {venueSessions.length > 0 && (
        <div className="space-y-4">
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#C87D43]">
              Community Rotations
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#1A241E]">
              Open Play Sessions at this Facility
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venueSessions.map((sess) => (
              <div
                key={sess.id}
                className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF4EE] px-2.5 py-0.5 text-xs font-bold text-[#1E4A32]">
                      <Sparkles className="w-3 h-3 text-[#C87D43]" />
                      {sess.rotation_format}
                    </span>
                    <span className="text-xs font-bold text-[#2D724E]">
                      {sess.status === 'active' ? 'Active Now' : 'Upcoming'}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-[#1A241E] leading-snug">{sess.title}</h3>
                  <p className="text-xs text-[#65756B] mt-1 line-clamp-2 leading-relaxed">
                    {sess.description}
                  </p>

                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs border-t border-[#E8E5DF] pt-3">
                    <div className="flex items-center gap-1.5 text-[#65756B]">
                      <Users className="w-4 h-4 text-[#2D724E]" />
                      <span>
                        <strong className="text-[#1A241E]">{sess.current_players_count}</strong> / {sess.max_players} players
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#65756B] block">Entry Fee</span>
                      <span className="text-sm font-black text-[#2D724E]">
                        {formatCurrency(sess.fee_cents)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleJoinSession(sess)}
                  className="w-full py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-xs transition-all text-center min-h-[42px]"
                >
                  Join Session
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          venue={venue}
          court={selectedCourt}
          session={selectedSession}
          preselectedDate={selectedDate}
          preselectedTime={selectedTimeSlot}
        />
      )}
    </div>
  );
}
