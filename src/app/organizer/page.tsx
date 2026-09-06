'use client';

import React, { useState } from 'react';
import { useMonkeyStore } from '@/lib/store';
import { INITIAL_COURTS } from '@/lib/mockData';
import { ReceiptReviewModal } from '@/components/payments/ReceiptReviewModal';
import { ScoreModal } from '@/components/queue/ScoreModal';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { Payment, Match } from '@/types';
import { formatCurrency, formatTimeAgo, getSportEmoji } from '@/lib/utils';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Play,
  UserPlus,
  AlertCircle,
  Eye,
  Trophy,
} from 'lucide-react';

export default function OrganizerDashboard() {
  const {
    sessions,
    venues,
    queues,
    matches,
    payments,
    currentUser,
    assignQueueToCourt,
    joinQueue,
  } = useMonkeyStore();

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedScoreMatch, setSelectedScoreMatch] = useState<Match | null>(null);
  const [walkInName, setWalkInName] = useState('');
  const [activeTab, setActiveTab] = useState<'queue_ops' | 'payments'>('queue_ops');

  const primarySession = sessions[0];
  const sessionCourts = INITIAL_COURTS.filter((c) => primarySession.court_ids.includes(c.id));
  const sessionQueues = queues.filter((q) => q.session_id === primarySession.id);

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const verifiedPayments = payments.filter((p) => p.status === 'approved');

  const waitingPlayers = sessionQueues.filter((q) => q.status === 'waiting');

  const handleAddWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    joinQueue(primarySession.id, [walkInName.trim()]);
    setWalkInName('');
  };

  const handleAdvanceToCourt = (courtId: string, courtName: string) => {
    if (waitingPlayers.length === 0) return;
    const nextInLine = waitingPlayers[0];
    assignQueueToCourt(nextInLine.id, courtId, courtName);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Venue Live Ops Desk
            </h1>
            <span className="rounded-full bg-[#171717] px-2.5 py-0.5 text-xs font-bold text-white flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF9F43]" />
              Organizer Mode
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Real-time court management, queue rotations, and manual GCash receipt verification.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#EBEBE6] rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('queue_ops')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'queue_ops'
                ? 'bg-white text-[#171717] shadow-sm'
                : 'text-[#6B7280] hover:text-[#171717]'
            }`}
          >
            Court & Queue Ops
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`relative px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-white text-[#171717] shadow-sm'
                : 'text-[#6B7280] hover:text-[#171717]'
            }`}
          >
            <span>Verify Receipts</span>
            {pendingPayments.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-black text-white">
                {pendingPayments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mascot Organizer Banner */}
      <MascotBanner
        mood="referee"
        title="Organizer Ops Whistle"
        message="Keep rotations snappy! Rotate players onto open courts, approve GCash receipts with one click, and keep the energy high! 🐒⚡"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#EBEBE6] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#6B7280]">Active Rotation</span>
          <div className="text-xl font-black text-[#171717] mt-1">
            {primarySession.current_players_count} / {primarySession.max_players}
          </div>
          <span className="text-[11px] text-[#1F9D55] font-semibold mt-0.5 block">
            {primarySession.title.split(':')[0]}
          </span>
        </div>

        <div className="rounded-2xl border border-[#EBEBE6] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#6B7280]">Waiting in Queue</span>
          <div className="text-xl font-black text-[#FF9F43] mt-1">
            {waitingPlayers.length} Players
          </div>
          <span className="text-[11px] text-[#6B7280] mt-0.5 block">
            Avg wait: ~{waitingPlayers.length * 8} mins
          </span>
        </div>

        <div className="rounded-2xl border border-[#EBEBE6] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#6B7280]">Pending Receipts</span>
          <div className="text-xl font-black text-[#EF4444] mt-1">
            {pendingPayments.length} Pending
          </div>
          <span className="text-[11px] text-[#6B7280] mt-0.5 block">GCash verification needed</span>
        </div>

        <div className="rounded-2xl border border-[#EBEBE6] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#6B7280]">Verified Revenue</span>
          <div className="text-xl font-black text-[#1F9D55] mt-1">
            {formatCurrency(
              verifiedPayments.reduce((acc, curr) => acc + curr.amount_cents, 0)
            )}
          </div>
          <span className="text-[11px] text-[#147A40] font-semibold mt-0.5 block">
            {verifiedPayments.length} transactions approved
          </span>
        </div>
      </div>

      {activeTab === 'queue_ops' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Live Courts & Quick Rotation Trigger */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-[#171717]">Court Rotation Control</h2>
                <span className="text-xs text-[#6B7280]">
                  Click &ldquo;Advance Next Group&rdquo; to call players
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sessionCourts.map((court) => {
                  const ongoingMatch = matches.find(
                    (m) => m.court_id === court.id && m.status === 'in_progress'
                  );

                  return (
                    <div
                      key={court.id}
                      className="rounded-2xl border border-[#EBEBE6] p-4 bg-[#FAFAF7] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-[#171717]">
                          {court.name}
                        </span>
                        {ongoingMatch ? (
                          <span className="text-[10px] font-bold text-[#147A40] bg-[#E9F8EE] px-2 py-0.5 rounded-full">
                            Active Match
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#6B7280] bg-[#EBEBE6] px-2 py-0.5 rounded-full">
                            Ready
                          </span>
                        )}
                      </div>

                      {ongoingMatch ? (
                        <div className="rounded-xl bg-white p-3 border border-[#EBEBE6] space-y-2">
                          <div className="flex justify-between text-xs font-bold text-[#171717]">
                            <span>{ongoingMatch.team_a_names.join(' & ')}</span>
                            <span className="text-[#1F9D55]">{ongoingMatch.score_a}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-[#171717]">
                            <span>{ongoingMatch.team_b_names.join(' & ')}</span>
                            <span className="text-[#FF9F43]">{ongoingMatch.score_b}</span>
                          </div>

                          <div className="pt-2 border-t border-[#EBEBE6] flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedScoreMatch(ongoingMatch)}
                              className="flex-1 py-1 rounded-lg bg-[#1F9D55] text-white text-[11px] font-bold"
                            >
                              Live Score
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-[#6B7280]">
                          Court available for rotation
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={waitingPlayers.length === 0}
                        onClick={() => handleAdvanceToCourt(court.id, court.name)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#171717] hover:bg-[#262626] disabled:opacity-40 text-white text-xs font-bold transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Advance Next Group to Court</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Walk-in Registration */}
            <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-[#1F9D55]" />
                <h3 className="text-sm font-black text-[#171717]">Add In-Person Walk-In Player</h3>
              </div>
              <form onSubmit={handleAddWalkIn} className="flex gap-2">
                <input
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Player / Guest Name (e.g. Kuya Jojo, Mark Cruz)..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#EBEBE6] text-xs focus:ring-2 focus:ring-[#1F9D55] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-sm transition-all"
                >
                  Add to Queue
                </button>
              </form>
            </div>
          </div>

          {/* Right Col: Live Queue List for Session */}
          <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBEBE6] pb-3">
              <h3 className="font-black text-sm text-[#171717]">Queue Rotation List</h3>
              <span className="text-xs text-[#6B7280]">{sessionQueues.length} total</span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {sessionQueues.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-[#EBEBE6] p-3 text-xs bg-[#FAFAF7]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-[#EBEBE6] font-bold text-[11px] text-[#171717]">
                      #{entry.queue_number}
                    </span>
                    <div>
                      <span className="font-extrabold text-[#171717]">
                        {entry.user?.full_name || 'Player'}
                      </span>
                      {entry.partner_names.length > 0 && (
                        <span className="block text-[10px] text-[#6B7280]">
                          +{entry.partner_names.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      entry.status === 'on_court'
                        ? 'bg-[#E9F8EE] text-[#147A40]'
                        : 'bg-white border border-[#EBEBE6] text-[#6B7280]'
                    }`}
                  >
                    {entry.status === 'on_court' ? entry.court_name : 'Waiting'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Payments Tab: GCash Manual Receipt Verification */
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBEBE6] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#171717]">
                  Pending GCash Proof of Payments
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Click &ldquo;Inspect & Verify&rdquo; to inspect reference numbers and receipt screenshots.
                </p>
              </div>

              <span className="rounded-full bg-[#EF4444]/10 px-3 py-1 text-xs font-bold text-[#EF4444]">
                {pendingPayments.length} Awaiting Approval
              </span>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6B7280]">
                <CheckCircle2 className="mx-auto w-10 h-10 text-[#1F9D55] mb-2" />
                <p className="font-bold text-sm text-[#171717]">All caught up!</p>
                <p className="mt-1">No pending GCash payment receipts need review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-[#EBEBE6] bg-[#FAFAF7] p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-[#007DFE] bg-blue-50 px-2 py-0.5 rounded-md">
                          GCash Express
                        </span>
                        <span className="text-[10px] text-[#6B7280]">
                          {formatTimeAgo(payment.created_at)}
                        </span>
                      </div>

                      <h4 className="font-black text-sm text-[#171717]">{payment.user_name}</h4>
                      <p className="font-mono text-xs text-[#171717] mt-0.5">
                        Ref: {payment.reference_code}
                      </p>

                      <div className="mt-2 text-base font-black text-[#1F9D55]">
                        {formatCurrency(payment.amount_cents)}
                      </div>

                      {payment.notes && (
                        <p className="text-[11px] text-[#6B7280] mt-1 bg-white p-2 rounded-lg border border-[#EBEBE6]">
                          {payment.notes}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPayment(payment)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-sm transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect & Verify Proof &rarr;</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verified History */}
          <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-black text-sm text-[#171717]">Recently Verified Receipts</h3>
            <div className="divide-y divide-[#EBEBE6]">
              {verifiedPayments.map((payment) => (
                <div key={payment.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1F9D55] shrink-0" />
                    <div>
                      <span className="font-bold text-[#171717]">{payment.user_name}</span>
                      <span className="text-[#6B7280] font-mono ml-2">({payment.reference_code})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[#1F9D55]">
                      {formatCurrency(payment.amount_cents)}
                    </span>
                    <span className="block text-[10px] text-[#6B7280]">
                      Verified by {payment.verified_by || 'Organizer'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedPayment && (
        <ReceiptReviewModal
          isOpen={Boolean(selectedPayment)}
          onClose={() => setSelectedPayment(null)}
          payment={selectedPayment}
        />
      )}

      {selectedScoreMatch && (
        <ScoreModal
          isOpen={Boolean(selectedScoreMatch)}
          onClose={() => setSelectedScoreMatch(null)}
          match={selectedScoreMatch}
        />
      )}
    </div>
  );
}
