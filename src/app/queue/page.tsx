'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMonkeyStore } from '@/lib/store';
import { INITIAL_COURTS } from '@/lib/mockData';
import { CourtDisplay } from '@/components/queue/CourtDisplay';
import { LiveQueueBoard } from '@/components/queue/LiveQueueBoard';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { formatCurrency, getSportDisplayName } from '@/lib/utils';
import { ArrowLeft, MapPin, Shield, Users, Sparkles } from 'lucide-react';

export default function QueuePage() {
  const { sessions, venues, queues, matches, currentUser, toggleRole } = useMonkeyStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id || 'sess_friday_smash'
  );

  const activeSession =
    sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const venue =
    venues.find((v) => v.id === activeSession.venue_id) || venues[0];
  const sessionCourts = INITIAL_COURTS.filter((c) =>
    activeSession.court_ids.includes(c.id)
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Top Header & Role Action */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65756B] hover:text-[#2D724E] transition-colors py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Courts</span>
        </Link>

        {currentUser.role !== 'organizer' && (
          <button
            type="button"
            onClick={toggleRole}
            className="text-xs font-black text-[#2D724E] hover:underline flex items-center gap-1 py-1"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Switch to Ops Desk</span>
          </button>
        )}
      </div>

      {/* Session Switcher Pills if multiple sessions */}
      {sessions.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {sessions.map((sess) => {
            const isSelected = sess.id === activeSession.id;
            return (
              <button
                key={sess.id}
                type="button"
                onClick={() => setSelectedSessionId(sess.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#2D724E] text-white shadow-sm'
                    : 'bg-white text-[#65756B] border border-[#E8E5DF] hover:border-[#2D724E]'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#E9C46A]" />
                <span>{sess.title.split(':')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Session Title Header Card */}
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="rounded-md bg-[#EBF4EE] px-2 py-0.5 text-[11px] font-black text-[#1E4A32]">
                {getSportDisplayName(activeSession.sport)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FBF0E6] px-2 py-0.5 text-[11px] font-black text-[#A35C2B]">
                <Users className="w-3 h-3" />
                Doubles (2v2) &amp; Singles (1v1)
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#1E4A32] bg-[#EBF4EE] px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2D724E] animate-pulse" />
                Live Rotation
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-[#1A241E] tracking-tight leading-snug">
              {activeSession.title}
            </h1>

            <p className="flex items-center gap-1.5 text-xs text-[#65756B] mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#2D724E] shrink-0" />
              <span className="truncate">
                {venue.name} &bull; {venue.address}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[#E8E5DF] pt-2.5 sm:pt-0 sm:pl-5 shrink-0">
            <div>
              <span className="text-[10px] text-[#65756B]">Rotation Entry</span>
              <div className="text-base sm:text-lg font-black text-[#2D724E]">
                {formatCurrency(activeSession.fee_cents)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#65756B]">Players in Hub</span>
              <div className="text-base sm:text-lg font-black text-[#1A241E]">
                {activeSession.current_players_count} / {activeSession.max_players}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Referee Mascot Banner */}
      <MascotBanner
        mood="referee"
        title="Court Rules"
        message="Keep rallies active! Call lines loud and shake hands at the net. Winners stay on court, challengers rotate in."
        equippedGear={currentUser.equipped_gear}
      />

      {/* Active Courts & Scorekeeper (supports 4-player doubles teams) */}
      <CourtDisplay courts={sessionCourts} matches={matches} />

      {/* Live Queue Board (supports Doubles pair queuing and Singles 1v1) */}
      <LiveQueueBoard session={activeSession} queues={queues} />
    </div>
  );
}
