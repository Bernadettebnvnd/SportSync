'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useMatchiStore } from '@/lib/store';
import { VenueCard } from '@/components/explore/VenueCard';
import { formatCurrency, getSportDisplayName } from '@/lib/utils';
import { SportType } from '@/types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
} from 'lucide-react';

const SPORTS: { id: SportType | 'all'; label: string }[] = [
  { id: 'all', label: 'All Sports' },
  { id: 'pickleball', label: 'Pickleball' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'padel', label: 'Padel' },
];

const DATE_PILLS = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'weekend', label: 'This Weekend' },
];

const LOCATION_CHIPS = [
  { id: 'all', label: 'All Metro' },
  { id: 'taguig', label: 'BGC & Taguig' },
  { id: 'makati', label: 'Makati' },
  { id: 'pasig', label: 'Pasig' },
  { id: 'qc', label: 'Quezon City' },
];

export default function HomePage() {
  const { currentUser, venues, sessions, bookings } = useMatchiStore();

  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Filtered Venues
  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      if (selectedSport !== 'all' && !venue.featured_sports.includes(selectedSport)) {
        return false;
      }
      if (selectedLocation !== 'all') {
        const loc = selectedLocation.toLowerCase();
        const address = `${venue.city} ${venue.address}`.toLowerCase();
        if (!address.includes(loc)) return false;
      }
      return true;
    });
  }, [venues, selectedSport, selectedLocation]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((sess) => {
      if (selectedSport !== 'all' && sess.sport !== selectedSport) {
        return false;
      }
      return true;
    });
  }, [sessions, selectedSport]);

  // Active upcoming booking for current user
  const upcomingBooking = bookings.find(
    (b) => b.user_id === currentUser.id && (b.status === 'confirmed' || b.status === 'pending')
  );

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
      {/* Top Header: Date & Clean Sport Switcher (Apple Sports visual discipline) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-[#E8E5DF] pb-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#65756B]">
              {todayFormatted}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E] mt-0.5">
              Philippines Sports
            </h1>
          </div>
          <p className="text-xs text-[#65756B]">
            Real court availability and verified open play sessions.
          </p>
        </div>

        {/* Sport Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SPORTS.map((sport) => {
            const isSelected = selectedSport === sport.id;
            return (
              <button
                key={sport.id}
                type="button"
                onClick={() => setSelectedSport(sport.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#1A241E] text-white shadow-xs'
                    : 'bg-white border border-[#E8E5DF] text-[#65756B] hover:text-[#1A241E] hover:border-[#1A241E]'
                }`}
              >
                {sport.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming Reservation (Shown strictly when real booking exists) */}
      {upcomingBooking && (
        <section className="rounded-2xl border border-[#2D724E]/30 bg-[#EBF4EE]/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E] block">
              Upcoming Booking &bull; {upcomingBooking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
            </span>
            <h3 className="text-base font-black text-[#1A241E]">
              {upcomingBooking.court?.name || 'Reserved Court'}
            </h3>
            <div className="flex items-center gap-3 text-xs text-[#65756B] flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#2D724E]" />
                {upcomingBooking.booking_date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#2D724E]" />
                {upcomingBooking.start_time} - {upcomingBooking.end_time}
              </span>
              {upcomingBooking.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2D724E]" />
                  {upcomingBooking.venue.name}
                </span>
              )}
            </div>
          </div>

          <Link
            href="/bookings"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#2D724E] text-white text-xs font-bold hover:bg-[#1E4A32] transition-colors"
          >
            View Booking
          </Link>
        </section>
      )}

      {/* PRIMARY ACTION 1: FIND A COURT */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#1A241E] tracking-tight">
              Find a Court
            </h2>
            <p className="text-xs text-[#65756B]">
              Verified facilities with dedicated playing areas and instant hourly slots.
            </p>
          </div>

          <Link
            href="/explore"
            className="text-xs font-bold text-[#2D724E] hover:underline inline-flex items-center gap-1"
          >
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Filter Controls (Replacing Desktop Dropdowns) */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
          {/* Date Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {DATE_PILLS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDate(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedDate === d.id
                    ? 'bg-[#2D724E] text-white shadow-xs'
                    : 'bg-white border border-[#E8E5DF] text-[#65756B] hover:text-[#1A241E]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-4 w-px bg-[#E8E5DF]" />

          {/* Location Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {LOCATION_CHIPS.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedLocation(loc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedLocation === loc.id
                    ? 'bg-[#1A241E] text-white shadow-xs'
                    : 'bg-white border border-[#E8E5DF] text-[#65756B] hover:text-[#1A241E]'
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Venues Grid */}
        {filteredVenues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E8E5DF] bg-white p-8 text-center space-y-2">
            <span className="text-xs font-bold text-[#1A241E] block">
              No facilities available.
            </span>
            <p className="text-[11px] text-[#65756B]">
              Try choosing another sport or area to discover available courts.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedSport('all');
                setSelectedLocation('all');
              }}
              className="mt-2 px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs font-bold text-[#1A241E] hover:bg-[#E8E5DF] transition-colors"
            >
              Reset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredVenues.slice(0, 6).map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </section>

      {/* Subtle Separator */}
      <div className="border-t border-[#E8E5DF]" />

      {/* PRIMARY ACTION 2: FIND A GAME */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#1A241E] tracking-tight">
              Find a Game
            </h2>
            <p className="text-xs text-[#65756B]">
              Drop-in open play sessions and live rotation boards.
            </p>
          </div>

          <Link
            href="/queue"
            className="text-xs font-bold text-[#2D724E] hover:underline inline-flex items-center gap-1"
          >
            <span>Open Play</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Sessions Grid */}
        {filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E8E5DF] bg-white p-8 text-center space-y-1">
            <span className="text-xs font-bold text-[#1A241E] block">
              No games available.
            </span>
            <p className="text-[11px] text-[#65756B]">
              Check back for upcoming open play rotations or book a private court.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map((sess) => (
              <div
                key={sess.id}
                className="rounded-2xl border border-[#E8E5DF] bg-white p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-all hover:border-[#2D724E]/40"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E] bg-[#2D724E]/10 px-2 py-0.5 rounded-md">
                      {getSportDisplayName(sess.sport)} &bull; {sess.rotation_format}
                    </span>
                    <span className="text-xs font-bold text-[#2D724E]">
                      {sess.status === 'active' ? 'Active' : 'Upcoming'}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-[#1A241E] leading-snug">
                    {sess.title}
                  </h3>
                  <p className="text-xs text-[#65756B] line-clamp-2 leading-relaxed">
                    {sess.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#E8E5DF] pt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-[#65756B]">
                    <Users className="w-3.5 h-3.5 text-[#2D724E]" />
                    <span>
                      <strong className="text-[#1A241E]">{sess.current_players_count}</strong> / {sess.max_players} players
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-black text-[#1A241E]">
                      {formatCurrency(sess.fee_cents)}
                    </span>
                    <Link
                      href={`/sessions/${sess.id}`}
                      className="px-3 py-1.5 rounded-xl bg-[#2D724E] text-white text-xs font-bold hover:bg-[#1E4A32] transition-colors"
                    >
                      Join
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
