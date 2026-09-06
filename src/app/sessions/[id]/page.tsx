'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useMonkeyStore } from '@/lib/store';
import { INITIAL_COURTS } from '@/lib/mockData';
import { CourtDisplay } from '@/components/queue/CourtDisplay';
import { LiveQueueBoard } from '@/components/queue/LiveQueueBoard';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { formatCurrency, getSportEmoji, getSportDisplayName } from '@/lib/utils';
import { ArrowLeft, Sparkles, MapPin, Shield, Users } from 'lucide-react';

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default function SessionQueuePage({ params }: SessionPageProps) {
  const { id } = use(params);
  const { sessions, venues, queues, matches, currentUser, toggleRole } = useMonkeyStore();

  const session = sessions.find((s) => s.id === id) || sessions[0];
  const venue = venues.find((v) => v.id === session.venue_id) || venues[0];
  const sessionCourts = INITIAL_COURTS.filter((c) => session.court_ids.includes(c.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Navigation & Venue link */}
      <div className="flex items-center justify-between">
        <Link
          href={`/venues/${venue.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#1F9D55] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {venue.name}
        </Link>

        {currentUser.role !== 'organizer' && (
          <button
            type="button"
            onClick={toggleRole}
            className="text-xs font-bold text-[#1F9D55] hover:underline flex items-center gap-1"
          >
            <Shield className="w-3.5 h-3.5" />
            Switch to Organizer View
          </button>
        )}
      </div>

      {/* Session Title Header Card */}
      <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">{getSportEmoji(session.sport)}</span>
              <span className="rounded-full bg-[#1F9D55]/10 px-2.5 py-0.5 text-xs font-bold text-[#1F9D55]">
                {getSportDisplayName(session.sport)} Open Play
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-[#147A40] bg-[#E9F8EE] px-2.5 py-0.5 rounded-full">
                <span className="h-2 w-2 rounded-full bg-[#1F9D55] animate-pulse" />
                Live Now
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              {session.title}
            </h1>

            <p className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#1F9D55]" />
              <span>
                {venue.name} &bull; {venue.address}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[#EBEBE6] pt-3 sm:pt-0 sm:pl-6">
            <div>
              <span className="text-xs text-[#6B7280]">Rotation Entry</span>
              <div className="text-xl font-black text-[#1F9D55]">
                {formatCurrency(session.fee_cents)}
              </div>
            </div>
            <div>
              <span className="text-xs text-[#6B7280]">Players In Hub</span>
              <div className="text-xl font-black text-[#171717]">
                {session.current_players_count} / {session.max_players}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Referee Mascot Banner */}
      <MascotBanner
        mood="referee"
        title="Referee Miki’s Whistle"
        message="Keep it energetic and clean! Call your lines loud, shake hands at the net, and stay maligalig! Winners stay on court, challengers rotate in!"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Active Courts & Scorekeeper */}
      <CourtDisplay courts={sessionCourts} matches={matches} />

      {/* Live Queue Board & Smart Rotation */}
      <LiveQueueBoard session={session} queues={queues} />
    </div>
  );
}
