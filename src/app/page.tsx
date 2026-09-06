'use client';

import React from 'react';
import Link from 'next/link';
import { useMonkeyStore } from '@/lib/store';
import { MonkeyMascot } from '@/components/mascot/MonkeyMascot';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { VenueCard } from '@/components/explore/VenueCard';
import { formatCurrency, getSportDisplayName } from '@/lib/utils';
import {
  Zap,
  Clock,
  Compass,
  ArrowRight,
  Users,
  Sparkles,
  CreditCard,
  Banknote,
} from 'lucide-react';

export default function HomePage() {
  const { currentUser, venues, sessions, queues } = useMonkeyStore();

  const activeSession = sessions[0];
  const myQueueEntry = queues.find(
    (q) => q.session_id === activeSession.id && q.user_id === currentUser.id
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Top Hero Banner: Matchi Tarzan Aesthetic */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E4A32] via-[#2D724E] to-[#153423] p-4 sm:p-7 text-white shadow-lg">
        {/* Ambient jungle canopy gradients */}
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[#C87D43]/25 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-xl">
            <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
              Ready for the court, <span className="text-[#E9C46A]">{currentUser.nickname}</span>?
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              Book courts and join open play queues across the Philippines.
            </p>

            {/* CTAs with phone touch sizing */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1E4A32] font-black text-xs sm:text-sm shadow-md hover:bg-emerald-50 transition-all active:scale-95 min-h-[42px]"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Courts</span>
              </Link>
              <Link
                href={`/sessions/${activeSession.id}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C87D43] hover:bg-[#A35C2B] text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 min-h-[42px]"
              >
                <Zap className="w-4 h-4 fill-current text-[#E9C46A]" />
                <span>Join Open Play</span>
              </Link>
            </div>
          </div>

          {/* Big Mascot Graphic in Hero */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            <MonkeyMascot
              mood="hype"
              size="lg"
              equippedGear={currentUser.equipped_gear}
            />
            <div className="md:hidden text-xs font-bold text-white/90">
              Miki &bull; Matchi Mascot
            </div>
          </div>
        </div>
      </div>

      {/* Next Activity / Active Status Card */}
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#EBF4EE] text-[#2D724E] shrink-0 font-black">
              <Zap className="w-6 h-6 fill-current text-[#C87D43]" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#C87D43]">
                Your Active Rotation
              </span>
              <h2 className="text-base sm:text-lg font-black text-[#1A241E] leading-snug">
                {myQueueEntry
                  ? `You’re #${myQueueEntry.queue_number} in queue for ${activeSession.title}`
                  : `Next game is up: ${activeSession.title}`}
              </h2>
              <p className="text-xs text-[#65756B] mt-0.5">
                The Upper Deck Sports Center &bull; Badminton Court 1 &amp; 2
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {myQueueEntry ? (
              <span className="w-full sm:w-auto rounded-xl bg-[#EBF4EE] px-3.5 py-2.5 text-xs font-bold text-[#1E4A32] flex items-center justify-center gap-1.5 min-h-[44px]">
                <Clock className="w-4 h-4 text-[#2D724E]" />
                <span>Estimated Wait: ~{myQueueEntry.estimated_wait_minutes}m</span>
              </span>
            ) : (
              <Link
                href={`/sessions/${activeSession.id}`}
                className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all min-h-[44px] flex items-center justify-center"
              >
                Hop into Queue &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mascot Conversational Intel */}
      <MascotBanner
        mood="thinking"
        title="Miki's Daily Court Intel"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Recommended Open Play Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#2D724E]">
              Real-time Rotations
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-[#1A241E]">
              Recommended Open Play
            </h2>
          </div>
          <Link
            href="/explore"
            className="text-xs font-bold text-[#2D724E] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded-lg bg-[#EBF4EE] px-2.5 py-0.5 text-xs font-black text-[#1E4A32]">
                    {getSportDisplayName(sess.sport)}
                  </span>
                  <span className="rounded-full bg-[#FAF8F5] border border-[#E8E5DF] px-2 py-0.5 text-[10px] font-bold text-[#65756B]">
                    {sess.status === 'active' ? 'Active Now' : 'Upcoming'}
                  </span>
                </div>

                <h3 className="font-black text-sm sm:text-base text-[#1A241E] leading-snug">{sess.title}</h3>
                <p className="text-xs text-[#65756B] mt-1 line-clamp-2">
                  {sess.description}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs text-[#65756B]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#2D724E]" />
                    {sess.current_players_count} / {sess.max_players} players
                  </span>
                  <span className="font-black text-[#2D724E]">
                    {formatCurrency(sess.fee_cents)}
                  </span>
                </div>
              </div>

              <Link
                href={`/sessions/${sess.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm transition-all text-center min-h-[42px]"
              >
                <span>Check Live Queue Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Venues Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#C87D43]">
              Philippines
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-[#1A241E]">
              Featured Sports Centers
            </h2>
          </div>
          <Link
            href="/explore"
            className="text-xs font-bold text-[#2D724E] hover:underline flex items-center gap-1"
          >
            View all ({venues.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {venues.slice(0, 6).map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </div>
    </div>
  );
}
