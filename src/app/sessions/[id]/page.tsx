'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useMonkeyStore } from '@/lib/store';
import { INITIAL_COURTS } from '@/lib/mockData';
import { CourtDisplay } from '@/components/queue/CourtDisplay';
import { LiveQueueBoard } from '@/components/queue/LiveQueueBoard';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { formatCurrency, getSportDisplayName } from '@/lib/utils';
import { ArrowLeft, MapPin, Shield, Users } from 'lucide-react';

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
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/venues/${venue.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65756B] hover:text-[#2D724E] transition-colors py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {venue.name}
        </Link>

        {currentUser.role !== 'organizer' && (
          <button
            type="button"
            onClick={toggleRole}
            className="text-xs font-black text-[#2D724E] hover:underline flex items-center gap-1 py-1"
          >
            <Shield className="w-3.5 h-3.5" />
            Switch to Organizer View
          </button>
        )}
      </div>

      {/* Session Title Header Card */}
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="rounded-md bg-[#EBF4EE] px-2.5 py-0.5 text-xs font-black text-[#1E4A32]">
                {getSportDisplayName(session.sport)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FBF0E6] px-2 py-0.5 text-xs font-black text-[#A35C2B]">
                <Users className="w-3 h-3" />
                Doubles (2v2) &amp; Singles (1v1)
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-[#1E4A32] bg-[#EBF4EE] px-2 py-0.5 rounded-full">
                <span className="h-2 w-2 rounded-full bg-[#2D724E] animate-pulse" />
                Live Now
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-[#1A241E] tracking-tight leading-snug">
              {session.title}
            </h1>

            <p className="flex items-center gap-1.5 text-xs text-[#65756B] mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#2D724E]" />
              <span>
                {venue.name} &bull; {venue.address}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[#E8E5DF] pt-3 sm:pt-0 sm:pl-6">
            <div>
              <span className="text-[10px] text-[#65756B]">Rotation Entry</span>
              <div className="text-lg sm:text-xl font-black text-[#2D724E]">
                {formatCurrency(session.fee_cents)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#65756B]">Players in Hub</span>
              <div className="text-lg sm:text-xl font-black text-[#1A241E]">
                {session.current_players_count} / {session.max_players}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Referee Mascot Banner */}
      <MascotBanner
        mood="referee"
        title="Referee Miki’s Rules"
        message="Keep rallies high-energy! Communicate with your doubles partner, call your lines loud, and shake hands at the net. Winners stay on court, challengers rotate in!"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Active Courts & Scorekeeper (supports 4-player doubles teams) */}
      <CourtDisplay courts={sessionCourts} matches={matches} />

      {/* Live Queue Board (supports Doubles pair queuing and Singles 1v1) */}
      <LiveQueueBoard session={session} queues={queues} />
    </div>
  );
}
