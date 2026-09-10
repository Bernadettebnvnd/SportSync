'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';
import { CourtDisplay } from '@/components/queue/CourtDisplay';
import { LiveQueueBoard } from '@/components/queue/LiveQueueBoard';
import { EmptyState } from '@/components/ui/States';
import { formatCurrency, getSportDisplayName } from '@/lib/utils';
import { ArrowLeft, MapPin, Users, Sparkles, Compass } from 'lucide-react';

export default function QueuePage() {
  const router = useRouter();
  const { sessions, venues, courts, queues, matches } = useMatchiStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id || ''
  );

  // If there are no sessions in the database
  if (sessions.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="rounded-3xl border border-dashed border-[#E8E5DF] bg-white p-10 sm:p-14 space-y-4">
          <EmptyState
            icon={<Compass className="w-7 h-7 text-[#2D724E]" />}
            title="No Active Open Play Sessions"
            description="There are currently no community game rotations scheduled. Check back later or book a private court for your group."
            action={{
              label: 'Find Courts',
              onClick: () => {
                router.push('/explore');
              },
            }}
          />
        </div>
      </div>
    );
  }

  const activeSession =
    sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const venue =
    activeSession.venue || venues.find((v) => v.id === activeSession.venue_id);
  const sessionCourts = courts.filter((c) =>
    activeSession.court_ids?.includes(c.id)
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65756B] hover:text-[#2D724E] transition-colors py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Facilities</span>
        </Link>
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
                    ? 'bg-[#2D724E] text-white shadow-xs'
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
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="rounded-md bg-[#EBF4EE] px-2 py-0.5 text-[11px] font-black text-[#1E4A32]">
                {getSportDisplayName(activeSession.sport)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FBF0E6] px-2 py-0.5 text-[11px] font-black text-[#A35C2B]">
                <Users className="w-3 h-3" />
                Doubles &amp; Singles
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#1E4A32] bg-[#EBF4EE] px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2D724E] animate-pulse" />
                Live Rotation
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-[#1A241E] tracking-tight leading-snug">
              {activeSession.title}
            </h1>

            {venue && (
              <p className="flex items-center gap-1.5 text-xs text-[#65756B] mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#2D724E] shrink-0" />
                <span className="truncate">
                  {venue.name} &bull; {venue.address}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="text-right">
              <span className="text-[10px] text-[#65756B] block">Queue Entry</span>
              <span className="text-base font-black text-[#2D724E]">
                {formatCurrency(activeSession.fee_cents)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Courts Display */}
      {sessionCourts.length > 0 && (
        <CourtDisplay
          courts={sessionCourts}
          matches={matches.filter((m) => m.session_id === activeSession.id)}
        />
      )}

      {/* Live Queue Rotation Board */}
      <LiveQueueBoard
        session={activeSession}
        queues={queues.filter((q) => q.session_id === activeSession.id)}
      />
    </div>
  );
}
