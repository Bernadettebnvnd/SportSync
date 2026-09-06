'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useMonkeyStore } from '@/lib/store';
import { INITIAL_COURTS } from '@/lib/mockData';
import { BookingModal } from '@/components/payments/BookingModal';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { Court, Session } from '@/types';
import { formatCurrency, getSportEmoji, getSportDisplayName } from '@/lib/utils';
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  Sparkles,
  Calendar,
  Share2,
} from 'lucide-react';

interface VenuePageProps {
  params: Promise<{ id: string }>;
}

export default function VenueDetailPage({ params }: VenuePageProps) {
  const { id } = use(params);
  const { venues, sessions, currentUser } = useMonkeyStore();

  const [selectedCourt, setSelectedCourt] = useState<Court | undefined>();
  const [selectedSession, setSelectedSession] = useState<Session | undefined>();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const venue = venues.find((v) => v.id === id) || venues[0];
  const venueCourts = INITIAL_COURTS.filter((c) => c.venue_id === venue.id);
  const venueSessions = sessions.filter((s) => s.venue_id === venue.id);

  const handleBookCourt = (court: Court) => {
    setSelectedCourt(court);
    setSelectedSession(undefined);
    setIsBookingModalOpen(true);
  };

  const handleJoinSession = (session: Session) => {
    setSelectedSession(session);
    setSelectedCourt(undefined);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Back button */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#1F9D55] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Explore
      </Link>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Image */}
        <div className="lg:col-span-2 relative h-72 sm:h-96 rounded-3xl overflow-hidden shadow-sm border border-[#EBEBE6]">
          <img
            src={venue.images[0] || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Hero text overlay */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {venue.featured_sports.map((sport) => (
                <span
                  key={sport}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/20 backdrop-blur-md px-2.5 py-1 text-xs font-bold"
                >
                  <span>{getSportEmoji(sport)}</span>
                  <span>{getSportDisplayName(sport)}</span>
                </span>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              {venue.name}
            </h1>

            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-200 mt-1">
              <MapPin className="w-4 h-4 text-[#FF9F43] shrink-0" />
              <span>{venue.address}</span>
            </p>
          </div>
        </div>

        {/* Venue Quick Card */}
        <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Star className="w-5 h-5 fill-[#FF9F43] text-[#FF9F43]" />
                <span className="text-lg font-black text-[#171717]">{venue.rating}</span>
                <span className="text-xs text-[#6B7280]">({venue.review_count} player reviews)</span>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="rounded-full p-2 text-[#6B7280] hover:bg-[#FAFAF7] transition-colors"
                title="Share Venue"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Operating Hours
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#171717] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#1F9D55]" />
                {venue.operating_hours.mon_sun || '06:00 AM - 11:00 PM Daily'}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Amenities & Perks
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {venue.amenities.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#FAFAF7] border border-[#EBEBE6] px-2.5 py-1 text-xs font-medium text-[#171717]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#1F9D55]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[#3B82F6]/5 border border-[#3B82F6]/20 p-3">
              <div className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#007DFE] text-white text-[10px] font-black">
                  G
                </span>
                Official GCash Verification
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">
                Instant receipt uploads accepted. Account: {venue.gcash_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (venueCourts.length > 0) {
                handleBookCourt(venueCourts[0]);
              }
            }}
            className="w-full py-3 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-md transition-all active:scale-[0.99] text-center"
          >
            Quick Book Court &rarr;
          </button>
        </div>
      </div>

      {/* Mascot banter banner */}
      <MascotBanner
        mood="hype"
        title="Miki's Court Intel"
        message={`${venue.name} has crisp floor grip and fast shuttles! Grab a court slot or hop directly into open play below! 🏸🔥`}
        equippedGear={currentUser.equipped_gear}
      />

      {/* Open Play Sessions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF9F43]">
              Rotations & Waitlists
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#171717]">
              Open Play Queuing Sessions
            </h2>
          </div>
        </div>

        {venueSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[#6B7280]">
              Nothing scheduled here right now. Organizers update upcoming sessions daily!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venueSessions.map((sess) => (
              <div
                key={sess.id}
                className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F8EE] px-2.5 py-0.5 text-xs font-bold text-[#147A40]">
                      <Sparkles className="w-3 h-3 text-[#FF9F43]" />
                      {sess.rotation_format}
                    </span>
                    <span className="text-xs font-bold text-[#1F9D55]">
                      {sess.status === 'active' ? '🟢 Active Now' : '📅 Upcoming'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-[#171717]">{sess.title}</h3>
                  <p className="text-xs text-[#6B7280] mt-1 line-clamp-2 leading-relaxed">
                    {sess.description}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#6B7280]">
                      <Users className="w-4 h-4 text-[#1F9D55]" />
                      <span>
                        <strong className="text-[#171717]">{sess.current_players_count}</strong> / {sess.max_players} players
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#6B7280]">
                      <Calendar className="w-4 h-4 text-[#1F9D55]" />
                      <span>{new Date(sess.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EBEBE6] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#6B7280]">Queue Entry Fee</span>
                    <div className="text-lg font-black text-[#1F9D55]">
                      {formatCurrency(sess.fee_cents)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/sessions/${sess.id}`}
                      className="px-3 py-2 rounded-xl bg-[#FAFAF7] hover:bg-[#F1F1EB] border border-[#EBEBE6] text-xs font-bold text-[#171717] transition-all"
                    >
                      View Live Board
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleJoinSession(sess)}
                      className="px-4 py-2 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-sm transition-all"
                    >
                      Join Queue &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Courts Available Section */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1F9D55]">
            Hourly Bookings
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#171717]">
            Available Courts
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venueCourts.map((court) => (
            <div
              key={court.id}
              className="rounded-2xl border border-[#EBEBE6] bg-white p-5 shadow-sm hover:border-[#1F9D55] transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{getSportEmoji(court.sport)}</span>
                  <span className="rounded-full bg-[#E9F8EE] px-2 py-0.5 text-[10px] font-bold uppercase text-[#147A40]">
                    {court.is_indoor ? 'Indoor Court' : 'Covered Outdoor'}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-[#171717]">{court.name}</h3>
                <p className="text-xs text-[#6B7280] mt-1">{court.floor_type}</p>
              </div>

              <div className="pt-3 border-t border-[#EBEBE6] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#6B7280]">Hourly Rate</span>
                  <div className="text-base font-black text-[#171717]">
                    {formatCurrency(court.hourly_rate_cents)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBookCourt(court)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-sm transition-all"
                >
                  Book Slot
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal with GCash and Receipt Upload */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        venue={venue}
        court={selectedCourt}
        session={selectedSession}
      />
    </div>
  );
}
