'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMatchiStore } from '@/lib/store';
import { SportType } from '@/types';
import {
  Calendar,
  Clock,
  ArrowRight,
  Users,
  Compass,
  Zap,
} from 'lucide-react';

const SPORTS: { id: SportType; label: string }[] = [
  { id: 'pickleball', label: 'Pickleball' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'padel', label: 'Padel' },
];

export default function HomePage() {
  const { currentUser, bookings, sessions } = useMatchiStore();
  const [selectedSport, setSelectedSport] = useState<SportType>('pickleball');

  // Active upcoming booking for current user (strictly shown if real)
  const upcomingBooking = bookings.find(
    (b) => b.user_id === currentUser.id && (b.status === 'confirmed' || b.status === 'pending')
  );

  const activeSessionsCount = sessions.filter((s) => s.status === 'active').length;

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 pb-24 md:pb-12">
      {/* Quiet Top Header */}
      <div className="space-y-1 border-b border-[#E8E5DF] pb-4">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#65756B]">
          {todayFormatted}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
          Matchi
        </h1>
        <p className="text-xs sm:text-sm text-[#65756B]">
          Court booking &amp; open play rotations across the Philippines.
        </p>
      </div>

      {/* Upcoming Reservation (Rendered ONLY if a real booking exists) */}
      {upcomingBooking && (
        <section className="rounded-2xl border border-[#2D724E]/30 bg-[#EBF4EE]/70 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E] block">
              Upcoming Booking &bull; {upcomingBooking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
            </span>
            <h3 className="text-sm sm:text-base font-black text-[#1A241E] truncate">
              {upcomingBooking.court?.name || 'Reserved Court'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[#65756B] flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#2D724E]" />
                {upcomingBooking.booking_date}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#2D724E]" />
                {upcomingBooking.start_time} - {upcomingBooking.end_time}
              </span>
            </div>
          </div>

          <Link
            href="/bookings"
            className="px-3.5 py-1.5 rounded-xl bg-[#2D724E] text-white text-xs font-bold shrink-0 hover:bg-[#1E4A32] transition-colors"
          >
            View
          </Link>
        </section>
      )}

      {/* PRIMARY ACTION 1: FIND A COURT */}
      <section className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2D724E]" />
            <h2 className="text-lg sm:text-xl font-black text-[#1A241E] tracking-tight">
              Find a Court
            </h2>
          </div>
          <p className="text-xs text-[#65756B]">
            Dedicated venues with verified playing surfaces and instant hourly slots.
          </p>
        </div>

        {/* Mobile Sport Selector */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#65756B] uppercase tracking-wider block">
            Select Sport
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPORTS.map((sport) => {
              const isSelected = selectedSport === sport.id;
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setSelectedSport(sport.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#1E4A32] text-white border-[#1E4A32] shadow-xs'
                      : 'bg-[#FAF8F5] border-[#E8E5DF] text-[#1A241E] hover:border-[#1A241E]'
                  }`}
                >
                  <span>{sport.label}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#E9C46A]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div>
          <Link
            href={`/explore?sport=${selectedSport}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
          >
            <Compass className="w-4 h-4" />
            <span>Find a Court</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* PRIMARY ACTION 2: FIND A GAME */}
      <section className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C87D43]" />
            <h2 className="text-lg sm:text-xl font-black text-[#1A241E] tracking-tight">
              Find a Game
            </h2>
          </div>
          <p className="text-xs text-[#65756B]">
            Drop-in paddle queues, live rotation boards, and open play matches.
          </p>
        </div>

        {/* Live Queue Pulse Indicator */}
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-3.5 text-xs text-[#65756B]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2D724E]" />
            <span>
              <strong className="text-[#1A241E] font-black">{activeSessionsCount} active sessions</strong> open today
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#2D724E] uppercase tracking-wider bg-[#EBF4EE] px-2 py-0.5 rounded-md">
            Live Rotation
          </span>
        </div>

        {/* Action Button */}
        <div>
          <Link
            href="/queue"
            className="w-full py-3.5 px-4 rounded-2xl bg-[#1A241E] hover:bg-[#0F172A] text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
          >
            <Zap className="w-4 h-4 text-[#E9C46A]" />
            <span>Find a Game</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
