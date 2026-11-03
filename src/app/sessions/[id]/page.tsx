'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useMatchiStore } from '@/lib/store';
import { BookingModal } from '@/components/payments/BookingModal';
import { SportCourtVisualizer } from '@/components/explore/SportCourtVisualizer';
import { formatCurrency, getSportDisplayName } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Zap,
  Activity,
  CheckCircle2,
  ChevronRight,
  Layers,
  Award,
} from 'lucide-react';

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default function SessionDetailPage({ params }: SessionPageProps) {
  const { id } = use(params);
  const { sessions, venues, courts, queues, currentUser } = useMatchiStore();

  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Find target session
  const session = sessions.find((s) => s.id === id);
  const venue = session ? venues.find((v) => v.id === session.venue_id) : undefined;

  if (!session || !venue) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <h2 className="text-xl font-bold text-[#1A241E]">Session Not Found</h2>
        <p className="text-sm text-[#65756B]">The requested Open Play session does not exist or has ended.</p>
        <Link
          href="/queue"
          className="px-5 py-2.5 rounded-xl bg-[#2D724E] text-white text-xs font-bold"
        >
          Browse Active Sessions
        </Link>
      </div>
    );
  }

  const sessionCourts = courts.filter((c) => session.court_ids.includes(c.id));
  const sessionQueues = queues.filter((q) => q.session_id === session.id);

  const isUserJoined = sessionQueues.some((q) => q.user_id === currentUser.id);
  const maxCapacity = session.max_players || 16;
  const spotsLeft = Math.max(0, maxCapacity - sessionQueues.length);
  const isFull = spotsLeft === 0;

  const sessionDate = new Date(session.start_time).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 pb-28 md:pb-12">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#65756B] hover:text-[#2D724E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Courts &amp; Sessions</span>
        </Link>

        <Link
          href={`/queue?sessionId=${session.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2D724E]/20 bg-[#EBF4EE] text-xs font-semibold text-[#1E4A32] hover:bg-[#EBF4EE]/80 transition-all"
        >
          <Activity className="w-3.5 h-3.5 text-[#2D724E]" />
          <span>Live Queue Board</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#EBF4EE] px-2.5 py-1 text-xs font-bold text-[#1E4A32] capitalize">
                {getSportDisplayName(session.sport)}
              </span>
              <span className="rounded-md bg-[#FBF0E6] px-2.5 py-1 text-xs font-bold text-[#C87D43] capitalize">
                {session.skill_level.replace('_', ' ')}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2D724E] bg-[#EBF4EE] px-2.5 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2D724E] animate-pulse" />
                Active Open Play
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1A241E] tracking-tight">
              {session.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#65756B] pt-1">
              <Link
                href={`/venues/${venue.id}`}
                className="flex items-center gap-1.5 font-semibold text-[#1A241E] hover:text-[#2D724E] transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-[#2D724E]" />
                <span>{venue.name} &bull; {venue.city}</span>
              </Link>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#65756B]" />
                <span>{sessionDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#65756B]" />
                <span>{session.start_time} - {session.end_time}</span>
              </div>
            </div>
          </div>

          {/* Quick Price & Action Card (Desktop) */}
          <div className="hidden lg:flex flex-col items-end justify-between p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] min-w-[240px]">
            <div className="text-right">
              <span className="text-[11px] font-medium text-[#65756B] block">Session Fee</span>
              <div className="text-2xl font-black text-[#1A241E]">
                {formatCurrency(session.fee_cents)}
                <span className="text-xs font-normal text-[#65756B]"> / player</span>
              </div>
              <span className="text-xs font-semibold text-[#2D724E] block mt-1">
                {spotsLeft} of {maxCapacity} slots open
              </span>
            </div>

            <div className="w-full mt-4">
              {isUserJoined ? (
                <Link
                  href={`/queue?sessionId=${session.id}`}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D724E] text-white text-xs font-bold shadow-sm hover:bg-[#1E4A32] transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>View Queue</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={isFull}
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isFull ? 'Session Full' : 'Join Session'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout: Session Details & Allocated Courts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Format Specs & Live Courts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Format & Rules Card */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#1A241E] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2D724E]" />
              <span>Rotation Rules &amp; Format</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] text-center">
                <span className="text-[10px] uppercase font-bold text-[#65756B] block">Format</span>
                <span className="text-xs font-extrabold text-[#1A241E] mt-0.5 block">2v2 Doubles</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] text-center">
                <span className="text-[10px] uppercase font-bold text-[#65756B] block">Rule</span>
                <span className="text-xs font-extrabold text-[#1A241E] mt-0.5 block">First to 11 pts</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] text-center">
                <span className="text-[10px] uppercase font-bold text-[#65756B] block">Paddle Rack</span>
                <span className="text-xs font-extrabold text-[#1A241E] mt-0.5 block">Automated FIFO</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] text-center">
                <span className="text-[10px] uppercase font-bold text-[#65756B] block">Duration</span>
                <span className="text-xs font-extrabold text-[#1A241E] mt-0.5 block">4 Hours</span>
              </div>
            </div>

            <p className="text-xs text-[#65756B] leading-relaxed">
              Players rotate on and off the courts continuously. Winners stay for a maximum of 2 consecutive matches. 
              The digital queue manages fair rotation so you spend more time playing and zero time arguing over who is next.
            </p>
          </div>

          {/* Allocated Courts Visualizer */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A241E] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#2D724E]" />
                <span>Dedicated Courts ({sessionCourts.length})</span>
              </h3>
              <span className="text-xs text-[#65756B]">BWF &amp; USA Pickleball Specs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sessionCourts.map((c) => (
                <div key={c.id} className="rounded-2xl border border-[#E8E5DF] overflow-hidden bg-[#FAF8F5]">
                  <div className="p-3 border-b border-[#E8E5DF] flex items-center justify-between bg-white">
                    <span className="text-xs font-bold text-[#1A241E]">{c.name}</span>
                    <span className="text-[10px] font-semibold text-[#2D724E] bg-[#EBF4EE] px-2 py-0.5 rounded-md capitalize">
                      {c.sport}
                    </span>
                  </div>
                  <div className="p-3">
                    <SportCourtVisualizer sport={c.sport} courtName={c.name} />
                  </div>
                  <div className="px-3 pb-3 flex justify-between text-[11px] text-[#65756B]">
                    <span>Floor: {c.floor_type}</span>
                    <span className="text-[#2D724E] font-medium">In Rotation</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Live Queue & Player Roster */}
        <div className="space-y-6">
          {/* Current Roster Card */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A241E] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2D724E]" />
                <span>Joined Players ({sessionQueues.length}/{maxCapacity})</span>
              </h3>
              <span className="text-[11px] font-bold text-[#2D724E]">
                {spotsLeft} spots open
              </span>
            </div>

            {sessionQueues.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] text-center space-y-2">
                <Users className="w-8 h-8 text-[#65756B] mx-auto opacity-50" />
                <p className="text-xs font-semibold text-[#1A241E]">No players registered yet</p>
                <p className="text-[11px] text-[#65756B]">Be the first to secure a spot for this session!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {sessionQueues.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 font-mono text-[11px] font-bold text-[#65756B] text-center">
                        #{idx + 1}
                      </span>
                      {entry.user?.avatar_url ? (
                        <img
                          src={entry.user.avatar_url}
                          alt={entry.user?.full_name || 'Player'}
                          className="w-7 h-7 rounded-full object-cover border border-[#E8E5DF]"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#EBF4EE] text-[#2D724E] font-bold flex items-center justify-center text-[10px]">
                          {(entry.user?.full_name || 'P').charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-[#1A241E] block truncate max-w-[130px]">
                          {entry.user?.full_name || 'Player'}
                          {entry.user_id === currentUser.id && ' (You)'}
                        </span>
                        <span className="text-[10px] text-[#65756B] capitalize">
                          {entry.match_format || 'doubles'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        entry.status === 'on_court'
                          ? 'bg-[#EBF4EE] text-[#1E4A32]'
                          : 'bg-white border border-[#E8E5DF] text-[#65756B]'
                      }`}
                    >
                      {entry.status === 'on_court' ? 'On Court' : 'In Queue'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Host Facility Card */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65756B]">
              Facility &amp; Organizer
            </span>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF4EE] flex items-center justify-center text-[#2D724E] font-bold text-lg">
                {venue.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1A241E]">{venue.name}</h4>
                <p className="text-xs text-[#65756B]">{venue.address}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8E5DF] flex items-center justify-between text-xs">
              <span className="text-[#65756B]">Verified Facility Partner</span>
              <Link
                href={`/venues/${venue.id}`}
                className="font-bold text-[#2D724E] hover:underline"
              >
                View Courts
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Dock on Mobile */}
      <div className="lg:hidden fixed bottom-16 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E5DF] p-3 shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-[10px] font-semibold text-[#65756B] block">Entry Fee</span>
            <div className="text-lg font-black text-[#1A241E]">
              {formatCurrency(session.fee_cents)}
              <span className="text-[10px] font-normal text-[#65756B]"> / player</span>
            </div>
          </div>

          {isUserJoined ? (
            <Link
              href={`/queue?sessionId=${session.id}`}
              className="px-5 py-2.5 rounded-xl bg-[#2D724E] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>View Queue</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled={isFull}
              onClick={() => setIsBookingOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 min-h-[44px]"
            >
              <Zap className="w-4 h-4" />
              <span>{isFull ? 'Full' : 'Join Session'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Booking / Payment Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        venue={venue}
        session={session}
      />
    </div>
  );
}
