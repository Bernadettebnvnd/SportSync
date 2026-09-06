'use client';

import React from 'react';
import Link from 'next/link';
import { useMonkeyStore } from '@/lib/store';
import { MonkeyMascot } from '@/components/mascot/MonkeyMascot';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { VenueCard } from '@/components/explore/VenueCard';
import { formatCurrency, getSportEmoji, getSportDisplayName } from '@/lib/utils';
import {
  Flame,
  Zap,
  Clock,
  Compass,
  ArrowRight,
  ShieldCheck,
  Users,
  Sparkles,
  Award,
} from 'lucide-react';

export default function HomePage() {
  const { currentUser, venues, sessions, queues } = useMonkeyStore();

  const activeSession = sessions[0];
  const myQueueEntry = queues.find(
    (q) => q.session_id === activeSession.id && q.user_id === currentUser.id
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner: Maligalig Monkey Mascot Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1F9D55] via-[#147A40] to-[#0E542C] p-6 sm:p-8 text-white shadow-lg">
        {/* Ambient background rings */}
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[#FF9F43]/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
              <Sparkles className="w-3.5 h-3.5 text-[#FF9F43]" />
              Maligalig Energy: 100%
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Ready to smash, <span className="text-[#FFC837]">{currentUser.nickname}</span>? 🏸
            </h1>

            <p className="text-xs sm:text-base text-emerald-100 leading-relaxed">
              Find open courts in seconds, hop into live open-play queues, and rack up
              Banana Points on the court!
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#147A40] font-extrabold text-xs sm:text-sm shadow-md hover:bg-emerald-50 transition-all active:scale-95"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Nearby Courts</span>
              </Link>
              <Link
                href={`/sessions/${activeSession.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF9F43] hover:bg-[#E68529] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Join Live Open Play</span>
              </Link>
            </div>
          </div>

          {/* Big Mascot Graphic in Hero */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative p-2">
              <MonkeyMascot
                mood="hype"
                size="xl"
                equippedGear={currentUser.equipped_gear}
              />
            </div>
            <div className="mt-2 text-center text-xs font-bold text-white/90">
              Miki the Court Monkey
            </div>
          </div>
        </div>
      </div>

      {/* Next Activity / Active Status Card */}
      <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF5EA] text-2xl shrink-0">
              ⚡
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF9F43]">
                Your Next Activity
              </span>
              <h2 className="text-lg font-black text-[#171717]">
                {myQueueEntry
                  ? `You’re #${myQueueEntry.queue_number} in queue for ${activeSession.title}`
                  : `Next game is up: ${activeSession.title}`}
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                The Upper Deck Sports Center &bull; Badminton Court 1 & 2
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {myQueueEntry ? (
              <span className="rounded-xl bg-[#E9F8EE] px-3.5 py-2 text-xs font-bold text-[#147A40] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#1F9D55]" />
                <span>Estimated Wait: ~{myQueueEntry.estimated_wait_minutes} mins</span>
              </span>
            ) : (
              <Link
                href={`/sessions/${activeSession.id}`}
                className="px-4 py-2 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-sm transition-all"
              >
                Enter Open Play Queue &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mascot Conversational Tip */}
      <MascotBanner
        mood="thinking"
        title="Miki's Daily Court Tip"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Quick Join Open Play Carousel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#1F9D55]">
              Real-time Waitlists
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#171717]">
              Recommended Open Play
            </h2>
          </div>
          <Link
            href="/explore"
            className="text-xs font-bold text-[#1F9D55] hover:underline flex items-center gap-1"
          >
            View all sessions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="rounded-3xl border border-[#EBEBE6] bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-2xl">{getSportEmoji(sess.sport)}</span>
                  <span className="rounded-full bg-[#E9F8EE] px-2.5 py-0.5 text-[10px] font-bold text-[#147A40]">
                    {sess.status === 'active' ? '🟢 Active Rotation' : 'Upcoming'}
                  </span>
                </div>

                <h3 className="font-black text-base text-[#171717]">{sess.title}</h3>
                <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">
                  {sess.description}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs text-[#6B7280]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#1F9D55]" />
                    {sess.current_players_count} / {sess.max_players} players
                  </span>
                  <span className="font-extrabold text-[#1F9D55]">
                    {formatCurrency(sess.fee_cents)}
                  </span>
                </div>
              </div>

              <Link
                href={`/sessions/${sess.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-sm transition-all text-center"
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
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF9F43]">
              Metro Manila
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#171717]">
              Nearby Sports Centers
            </h2>
          </div>
          <Link
            href="/explore"
            className="text-xs font-bold text-[#1F9D55] hover:underline flex items-center gap-1"
          >
            Explore on Map <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.slice(0, 3).map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </div>
    </div>
  );
}
