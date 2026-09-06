'use client';

import React, { useState } from 'react';
import { useMonkeyStore } from '@/lib/store';
import { INITIAL_COURTS } from '@/lib/mockData';
import { ReceiptReviewModal } from '@/components/payments/ReceiptReviewModal';
import { ScoreModal } from '@/components/queue/ScoreModal';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { Payment, Match } from '@/types';
import { formatCurrency, formatTimeAgo, getPaymentMethodName } from '@/lib/utils';
import {
  ShieldCheck,
  CheckCircle2,
  Users,
  Play,
  UserPlus,
  Eye,
  Banknote,
  CreditCard,
  Building2,
} from 'lucide-react';

export default function OrganizerDashboard() {
  const {
    sessions,
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
  const [walkInFormat, setWalkInFormat] = useState<'doubles' | 'singles'>('doubles');
  const [activeTab, setActiveTab] = useState<'queue_ops' | 'payments'>('queue_ops');

  const primarySession = sessions[0];
  const sessionCourts = INITIAL_COURTS.filter((c) => primarySession.court_ids.includes(c.id));
  const sessionQueues = queues.filter((q) => q.session_id === primarySession.id);

  const pendingPayments = payments.filter(
    (p) => p.status === 'pending' || p.status === 'cash_at_venue'
  );
  const verifiedPayments = payments.filter((p) => p.status === 'approved');

  const waitingPlayers = sessionQueues.filter((q) => q.status === 'waiting');

  const handleAddWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    joinQueue(primarySession.id, [walkInName.trim()], walkInFormat);
    setWalkInName('');
  };

  const handleAdvanceToCourt = (courtId: string, courtName: string) => {
    if (waitingPlayers.length === 0) return;
    const nextInLine = waitingPlayers[0];
    assignQueueToCourt(nextInLine.id, courtId, courtName);
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-black text-[#1A241E] tracking-tight">
              Venue Live Ops Desk
            </h1>
            <span className="rounded-full bg-[#1E4A32] px-2.5 py-0.5 text-xs font-bold text-white flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E9C46A]" />
              Organizer
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#65756B] mt-0.5">
            Doubles &amp; Singles court rotation, walk-in registration, and multi-channel payment verification.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#E8E5DF]/70 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('queue_ops')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'queue_ops'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            Court &amp; Queue Ops
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            <span>Payments &amp; Cash</span>
            {pendingPayments.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C87D43] text-[9px] font-black text-white">
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
        message="Keep doubles rotations fast! Pair waiting players, verify cash receipts with one tap, and keep courts buzzing with maligalig energy!"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-3.5 sm:p-4 shadow-sm">
          <span className="text-[11px] font-bold text-[#65756B]">Active Rotation</span>
          <div className="text-lg sm:text-xl font-black text-[#1A241E] mt-1">
            {primarySession.current_players_count} / {primarySession.max_players}
          </div>
          <span className="text-[10px] text-[#2D724E] font-bold mt-0.5 block">
            Doubles Open Play
          </span>
        </div>

        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-3.5 sm:p-4 shadow-sm">
          <span className="text-[11px] font-bold text-[#65756B]">Waiting in Line</span>
          <div className="text-lg sm:text-xl font-black text-[#C87D43] mt-1">
            {waitingPlayers.length} Groups
          </div>
          <span className="text-[10px] text-[#65756B] mt-0.5 block">
            Est wait: ~{waitingPlayers.length * 8} mins
          </span>
        </div>

        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-3.5 sm:p-4 shadow-sm">
          <span className="text-[11px] font-bold text-[#65756B]">Awaiting Approval</span>
          <div className="text-lg sm:text-xl font-black text-[#A35C2B] mt-1">
            {pendingPayments.length} Pending
          </div>
          <span className="text-[10px] text-[#65756B] mt-0.5 block">E-Wallets, Banks &amp; Cash</span>
        </div>

        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-3.5 sm:p-4 shadow-sm">
          <span className="text-[11px] font-bold text-[#65756B]">Verified Revenue</span>
          <div className="text-lg sm:text-xl font-black text-[#2D724E] mt-1">
            {formatCurrency(
              verifiedPayments.reduce((acc, curr) => acc + curr.amount_cents, 0)
            )}
          </div>
          <span className="text-[10px] text-[#1E4A32] font-bold mt-0.5 block">
            {verifiedPayments.length} bookings confirmed
          </span>
        </div>
      </div>

      {activeTab === 'queue_ops' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Left 2 Cols: Live Courts & Rotation Advance */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                  Court Rotation Control
                </h2>
                <span className="text-xs text-[#65756B]">Call Next Doubles Pair</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sessionCourts.map((court) => {
                  const ongoingMatch = matches.find(
                    (m) => m.court_id === court.id && m.status === 'in_progress'
                  );

                  return (
                    <div
                      key={court.id}
                      className="rounded-2xl border border-[#E8E5DF] p-4 bg-[#FAF8F5] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-[#1A241E]">
                          {court.name}
                        </span>
                        {ongoingMatch ? (
                          <span className="text-[10px] font-black text-[#1E4A32] bg-[#EBF4EE] px-2 py-0.5 rounded-full">
                            Doubles Match
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#65756B] bg-[#E8E5DF] px-2 py-0.5 rounded-full">
                            Court Open
                          </span>
                        )}
                      </div>

                      {ongoingMatch ? (
                        <div className="rounded-xl bg-white p-3 border border-[#E8E5DF] space-y-2">
                          <div className="flex justify-between text-xs font-bold text-[#1A241E]">
                            <span>{ongoingMatch.team_a_names.join(' & ')}</span>
                            <span className="text-[#2D724E]">{ongoingMatch.score_a}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-[#1A241E]">
                            <span>{ongoingMatch.team_b_names.join(' & ')}</span>
                            <span className="text-[#C87D43]">{ongoingMatch.score_b}</span>
                          </div>

                          <div className="pt-2 border-t border-[#E8E5DF] flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedScoreMatch(ongoingMatch)}
                              className="flex-1 py-1.5 rounded-lg bg-[#2D724E] text-white text-[11px] font-bold min-h-[36px]"
                            >
                              Update Live Score
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-[#65756B]">
                          Ready for next rotation
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={waitingPlayers.length === 0}
                        onClick={() => handleAdvanceToCourt(court.id, court.name)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1A241E] hover:bg-[#2A362F] disabled:opacity-40 text-white text-xs font-bold transition-all min-h-[42px]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-[#E9C46A]" />
                        <span>Advance Next Pair to Court</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick In-Person Walk-in Registration */}
            <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-[#2D724E]" />
                <h3 className="text-sm font-black text-[#1A241E]">Add In-Person Walk-In Players</h3>
              </div>
              <form onSubmit={handleAddWalkIn} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Player Name(s) e.g. Coach Carlo & Mark..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none min-h-[42px]"
                  />
                  <div className="flex gap-2">
                    <select
                      value={walkInFormat}
                      onChange={(e) => setWalkInFormat(e.target.value as any)}
                      className="px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold min-h-[42px]"
                    >
                      <option value="doubles">Doubles (2v2)</option>
                      <option value="singles">Singles (1v1)</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all min-h-[42px]"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right Col: Live Queue List for Session */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-black text-sm text-[#1A241E]">Session Queue List</h3>
              <span className="text-xs text-[#65756B]">{sessionQueues.length} registered</span>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {sessionQueues.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-[#E8E5DF] p-2.5 sm:p-3 text-xs bg-[#FAF8F5]"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-[#E8E5DF] font-black text-[10px] text-[#1A241E] shrink-0">
                      #{entry.queue_number}
                    </span>
                    <div>
                      <span className="font-bold text-[#1A241E] block truncate max-w-[120px] sm:max-w-[150px]">
                        {entry.user?.full_name || 'Player'}
                      </span>
                      {entry.partner_names.length > 0 && (
                        <span className="text-[10px] text-[#65756B] block">
                          +{entry.partner_names.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      entry.status === 'on_court'
                        ? 'bg-[#EBF4EE] text-[#1E4A32]'
                        : 'bg-white border border-[#E8E5DF] text-[#65756B]'
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
        /* Payments Tab: Multi-Channel Payment Verification */
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                  Pending Payments &amp; Cash Confirmations
                </h2>
                <p className="text-xs text-[#65756B]">
                  Inspect GCash/Maya reference codes, bank receipts, or mark cash collected at the venue.
                </p>
              </div>

              <span className="rounded-full bg-[#C87D43]/15 px-3 py-1 text-xs font-black text-[#A35C2B] self-start sm:self-auto">
                {pendingPayments.length} Need Action
              </span>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#65756B]">
                <CheckCircle2 className="mx-auto w-9 h-9 text-[#2D724E] mb-2" />
                <p className="font-black text-sm text-[#1A241E]">All caught up!</p>
                <p className="mt-0.5">No pending payments need review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingPayments.map((payment) => {
                  const isCash = payment.status === 'cash_at_venue';
                  return (
                    <div
                      key={payment.id}
                      className="rounded-2xl border border-[#E8E5DF] bg-[#FAF8F5] p-4 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isCash
                                ? 'bg-[#EBF4EE] text-[#1E4A32]'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {isCash ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                            <span>{getPaymentMethodName(payment.payment_method)}</span>
                          </span>
                          <span className="text-[10px] text-[#65756B]">
                            {formatTimeAgo(payment.created_at)}
                          </span>
                        </div>

                        <h4 className="font-black text-sm text-[#1A241E]">{payment.user_name}</h4>
                        <p className="font-mono text-xs text-[#1A241E] mt-0.5">
                          Ref: {payment.reference_code}
                        </p>

                        <div className="mt-2 text-base font-black text-[#2D724E]">
                          {formatCurrency(payment.amount_cents)}
                        </div>

                        {payment.notes && (
                          <p className="text-[11px] text-[#65756B] mt-1.5 bg-white p-2 rounded-lg border border-[#E8E5DF]">
                            {payment.notes}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPayment(payment)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all min-h-[40px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isCash ? 'Verify Cash Collected &rarr;' : 'Inspect & Verify &rarr;'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Verified History */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-3">
            <h3 className="font-black text-sm text-[#1A241E]">Confirmed Transactions</h3>
            <div className="divide-y divide-[#E8E5DF]">
              {verifiedPayments.map((payment) => (
                <div key={payment.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2D724E] shrink-0" />
                    <div>
                      <span className="font-bold text-[#1A241E]">{payment.user_name}</span>
                      <span className="text-[#65756B] font-mono ml-1.5 text-[11px]">
                        ({getPaymentMethodName(payment.payment_method)})
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[#2D724E]">
                      {formatCurrency(payment.amount_cents)}
                    </span>
                    <span className="block text-[9px] text-[#65756B]">
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
