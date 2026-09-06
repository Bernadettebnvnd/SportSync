'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useMonkeyStore } from '@/lib/store';
import { INITIAL_COURTS } from '@/lib/mockData';
import { BookingModal } from '@/components/payments/BookingModal';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { VenueMap } from '@/components/explore/VenueMap';
import { Court, Session } from '@/types';
import { formatCurrency, getSportDisplayName } from '@/lib/utils';
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
  CreditCard,
  Building2,
  Banknote,
  User,
  Navigation,
  ExternalLink,
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
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Back button */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65756B] hover:text-[#2D724E] transition-colors py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Explore
      </Link>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Main Image */}
        <div className="lg:col-span-2 relative h-64 sm:h-96 rounded-3xl overflow-hidden shadow-sm border border-[#E8E5DF]">
          <img
            src={venue.images[0] || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          {/* Hero text overlay */}
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {venue.featured_sports.map((sport) => (
                <span
                  key={sport}
                  className="inline-flex items-center rounded-lg bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold"
                >
                  {getSportDisplayName(sport)}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#C87D43]/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-white">
                <Users className="w-3 h-3" />
                Doubles &amp; Singles
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              {venue.name}
            </h1>

            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-200 mt-1">
              <MapPin className="w-4 h-4 text-[#E9C46A] shrink-0" />
              <span>{venue.address}</span>
            </p>
          </div>
        </div>

        {/* Venue Quick Card */}
        <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Star className="w-5 h-5 fill-[#E9C46A] text-[#E9C46A]" />
                <span className="text-lg font-black text-[#1A241E]">{venue.rating}</span>
                <span className="text-xs text-[#65756B]">({venue.review_count} player reviews)</span>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="rounded-full p-2 text-[#65756B] hover:bg-[#FAF8F5] transition-colors"
                title="Share Venue"
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
                {venue.operating_hours.mon_sun || '06:00 AM - 11:00 PM Daily'}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-[#65756B]">
                Amenities &amp; Perks
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {venue.amenities.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#FAF8F5] border border-[#E8E5DF] px-2 py-0.5 text-[11px] font-semibold text-[#1A241E]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#2D724E]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Payment flexibility card */}
            <div className="rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-3 space-y-1.5">
              <div className="text-xs font-black text-[#1A241E] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#2D724E]" />
                Flexible Payment Options
              </div>
              <p className="text-[11px] text-[#65756B] leading-snug">
                Supports <strong>GCash, Maya, GrabPay</strong>, Bank Transfers (BDO, BPI, UnionBank), or <strong>Cash at Venue</strong>.
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
            className="w-full py-3 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-md transition-all active:scale-[0.99] text-center min-h-[46px]"
          >
            Quick Book Court &rarr;
          </button>
        </div>
      </div>

      {/* Mascot banter banner */}
      <MascotBanner
        mood="hype"
        title="Miki's Court Advice"
        message={`${venue.name} has non-slip tournament Taraflex flooring. Join a doubles rotation or lock down a private singles court below!`}
        equippedGear={currentUser.equipped_gear}
      />

      {/* Open Play Sessions Section */}
      <div className="space-y-4">
        <div>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#C87D43]">
            Community Rotations
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-[#1A241E]">
            Open Play Queuing Sessions
          </h2>
        </div>

        {venueSessions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E8E5DF] bg-white p-8 text-center">
            <p className="text-xs sm:text-sm font-semibold text-[#65756B]">
              No active sessions scheduled right now. Organizers update upcoming sessions daily!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venueSessions.map((sess) => (
              <div
                key={sess.id}
                className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
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

                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#65756B]">
                      <Users className="w-4 h-4 text-[#2D724E]" />
                      <span>
                        <strong className="text-[#1A241E]">{sess.current_players_count}</strong> / {sess.max_players} players
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#65756B]">
                      <Calendar className="w-4 h-4 text-[#2D724E]" />
                      <span>{new Date(sess.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[#E8E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-[#65756B]">Entry Fee</span>
                    <div className="text-base sm:text-lg font-black text-[#2D724E]">
                      {formatCurrency(sess.fee_cents)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/queue"
                      className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#E8E5DF] border border-[#E8E5DF] text-xs font-bold text-[#1A241E] transition-all text-center min-h-[40px] flex items-center justify-center"
                    >
                      Live Board
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleJoinSession(sess)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all text-center min-h-[40px]"
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
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#2D724E]">
            Private Slots
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-[#1A241E]">
            Available Courts
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venueCourts.map((court) => (
            <div
              key={court.id}
              className="rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-5 shadow-sm hover:border-[#2D724E] transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-[#2D724E]">{getSportDisplayName(court.sport)}</span>
                  <div className="flex gap-1">
                    <span className="rounded-md bg-[#EBF4EE] px-1.5 py-0.5 text-[9px] font-black text-[#1E4A32]">
                      Doubles (2v2)
                    </span>
                    <span className="rounded-md bg-[#FBF0E6] px-1.5 py-0.5 text-[9px] font-black text-[#A35C2B]">
                      Singles (1v1)
                    </span>
                  </div>
                </div>

                <h3 className="font-black text-sm sm:text-base text-[#1A241E]">{court.name}</h3>
                <p className="text-xs text-[#65756B] mt-1">{court.floor_type}</p>
              </div>

              <div className="pt-3 border-t border-[#E8E5DF] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#65756B]">Hourly Rate</span>
                  <div className="text-sm sm:text-base font-black text-[#1A241E]">
                    {formatCurrency(court.hourly_rate_cents)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBookCourt(court)}
                  className="px-4 py-2 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all min-h-[38px]"
                >
                  Book Slot
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Location & OpenStreetMap Directions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#2D724E]">
              Court Location
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-[#1A241E]">
              Map &amp; Directions
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}#map=17/${venue.latitude}/${venue.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8E5DF] text-xs font-bold text-[#2D724E] hover:bg-[#FAF8F5] transition-colors shadow-sm"
            >
              <Navigation className="w-3.5 h-3.5 text-[#2D724E]" />
              <span>Open in OpenStreetMap</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${venue.latitude}%2C${venue.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2D724E] text-white text-xs font-bold hover:bg-[#1E4A32] transition-colors shadow-sm"
            >
              <span>Get Directions</span>
            </a>
          </div>
        </div>

        {/* Embedded OpenStreetMap */}
        <div className="rounded-3xl overflow-hidden border border-[#E8E5DF] bg-white shadow-sm">
          <VenueMap
            venues={[venue]}
            singleVenueMode={true}
            initialCenter={[venue.latitude, venue.longitude]}
            initialZoom={16}
            heightClass="h-[300px] sm:h-[360px]"
            showSearch={false}
          />
          <div className="p-4 bg-white border-t border-[#E8E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#65756B]">
              <MapPin className="w-4 h-4 text-[#2D724E] shrink-0" />
              <span>{venue.address}</span>
            </div>
            <div className="text-[11px] font-mono text-[#65756B] bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#E8E5DF] self-start sm:self-auto">
              {venue.latitude.toFixed(4)}° N, {venue.longitude.toFixed(4)}° E
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal with Diversified Payments */}
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
